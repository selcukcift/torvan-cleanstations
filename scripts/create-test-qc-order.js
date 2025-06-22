const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestQCOrder() {
  try {
    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (!adminUser) {
      console.error('No admin user found')
      return
    }

    // Create a test order in READY_FOR_PRE_QC status
    const testOrder = await prisma.order.create({
      data: {
        poNumber: `TEST-QC-${Date.now()}`,
        customerName: 'Test Customer for QC',
        projectName: 'QC Testing Project',
        wantDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        orderStatus: 'READY_FOR_PRE_QC',  // Ready for QC
        buildNumbers: ['QC-TEST-001'],
        createdById: adminUser.id,
        salesPerson: 'Test Sales',
        notes: 'Test order for QC system verification'
      }
    })

    // Skip sink configuration for now - just testing QC API

    console.log('✅ Created test order for QC verification:')
    console.log(`   Order ID: ${testOrder.id}`)
    console.log(`   PO Number: ${testOrder.poNumber}`)
    console.log(`   Status: ${testOrder.orderStatus}`)
    console.log(`   Build Number: ${testOrder.buildNumbers[0]}`)
    console.log('')
    console.log('🎯 You can now test the QC system with this order!')
    console.log(`   URL: /orders/${testOrder.id}?tab=qc`)

  } catch (error) {
    console.error('❌ Error creating test QC order:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createTestQCOrder()