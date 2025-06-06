#!/bin/bash

echo "Setting up PostgreSQL authentication..."

# Set password for postgres user
echo "Setting postgres user password..."
sudo -u postgres psql -p 5433 -c "ALTER USER postgres PASSWORD 'postgres';"

echo "PostgreSQL authentication setup completed!"
echo ""
echo "Database URL should be: postgresql://postgres:postgres@localhost:5433/torvan-db?schema=public"