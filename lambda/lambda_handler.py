import json
import logging
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
import uuid
import boto3
import os
import time


logger = logging.getLogger()
logger.setLevel(logging.INFO)


dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
s3 = boto3.client('s3', region_name='us-east-1')


S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'briefr-digests')
DIGEST_METADATA_TABLE = os.environ.get('DIGEST_METADATA_TABLE', 'briefr-digest-metadata')
USERS_TABLE = "briefr-users"

def fetch_rss_feed(url, label="", category="News"):
    """Fetch an RSS feed and return top 5 stories."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            
            stories = []
            for item in root.findall('.//item')[:5]:
                title = item.find('title')
                link = item.find('link')
                desc = item.find('description')
                
                # Fallback to <guid> if <link> is missing
                link_url = link.text if link is not None else "#"
                if not link_url or link_url == "#":
                    guid = item.find('guid')
                    if guid is not None: link_url = guid.text

                # Clean HTML from description text
                desc_text = desc.text if desc is not None else "No Description"
                if "<" in desc_text and ">" in desc_text:
                    desc_text = "Click the headline to read the full story on the original source."

                title_text = title.text if title is not None else "No Title"
                if label:
                    title_text = f"[{label}] {title_text}"

                stories.append({
                    'title': title_text,
                    'link': link_url,
                    'description': desc_text,
                    'category': category,
                    'source': label or "Unknown Source"
                })
            return stories
    except Exception as e:
        logger.error(f"Error fetching feed {url}: {str(e)}")
        return []

def generate_html_digest(user_name, stories):
    """Generate a printable HTML digest document."""
    html_items = ""
    for story in stories:
        html_items += f'''
        <div class="story" data-category="{story['category']}" data-source="{story['source']}">
            <h2><a href="{story['link']}" target="_blank">{story['title']}</a></h2>
            <p>{story['description']}</p>
        </div>'''
        
    template = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Daily Digest for {user_name}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap');
        @page {{ size: 8.5in 11in; margin: 0.5in 1in; }}
        body {{
            font-family: 'Merriweather', serif; background-color: #ffffff;
            color: #2c3e50; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto;
        }}
        .header {{ text-align: center; border-bottom: 2px solid #6c63ff; padding-bottom: 1rem; margin-bottom: 2rem; }}
        .header h1 {{ font-size: 2.5rem; margin: 0; color: #1a1a2e; }}
        .header p {{ color: #7f8c8d; font-size: 1.1rem; }}
        .story {{ margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px dashed #ecf0f1; }}
        .story h2 a {{ color: #2c3e50; text-decoration: none; font-size: 1.4rem; }}
        .story h2 a:hover {{ color: #6c63ff; }}
        .story p {{ color: #555; font-size: 1rem; }}
        .footer {{ text-align: center; margin-top: 3rem; font-size: 0.9rem; color: #bdc3c7; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Briefr Daily Digest</h1>
        <p>Curated specifically for {user_name} &bull; {datetime.utcnow().strftime('%B %d, %Y')}</p>
    </div>
    <div class="content">{html_items}</div>
    <div class="footer"><p>Powered by Briefr Cloud Solutions &bull; Download or Print as PDF instantly.</p></div>
</body>
</html>'''
    return template

def lambda_handler(event, context):
    logger.info("Lambda triggered. Checking for scheduled digests.")
    
    # Current UTC hour
    target_time = datetime.utcnow().strftime("%H:00")
    
    # Allow manual override for testing
    if event and 'override_time' in event:
        target_time = event['override_time']
        
    logger.info(f"Scanning for users with delivery_time == {target_time}")
    
    users_table = dynamodb.Table(USERS_TABLE)
    try:
        response = users_table.scan()
        all_users = response.get('Items', [])
        # Filter users whose delivery_time matches the current hour
        users = [u for u in all_users if u.get('delivery_time', '08:00') == target_time]
    except Exception as e:
        logger.error(f"Failed to scan users: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps("Error connecting to DynamoDB")}
        
    logger.info(f"Found {len(users)} user(s) matching exactly `{target_time}` schedule.")
    if not users:
        return {'statusCode': 200, 'body': json.dumps("No users scheduled for this hour.")}
        
    success_count = 0
    metadata_table = dynamodb.Table(DIGEST_METADATA_TABLE)
    
    for user in users:
        try:
            email = user['email']
            name = user.get('name', 'User')
            digest_id = str(uuid.uuid4())
            file_key = f"{email}/{datetime.utcnow().strftime('%Y-%m-%d')}_{digest_id}.html"
            
            # Collect stories from user's active feeds
            feeds = user.get('feeds', [])
            active_feeds = [f for f in feeds if f.get('active', True)]
            
            if not active_feeds:
                logger.info(f"User {email} has no active feeds. Skipping.")
                continue

            stories = []
            for feed in active_feeds:
                url = feed.get('url')
                label = feed.get('label', '')
                category = feed.get('category', 'News')
                if url:
                    feed_stories = fetch_rss_feed(url, label, category)
                    stories.extend(feed_stories)

            if not stories:
                logger.warning(f"No stories extracted for {email}. Skipping.")
                continue
            
            # Build and upload the HTML digest
            html_content = generate_html_digest(name, stories)
            
            # Upload to S3
            s3.put_object(
                Bucket=S3_BUCKET_NAME,
                Key=file_key,
                Body=html_content.encode('utf-8'),
                ContentType='text/html'
            )
            
            # Save metadata with 48-hour TTL
            expires_at = int(time.time()) + 172800
            
            metadata_table.put_item(Item={
                "digest_id": digest_id,
                "user_email": email,
                "s3_key": file_key,
                "target_time": target_time,
                "created_at": str(datetime.utcnow()),
                "expires_at": expires_at
            })
            
            logger.info(f"Digest delivered for {email}")
            success_count += 1
            
        except Exception as e:
            logger.error(f"Error processing user {user.get('email', 'Unknown')}: {str(e)}")
            
    return {
        'statusCode': 200,
        'body': json.dumps(f"Done. Generated {success_count} digest(s).")
    }
