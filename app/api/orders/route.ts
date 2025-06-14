import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { generateBOMForOrder } from '@/lib/bomService.native'

const prisma = new PrismaClient()

// Validation schemas
const CustomerInfoSchema = z.object({
  poNumber: z.string().min(1, 'PO Number is required'),
  customerName: z.string().min(1, 'Customer Name is required'),
  projectName: z.string().optional(),
  salesPerson: z.string().min(1, 'Sales Person is required'),
  wantDate: z.union([
    z.string().transform((str) => new Date(str)),
    z.date()
  ]),
  language: z.string().transform((lang) => {
    if (lang === 'English' || lang === 'EN') return 'EN'
    if (lang === 'French' || lang === 'FR') return 'FR'
    if (lang === 'Spanish' || lang === 'ES') return 'ES'
    return 'EN' // default
  }),
  notes: z.string().optional()
})

const BasinConfigurationSchema = z.object({
  basinTypeId: z.string().optional(),
  basinType: z.string().optional(),  // Allow user-friendly basin type from UI
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
  sinkModelId: z.string().min(1, 'Sink model is required'),
  sinkWidth: z.number().optional(),
  sinkLength: z.number().min(48, 'Sink length must be at least 48 inches').optional(),
  width: z.number().min(1, 'Width is required when specified').optional(),
  length: z.number().min(48, 'Length must be at least 48 inches when specified').optional(),
  legsTypeId: z.string().min(1, 'Legs type is required').optional(),
  legTypeId: z.string().optional(),
  feetTypeId: z.string().min(1, 'Feet type is required').optional(),
  pegboard: z.boolean().optional(),
  pegboardTypeId: z.string().optional(),
  pegboardType: z.string().optional(),
  pegboardColor: z.string().optional(),
  pegboardColorId: z.string().optional(),
  pegboardSizePartNumber: z.string().optional(),
  specificPegboardKitId: z.string().optional(),
  drawersAndCompartments: z.array(z.string()).optional(),
  workflowDirection: z.enum(['LEFT_TO_RIGHT', 'RIGHT_TO_LEFT']).optional(),
  basins: z.array(BasinConfigurationSchema).min(1, 'At least one basin configuration is required'),
  faucet: FaucetConfigurationSchema.optional(),
  faucets: z.array(FaucetConfigurationSchema).optional(),
  sprayer: SprayerConfigurationSchema.optional(),
  sprayers: z.array(SprayerItemSchema).optional(),
  controlBoxId: z.string().nullable().optional()
}).refine((data) => {
  // Ensure at least one dimension is provided
  if (!data.width && !data.length && !data.sinkWidth && !data.sinkLength) {
    return false;
  }
  return true;
}, {
  message: "At least one dimension (width, length, sinkWidth, or sinkLength) must be provided",
  path: ["dimensions"]
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
}).refine((data) => {
  // Ensure all build numbers have configurations
  const configurationKeys = Object.keys(data.configurations);
  const missingConfigurations = data.sinkSelection.buildNumbers.filter(
    buildNumber => !configurationKeys.includes(buildNumber)
  );
  
  if (missingConfigurations.length > 0) {
    return false;
  }
  
  return true;
}, {
  message: "All build numbers must have corresponding sink configurations",
  path: ["configurations"]
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
        language: customerInfo.language,
        createdById: user.id
      }
    })

    // Transform basin type IDs from user-friendly to assembly IDs
    const basinTypeMapping: Record<string, string> = {
      'E_DRAIN': 'T2-BSN-EDR-KIT',
      'E_SINK': 'T2-BSN-ESK-KIT', 
      'E_SINK_DI': 'T2-BSN-ESK-DI-KIT'
    }

    // Create basin configurations - ONE per build number
    const basinConfigs = []
    for (const [buildNumber, config] of Object.entries(configurations)) {
      if (config.basins && config.basins.length > 0) {
        // For multiple basins, we need to aggregate the data
        // Since the schema only supports one basin configuration per build,
        // we'll use the first basin's data and store basin count
        const firstBasin = config.basins[0]
        const totalBasinCount = config.basins.length
        
        // Transform basin type ID if needed
        let basinTypeId = firstBasin.basinTypeId || ''
        if (firstBasin.basinType && !basinTypeId) {
          basinTypeId = basinTypeMapping[firstBasin.basinType] || firstBasin.basinType
        } else if (basinTypeId && basinTypeMapping[basinTypeId]) {
          basinTypeId = basinTypeMapping[basinTypeId]
        }
        
        // Collect all addon IDs from all basins
        const allAddonIds = config.basins.flatMap(basin => basin.addonIds || [])
        
        basinConfigs.push({
          buildNumber,
          orderId: order.id,
          basinTypeId: basinTypeId,
          basinSizePartNumber: firstBasin.basinSizePartNumber || '',
          basinCount: totalBasinCount,
          addonIds: allAddonIds,
          customDepth: firstBasin.customDepth || null,
          customLength: firstBasin.customLength || null,
          customWidth: firstBasin.customWidth || null
        })
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

    const transformedConfigurations = Object.entries(configurations).reduce((acc, [buildNumber, config]) => {
      const transformedConfig = { ...config }
      
      // Transform basin configurations
      if (config.basins && config.basins.length > 0) {
        transformedConfig.basins = config.basins.map(basin => {
          const transformedBasin = { ...basin }
          
          // Map basinType to basinTypeId if needed
          if (basin.basinType && !basin.basinTypeId) {
            transformedBasin.basinTypeId = basinTypeMapping[basin.basinType] || basin.basinType
          }
          
          return transformedBasin
        })
      }
      
      acc[buildNumber] = transformedConfig
      return acc
    }, {} as Record<string, any>)

    // Generate BOM using the service
    const bomResult = await generateBOMForOrder({
      customer: customerInfo,
      configurations: transformedConfigurations,
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
    const customerName = searchParams.get('customerName')
    const buildNumber = searchParams.get('buildNumber')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const dateType = searchParams.get('dateType') || 'createdAt' // createdAt or wantDate

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
      if (customerName) {
        where.customerName = {
          contains: customerName,
          mode: 'insensitive'
        }
      }
      if (buildNumber) {
        where.buildNumbers = {
          has: buildNumber
        }
      }
      if (dateFrom || dateTo) {
        where[dateType] = {}
        if (dateFrom) {
          where[dateType].gte = new Date(dateFrom)
        }
        if (dateTo) {
          // Add 23:59:59 to include the entire end date
          const endDate = new Date(dateTo)
          endDate.setHours(23, 59, 59, 999)
          where[dateType].lte = endDate
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

    // Apply common search filters for all non-admin, non-production coordinator roles
    if (user.role !== 'ADMIN' && user.role !== 'PRODUCTION_COORDINATOR') {
      if (customerName) {
        where.customerName = {
          contains: customerName,
          mode: 'insensitive'
        }
      }
      if (buildNumber) {
        where.buildNumbers = {
          has: buildNumber
        }
      }
      if (dateFrom || dateTo) {
        where[dateType] = {}
        if (dateFrom) {
          where[dateType].gte = new Date(dateFrom)
        }
        if (dateTo) {
          const endDate = new Date(dateTo)
          endDate.setHours(23, 59, 59, 999)
          where[dateType].lte = endDate
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
