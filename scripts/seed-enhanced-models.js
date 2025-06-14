const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function seedEnhancedModels() {
  try {
    console.log('🚀 Seeding enhanced models...')
    
    // Check if we have basic data
    const [categoryCount, partCount, assemblyCount, userCount] = await Promise.all([
      prisma.category.count(),
      prisma.part.count(),
      prisma.assembly.count(),
      prisma.user.count()
    ])
    
    if (categoryCount === 0 || partCount === 0 || assemblyCount === 0) {
      console.log('⚠️  Basic data not found. Running main seed first...')
      await require('./seed.js')
    }
    
    console.log('📋 Current data: Categories:', categoryCount, 'Parts:', partCount, 'Assemblies:', assemblyCount, 'Users:', userCount)
    
    // Get some users for assignments
    const users = await prisma.user.findMany({ take: 5 })
    if (users.length === 0) {
      throw new Error('No users found for assignments')
    }
    
    // 1. Create Work Instructions
    console.log('📝 Creating work instructions...')
    
    const workInstructions = [
      {
        id: 'wi-t2-basin-assembly',
        title: 'T2 Sink Basin Assembly',
        description: 'Complete assembly instructions for T2 sink basin including mounting and connections',
        estimatedMinutes: 120,
        steps: [
          {
            stepNumber: 1,
            title: 'Prepare Basin Components',
            description: 'Unpack and inspect all basin components, ensure no damage',
            estimatedMinutes: 10,
            images: ['/instructions/basin-prep-1.jpg'],
            checkpoints: ['All components present', 'No visible damage', 'Hardware counted']
          },
          {
            stepNumber: 2,
            title: 'Install Mounting Brackets',
            description: 'Attach mounting brackets to basin underside using provided hardware',
            estimatedMinutes: 20,
            images: ['/instructions/mounting-brackets.jpg'],
            checkpoints: ['Brackets aligned', 'All bolts torqued to spec', 'Level verified']
          },
          {
            stepNumber: 3,
            title: 'Basin Installation',
            description: 'Position basin in frame and secure with mounting hardware',
            estimatedMinutes: 30,
            images: ['/instructions/basin-install.jpg'],
            checkpoints: ['Basin level', 'Secure mounting', 'Proper clearances']
          },
          {
            stepNumber: 4,
            title: 'Plumbing Connections',
            description: 'Connect supply lines and drain assembly',
            estimatedMinutes: 45,
            images: ['/instructions/plumbing.jpg'],
            checkpoints: ['No leaks', 'Proper drainage', 'Supply pressure verified']
          },
          {
            stepNumber: 5,
            title: 'Final Testing',
            description: 'Test all functions and verify proper operation',
            estimatedMinutes: 15,
            images: ['/instructions/testing.jpg'],
            checkpoints: ['Water flow normal', 'Drainage clear', 'No leaks detected']
          }
        ]
      },
      {
        id: 'wi-t2-frame-assembly',
        title: 'T2 Frame Assembly',
        description: 'Assembly instructions for T2 frame structure and support components',
        estimatedMinutes: 90,
        steps: [
          {
            stepNumber: 1,
            title: 'Frame Component Preparation',
            description: 'Sort and prepare all frame components',
            estimatedMinutes: 15,
            images: ['/instructions/frame-prep.jpg'],
            checkpoints: ['Components sorted', 'Hardware organized']
          },
          {
            stepNumber: 2,
            title: 'Main Frame Assembly',
            description: 'Assemble main frame structure',
            estimatedMinutes: 45,
            images: ['/instructions/frame-main.jpg'],
            checkpoints: ['Square and level', 'All joints secure']
          },
          {
            stepNumber: 3,
            title: 'Support Installation',
            description: 'Install support brackets and reinforcements',
            estimatedMinutes: 30,
            images: ['/instructions/frame-support.jpg'],
            checkpoints: ['Supports aligned', 'Load capacity verified']
          }
        ]
      }
    ]
    
    for (const wiData of workInstructions) {
      const existing = await prisma.workInstruction.findUnique({ where: { id: wiData.id } })
      if (!existing) {
        const workInstruction = await prisma.workInstruction.create({
          data: {
            id: wiData.id,
            title: wiData.title,
            description: wiData.description,
            estimatedMinutes: wiData.estimatedMinutes,
            steps: {
              create: wiData.steps.map(step => ({
                stepNumber: step.stepNumber,
                title: step.title,
                description: step.description,
                estimatedMinutes: step.estimatedMinutes,
                images: step.images,
                checkpoints: step.checkpoints
              }))
            }
          }
        })
        console.log(`✅ Created work instruction: ${workInstruction.title}`)
      } else {
        console.log(`ℹ️  Work instruction exists: ${wiData.title}`)
      }
    }
    
    // 2. Create Tools
    console.log('🔧 Creating tools...')
    
    const tools = [
      { id: 'tool-torque-wrench', name: 'Digital Torque Wrench', description: 'Precision torque wrench 20-200 Nm', category: 'POWER_TOOL' },
      { id: 'tool-socket-set', name: 'Socket Set Metric', description: 'Complete metric socket set 8-19mm', category: 'HAND_TOOL' },
      { id: 'tool-level-4ft', name: '4ft Spirit Level', description: 'Precision spirit level for alignment', category: 'MEASURING' },
      { id: 'tool-safety-glasses', name: 'Safety Glasses', description: 'ANSI Z87.1 safety glasses', category: 'SAFETY' },
      { id: 'tool-drill-bits', name: 'HSS Drill Bit Set', description: 'High speed steel drill bits 1-10mm', category: 'HAND_TOOL' },
      { id: 'tool-multimeter', name: 'Digital Multimeter', description: 'Digital multimeter for electrical testing', category: 'MEASURING' }
    ]
    
    for (const toolData of tools) {
      const existing = await prisma.tool.findUnique({ where: { id: toolData.id } })
      if (!existing) {
        const tool = await prisma.tool.create({ data: toolData })
        console.log(`✅ Created tool: ${tool.name}`)
      } else {
        console.log(`ℹ️  Tool exists: ${toolData.name}`)
      }
    }
    
    // 3. Create sample Inventory Items
    console.log('📦 Creating inventory items...')
    
    // Get some parts for inventory
    const sampleParts = await prisma.part.findMany({ take: 10 })
    
    for (const part of sampleParts) {
      const existing = await prisma.inventoryItem.findFirst({ 
        where: { partId: part.partId, location: 'MAIN_WAREHOUSE' } 
      })
      
      if (!existing) {
        const quantityOnHand = Math.floor(Math.random() * 100) + 10
        const quantityReserved = Math.floor(Math.random() * 5)
        
        const inventoryItem = await prisma.inventoryItem.create({
          data: {
            partId: part.partId,
            location: 'MAIN_WAREHOUSE',
            quantityOnHand,
            quantityReserved,
            quantityAvailable: quantityOnHand - quantityReserved, // Calculate manually
            reorderPoint: Math.floor(Math.random() * 20) + 5,
            maxStock: Math.floor(Math.random() * 200) + 100,
            updatedById: users[0].id
          }
        })
        console.log(`✅ Created inventory for: ${part.name}`)
      }
    }
    
    // 4. Create sample System Notifications
    console.log('🔔 Creating system notifications...')
    
    const notifications = [
      {
        type: 'SYSTEM_ALERT',
        title: 'System Maintenance Scheduled',
        message: 'System maintenance is scheduled for tonight at 2 AM EST. Expected downtime: 30 minutes.',
        priority: 'NORMAL',
        userId: null // System-wide notification
      },
      {
        type: 'INVENTORY_LOW',
        title: 'Low Inventory Alert',
        message: 'Several parts are below reorder point. Please review inventory status.',
        priority: 'HIGH',
        userId: users.find(u => u.role === 'PROCUREMENT_SPECIALIST')?.id
      },
      {
        type: 'ORDER_STATUS_CHANGE',
        title: 'Orders Pending QC',
        message: 'Multiple orders are ready for quality control inspection.',
        priority: 'NORMAL',
        userId: users.find(u => u.role === 'QC_PERSON')?.id
      }
    ]
    
    for (const notifData of notifications) {
      const notification = await prisma.systemNotification.create({
        data: notifData
      })
      console.log(`✅ Created notification: ${notification.title}`)
    }
    
    // 5. Create sample Orders with Tasks (if no orders exist)
    const orderCount = await prisma.order.count()
    if (orderCount === 0) {
      console.log('📋 Creating sample orders with tasks...')
      
      // Create a sample order
      const sampleOrder = await prisma.order.create({
        data: {
          customerName: 'Sample Medical Center',
          poNumber: 'PO-2025-001',
          buildNumbers: ['BN-2025-001'],
          salesPerson: 'John Doe',
          wantDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          notes: 'Sample order for testing',
          orderStatus: 'ORDER_CREATED',
          createdById: users[0].id
        }
      })
      
      // Create tasks for the order
      const workInstruction = await prisma.workInstruction.findFirst()
      
      const tasks = [
        {
          title: 'Basin Assembly',
          description: 'Assemble main basin component with mounting hardware',
          status: 'PENDING',
          priority: 'HIGH',
          estimatedMinutes: 120,
          workInstructionId: workInstruction?.id,
          assignedToId: users.find(u => u.role === 'ASSEMBLER')?.id
        },
        {
          title: 'Frame Preparation',
          description: 'Prepare and pre-assemble frame components',
          status: 'PENDING',
          priority: 'MEDIUM',
          estimatedMinutes: 90,
          assignedToId: users.find(u => u.role === 'ASSEMBLER')?.id
        },
        {
          title: 'Quality Inspection',
          description: 'Final quality control inspection',
          status: 'PENDING',
          priority: 'HIGH',
          estimatedMinutes: 30,
          assignedToId: users.find(u => u.role === 'QC_PERSON')?.id
        }
      ]
      
      for (const taskData of tasks) {
        const task = await prisma.task.create({
          data: {
            ...taskData,
            orderId: sampleOrder.id
          }
        })
        console.log(`✅ Created task: ${task.title}`)
      }
      
      console.log(`✅ Created sample order: ${sampleOrder.customerName}`)
    }
    
    // 6. Test advanced features
    console.log('\n🧪 Testing advanced database features...')
    
    // Skip view tests as they don't exist in current schema
    // const taskStats = await prisma.$queryRaw`SELECT * FROM task_summary_stats`
    // console.log('✅ Task summary stats:', taskStats[0])
    
    // const inventoryAlerts = await prisma.$queryRaw`SELECT COUNT(*) as alert_count FROM inventory_alerts`
    // console.log('✅ Inventory alerts:', inventoryAlerts[0])
    
    // Test audit log (should have entries from creating data)
    const auditCount = await prisma.auditLog.count()
    console.log('✅ Audit log entries:', auditCount)
    
    console.log('\n🎉 Enhanced models seeded successfully!')
    
  } catch (error) {
    console.error('💥 Error seeding enhanced models:', error)
    throw error
  } finally {
    // Don't disconnect here when called from main seed script
    if (require.main === module) {
      await prisma.$disconnect()
    }
  }
}

// Run if called directly
if (require.main === module) {
  seedEnhancedModels()
    .then(() => {
      console.log('✨ Enhanced seeding complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Enhanced seeding failed:', error)
      process.exit(1)
    })
}

module.exports = { seedEnhancedModels }