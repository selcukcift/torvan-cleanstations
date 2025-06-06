const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function seedEnhancedModelsWorking() {
  try {
    console.log('🚀 Seeding enhanced models (working version)...')
    
    // Get some users for assignments
    const users = await prisma.user.findMany({ take: 5 })
    if (users.length === 0) {
      throw new Error('No users found for assignments')
    }
    
    console.log('📋 Found users:', users.length)
    
    // 1. Create Work Instructions (skip if exists)
    console.log('📝 Creating work instructions...')
    
    const workInstructionCount = await prisma.workInstruction.count()
    if (workInstructionCount === 0) {
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
            }
          ]
        }
      ]
      
      for (const wiData of workInstructions) {
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
      }
    } else {
      console.log(`ℹ️  Work instructions exist: ${workInstructionCount}`)
    }
    
    // 2. Create Tools
    console.log('🔧 Creating tools...')
    
    const toolCount = await prisma.tool.count()
    if (toolCount === 0) {
      const tools = [
        { id: 'tool-torque-wrench', name: 'Digital Torque Wrench', description: 'Precision torque wrench 20-200 Nm', category: 'POWER_TOOL' },
        { id: 'tool-socket-set', name: 'Socket Set Metric', description: 'Complete metric socket set 8-19mm', category: 'HAND_TOOL' },
        { id: 'tool-level-4ft', name: '4ft Spirit Level', description: 'Precision spirit level for alignment', category: 'MEASURING' },
        { id: 'tool-safety-glasses', name: 'Safety Glasses', description: 'ANSI Z87.1 safety glasses', category: 'SAFETY' }
      ]
      
      for (const toolData of tools) {
        const tool = await prisma.tool.create({ data: toolData })
        console.log(`✅ Created tool: ${tool.name}`)
      }
    } else {
      console.log(`ℹ️  Tools exist: ${toolCount}`)
    }
    
    // 3. Create System Notifications
    console.log('🔔 Creating system notifications...')
    
    const notificationCount = await prisma.systemNotification.count()
    if (notificationCount === 0) {
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
    } else {
      console.log(`ℹ️  Notifications exist: ${notificationCount}`)
    }
    
    // 4. Create sample Orders with Tasks (if no orders exist)
    const orderCount = await prisma.order.count()
    if (orderCount === 0) {
      console.log('📋 Creating sample orders with tasks...')
      
      // Get some parts for the order
      const sampleParts = await prisma.part.findMany({ take: 3 })
      
      if (sampleParts.length > 0) {
        // Create a sample order with required fields
        const sampleOrder = await prisma.order.create({
          data: {
            poNumber: `PO-${Date.now()}`,
            buildNumbers: ['BUILD-001'],
            customerName: 'Sample Medical Center',
            projectName: 'T2 Sink Installation Project',
            salesPerson: 'Sales Rep Demo',
            wantDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            notes: 'Sample order for testing enhanced models',
            orderStatus: 'READY_FOR_PRODUCTION',
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
    } else {
      console.log(`ℹ️  Orders exist: ${orderCount}`)
    }
    
    // 5. Test advanced features
    console.log('\\n🧪 Testing advanced database features...')
    
    // Test task summary view
    const taskStats = await prisma.$queryRaw`SELECT * FROM task_summary_stats`
    console.log('✅ Task summary stats:', taskStats[0])
    
    // Test inventory alerts view  
    const inventoryAlerts = await prisma.$queryRaw`SELECT COUNT(*) as alert_count FROM inventory_alerts`
    console.log('✅ Inventory alerts:', inventoryAlerts[0])
    
    // Test audit log (should have entries from creating data)
    const auditCount = await prisma.auditLog.count()
    console.log('✅ Audit log entries:', auditCount)
    
    // Final status check
    console.log('\\n📊 Final Model Counts:')
    const [wiCount, toolCount2, notifCount, taskCount] = await Promise.all([
      prisma.workInstruction.count(),
      prisma.tool.count(),
      prisma.systemNotification.count(),
      prisma.task.count()
    ])
    
    console.log('Work Instructions:', wiCount)
    console.log('Tools:', toolCount2)
    console.log('System Notifications:', notifCount)
    console.log('Tasks:', taskCount)
    
    console.log('\\n🎉 Enhanced models seeded successfully!')
    console.log('⚠️  Note: InventoryItem seeding skipped due to table constraint issue')
    
  } catch (error) {
    console.error('💥 Error seeding enhanced models:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  seedEnhancedModelsWorking()
    .then(() => {
      console.log('✨ Enhanced seeding complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Enhanced seeding failed:', error)
      process.exit(1)
    })
}

module.exports = { seedEnhancedModelsWorking }