const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createSimpleQCTests() {
  console.log('🔄 Creating simple QC test orders...')

  try {
    // Clean up existing test data first
    console.log('🧹 Cleaning up existing test data...')
    await prisma.order.deleteMany({
      where: {
        poNumber: {
          startsWith: 'QC-TEST-'
        }
      }
    })

    // Ensure we have test users
    const qcUser = await prisma.user.upsert({
      where: { username: 'qc_inspector' },
      update: {},
      create: {
        username: 'qc_inspector',
        email: 'qc@torvan.test',
        passwordHash: '$2b$10$placeholder',
        fullName: 'QC Inspector Test',
        role: 'QC_PERSON',
        initials: 'QIT',
        isActive: true
      }
    })

    const prodCoordinator = await prisma.user.upsert({
      where: { username: 'prod_coordinator' },
      update: {},
      create: {
        username: 'prod_coordinator',
        email: 'prod@torvan.test',
        passwordHash: '$2b$10$placeholder',
        fullName: 'Production Coordinator Test',
        role: 'PRODUCTION_COORDINATOR',
        initials: 'PCT',
        isActive: true
      }
    })

    console.log('✅ Created test users')

    // Test Order 1: Ready for Pre-QC
    const testOrder1 = await prisma.order.create({
      data: {
        poNumber: 'QC-TEST-001',
        buildNumbers: ['QC-BUILD-001'],
        customerName: 'QC Test Hospital',
        projectName: 'Pre-QC Test',
        salesPerson: 'Test Sales',
        wantDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: 'Test order for Pre-QC inspection',
        language: 'EN',
        orderStatus: 'READY_FOR_PRE_QC',
        createdById: prodCoordinator.id
      }
    })

    // Test Order 2: Ready for Final QC
    const testOrder2 = await prisma.order.create({
      data: {
        poNumber: 'QC-TEST-002',
        buildNumbers: ['QC-BUILD-002'],
        customerName: 'Final QC Test Center',
        projectName: 'Final QC Test',
        salesPerson: 'Test Sales',
        wantDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        notes: 'Test order for Final QC inspection',
        language: 'EN',
        orderStatus: 'READY_FOR_FINAL_QC',
        createdById: prodCoordinator.id
      }
    })

    // Test Order 3: Ready for Production (for Production Check testing)
    const testOrder3 = await prisma.order.create({
      data: {
        poNumber: 'QC-TEST-003',
        buildNumbers: ['QC-BUILD-003'],
        customerName: 'Production QC Test Lab',
        projectName: 'Production Check Test',
        salesPerson: 'Test Sales',
        wantDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        notes: 'Test order for Production QC inspection',
        language: 'EN',
        orderStatus: 'READY_FOR_PRODUCTION',
        createdById: prodCoordinator.id
      }
    })

    console.log('✅ Created test orders for QC testing')

    // Create some basic configurations to test conditional logic
    await prisma.sinkConfiguration.create({
      data: {
        orderId: testOrder1.id,
        buildNumber: 'QC-BUILD-001',
        sinkModelId: 'T2-B1',
        width: 48,
        length: 60,
        pegboard: true,
        pegboardTypeId: 'PERF',
        pegboardColorId: 'GREEN'
      }
    })

    await prisma.basinConfiguration.create({
      data: {
        orderId: testOrder1.id,
        buildNumber: 'QC-BUILD-001',
        basinTypeId: 'E-DRAIN-20X20X8',
        basinCount: 1,
        addonIds: ['P-TRAP', 'BASIN-LIGHT']
      }
    })

    await prisma.sinkConfiguration.create({
      data: {
        orderId: testOrder2.id,
        buildNumber: 'QC-BUILD-002',
        sinkModelId: 'T2-B2',
        width: 60,
        length: 84,
        pegboard: false // No pegboard for N/A testing
      }
    })

    await prisma.basinConfiguration.create({
      data: {
        orderId: testOrder2.id,
        buildNumber: 'QC-BUILD-002',
        basinTypeId: 'E-SINK-24X20X10',
        basinCount: 1,
        addonIds: ['P-TRAP', 'DOSING-PORT', 'TEMP-SENSOR']
      }
    })

    console.log('✅ Created basic configurations for conditional logic testing')

    console.log('\n🎉 Successfully created QC test orders!')
    console.log('\n📊 Test Orders Summary:')
    console.log(`   • ${testOrder1.poNumber}: Ready for Pre-QC (E-Drain, with pegboard)`)
    console.log(`   • ${testOrder2.poNumber}: Ready for Final QC (E-Sink, no pegboard)`)
    console.log(`   • ${testOrder3.poNumber}: Ready for Production Check`)
    
    console.log('\n👥 Test Users:')
    console.log(`   • QC Inspector: ${qcUser.username}`)
    console.log(`   • Production Coordinator: ${prodCoordinator.username}`)
    
    console.log('\n🧪 Test Scenarios:')
    console.log('   • Pre-Production Check workflow')
    console.log('   • Final Quality Check workflow')
    console.log('   • Production Check workflow')
    console.log('   • Conditional logic (pegboard vs no pegboard)')
    console.log('   • Basin type logic (E-Drain vs E-Sink)')

    return {
      testOrders: [testOrder1, testOrder2, testOrder3],
      testUsers: [qcUser, prodCoordinator]
    }

  } catch (error) {
    console.error('❌ Error creating QC test orders:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  createSimpleQCTests()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = { createSimpleQCTests }