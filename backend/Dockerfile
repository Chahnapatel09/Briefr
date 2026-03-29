# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install dependencies
# Note: Using bcrypt 3.2.0 to avoid the "password too long" bug in passlib/bcrypt 4.0+
RUN pip install --no-cache-dir fastapi uvicorn boto3 python-dotenv \
    "python-jose[cryptography]" "passlib" "bcrypt==3.2.0" python-multipart \
    requests beautifulsoup4 gunicorn

# Copy the current directory contents into the container at /app
COPY . .

# Environment variables will be passed via docker-compose
ENV PYTHONUNBUFFERED=1

# Expose port 8000
EXPOSE 8000

# Run uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
