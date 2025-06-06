#!/bin/bash

echo "Setting up database for Clean-stations project..."

# Create the database
echo "Creating torvan-db database..."
sudo -u postgres createdb -p 5433 torvan-db

# Test connection
echo "Testing database connection..."
sudo -u postgres psql -p 5433 -d torvan-db -c "SELECT version();"

echo "Database setup completed!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with: DATABASE_URL=\"postgresql://postgres@localhost:5433/torvan-db\""
echo "2. Run: npm run prisma:migrate"
echo "3. Run: npm run prisma:generate"
echo "4. Run: npm run prisma:seed"