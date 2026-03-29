import os
import boto3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes import auth
from bs4 import BeautifulSoup

load_dotenv()

app = FastAPI(title="Briefr API", description="Serverless News Digest Aggregator")

app.include_router(auth.router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AWS clients — uses env vars if set, otherwise falls back to ~/.aws/credentials
aws_config = {
    'region_name': os.getenv('AWS_REGION', 'us-east-1')
}

if os.getenv('AWS_ACCESS_KEY_ID'):
    aws_config['aws_access_key_id'] = os.getenv('AWS_ACCESS_KEY_ID')
    aws_config['aws_secret_access_key'] = os.getenv('AWS_SECRET_ACCESS_KEY')
    aws_config['aws_session_token'] = os.getenv('AWS_SESSION_TOKEN')

s3 = boto3.client('s3', **aws_config)
dynamodb = boto3.resource('dynamodb', **aws_config)

S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'briefr-digests-688832024440')
DIGEST_METADATA_TABLE = "briefr-digest-metadata"

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the Briefr API",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    # Quick DynamoDB connectivity check
    try:
        table_names = [table.name for table in dynamodb.tables.all()]
        return {"status": "healthy", "database": "connected", "tables": table_names}
    except Exception as e:
        return {"status": "degraded", "error": str(e)}

# --- RSS Auto-Discovery ---
import requests as http_requests
from urllib.parse import urljoin

COMMON_RSS_PATHS = [
    "/feed", "/feed/", "/rss", "/rss.xml", "/feed.xml", "/atom.xml",
    "/feeds/posts/default", "/blog/feed", "/news/feed", "/rss/feed",
    "/?feed=rss2",
]

@app.get("/tools/discover-feed")
def discover_feed(domain: str):
    """
    Accepts a plain domain (e.g. 'wired.com') or full URL.
    Attempts to auto-discover RSS/Atom feed URLs
    """
    url = domain.strip()
    if not url.startswith("http"):
        url = f"https://{url}"
    base_url = url.rstrip("/")

    headers = {"User-Agent": "Mozilla/5.0 (Briefr RSS Discovery Bot)"}

    try:
        resp = http_requests.get(base_url, headers=headers, timeout=8, allow_redirects=True)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            link_tags = soup.find_all("link", attrs={"type": ["application/rss+xml", "application/atom+xml"]})
            if link_tags:
                href = link_tags[0].get("href", "")
                if href:
                    feed_url = urljoin(base_url, href)
                    try:
                        check = http_requests.get(feed_url, headers=headers, timeout=6)
                        if check.status_code == 200 and ("<rss" in check.text[:500] or "<feed" in check.text[:500] or "<channel" in check.text[:500]):
                            return {"found": True, "feed_url": feed_url, "method": "html_meta"}
                    except Exception:
                        pass
    except Exception:
        pass

    for path in COMMON_RSS_PATHS:
        try:
            test_url = f"{base_url}{path}"
            resp = http_requests.get(test_url, headers=headers, timeout=5, allow_redirects=True)
            if resp.status_code == 200 and ("<rss" in resp.text[:500] or "<feed" in resp.text[:500] or "<channel" in resp.text[:500]):
                return {"found": True, "feed_url": test_url, "method": "path_probe"}
        except Exception:
            continue

    return {"found": False, "message": f"No RSS feed detected on '{domain}'."}

# --- Story Deletion ---
from pydantic import BaseModel

class DeleteStoryRequest(BaseModel):
    digest_id: str
    story_link: str
    story_title: str

def get_s3_bucket():
    bucket = os.getenv("S3_BUCKET_NAME")
    if bucket: return bucket
    try:
        response = s3.list_buckets()
        for b in response['Buckets']:
            if b['Name'].startswith('briefr-digests-'):
                return b['Name']
    except Exception:
        pass
    return "briefr-digests-688832024440"

from urllib.parse import unquote

@app.post("/tools/delete-story")
def delete_story(req: DeleteStoryRequest):
    """Remove a single story from the S3 HTML digest by matching URL or title."""
    try:
        table = dynamodb.Table(DIGEST_METADATA_TABLE)
        response = table.get_item(Key={'digest_id': req.digest_id})
        if 'Item' not in response:
            return {"success": False, "error": "Digest tracking record not found in DynamoDB."}
        
        item = response['Item']
        s3_key = item.get('s3_key')
        if not s3_key:
            return {"success": False, "error": "Database record is missing 's3_key' attribute."}

        bucket = get_s3_bucket()
        obj = s3.get_object(Bucket=bucket, Key=s3_key)
        html_content = obj['Body'].read().decode('utf-8')

        soup = BeautifulSoup(html_content, "html.parser")
        
        # Normalize URLs to handle encoding differences (e.g. &amp; vs &)
        def normalize_url(u):
            return unquote(str(u)).strip().rstrip('/')

        target_url = normalize_url(req.story_link)
        target_title = req.story_title.strip().lower()

        # First try matching by link
        target_story = None
        for story_div in soup.find_all(class_="story"):
            links = story_div.find_all('a')
            for l in links:
                href = l.get('href', '')
                if normalize_url(href) == target_url:
                    target_story = story_div
                    break
            if target_story: break

        # Fallback: match by title text
        if not target_story:
            for story_div in soup.find_all(class_="story"):
                title_tag = story_div.find(['h1', 'h2', 'h3', 'h4'])
                if title_tag and target_title in title_tag.get_text().strip().lower():
                    target_story = story_div
                    break
        
        if not target_story:
            return {"success": False, "error": "Story could not be located in storage (URL or Title mismatch)."}
        
        target_story.decompose()
        new_html = str(soup)

        s3.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=new_html.encode('utf-8'),
            ContentType='text/html'
        )

        return {"success": True, "message": "Story removed successfully."}

    except Exception as e:
        return {"success": False, "error": f"Delete failed: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
