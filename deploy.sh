#!/bin/bash

# Briefr One-Command Activation & Update Script
# This script ensures the app is running the latest code in a clean Docker environment.

echo "Starting Briefr Deployment System..."

# 1. Pull latest changes from GitHub
echo "Syncing code from repository..."
git pull origin main

# 2. Build and Launch Containers
echo "Building and launching containers..."
docker-compose up --build -d --remove-orphans

# 3. Cleanup old images to prevent disk space issues
echo "Cleaning up old Docker artifacts..."
docker image prune -f

echo "Briefr is now LIVE and ACTIVE!"
echo "------------------------------------------------"
echo "Frontend: http://localhost"
echo "Backend:  http://localhost:8000"
echo "------------------------------------------------"

# 4. Automatically open the browser (Mac only)
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Opening Briefr in your browser..."
  open http://localhost
fi

docker ps
