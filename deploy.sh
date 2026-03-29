#!/bin/bash

# Briefr One-Command Activation & Update Script
# This script ensures the app is running the latest code in a clean Docker environment.

echo "🚀 Starting Briefr Deployment System..."

# 1. Pull latest changes from GitHub
echo "📥 Syncing code from repository..."
git pull origin main

# 2. Build and Launch Containers
# --build: ensures latest code is compiled
# -d: runs in background (detached)
# --remove-orphans: cleans up any retired containers
echo "🏗️ Building and launching containers..."
sudo docker-compose up --build -d --remove-orphans

# 3. Cleanup old images to prevent disk space issues on EC2
echo "🧹 Cleaning up old Docker artifacts..."
sudo docker image prune -f

echo "✅ Briefr is now LIVE and ACTIVE!"
echo "------------------------------------------------"
echo "Frontend: http://localhost (or EC2 Public IP)"
echo "Backend:  http://localhost:8000 (or EC2 Public IP:8000)"
echo "------------------------------------------------"
sudo docker ps
