#!/bin/bash

# Briefr Shutdown Script
# This script stops the application and cleans up containers.

echo "Shutting down Briefr..."

# Stop and remove containers
docker-compose down

echo "Briefr has been shut down."
echo "Your code and data are safe."
echo "To restart, simply run: ./deploy.sh"
