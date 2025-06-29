/**
 * Automatic Account Linking Script
 * Links existing database users with new Clerk accounts by email matching
 */

const { PrismaClient } = require('@prisma/client')

async function autoLinkClerkAccounts() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔗 Starting automatic Clerk account linking...')
    
    // Find users who have signed up with Clerk but aren't linked yet
    // This would typically be called via webhook when users sign up
    
    const usersWithoutClerkId = await prisma.user.findMany({
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
        role: true
      }
    })
    
    if (usersWithoutClerkId.length === 0) {
      console.log('✅ All users are already linked with Clerk!')
      return
    }
    
    console.log(`📋 Found ${usersWithoutClerkId.length} users ready for linking:`)
    usersWithoutClerkId.forEach(user => {
      console.log(`  📧 ${user.email} (${user.fullName}) - ${user.role}`)
    })
    
    console.log('')
    console.log('🔄 Next Steps for Account Linking:')
    console.log('==================================')
    console.log('')
    console.log('1. Users sign up at: http://localhost:3005/sign-up')
    console.log('2. They MUST use their existing email addresses:')
    
    usersWithoutClerkId.forEach(user => {
      console.log(`   📧 ${user.email} (for ${user.fullName})`)
    })
    
    console.log('')
    console.log('3. After signup, accounts will be automatically linked')
    console.log('4. Users will retain all their existing data and roles')
    console.log('')
    console.log('📄 Email template available at: user-migration-email-template.txt')
    console.log('   Copy and customize this template to send to your users')
    
  } catch (error) {
    console.error('❌ Account linking preparation failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function checkLinkingStatus() {
  const prisma = new PrismaClient()
  
  try {
    const totalUsers = await prisma.user.count()
    const linkedUsers = await prisma.user.count({
      where: {
        clerkId: {
          not: null
        }
      }
    })
    
    console.log('📊 Account Linking Status:')
    console.log('==========================')
    console.log(`Total Users: ${totalUsers}`)
    console.log(`Linked to Clerk: ${linkedUsers}`)
    console.log(`Pending Migration: ${totalUsers - linkedUsers}`)
    
    if (linkedUsers === totalUsers) {
      console.log('🎉 All users have been successfully migrated to Clerk!')
    } else {
      console.log('')
      console.log('📋 Users still needing migration:')
      const pendingUsers = await prisma.user.findMany({
        where: {
          OR: [
            { clerkId: null },
            { clerkId: '' }
          ]
        },
        select: {
          email: true,
          fullName: true,
          role: true
        }
      })
      
      pendingUsers.forEach(user => {
        console.log(`  📧 ${user.email} (${user.fullName})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Status check failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  const command = process.argv[2] || 'prepare'
  
  if (command === 'prepare') {
    autoLinkClerkAccounts()
      .then(() => {
        console.log('✅ Account linking preparation completed')
        process.exit(0)
      })
      .catch((error) => {
        console.error('Account linking preparation failed:', error)
        process.exit(1)
      })
  } else if (command === 'status') {
    checkLinkingStatus()
      .then(() => {
        console.log('✅ Status check completed')
        process.exit(0)
      })
      .catch((error) => {
        console.error('Status check failed:', error)
        process.exit(1)
      })
  } else {
    console.log('Usage: node auto-link-clerk-accounts.js [prepare|status]')
    console.log('  prepare: Show migration instructions and user list')
    console.log('  status:  Check current migration status')
    process.exit(1)
  }
}

module.exports = { autoLinkClerkAccounts, checkLinkingStatus }