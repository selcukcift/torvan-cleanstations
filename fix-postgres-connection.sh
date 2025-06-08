#!/bin/bash

echo "=== PostgreSQL Connection Fix Script ==="
echo "This script will help you configure PostgreSQL for the Torvan Medical application"
echo ""

# Check if PostgreSQL is running
echo "1. Checking PostgreSQL status..."
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not running. Starting it..."
    sudo systemctl start postgresql
fi

echo ""
echo "2. Setting postgres user password..."
echo "Enter the following commands when prompted:"
echo ""
echo "ALTER USER postgres PASSWORD 'postgres';"
echo "\q"
echo ""
echo "Press Enter to continue..."
read

# Set the password for postgres user
sudo -u postgres psql

echo ""
echo "3. Testing connection..."
PGPASSWORD=postgres psql -h localhost -U postgres -d torvan-db -c "SELECT version();" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
    echo ""
    echo "4. Running Prisma setup..."
    
    # Generate Prisma client
    npm run prisma:generate
    
    # Run migrations
    echo "Running database migrations..."
    npm run prisma:migrate
    
    # Seed the database
    echo "Seeding database with initial data..."
    npm run prisma:seed
    
    echo ""
    echo "✅ Setup complete! You can now run 'npm run dev' to start the application."
else
    echo "❌ Connection still failing. Please check:"
    echo "   - The postgres user password is set to 'postgres'"
    echo "   - The database 'torvan-db' exists"
    echo "   - PostgreSQL is listening on localhost:5432"
    echo ""
    echo "To create the database if it doesn't exist:"
    echo "sudo -u postgres createdb torvan-db"
fi