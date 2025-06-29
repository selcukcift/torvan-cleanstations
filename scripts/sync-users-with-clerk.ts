import { clerkClient } from "@clerk/nextjs/server"
import { prisma } from "../lib/prisma"

async function syncUsersWithClerk() {
  console.log("Starting user sync with Clerk...")
  
  try {
    // Get all users from database
    const dbUsers = await prisma.user.findMany({
      where: {
        clerkId: null // Only sync users without Clerk ID
      }
    })
    
    console.log(`Found ${dbUsers.length} users without Clerk ID`)
    
    for (const dbUser of dbUsers) {
      try {
        // Check if user already exists in Clerk by email
        const clerkUsers = await clerkClient.users.getUserList({
          emailAddress: [dbUser.email]
        })
        
        if (clerkUsers.totalCount > 0) {
          // User exists in Clerk, update database with Clerk ID
          const clerkUser = clerkUsers.data[0]
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              clerkId: clerkUser.id,
              clerkEmail: dbUser.email
            }
          })
          console.log(`✓ Linked existing Clerk user: ${dbUser.email}`)
        } else {
          // User doesn't exist in Clerk - you may want to create them
          console.log(`✗ User not found in Clerk: ${dbUser.email}`)
          console.log(`  To create this user in Clerk, they need to sign up or be invited`)
        }
      } catch (error) {
        console.error(`Error syncing user ${dbUser.email}:`, error)
      }
    }
    
    console.log("User sync completed!")
  } catch (error) {
    console.error("Error during sync:", error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the sync
syncUsersWithClerk()