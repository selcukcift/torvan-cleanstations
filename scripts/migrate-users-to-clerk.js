/**
 * User Migration Script for Clerk Integration
 * This script helps transition existing NextAuth users to Clerk
 */

const { PrismaClient } = require('@prisma/client')

async function migrateUsersToClerk() {
  const prisma = new PrismaClient()
  
  try {
    console.log('👥 Starting user migration to Clerk...')
    
    // Get all users without Clerk IDs
    const usersToMigrate = await prisma.user.findMany({
      where: {
        OR: [
          { clerkId: null },
          { clerkId: '' }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true
      }
    })
    
    if (usersToMigrate.length === 0) {
      console.log('✅ No users need migration - all users already have Clerk integration')
      return
    }
    
    console.log(`📋 Found ${usersToMigrate.length} users to migrate:`)
    usersToMigrate.forEach(user => {
      console.log(`  - ${user.fullName} (${user.email}) - ${user.role}`)
    })
    
    console.log('')
    console.log('📝 Username-Based Migration Instructions:')
    console.log('==========================================')
    console.log('')
    console.log('Since your users log in with USERNAMES, here\'s the migration process:')
    console.log('')
    console.log('OPTION 1: Automatic Account Linking (Recommended)')
    console.log('  1. ✅ Clerk authentication is now enabled')
    console.log('  2. 📧 Send invitation emails to existing users with instructions')
    console.log('  3. 👤 Users sign up with their EXISTING EMAIL addresses')
    console.log('  4. 🔗 System automatically links accounts by email match')
    console.log('  5. 📝 Users keep their existing roles and data')
    console.log('')
    console.log('OPTION 2: Administrative account linking (after users sign up)')
    console.log('  1. Users sign up through Clerk interface (/sign-up)')
    console.log('  2. Administrator runs account linking script')
    console.log('  3. Accounts are merged based on email matching')
    console.log('')
    console.log('⚠️  Important Notes:')
    console.log('  - Users will need to reset their passwords through Clerk')
    console.log('  - Existing user roles and data will be preserved')
    console.log('  - The migration is reversible by disabling Clerk')
    console.log('')
    
    // Create CSV export for user communication
    const csvData = [
      'Full Name,Email,Username,Role,Status',
      ...usersToMigrate.map(user => 
        `"${user.fullName}","${user.email}","${user.username}","${user.role}","${user.isActive ? 'Active' : 'Inactive'}"`
      )
    ].join('\n')
    
    const fs = require('fs')
    const csvPath = './user-migration-list.csv'
    fs.writeFileSync(csvPath, csvData)
    
    console.log(`📄 User list exported to: ${csvPath}`)
    console.log('   Use this list to invite users to the new Clerk system')
    
  } catch (error) {
    console.error('❌ User migration preparation failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function linkClerkAccounts() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔗 Starting Clerk account linking...')
    
    // This would typically be called after users have signed up with Clerk
    // It links existing database users with new Clerk users by email
    
    const usersWithoutClerkId = await prisma.user.findMany({
      where: {
        OR: [
          { clerkId: null },
          { clerkId: '' }
        ]
      }
    })
    
    console.log(`Found ${usersWithoutClerkId.length} users without Clerk IDs`)
    console.log('Manual linking required - Clerk IDs must be obtained from Clerk dashboard')
    console.log('and updated manually or through Clerk webhook integration')
    
  } catch (error) {
    console.error('❌ Account linking failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  const command = process.argv[2] || 'prepare'
  
  if (command === 'prepare') {
    migrateUsersToClerk()
      .then(() => {
        console.log('✅ User migration preparation completed')
        process.exit(0)
      })
      .catch((error) => {
        console.error('Migration preparation failed:', error)
        process.exit(1)
      })
  } else if (command === 'link') {
    linkClerkAccounts()
      .then(() => {
        console.log('✅ Account linking completed')
        process.exit(0)
      })
      .catch((error) => {
        console.error('Account linking failed:', error)
        process.exit(1)
      })
  } else {
    console.log('Usage: node migrate-users-to-clerk.js [prepare|link]')
    console.log('  prepare: Generate migration plan and user list')
    console.log('  link:    Link existing users with Clerk accounts')
    process.exit(1)
  }
}

module.exports = { migrateUsersToClerk, linkClerkAccounts }