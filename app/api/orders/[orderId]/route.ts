import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, OrderStatus } from '@prisma/client'
import { getAuthUser, canAccessOrder, checkUserRole } from '@/lib/auth'
import { generateBOMForOrder } from '@/lib/bomService.native'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const BasinConfigSchema = z.object({
  id: z.string().optional(),
  basinType: z.enum(['E_SINK', 'E_SINK_DI', 'E_DRAIN']),
  basinSize: z.string(),
  customWidth: z.number().optional(),
  customLength: z.number().optional(),
  customDepth: z.number().optional(),
  addons: z.array(z.string()).optional()
})

const ConfigurationSchema = z.object({
  sinkModelId: z.string(),
  width: z.number().optional(),
  length: z.number().optional(),
  sinkWidth: z.number(),
  sinkLength: z.number(),
  legTypeId: z.string(),
  feetTypeId: z.string(),
  workflowDirection: z.enum(['LEFT_TO_RIGHT', 'RIGHT_TO_LEFT']),
  hasPegboard: z.boolean(),
  pegboard: z.boolean().optional(),
  pegboardColor: z.string().optional(),
  pegboardType: z.string().optional(),
  pegboardSizeOption: z.string().optional(),
  controlBoxId: z.string().nullable(),
  basins: z.array(BasinConfigSchema),
  faucets: z.array(z.object({
    id: z.string().optional(),
    faucetTypeId: z.string(),
    placement: z.string()
  })).optional(),
  hasSprayer: z.boolean().optional(),
  sprayerTypeIds: z.array(z.string()).optional(),
  sprayerQuantity: z.number().optional(),
  sprayerLocation: z.string().optional()
})

const OrderUpdateSchema = z.object({
  customerInfo: z.object({
    poNumber: z.string(),
    customerName: z.string(),
    projectName: z.string().optional(),
    salesPerson: z.string(),
    wantDate: z.string().nullable(),
    language: z.enum(['EN', 'FR', 'ES']),
    notes: z.string().optional()
  }),
  sinkSelection: z.object({
    sinkFamily: z.string(),
    quantity: z.number(),
    buildNumbers: z.array(z.string())
  }),
  configurations: z.record(z.string(), ConfigurationSchema),
  accessories: z.record(z.string(), z.array(z.object({
    assemblyId: z.string(),
    name: z.string(),
    quantity: z.number()
  })))
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  try {
    // Authenticate user
    const user = await getAuthUser()

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Fetch the order with all required relations
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            initials: true,
            email: true
          }
        },
        associatedDocuments: true,
        generatedBoms: {
          include: {
            bomItems: {
              include: {
                children: {
                  include: {
                    children: true // Support nested hierarchy
                  }
                }
              }
            }
          }
        },
        historyLogs: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                initials: true
              }
            }
          },
          orderBy: {
            timestamp: 'desc'
          }
        },
        basinConfigurations: true,
        sinkConfigurations: true,
        faucetConfigurations: true,
        sprayerConfigurations: true,
        selectedAccessories: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }

    // Check role-based access control
    if (!canAccessOrder(user, order)) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: order
    })

  } catch (error) {
    console.error('Error fetching order details:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  try {
    // Authenticate user
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Check if user has permission to update orders
    if (!checkUserRole(user, ['ADMIN', 'PRODUCTION_COORDINATOR'])) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to update orders' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = OrderUpdateSchema.parse(body)

    // Fetch existing order
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        sinkConfigurations: true,
        basinConfigurations: true,
        faucetConfigurations: true,
        sprayerConfigurations: true,
        selectedAccessories: true,
        generatedBoms: {
          include: {
            bomItems: true
          }
        }
      }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }

    // Check if order can be edited (only in ORDER_CREATED status)
    if (existingOrder.orderStatus !== 'ORDER_CREATED') {
      return NextResponse.json(
        { 
          success: false, 
          message: `Cannot edit order in status: ${existingOrder.orderStatus}. Only orders in ORDER_CREATED status can be edited.` 
        },
        { status: 400 }
      )
    }

    // Begin transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update main order info
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          customerName: validatedData.customerInfo.customerName,
          projectName: validatedData.customerInfo.projectName || null,
          salesPerson: validatedData.customerInfo.salesPerson,
          wantDate: validatedData.customerInfo.wantDate ? new Date(validatedData.customerInfo.wantDate) : undefined,
          language: validatedData.customerInfo.language,
          notes: validatedData.customerInfo.notes || null,
        }
      })

      // Delete existing configurations
      await tx.sinkConfiguration.deleteMany({ where: { orderId } })
      await tx.basinConfiguration.deleteMany({ where: { orderId } })
      await tx.faucetConfiguration.deleteMany({ where: { orderId } })
      await tx.sprayerConfiguration.deleteMany({ where: { orderId } })
      await tx.selectedAccessory.deleteMany({ where: { orderId } })

      // Delete existing BOM
      if (existingOrder.generatedBoms.length > 0) {
        const bomIds = existingOrder.generatedBoms.map(bom => bom.id)
        await tx.bomItem.deleteMany({ where: { bomId: { in: bomIds } } })
        await tx.bom.deleteMany({ where: { orderId } })
      }

      // Create new configurations
      for (const buildNumber of validatedData.sinkSelection.buildNumbers) {
        const config = validatedData.configurations[buildNumber]
        if (!config) continue

        // Create sink configuration
        await tx.sinkConfiguration.create({
          data: {
            orderId,
            buildNumber,
            sinkModelId: config.sinkModelId,
            width: config.sinkWidth || config.width,
            length: config.sinkLength || config.length,
            legsTypeId: config.legTypeId,
            feetTypeId: config.feetTypeId,
            workflowDirection: config.workflowDirection,
            pegboard: config.hasPegboard || config.pegboard || false,
            pegboardTypeId: config.pegboardType,
            pegboardColorId: config.pegboardColor,
            controlBoxId: config.controlBoxId
          }
        })

        // Create basin configurations - individual records for BOM logic compatibility
        for (const basin of config.basins) {
          await tx.basinConfiguration.create({
            data: {
              orderId,
              buildNumber,
              basinTypeId: basin.basinType,
              basinSizePartNumber: basin.basinSize,
              basinCount: 1, // Always 1 for individual basin records
              customWidth: basin.customWidth,
              customLength: basin.customLength,
              customDepth: basin.customDepth,
              addonIds: basin.addons || []
            }
          })
        }

        // Create faucet configurations
        if (config.faucets) {
          for (const faucet of config.faucets) {
            await tx.faucetConfiguration.create({
              data: {
                orderId,
                buildNumber,
                faucetTypeId: faucet.faucetTypeId,
                faucetQuantity: 1,
                faucetPlacement: faucet.placement
              }
            })
          }
        }

        // Create sprayer configuration
        if (config.hasSprayer && config.sprayerTypeIds) {
          await tx.sprayerConfiguration.create({
            data: {
              orderId,
              buildNumber,
              hasSpray: true,
              sprayerQuantity: config.sprayerQuantity || 1,
              sprayerTypeIds: config.sprayerTypeIds,
              sprayerLocation: config.sprayerLocation || 'LEFT'
            }
          })
        }

        // Create selected accessories
        const buildAccessories = validatedData.accessories[buildNumber] || []
        for (const accessory of buildAccessories) {
          await tx.selectedAccessory.create({
            data: {
              orderId,
              buildNumber,
              assemblyId: accessory.assemblyId,
              quantity: accessory.quantity
            }
          })
        }
      }

      // Generate new BOM
      const bomData = await generateBOMForOrder({
        customer: validatedData.customerInfo,
        configurations: validatedData.configurations,
        accessories: validatedData.accessories,
        buildNumbers: validatedData.sinkSelection.buildNumbers
      })

      // Create new BOM
      const newBom = await tx.bom.create({
        data: {
          orderId,
          generatedAt: new Date()
        }
      })

      // Create BOM items
      for (const item of bomData) {
        await createBomItemRecursive(tx, newBom.id, item, null)
      }

      // Create history log entry
      await tx.orderHistoryLog.create({
        data: {
          orderId,
          userId: user.id,
          action: 'CONFIGURATION_UPDATED',
          oldStatus: existingOrder.orderStatus,
          newStatus: existingOrder.orderStatus,
          notes: 'Order configuration updated'
        }
      })

      return { updatedOrder, bomId: newBom.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully',
      orderId: result.updatedOrder.id,
      bomId: result.bomId
    })

  } catch (error) {
    console.error('Error updating order:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation error', 
          errors: error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to create BOM items recursively
async function createBomItemRecursive(
  tx: any,
  bomId: string,
  item: any,
  parentId: string | null
): Promise<void> {
  const bomItem = await tx.bomItem.create({
    data: {
      bomId,
      parentId,
      partIdOrAssemblyId: item.id,
      name: item.name,
      quantity: item.quantity,
      itemType: item.type,
      category: item.category,
      isCustom: item.isCustom || false
    }
  })

  if (item.components && item.components.length > 0) {
    for (const component of item.components) {
      await createBomItemRecursive(tx, bomId, component, bomItem.id)
    }
  }
}
