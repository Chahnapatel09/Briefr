# Briefr

Briefr is a cloud-native news aggregation platform that uses a serverless architecture to deliver personalized daily digests. The platform automates the extraction, processing, and delivery of news from user-defined RSS feeds into a clean, readable format.

## System Architecture

The project is built on AWS using a modular architecture:

- **Frontend**: A React and TypeScript application built with Vite and Ant Design, providing a minimalist Reading Room for accessing digests.
- **Backend API**: A FastAPI server (Python) that manages user authentication, feed configurations, and provides a bridge to AWS resources.
- **Serverless Engine**: AWS Lambda functions triggered by EventBridge schedules to scrape RSS feeds, aggregate content, and generate HTML digests.
- **Storage and Database**:
    - **Amazon S3**: Stores the generated HTML digests with lifecycle policies for automatic cleanup.
    - **Amazon DynamoDB**: Maintains user profiles, feed metadata, and digest history with TTL-based expiration.
- **Infrastructure as Code**: Terraform is used to provision and manage the entire AWS environment, including VPC, subnets, and security groups.

## Key Features

- **Personalized Scheduling**: Users can configure specific delivery times in their local timezone.
- **Smart RSS Discovery**: An auto-discovery engine that identifies RSS feeds from plain website URLs.
- **Timezone-Aware Delivery**: Automatic conversion between local user time and UTC for precise Lambda execution.
- **Live User Metrics**: A comprehensive archive dashboard that tracks usage statistics and total generated stories.
- **Optimized Storage**: Automated 48-hour expiration for all digests to maintain a zero-cost storage footprint.

## Project Structure

- `/frontend`: React/TypeScript application and UI components.
- `/backend`: FastAPI service for authentication and resource management.
- `/lambda`: Python logic for the core news aggregation and processing engine.
- `/terraform`: Infrastructure definitions as code.

## Getting Started

### Local Development

#### Backend
1. Navigate to the `/backend` directory.
2. Create a virtual environment and install dependencies from `requirements.txt`.
3. Configure the `.env` file with your AWS credentials.
4. Start the server using `python main.py`.

#### Frontend
1. Navigate to the `/frontend` directory.
2. Install dependencies using `npm install`.
3. Start the development server using `npm run dev`.

### Infrastructure Deployment

1. Navigate to the `/terraform` directory.
2. Initialize Terraform using `terraform init`.
3. Apply the configuration using `terraform apply`.

---

Developed for CSCI5409 Advanced Topics in Cloud Computing.
