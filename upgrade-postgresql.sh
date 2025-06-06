#!/bin/bash

# PostgreSQL 17 Upgrade Script
echo "Starting PostgreSQL 17 upgrade process..."

# Create sources directory if it doesn't exist
sudo mkdir -p /etc/apt/sources.list.d

# Download and add PostgreSQL signing key
echo "Adding PostgreSQL signing key..."
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg

# Add PostgreSQL repository
echo "Adding PostgreSQL repository..."
sudo sh -c 'echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Update package list
echo "Updating package list..."
sudo apt update

# Install PostgreSQL 17
echo "Installing PostgreSQL 17..."
sudo apt install -y postgresql-17 postgresql-contrib-17

# Stop old PostgreSQL service
echo "Stopping PostgreSQL 14..."
sudo systemctl stop postgresql@14-main

# Start and enable PostgreSQL 17
echo "Starting PostgreSQL 17..."
sudo systemctl start postgresql@17-main
sudo systemctl enable postgresql@17-main

# Check status
echo "Checking PostgreSQL 17 status..."
sudo systemctl status postgresql@17-main --no-pager

# Show version
echo "PostgreSQL version:"
sudo -u postgres psql -c "SELECT version();"

echo "PostgreSQL 17 upgrade completed!"