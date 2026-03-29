# ============================================================
#  Briefr — main.tf
#  All AWS resources in one file
# ============================================================

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Auto-fetch account ID — used for unique S3 bucket name
data "aws_caller_identity" "current" {}

# ──────────────────────────────────────────────
#  NETWORKING (VPC)
# ──────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = { Name = "briefr-vpc" }
}

# Public Subnet — EC2 lives here
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "us-east-1a"
  tags                    = { Name = "briefr-public-subnet" }
}

# Private Subnet — (Optional/Advanced) Lambda can live here
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1a"
  tags              = { Name = "briefr-private-subnet" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "briefr-igw" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "briefr-public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Security group — firewall rules for EC2
resource "aws_security_group" "ec2_sg" {
  name        = "briefr-ec2-sg"
  description = "Allow HTTP, HTTPS, SSH and FastAPI port into EC2"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "FastAPI/Flask dev port"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "briefr-ec2-sg" }
}

# ──────────────────────────────────────────────
#  STORAGE (S3)
# ──────────────────────────────────────────────

resource "aws_s3_bucket" "digests" {
  bucket        = "briefr-digests-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
  tags          = { Name = "briefr-digests" }
}

# Block all public access — PDFs are private
resource "aws_s3_bucket_public_access_block" "digests" {
  bucket                  = aws_s3_bucket.digests.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Auto-cleanup: Delete files older than 2 days
resource "aws_s3_bucket_lifecycle_configuration" "cleanup" {
  bucket = aws_s3_bucket.digests.id

  rule {
    id     = "ExpireAfter2Days"
    status = "Enabled"

    filter {} # Required for current AWS provider version

    expiration {
      days = 2
    }
  }
}

# ──────────────────────────────────────────────
#  DATABASE (DynamoDB)
# ──────────────────────────────────────────────

# Feeds Table — stores the RSS sources
resource "aws_dynamodb_table" "feeds" {
  name         = "briefr-feeds"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "feed_id"

  attribute {
    name = "feed_id"
    type = "S"
  }

  tags = { Name = "briefr-feeds" }
}

# Digest metadata table — metadata for each generated daily digest
resource "aws_dynamodb_table" "digest_metadata" {
  name         = "briefr-digest-metadata"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "digest_id"

  attribute {
    name = "digest_id"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = { Name = "briefr-digest-metadata" }
}

# Stories table — individual news articles belonging to each digest
resource "aws_dynamodb_table" "stories" {
  name         = "briefr-stories"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "story_id"

  attribute {
    name = "story_id"
    type = "S"
  }

  tags = { Name = "briefr-stories" }
}

resource "aws_dynamodb_table" "users" {
  name         = "briefr-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "email"

  attribute {
    name = "email"
    type = "S"
  }

  tags = { Name = "briefr-users" }
}

# ──────────────────────────────────────────────
#  IAM & GOVERNANCE
# ──────────────────────────────────────────────

data "aws_iam_role" "labrole" {
  name = "LabRole"
}

# Create IAM Instance Profile for EC2
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "briefr-ec2-profile"
  role = data.aws_iam_role.labrole.name
}

# ──────────────────────────────────────────────
#  COMPUTE #1: Main EC2 Server
# ──────────────────────────────────────────────

resource "aws_instance" "briefr_server" {
  # Hardcoded Amazon Linux 2023 AMI for us-east-1 (avoids restricted DescribeImages permission)
  ami           = "ami-05b10e08d247fb927"
  instance_type = "t2.micro"
  
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name
  associate_public_ip_address = true
  
  key_name = "vockey"

  # Minimal User Data to ensure basic tools are ready
  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y git python3 python3-pip
              EOF

  tags = { Name = "briefr-main-server" }
}

# ──────────────────────────────────────────────
#  COMPUTE #2: Lambda Scraper
# ──────────────────────────────────────────────

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/briefr-news-scraper"
  retention_in_days = 7
}

# The News Scraper Lambda function
resource "aws_lambda_function" "scraper" {
  filename      = "../lambda/lambda_function.zip"
  function_name = "briefr-news-scraper"
  role          = data.aws_iam_role.labrole.arn
  handler       = "lambda_handler.lambda_handler"
  runtime       = "python3.12"
  timeout       = 60

  environment {
    variables = {
      S3_BUCKET_NAME        = aws_s3_bucket.digests.id
      FEEDS_TABLE           = aws_dynamodb_table.feeds.name
      DIGEST_METADATA_TABLE = aws_dynamodb_table.digest_metadata.name
      STORIES_TABLE         = aws_dynamodb_table.stories.name
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda_logs]
}

# ──────────────────────────────────────────────
#  MANAGEMENT #2: EventBridge Scheduler
# ──────────────────────────────────────────────

# Rule: Trigger every hour on the hour UTC to support cost-optimized scheduling
resource "aws_cloudwatch_event_rule" "daily_trigger" {
  name                = "briefr-smart-scraper-trigger"
  description         = "Fires every hour — Lambda checks preferred_hour in DynamoDB and exits immediately if it is not the user's chosen time. Only runs the full pipeline once per day at the user's selected hour."
  schedule_expression = "cron(0 * * * ? *)" 
}

# Target: Link the rule to our Lambda
resource "aws_cloudwatch_event_target" "scraper_target" {
  rule      = aws_cloudwatch_event_rule.daily_trigger.name
  target_id = "BriefrScraper"
  arn       = aws_lambda_function.scraper.arn
}

# Permission: Allow EventBridge to call the Lambda
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scraper.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_trigger.arn
}

# ──────────────────────────────────────────────
#  OUTPUTS
# ──────────────────────────────────────────────

output "ec2_public_ip" {
  value       = aws_instance.briefr_server.public_ip
  description = "Public IP of the EC2 instance"
}

output "s3_bucket_name" {
  value = aws_s3_bucket.digests.id
}
