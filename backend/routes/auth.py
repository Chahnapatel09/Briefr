import os
import json
import boto3
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Optional

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "briefr_dev_super_secret_key_123")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days (for convenience)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_users_table():
    dynamodb = boto3.resource(
        'dynamodb',
        region_name=os.getenv('AWS_REGION', 'us-east-1'),
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        aws_session_token=os.getenv('AWS_SESSION_TOKEN')
    )
    return dynamodb.Table("briefr-users")

class UserCreate(BaseModel):
    name: str  # New field required for registration
    email: str
    password: str

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register")
def register(user: UserCreate):
    table = get_users_table()
    
    # Check if user already exists
    response = table.get_item(Key={"email": user.email})
    if "Item" in response:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Hash password before storing
    hashed_password = get_password_hash(user.password)
    table.put_item(Item={
        "email": user.email,
        "name": user.name,
        "delivery_time": "08:00",
        "feeds": [
            {
                "id": "1",
                "label": "NYT Tech",
                "url": "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
                "category": "Tech",
                "active": True
            }
        ],
        "hashed_password": hashed_password,
        "created_at": str(datetime.utcnow())
    })
    
    return {"message": "User registered successfully"}

@router.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    table = get_users_table()
    
    # Fetch user from DynamoDB
    response = table.get_item(Key={"email": form_data.username})
    
    if "Item" not in response:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = response["Item"]
    
    # Verify password
    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Issue token with user profile data
    access_token = create_access_token(data={"sub": user["email"]})
    user_name = user.get("name", "User")
    delivery_time = user.get("delivery_time", "08:00")
    user_feeds = user.get("feeds", [])
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "name": user_name, 
        "delivery_time": delivery_time,
        "feeds": user_feeds
    }


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    return email

class SettingsUpdate(BaseModel):
    delivery_time: str
    feeds: Optional[List[dict]] = None

@router.put("/settings")
def update_settings(settings: SettingsUpdate, current_user_email: str = Depends(get_current_user)):
    table = get_users_table()
    
    update_expr = "SET delivery_time = :dt"
    expr_vals = {":dt": settings.delivery_time}
    
    if settings.feeds is not None:
        update_expr += ", feeds = :f"
        expr_vals[":f"] = settings.feeds
        
    table.update_item(
        Key={'email': current_user_email},
        UpdateExpression=update_expr,
        ExpressionAttributeValues=expr_vals
    )
    
    return {
        "message": "Settings updated.", 
        "delivery_time": settings.delivery_time,
        "feeds": settings.feeds
    }

# --- Digest Routes ---

DIGEST_METADATA_TABLE = os.getenv("DIGEST_METADATA_TABLE", "briefr-digest-metadata")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "briefr-digests-688832024440")

def get_s3_bucket():
    # Try env var first, otherwise discover from boto3
    bucket = os.getenv("S3_BUCKET_NAME")
    if bucket: return bucket
    s3 = boto3.client('s3', region_name='us-east-1')
    response = s3.list_buckets()
    for b in response['Buckets']:
        if b['Name'].startswith('briefr-digests-'):
            return b['Name']
    return None

@router.get("/digests")
def get_digests(current_user_email: str = Depends(get_current_user)):
    """Fetch all digest metadata for the authenticated user."""
    dynamodb = boto3.resource("dynamodb", region_name='us-east-1')
    table = dynamodb.Table(DIGEST_METADATA_TABLE)
    
    try:
        response = table.scan()
        all_metadata = response.get('Items', [])
        # Filter to only this user's digests
        user_digests = [d for d in all_metadata if d.get('user_email') == current_user_email]
        
        # Sort newest first
        user_digests.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return user_digests
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/digests/{digest_id}")
def read_raw_digest(digest_id: str, current_user_email: str = Depends(get_current_user)):
    """Fetch the raw HTML content of a digest from S3."""
    dynamodb = boto3.resource("dynamodb", region_name='us-east-1')
    table = dynamodb.Table(DIGEST_METADATA_TABLE)
    
    # 1. Fetch exact record
    response = table.get_item(Key={"digest_id": digest_id})
    if "Item" not in response:
        raise HTTPException(status_code=404, detail="Digest not found")
        
    item = response["Item"]
    
    # Verify ownership
    if item.get("user_email") != current_user_email:
        raise HTTPException(status_code=403, detail="Access denied.")
        
    s3_key = item.get("s3_key")
    bucket = get_s3_bucket()
    
    if not s3_key or not bucket:
        raise HTTPException(status_code=500, detail="Storage configuration error.")
        
    # Stream the HTML from S3
    try:
        s3 = boto3.client('s3', region_name='us-east-1')
        s3_obj = s3.get_object(Bucket=bucket, Key=s3_key)
        html_bytes = s3_obj['Body'].read()
        return HTMLResponse(content=html_bytes, status_code=200)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read from storage: {str(e)}")

@router.post("/digests/trigger")
def manually_trigger_pipeline(current_user_email: str = Depends(get_current_user)):
    """Manually trigger the Lambda to generate a digest now."""
    # Get this user's delivery_time so we can pass it as an override
    dynamodb = boto3.resource("dynamodb", region_name='us-east-1')
    user_table = dynamodb.Table(get_users_table().name)
    user = user_table.get_item(Key={"email": current_user_email}).get("Item", {})
    target = user.get("delivery_time", "08:00")
    
    try:
        lmb = boto3.client('lambda', region_name='us-east-1')
        response = lmb.invoke(
            FunctionName='briefr-news-scraper',
            InvocationType='Event', # Asynchronous
            Payload=json.dumps({"override_time": target}).encode('utf-8')
        )
        return {"message": "Digest generation triggered."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lambda Error: {str(e)}")

