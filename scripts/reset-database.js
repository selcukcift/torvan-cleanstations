#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log(`
╔════════════════════════════════════════════════════════════╗
║          DATABASE RESET AND RESEED SCRIPT                  ║
║                                                            ║
║  This script will:                                         ║
║  1. Drop the current database                              ║
║  2. Create a fresh database                                ║
║  3. Push the Prisma schema                                 ║
║  4. Run all seeding scripts                                ║
║                                                            ║
║  ⚠️  WARNING: This will DELETE ALL DATA in torvan-db!      ║
╚════════════════════════════════════════════════════════════╝
`);

console.log('⚠️  This action cannot be undone!');
console.log('   Press Ctrl+C within 5 seconds to cancel...\n');

// Give user time to cancel
setTimeout(() => {
  try {
    console.log('📦 Step 1: Resetting database using Prisma...');
    execSync('npx prisma migrate reset --force --skip-seed', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ Database reset complete!\n');

    console.log('🔄 Step 2: Pushing Prisma schema to database...');
    execSync('npx prisma db push --force-reset', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ Schema pushed successfully!\n');

    console.log('🌱 Step 3: Running comprehensive seeding...');
    execSync('npm run prisma:seed:all', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log(`
✅ DATABASE RESET COMPLETE!

Your database has been completely reset and reseeded with:
- 284 parts
- 334 assemblies (including 154 pegboard kits)
- 6 users with different roles
- 4 QC templates with 150+ checklist items
- Work instructions and enhanced features

You can now start the application with:
  npm run dev
`);
    
  } catch (error) {
    console.error('❌ Error during database reset:', error.message);
    process.exit(1);
  }
}, 5000);