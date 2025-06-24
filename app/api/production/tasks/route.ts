import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'
import { getOrderSingleSourceOfTruth } from '@/lib/orderSingleSourceOfTruth'

const CreateTaskSchema = z.object({
  orderId: z.string(),
  buildNumber: z.string().optional(),
  taskId: z.string(),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  estimatedTime: z.number().min(1)
})

const UpdateTaskSchema = z.object({
  completed: z.boolean().optional(),
  actualTime: z.number().min(0).optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional()
})

const BulkCreateTasksSchema = z.object({
  orderId: z.string(),
  buildNumber: z.string().optional(),
  generateFromConfig: z.boolean().optional()
})

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const buildNumber = searchParams.get('buildNumber')
    const category = searchParams.get('category')
    const completed = searchParams.get('completed')

    let where: any = {}

    if (orderId) {
      where.orderId = orderId
    }

    if (buildNumber) {
      where.buildNumber = buildNumber
    }

    if (category) {
      where.category = category
    }

    if (completed !== null) {
      where.completed = completed === 'true'
    }

    // Role-based filtering
    if (user.role === 'ASSEMBLER') {
      // Assemblers can see tasks for orders in production
      where.order = {
        orderStatus: {
          in: ['READY_FOR_PRODUCTION', 'TESTING_COMPLETE']
        }
      }
    }

    const tasks = await prisma.productionTask.findMany({
      where,
      include: {
        order: {
          select: {
            poNumber: true,
            customerName: true,
            orderStatus: true,
            wantDate: true
          }
        },
        completer: {
          select: {
            fullName: true,
            initials: true
          }
        }
      },
      orderBy: [
        { completed: 'asc' },
        { category: 'asc' },
        { estimatedTime: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: tasks
    })

  } catch (error) {
    console.error('Error fetching production tasks:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions
    if (!['ASSEMBLER', 'PRODUCTION_COORDINATOR', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to create production tasks' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Check if this is a bulk create request
    if (body.generateFromConfig) {
      return handleBulkCreateTasks(body, user)
    }

    const validatedData = CreateTaskSchema.parse(body)

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }

    // Create production task
    const task = await prisma.productionTask.create({
      data: {
        orderId: validatedData.orderId,
        buildNumber: validatedData.buildNumber || null,
        taskId: validatedData.taskId,
        category: validatedData.category,
        title: validatedData.title,
        description: validatedData.description,
        estimatedTime: validatedData.estimatedTime,
        completed: false,
        photos: [],
        notes: null
      },
      include: {
        order: {
          select: {
            poNumber: true,
            customerName: true,
            orderStatus: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: task,
      message: 'Production task created successfully'
    })

  } catch (error) {
    console.error('Error creating production task:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle bulk task creation from order configuration
async function handleBulkCreateTasks(body: any, user: any) {
  const validatedData = BulkCreateTasksSchema.parse(body)

  // Get order configuration
  let orderConfig: any
  try {
    orderConfig = await getOrderSingleSourceOfTruth(validatedData.orderId)
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Could not load order configuration for task generation' },
      { status: 400 }
    )
  }

  // Generate tasks based on configuration
  const tasks = generateTasksFromConfiguration(orderConfig, validatedData.buildNumber)

  // Create tasks in bulk
  const createdTasks = []
  for (const taskData of tasks) {
    try {
      const task = await prisma.productionTask.create({
        data: {
          orderId: validatedData.orderId,
          buildNumber: validatedData.buildNumber || null,
          taskId: taskData.taskId,
          category: taskData.category,
          title: taskData.title,
          description: taskData.description,
          estimatedTime: taskData.estimatedTime,
          completed: false,
          photos: [],
          notes: null
        }
      })
      createdTasks.push(task)
    } catch (error) {
      console.error('Error creating task:', taskData.title, error)
      // Continue with other tasks
    }
  }

  return NextResponse.json({
    success: true,
    data: createdTasks,
    message: `${createdTasks.length} production tasks generated successfully`
  })
}

// Generate tasks from order configuration
function generateTasksFromConfiguration(orderConfig: any, buildNumber?: string): any[] {
  const tasks: any[] = []
  
  if (!orderConfig?.configuration) {
    return tasks
  }

  const config = orderConfig.configuration
  let taskCounter = 1

  // Sink body tasks
  tasks.push({
    taskId: `SINK_${taskCounter++}`,
    category: 'sink_body',
    title: 'Assemble sink frame',
    description: `Assemble main sink frame structure for ${config.sinkModel}`,
    estimatedTime: 180 // 3 hours
  })

  tasks.push({
    taskId: `SINK_${taskCounter++}`,
    category: 'sink_body',
    title: 'Install support legs',
    description: `Install and adjust ${config.structuralComponents?.legs?.name || 'height adjustable legs'}`,
    estimatedTime: 60 // 1 hour
  })

  // Basin installation tasks
  if (config.basins?.length > 0) {
    config.basins.forEach((basin: any, index: number) => {
      tasks.push({
        taskId: `BASIN_${taskCounter++}`,
        category: 'basin',
        title: `Install basin ${index + 1}`,
        description: `Install and align ${basin.type} basin at position ${basin.position}`,
        estimatedTime: 90 // 1.5 hours
      })
    })
  }

  // Faucet installation tasks
  if (config.faucets?.length > 0) {
    config.faucets.forEach((faucet: any, index: number) => {
      tasks.push({
        taskId: `FAUCET_${taskCounter++}`,
        category: 'faucet',
        title: `Install faucet ${index + 1}`,
        description: `Install faucet system with quantity ${faucet.quantity}`,
        estimatedTime: 45 // 45 minutes
      })
    })
  }

  // Sprayer installation tasks
  if (config.sprayers?.length > 0) {
    config.sprayers.forEach((sprayer: any, index: number) => {
      tasks.push({
        taskId: `SPRAYER_${taskCounter++}`,
        category: 'accessory',
        title: `Install sprayer system ${index + 1}`,
        description: `Install sprayer at ${sprayer.location} location`,
        estimatedTime: 30 // 30 minutes
      })
    })
  }

  // Pegboard installation
  if (config.pegboard?.enabled) {
    tasks.push({
      taskId: `PEGBOARD_${taskCounter++}`,
      category: 'accessory',
      title: 'Install pegboard system',
      description: `Install ${config.pegboard.type} pegboard system`,
      estimatedTime: 60 // 1 hour
    })
  }

  // Control system tasks
  tasks.push({
    taskId: `CONTROL_${taskCounter++}`,
    category: 'control_system',
    title: 'Install control box',
    description: 'Install and wire electronic control system',
    estimatedTime: 120 // 2 hours
  })

  tasks.push({
    taskId: `CONTROL_${taskCounter++}`,
    category: 'control_system',
    title: 'Test all electrical systems',
    description: 'Verify all electrical connections and functionality',
    estimatedTime: 45 // 45 minutes
  })

  // Packaging tasks
  tasks.push({
    taskId: `PACKAGE_${taskCounter++}`,
    category: 'packaging',
    title: 'Final cleaning and inspection',
    description: 'Complete final cleaning and quality inspection',
    estimatedTime: 60 // 1 hour
  })

  tasks.push({
    taskId: `PACKAGE_${taskCounter++}`,
    category: 'packaging',
    title: 'Apply protective materials',
    description: 'Apply protective wrapping and prepare for shipping',
    estimatedTime: 30 // 30 minutes
  })

  return tasks
}