import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { generateBOMForOrder } from '@/src/services/bomService'

const prisma = new PrismaClient()

// Validation schemas
const CustomerInfoSchema = z.object({
  poNumber: z.string().min(1, 'PO Number is required'),
  customerName: z.string().min(1, 'Customer Name is required'),
  projectName: z.string().optional(),
  salesPerson: z.string().min(1, 'Sales Person is required'),
  wantDate: z.string().transform((str) => new Date(str)),
  language: z.enum(['EN', 'FR', 'ES']),
  notes: z.string().optional()
})

const BasinConfigurationSchema = z.object({
  basinTypeId: z.string().optional(),
  basinSizePartNumber: z.string().optional(),
  addonIds: z.array(z.string()).optional()
})

const FaucetConfigurationSchema = z.object({
  faucetTypeId: z.string().optional(),
  quantity: z.number().optional()
})

const SprayerConfigurationSchema = z.object({
  hasSprayerSystem: z.boolean(),
  sprayerTypeIds: z.array(z.string()).optional()
})

const SprayerItemSchema = z.object({
  id: z.string().optional(),
  sprayerTypeId: z.string().optional(),
  location: z.string().optional()
})

const SinkConfigurationSchema = z.object({
  sinkModelId: z.string(),
  sinkWidth: z.number().optional(),
  sinkLength: z.number().optional(),
  width: z.number().optional(),
  length: z.number().optional(),
  legsTypeId: z.string().optional(),
  legTypeId: z.string().optional(),
  feetTypeId: z.string().optional(),
  pegboard: z.boolean().optional(),
  pegboardTypeId: z.string().optional(),
  pegboardType: z.string().optional(),
  pegboardColor: z.string().optional(),
  pegboardColorId: z.string().optional(),
  pegboardSizePartNumber: z.string().optional(),
  specificPegboardKitId: z.string().optional(),
  drawersAndCompartments: z.array(z.string()).optional(),
  workflowDirection: z.enum(['LEFT_TO_RIGHT', 'RIGHT_TO_LEFT']).optional(),
  basins: z.array(BasinConfigurationSchema).default([]),
  faucet: FaucetConfigurationSchema.optional(),
  faucets: z.array(FaucetConfigurationSchema).optional(),
  sprayer: SprayerConfigurationSchema.optional(),
  sprayers: z.array(SprayerItemSchema).optional(),
  controlBoxId: z.string().nullable().optional()
})

const SelectedAccessorySchema = z.object({
  assemblyId: z.string(),
  quantity: z.number().min(1)
})

const SinkSelectionSchema = z.object({
  sinkModelId: z.string(),
  quantity: z.number().min(1),
  buildNumbers: z.array(z.string())
})

const OrderCreateSchema = z.object({
  customerInfo: CustomerInfoSchema,
  sinkSelection: SinkSelectionSchema,
  configurations: z.record(z.string(), SinkConfigurationSchema),
  accessories: z.record(z.string(), z.array(SelectedAccessorySchema))
})

// Use the centralized auth utility
import { getAuthUser } from '@/lib/auth'

// Helper function to save BOM items recursively
async function saveBomItemsRecursive(
  tx: any, 
  bomItems: any[], 
  bomId: string, 
  parentId: string | null = null
): Promise<void> {
  for (const item of bomItems) {
    const bomItem = await tx.bomItem.create({
      data: {
        bomId: bomId,
        partIdOrAssemblyId: item.id,
        name: item.name,
        quantity: item.quantity,
        itemType: item.type || 'ASSEMBLY',
        category: item.category || 'SYSTEM',
        isCustom: item.isPlaceholder || false,
        parentId: parentId
      }
    })

    // Recursively save child components if they exist
    if (item.components && item.components.length > 0) {
      await saveBomItemsRecursive(tx, item.components, bomId, bomItem.id)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user using centralized utility
    const user = await getAuthUser()
    
    console.log('Auth user:', user) // Debug log
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = OrderCreateSchema.parse(body)

    const { customerInfo, sinkSelection, configurations, accessories } = validatedData

    // Check if PO number already exists
    const existingOrder = await prisma.order.findUnique({
      where: { poNumber: customerInfo.poNumber }
    })

    if (existingOrder) {
      return NextResponse.json(
        { success: false, message: 'PO Number already exists' },
        { status: 400 }
      )
    }

    // Create the main order
    console.log('Creating order with userId:', user.id) // Debug log
    
    const order = await prisma.order.create({
      data: {
        poNumber: customerInfo.poNumber,
        buildNumbers: sinkSelection.buildNumbers,
        customerName: customerInfo.customerName,
        projectName: customerInfo.projectName || null,
        salesPerson: customerInfo.salesPerson,
        wantDate: customerInfo.wantDate,
        notes: customerInfo.notes || null,
        language: customerInfo.language === 'English' ? 'EN' : 
                 customerInfo.language === 'French' ? 'FR' : 'ES',
        createdById: user.id
      }
    })

    // Create basin configurations
    const basinConfigs = []
    for (const [buildNumber, config] of Object.entries(configurations)) {
      if (config.basins && config.basins.length > 0) {
        for (const basin of config.basins) {
          basinConfigs.push({
            buildNumber,
            orderId: order.id,
            basinTypeId: basin.basinTypeId || '',
            basinSizePartNumber: basin.basinSizePartNumber,
            basinCount: basin.addonIds?.length || 1,
            addonIds: basin.addonIds || []
          })
        }
      }
    }

    if (basinConfigs.length > 0) {
      await prisma.basinConfiguration.createMany({
        data: basinConfigs
      })
    }

    // Create faucet configurations
    const faucetConfigs = []
    for (const [buildNumber, config] of Object.entries(configurations)) {
      // Handle new faucets array format
      if (config.faucets && config.faucets.length > 0) {
        for (const faucet of config.faucets) {
          if (faucet.faucetTypeId) {
            faucetConfigs.push({
              buildNumber,
              orderId: order.id,
              faucetTypeId: faucet.faucetTypeId,
              faucetQuantity: 1,
              faucetPlacement: faucet.placement || 'Center'
            })
          }
        }
      } else if (config.faucet?.faucetTypeId) {
        // Handle legacy single faucet format
        faucetConfigs.push({
          buildNumber,
          orderId: order.id,
          faucetTypeId: config.faucet.faucetTypeId,
          faucetQuantity: config.faucet.quantity || 1,
          faucetPlacement: 'Center' // Default placement
        })
      }
    }

    if (faucetConfigs.length > 0) {
      await prisma.faucetConfiguration.createMany({
        data: faucetConfigs
      })
    }

    // Create sprayer configurations
    const sprayerConfigs = []
    for (const [buildNumber, config] of Object.entries(configurations)) {
      // Handle new sprayers array format
      if (config.sprayers && config.sprayers.length > 0) {
        const sprayerTypeIds = config.sprayers
          .map((s: any) => s.sprayerTypeId)
          .filter((id: string) => id)
        const sprayerLocations = config.sprayers
          .map((s: any) => s.location || 'Center')
        
        sprayerConfigs.push({
          buildNumber,
          orderId: order.id,
          hasSpray: true,
          sprayerTypeIds,
          sprayerQuantity: sprayerTypeIds.length,
          sprayerLocations
        })
      } else if (config.sprayer) {
        // Handle legacy single sprayer format
        sprayerConfigs.push({
          buildNumber,
          orderId: order.id,
          hasSpray: config.sprayer.hasSprayerSystem,
          sprayerTypeIds: config.sprayer.sprayerTypeIds || [],
          sprayerQuantity: config.sprayer.sprayerTypeIds?.length || 0,
          sprayerLocations: config.sprayer.sprayerTypeIds?.map(() => 'Center') || []
        })
      }
    }

    if (sprayerConfigs.length > 0) {
      await prisma.sprayerConfiguration.createMany({
        data: sprayerConfigs
      })
    }

    // Create selected accessories
    const accessoryItems = []
    for (const [buildNumber, buildAccessories] of Object.entries(accessories)) {
      if (buildAccessories && buildAccessories.length > 0) {
        for (const accessory of buildAccessories) {
          accessoryItems.push({
            buildNumber,
            orderId: order.id,
            assemblyId: accessory.assemblyId,
            quantity: accessory.quantity
          })
        }
      }
    }

    if (accessoryItems.length > 0) {
      await prisma.selectedAccessory.createMany({
        data: accessoryItems
      })
    }

    // Create sink configurations
    const sinkConfigs = []
    for (const [buildNumber, config] of Object.entries(configurations)) {
      if (config) {
        sinkConfigs.push({
          buildNumber,
          orderId: order.id,
          sinkModelId: config.sinkModelId || '',
          width: config.width || null,
          length: config.length || null,
          legsTypeId: config.legsTypeId || null,
          feetTypeId: config.feetTypeId || null,
          workflowDirection: config.workflowDirection || null,
          pegboard: config.pegboard || false,
          pegboardTypeId: config.pegboardTypeId || null,
          pegboardColorId: config.pegboardColorId || null,
          hasDrawersAndCompartments: config.hasDrawersAndCompartments || false,
          drawersAndCompartments: config.drawersAndCompartments || [],
          controlBoxId: config.controlBoxId || null
        })
      }
    }

    if (sinkConfigs.length > 0) {
      await prisma.sinkConfiguration.createMany({
        data: sinkConfigs
      })
    }

    // Generate BOM using the service
    const bomResult = await generateBOMForOrder({
      customer: customerInfo,
      configurations,
      accessories,
      buildNumbers: sinkSelection.buildNumbers
    })

    // Save BOMs to database - Use transaction for data consistency
    await prisma.$transaction(async (tx) => {
      // Create BOMs for each build number if bomResult has data
      if (bomResult && bomResult.length > 0) {
        for (const buildNumber of sinkSelection.buildNumbers) {
          const createdBom = await tx.bom.create({
            data: {
              orderId: order.id,
              buildNumber: buildNumber
            }
          })

          // Save BOM items recursively
          await saveBomItemsRecursive(tx, bomResult, createdBom.id, null)
        }
      }

      return order
    })

    // Create order history log
    await prisma.orderHistoryLog.create({
      data: {
        orderId: order.id,
        userId: user.id,
        action: 'ORDER_CREATED',
        newStatus: 'ORDER_CREATED',
        notes: `Order created with ${sinkSelection.buildNumbers.length} sinks`
      }
    })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      bom: bomResult,
      message: 'Order created successfully'
    })

  } catch (error) {
    console.error('Error creating order:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const poNumber = searchParams.get('poNumber')

    let where: any = {}

    // Implement role-based filtering
    if (user.role === 'ADMIN' || user.role === 'PRODUCTION_COORDINATOR') {
      // Admin and Production Coordinator can see all orders
      if (status) {
        where.orderStatus = status
      }
      if (poNumber) {
        where.poNumber = {
          contains: poNumber,
          mode: 'insensitive'
        }
      }
    } else if (user.role === 'ASSEMBLER') {
      // Assemblers see orders assigned to them or in specific statuses
      where = {
        OR: [
          { currentAssignee: user.id },
          { orderStatus: { in: ['READY_FOR_PRODUCTION', 'TESTING_COMPLETE'] } }
        ]
      }
      if (status) {
        where.orderStatus = status
      }
    } else if (user.role === 'QC_PERSON') {
      // QC sees orders ready for QC
      where.orderStatus = { in: ['READY_FOR_PRE_QC', 'READY_FOR_FINAL_QC'] }
      if (status) {
        where.orderStatus = status
      }
    } else if (user.role === 'PROCUREMENT_SPECIALIST') {
      // Procurement sees orders that need parts management
      where.orderStatus = { in: ['ORDER_CREATED', 'PARTS_SENT_WAITING_ARRIVAL'] }
      if (status) {
        where.orderStatus = status
      }
    } else {
      // Default: user can only see their own orders
      where.createdById = user.id
      if (status) {
        where.orderStatus = status
      }
      if (poNumber) {
        where.poNumber = {
          contains: poNumber,
          mode: 'insensitive'
        }
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        createdBy: {
          select: {
            fullName: true,
            initials: true
          }
        },
        basinConfigurations: true,
        sinkConfigurations: true,
        faucetConfigurations: true,
        sprayerConfigurations: true,
        selectedAccessories: true,
        generatedBoms: {
          include: {
            bomItems: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    const total = await prisma.order.count({ where })

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching orders:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// [Per Coding Prompt Chains v5] To fix linter error for 'jsonwebtoken', run:
// npm install --save-dev @types/jsonwebtoken
