/**
 * Migration script to add Clerk integration fields to the database
 * Run this script when ready to enable Clerk authentication
 */

const { PrismaClient } = require('@prisma/client')

async function migrateToClerk() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Starting Clerk migration...')
    
    // Check if columns already exist
    const checkResult = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name IN ('clerkId', 'clerkEmail')
    `
    
    if (checkResult.length > 0) {
      console.log('✅ Clerk columns already exist, skipping migration')
      return
    }
    
    // Add Clerk columns to User table
    console.log('➕ Adding clerkId and clerkEmail columns...')
    await prisma.$executeRaw`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "clerkId" TEXT,
      ADD COLUMN IF NOT EXISTS "clerkEmail" TEXT
    `
    
    // Add unique constraint for clerkId
    console.log('🔒 Adding unique constraint for clerkId...')
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "User_clerkId_key" ON "User"("clerkId")
    `
    
    console.log('✅ Clerk migration completed successfully!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Set USE_CLERK_AUTH=true in your .env.local file')
    console.log('2. Set NEXT_PUBLIC_USE_CLERK_AUTH=true in your .env.local file')
    console.log('3. Restart your application')
    console.log('4. Users can now sign up using Clerk authentication')
    
  } catch (error) {
    console.error('❌ Clerk migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  migrateToClerk()
    .then(() => {
      console.log('Migration completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration failed:', error)
      process.exit(1)
    })
}

module.exports = { migrateToClerk }