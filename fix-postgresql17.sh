#!/bin/bash

echo "Fixing PostgreSQL 17 cluster setup..."

# Create PostgreSQL 17 cluster
echo "Creating PostgreSQL 17 cluster..."
sudo pg_createcluster 17 main

# Start the cluster
echo "Starting PostgreSQL 17 cluster..."
sudo systemctl start postgresql@17-main

# Enable for auto-start
echo "Enabling PostgreSQL 17 for auto-start..."
sudo systemctl enable postgresql@17-main

# Check status
echo "Checking PostgreSQL 17 status..."
sudo systemctl status postgresql@17-main --no-pager

# List all clusters
echo "Listing all PostgreSQL clusters..."
sudo pg_lsclusters

# Verify version
echo "Verifying PostgreSQL 17 version..."
sudo -u postgres psql -c "SELECT version();"

echo "PostgreSQL 17 setup completed!"