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
          notes: null,
          // Testing task specific fields (will be null for production tasks)
          testType: taskData.testType || null,
          expectedResult: taskData.expectedResult || null,
          unit: taskData.unit || null,
          minValue: taskData.minValue || null,
          maxValue: taskData.maxValue || null,
          basinNumber: taskData.basinNumber || null
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
  
  // Generate production tasks from CLP.T2.001.V01 Sections 2 & 3
  const productionTasks = generateProductionTasks(config)
  tasks.push(...productionTasks)
  
  // Generate testing tasks from CLT.T2.001.V01
  const testingTasks = generateTestingTasks(config)
  tasks.push(...testingTasks)

  return tasks
}

// Generate production tasks from CLP.T2.001.V01 Sections 2 & 3
function generateProductionTasks(config: any): any[] {
  const tasks: any[] = []
  let taskCounter = 1

  // SECTION 2: SINK PRODUCTION CHECK
  
  // Overhead LED Light (conditional - only if pegboard exists)
  if (config.pegboard?.enabled) {
    tasks.push({
      taskId: `PROD_${taskCounter++}`,
      category: 'lighting',
      title: 'Install overhead LED light bracket',
      description: 'Mount sink overhead LED light bracket with plastic washers (pegboard installation)',
      estimatedTime: 30
    })
    
    tasks.push({
      taskId: `PROD_${taskCounter++}`,
      category: 'lighting',
      title: 'Install overhead LED light button',
      description: 'Install lasered overhead LED light button',
      estimatedTime: 15
    })
  }

  // Standard basin faucets
  if (config.faucets?.length > 0) {
    tasks.push({
      taskId: `PROD_${taskCounter++}`,
      category: 'faucet',
      title: 'Install standard basin faucets',
      description: 'Install all standard basin faucets according to configuration',
      estimatedTime: 45
    })
  }

  // Lifter control system
  tasks.push({
    taskId: `PROD_${taskCounter++}`,
    category: 'control_system',
    title: 'Install lifter control button',
    description: 'Install lifter control button (DPF1K Non-Programmable or DP1C Programmable)',
    estimatedTime: 30
  })

  tasks.push({
    taskId: `PROD_${taskCounter++}`,
    category: 'control_system',
    title: 'Install lifter controller',
    description: 'Install lifter controller underneath the sink',
    estimatedTime: 45
  })

  // Branding and accessories
  tasks.push({
    taskId: `PROD_${taskCounter++}`,
    category: 'finishing',
    title: 'Attach Torvan logo',
    description: 'Attach Torvan logo on left side of sink',
    estimatedTime: 10
  })

  tasks.push({
    taskId: `PROD_${taskCounter++}`,
    category: 'control_system',
    title: 'Install power bar',
    description: 'Install power bar for electrical connections',
    estimatedTime: 20
  })

  // Control boxes (conditional based on basin types)
  const hasEDrain = config.basins?.some((basin: any) => basin.type === 'E-Drain')
  const hasESink = config.basins?.some((basin: any) => basin.type === 'E-Sink')
  
  if (hasEDrain || hasESink) {
    tasks.push({
      taskId: `PROD_${taskCounter++}`,
      category: 'control_system',
      title: 'Install control boxes',
      description: `Install necessary control boxes (${hasEDrain ? 'E-Drain' : ''}${hasEDrain && hasESink ? ', ' : ''}${hasESink ? 'E-Sink' : ''})`,
      estimatedTime: 60
    })
  }

  // Cable labeling
  tasks.push({
    taskId: `PROD_${taskCounter++}`,
    category: 'control_system',
    title: 'Label all cables',
    description: 'Label all cables with "D#" or "S#". Overhead light cables labeled L4 & S4',
    estimatedTime: 30
  })

  // Cleaning
  tasks.push({
    taskId: `PROD_${taskCounter++}`,
    category: 'finishing',
    title: 'Clean sink',
    description: 'Clean sink of metal shavings and waste',
    estimatedTime: 20
  })

  // EXTRAS (conditional)
  if (config.accessories?.airGun) {
    tasks.push({
      taskId: `PROD_${taskCounter++}`,
      category: 'accessory',
      title: 'Install air gun components',
      description: 'Install air gun components (BL-4350-01 and BL-5500-07)',
      estimatedTime: 25
    })
  }

  if (config.accessories?.waterGun) {
    tasks.push({
      taskId: `PROD_${taskCounter++}`,
      category: 'accessory',
      title: 'Install water gun components',
      description: 'Install water gun components (BL-4500-02 and BL-4249)',
      estimatedTime: 25
    })
  }

  if (config.accessories?.diFaucet) {
    tasks.push({
      taskId: `PROD_${taskCounter++}`,
      category: 'faucet',
      title: 'Install DI faucet',
      description: 'Install deionized water faucet',
      estimatedTime: 30
    })
  }

  if (config.accessories?.comboBasinFaucet) {
    tasks.push({
      taskId: `PROD_${taskCounter++}`,
      category: 'faucet',
      title: 'Install combo basin faucet',
      description: 'Install combination basin faucet',
      estimatedTime: 35
    })
  }

  // SECTION 3: BASIN PRODUCTION
  
  if (config.basins?.length > 0) {
    config.basins.forEach((basin: any, index: number) => {
      const basinNumber = index + 1
      
      if (basin.type === 'E-Drain') {
        // E-Drain specific tasks
        tasks.push({
          taskId: `BASIN_${basinNumber}_${taskCounter++}`,
          category: 'basin',
          title: `Basin ${basinNumber}: Install bottom-fill mixing valve & faucet`,
          description: `Install bottom-fill mixing valve and faucet for E-Drain basin ${basinNumber}`,
          estimatedTime: 45,
          basinNumber
        })

        tasks.push({
          taskId: `BASIN_${basinNumber}_${taskCounter++}`,
          category: 'basin',
          title: `Basin ${basinNumber}: Install bottom fill assembly`,
          description: `Install complete bottom fill assembly: Mixing Valve [DER-1899-14-CC] → 1/2" Male NPT to 3/4BSPP adapter → Check valve → ½" PEX Adaptor → ½" PEX Piping → Bottom Fill hole`,
          estimatedTime: 60,
          basinNumber
        })

        tasks.push({
          taskId: `BASIN_${basinNumber}_${taskCounter++}`,
          category: 'basin',
          title: `Basin ${basinNumber}: Label hot and cold water pipes`,
          description: `Label pipes as Hot Water and Cold Water for basin ${basinNumber}`,
          estimatedTime: 10,
          basinNumber
        })

        tasks.push({
          taskId: `BASIN_${basinNumber}_${taskCounter++}`,
          category: 'basin',
          title: `Basin ${basinNumber}: Install overflow sensor`,
          description: `Install overflow sensor for E-Drain basin ${basinNumber}`,
          estimatedTime: 25,
          basinNumber
        })
      }
      
      if (basin.type === 'E-Sink') {
        // E-Sink specific tasks
        tasks.push({
          taskId: `BASIN_${basinNumber}_${taskCounter++}`,
          category: 'basin',
          title: `Basin ${basinNumber}: Install mixing valve plate`,
          description: `Install mixing valve plate for E-Sink basin ${basinNumber}`,
          estimatedTime: 30,
          basinNumber
        })

        tasks.push({
          taskId: `BASIN_${basinNumber}_${taskCounter++}`,
          category: 'basin',
          title: `Basin ${basinNumber}: Install emergency stop buttons`,
          description: `Install emergency stop buttons for E-Sink basin ${basinNumber}`,
          estimatedTime: 20,
          basinNumber
        })

        tasks.push({
          taskId: `BASIN_${basinNumber}_${taskCounter++}`,
          category: 'basin',
          title: `Basin ${basinNumber}: Mount E-Sink touchscreen`,
          description: `Mount E-Sink touchscreen onto sink for basin ${basinNumber}`,
          estimatedTime: 25,
          basinNumber
        })

        tasks.push({
          taskId: `BASIN_${basinNumber}_${taskCounter++}`,
          category: 'basin',
          title: `Basin ${basinNumber}: Connect touchscreen to control box`,
          description: `Connect E-Sink touchscreen to E-Sink control box for basin ${basinNumber}`,
          estimatedTime: 20,
          basinNumber
        })

        tasks.push({
          taskId: `BASIN_${basinNumber}_${taskCounter++}`,
          category: 'basin',
          title: `Basin ${basinNumber}: Install overflow sensor`,
          description: `Install overflow sensor for E-Sink basin ${basinNumber}`,
          estimatedTime: 25,
          basinNumber
        })

        tasks.push({
          taskId: `BASIN_${basinNumber}_${taskCounter++}`,
          category: 'basin',
          title: `Basin ${basinNumber}: Install dosing port`,
          description: `Install dosing port on backsplash for basin ${basinNumber}`,
          estimatedTime: 15,
          basinNumber
        })

        tasks.push({
          taskId: `BASIN_${basinNumber}_${taskCounter++}`,
          category: 'basin',
          title: `Basin ${basinNumber}: Install temperature cable gland`,
          description: `Install basin temperature cable gland on backsplash for basin ${basinNumber}`,
          estimatedTime: 15,
          basinNumber
        })
      }
    })
  }

  return tasks
}

// Generate testing tasks from CLT.T2.001.V01
function generateTestingTasks(config: any): any[] {
  const tasks: any[] = []
  let taskCounter = 1

  // Setup tasks
  tasks.push({
    taskId: `TEST_${taskCounter++}`,
    category: 'setup',
    title: 'Set up basin test environment',
    description: 'Install drain assembly, connect drain solenoid, and connect valve plate/bottom fill faucet to hot and cold water lines',
    estimatedTime: 30
  })

  // General sink tests
  tasks.push({
    taskId: `TEST_${taskCounter++}`,
    category: 'general',
    title: 'Test main power connection',
    description: 'Plug sink main power cord into electrical outlet and verify all systems initialize properly',
    estimatedTime: 10,
    testType: 'pass_fail',
    expectedResult: 'E-Drain: All buttons lit, E-Sink: GUI displays on touchscreen(s)'
  })

  tasks.push({
    taskId: `TEST_${taskCounter++}`,
    category: 'general',
    title: 'Test height adjustment - raise',
    description: 'Press height adjustment button to raise sink',
    estimatedTime: 5,
    testType: 'pass_fail',
    expectedResult: 'Sink height increases when pressing up'
  })

  tasks.push({
    taskId: `TEST_${taskCounter++}`,
    category: 'general',
    title: 'Test height adjustment - lower',
    description: 'Press height adjustment button to lower sink',
    estimatedTime: 5,
    testType: 'pass_fail',
    expectedResult: 'Sink height decreases when pressing down'
  })

  // Basin-specific tests
  if (config.basins?.length > 0) {
    config.basins.forEach((basin: any, index: number) => {
      const basinNumber = index + 1
      
      if (basin.type === 'E-Drain') {
        // E-Drain specific tests
        tasks.push({
          taskId: `TEST_EDRAIN_${basinNumber}_${taskCounter++}`,
          category: 'e_drain',
          title: `Basin ${basinNumber}: Test bottom fill`,
          description: `Open bottom fill faucet to fill basin ${basinNumber} below overflow sensor`,
          estimatedTime: 15,
          testType: 'pass_fail',
          expectedResult: 'Water level rises',
          basinNumber
        })

        tasks.push({
          taskId: `TEST_EDRAIN_${basinNumber}_${taskCounter++}`,
          category: 'e_drain',
          title: `Basin ${basinNumber}: Test E-Drain function`,
          description: `Press E-Drain button to drain water until timer ends for basin ${basinNumber}`,
          estimatedTime: 20,
          testType: 'pass_fail',
          expectedResult: 'Water level decreases until basin is empty',
          basinNumber
        })

        tasks.push({
          taskId: `TEST_EDRAIN_${basinNumber}_${taskCounter++}`,
          category: 'e_drain',
          title: `Basin ${basinNumber}: Test overflow sensor activation`,
          description: `Fill basin ${basinNumber} until overflow sensor is activated`,
          estimatedTime: 15,
          testType: 'pass_fail',
          expectedResult: 'Drain opens and water level decreases',
          basinNumber
        })

        tasks.push({
          taskId: `TEST_EDRAIN_${basinNumber}_${taskCounter++}`,
          category: 'e_drain',
          title: `Basin ${basinNumber}: Test overflow sensor deactivation`,
          description: `Wait 10-15 seconds for overflow sensor to deactivate for basin ${basinNumber}`,
          estimatedTime: 20,
          testType: 'pass_fail',
          expectedResult: 'Drain closes',
          basinNumber
        })

        tasks.push({
          taskId: `TEST_EDRAIN_${basinNumber}_${taskCounter++}`,
          category: 'e_drain',
          title: `Basin ${basinNumber}: Test refill after overflow reset`,
          description: `Start filling basin ${basinNumber} again to ensure drain is closed`,
          estimatedTime: 10,
          testType: 'pass_fail',
          expectedResult: 'Water level increases again',
          basinNumber
        })

        // LED tests (conditional)
        if (config.lighting?.overhead) {
          tasks.push({
            taskId: `TEST_EDRAIN_${basinNumber}_${taskCounter++}`,
            category: 'e_drain',
            title: `Basin ${basinNumber}: Test overhead LED light`,
            description: `Press overhead LED light button to cycle through modes and turn off for basin ${basinNumber}`,
            estimatedTime: 10,
            testType: 'pass_fail',
            expectedResult: 'LED light cycles through brightness and turns off',
            basinNumber
          })
        }

        if (config.lighting?.basin) {
          tasks.push({
            taskId: `TEST_EDRAIN_${basinNumber}_${taskCounter++}`,
            category: 'e_drain',
            title: `Basin ${basinNumber}: Test basin light`,
            description: `Press basin light button to turn light on/off for basin ${basinNumber}`,
            estimatedTime: 5,
            testType: 'pass_fail',
            expectedResult: 'Basin light turns on/off',
            basinNumber
          })
        }
      }
      
      if (basin.type === 'E-Sink') {
        // E-Sink calibration tasks
        tasks.push({
          taskId: `TEST_ESINK_${basinNumber}_${taskCounter++}`,
          category: 'calibration',
          title: `Basin ${basinNumber}: Calibrate temperature sensors`,
          description: `Follow temperature calibration procedure for basin ${basinNumber} using calibrated Fluke thermometer`,
          estimatedTime: 45,
          testType: 'measurement',
          expectedResult: 'Temperature calibrated within 2°C',
          unit: '°C',
          minValue: -2,
          maxValue: 2,
          basinNumber
        })

        tasks.push({
          taskId: `TEST_ESINK_${basinNumber}_${taskCounter++}`,
          category: 'calibration',
          title: `Basin ${basinNumber}: Calibrate flow meter`,
          description: `Follow flow meter calibration procedure for basin ${basinNumber} using 40L reference volume`,
          estimatedTime: 30,
          testType: 'measurement',
          expectedResult: 'Flow meter calibrated to 40L',
          unit: 'L',
          minValue: 39,
          maxValue: 41,
          basinNumber
        })

        // E-Sink operational tests
        tasks.push({
          taskId: `TEST_ESINK_${basinNumber}_${taskCounter++}`,
          category: 'e_sink',
          title: `Basin ${basinNumber}: Test fill at 20°C`,
          description: `Set mixing temp to 20°C and test fill function for basin ${basinNumber}`,
          estimatedTime: 20,
          testType: 'pass_fail',
          expectedResult: 'Water flows with no leaks in valve plate or bottom fill assembly',
          basinNumber
        })

        tasks.push({
          taskId: `TEST_ESINK_${basinNumber}_${taskCounter++}`,
          category: 'e_sink',
          title: `Basin ${basinNumber}: Test mixing temperature accuracy at 40°C`,
          description: `Test mixing temperature accuracy at 40°C using calibrated thermometer at bottom-fill location for basin ${basinNumber}`,
          estimatedTime: 25,
          testType: 'measurement',
          expectedResult: 'Within 4°C of target temperature',
          unit: '°C',
          minValue: 36,
          maxValue: 44,
          basinNumber
        })

        tasks.push({
          taskId: `TEST_ESINK_${basinNumber}_${taskCounter++}`,
          category: 'e_sink',
          title: `Basin ${basinNumber}: Test basin temperature accuracy at 40°C`,
          description: `Test basin temperature accuracy at 40°C using calibrated thermometer in basin for basin ${basinNumber}`,
          estimatedTime: 25,
          testType: 'measurement',
          expectedResult: 'Within 2°C of target temperature',
          unit: '°C',
          minValue: 38,
          maxValue: 42,
          basinNumber
        })

        tasks.push({
          taskId: `TEST_ESINK_${basinNumber}_${taskCounter++}`,
          category: 'e_sink',
          title: `Basin ${basinNumber}: Test overflow sensor`,
          description: `Fill basin ${basinNumber} to overflow sensor level`,
          estimatedTime: 15,
          testType: 'pass_fail',
          expectedResult: 'Drain opens and overflow message appears on screen',
          basinNumber
        })

        tasks.push({
          taskId: `TEST_ESINK_${basinNumber}_${taskCounter++}`,
          category: 'e_sink',
          title: `Basin ${basinNumber}: Test overflow recovery`,
          description: `Wait for water level to drop and overflow sensor to reset for basin ${basinNumber}`,
          estimatedTime: 20,
          testType: 'pass_fail',
          expectedResult: 'Overflow message disappears, drain closes, filling continues',
          basinNumber
        })

        // LED tests (conditional)
        if (config.lighting?.overhead) {
          tasks.push({
            taskId: `TEST_ESINK_${basinNumber}_${taskCounter++}`,
            category: 'e_sink',
            title: `Basin ${basinNumber}: Test overhead LED light`,
            description: `Test overhead LED light cycling through modes for basin ${basinNumber}`,
            estimatedTime: 10,
            testType: 'pass_fail',
            expectedResult: 'LED light cycles through brightness and turns off',
            basinNumber
          })
        }

        if (config.lighting?.basin) {
          tasks.push({
            taskId: `TEST_ESINK_${basinNumber}_${taskCounter++}`,
            category: 'e_sink',
            title: `Basin ${basinNumber}: Test basin light via GUI`,
            description: `Test basin light on/off via touchscreen GUI for basin ${basinNumber}`,
            estimatedTime: 5,
            testType: 'pass_fail',
            expectedResult: 'Basin light turns on/off',
            basinNumber
          })
        }

        // Dosing test (conditional)
        if (config.accessories?.dosingPump) {
          tasks.push({
            taskId: `TEST_ESINK_${basinNumber}_${taskCounter++}`,
            category: 'e_sink',
            title: `Basin ${basinNumber}: Test dosing pump`,
            description: `Press dose button on GUI for basin ${basinNumber}`,
            estimatedTime: 15,
            testType: 'pass_fail',
            expectedResult: 'Dosing pump starts spinning and completes automatically',
            basinNumber
          })
        }
      }
    })
  }

  return tasks
}