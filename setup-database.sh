#\!/bin/bash

# Clean Stations Database Setup Script
# This script sets up the database from scratch on any PostgreSQL instance

set -e  # Exit on any error

echo "🚀 Setting up Clean Stations database..."

# Check if .env.local exists
if [ \! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found"
    echo "Please create .env.local with your database connection details:"
    echo "DATABASE_URL=\"postgresql://username:password@localhost:5432/database-name\""
    exit 1
fi

echo "📋 Step 1: Generating Prisma client..."
npm run prisma:generate

echo "📋 Step 2: Pushing schema to database (this will create/update tables)..."
npx prisma db push --accept-data-loss

echo "📋 Step 3: Running comprehensive seeding (safe for existing data)..."
npm run prisma:seed

echo "📋 Step 4: Verifying database setup..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function verify() {
  try {
    const categories = await prisma.category.count();
    const parts = await prisma.part.count();
    const assemblies = await prisma.assembly.count();
    const users = await prisma.user.count();
    const qcTemplates = await prisma.qcFormTemplate.count();
    
    console.log('✅ Database verification:');
    console.log('  Categories:', categories);
    console.log('  Parts:', parts);
    console.log('  Assemblies:', assemblies);
    console.log('  Users:', users);
    console.log('  QC Templates:', qcTemplates);
    
    if (categories > 0 && parts > 0 && assemblies > 0 && users > 0) {
      console.log('\\\\n🎉 Database setup completed successfully\!');
    } else {
      console.log('\\\\n⚠️  Warning: Some data may be missing');
    }
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}
verify();
"

echo ""
echo "✅ Database setup complete\!"
echo "   You can now run: npm run dev"
EOF < /dev/null
