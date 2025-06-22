const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateOrderStatus() {
  try {
    // Update any existing orders with the old status to the new status
    const result = await prisma.$executeRaw`
      UPDATE "Order" 
      SET "orderStatus" = 'SINK_BODY_EXTERNAL_PRODUCTION'
      WHERE "orderStatus" = 'PARTS_SENT_WAITING_ARRIVAL'
    `
    
    console.log(`Updated ${result} orders from PARTS_SENT_WAITING_ARRIVAL to SINK_BODY_EXTERNAL_PRODUCTION`)
    
    // Also update any other references in the database if needed
    // Check order history logs
    const historyResult = await prisma.$executeRaw`
      UPDATE "OrderHistoryLog" 
      SET "newStatus" = 'SINK_BODY_EXTERNAL_PRODUCTION'
      WHERE "newStatus" = 'PARTS_SENT_WAITING_ARRIVAL'
    `
    
    const historyResult2 = await prisma.$executeRaw`
      UPDATE "OrderHistoryLog" 
      SET "oldStatus" = 'SINK_BODY_EXTERNAL_PRODUCTION'
      WHERE "oldStatus" = 'PARTS_SENT_WAITING_ARRIVAL'
    `
    
    console.log(`Updated ${historyResult} + ${historyResult2} history log entries`)
    
  } catch (error) {
    console.log('No existing data to update or update failed:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

updateOrderStatus()