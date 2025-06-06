#!/bin/bash

echo "Fixing PostgreSQL 17 authentication..."

# Check current pg_hba.conf
echo "Current authentication settings:"
sudo grep -v "^#" /etc/postgresql/17/main/pg_hba.conf | grep -v "^$"

echo ""
echo "Setting up trust authentication for local connections..."

# Backup original pg_hba.conf
sudo cp /etc/postgresql/17/main/pg_hba.conf /etc/postgresql/17/main/pg_hba.conf.backup

# Create new pg_hba.conf with trust authentication for local connections
sudo tee /etc/postgresql/17/main/pg_hba.conf.new > /dev/null << 'EOF'
# PostgreSQL Client Authentication Configuration File
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             all                                     trust
# IPv4 local connections:
host    all             all             127.0.0.1/32            trust
# IPv6 local connections:
host    all             all             ::1/128                 trust
# Allow replication connections from localhost, by a user with the
# replication privilege.
local   replication     all                                     trust
host    replication     all             127.0.0.1/32            trust
host    replication     all             ::1/128                 trust
EOF

# Replace the original file
sudo mv /etc/postgresql/17/main/pg_hba.conf.new /etc/postgresql/17/main/pg_hba.conf

# Reload PostgreSQL configuration
echo "Reloading PostgreSQL configuration..."
sudo systemctl reload postgresql@17-main

echo "Authentication fixed! Now you can connect without a password."
echo "Testing connection..."
psql -h localhost -p 5433 -U postgres -d torvan-db -c "SELECT 'Connection successful!' as result;"