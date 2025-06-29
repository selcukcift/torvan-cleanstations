import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, canAccessOrder, checkUserRole } from '@/lib/auth'
import { generateBOMForOrder } from '@/lib/bomService.native'

export async function POST(
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
    
    // Check if user has permission to generate BOMs
    if (!checkUserRole(user, ['ADMIN', 'PRODUCTION_COORDINATOR', 'PROCUREMENT_SPECIALIST'])) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to generate BOM' },
        { status: 403 }
      )
    }

    // Fetch the order with all required configurations
    const order = await prisma.order.findUnique({
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

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    if (!canAccessOrder(user, order)) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    console.log('Order data retrieved:', {
      orderId,
      buildNumbers: order.buildNumbers,
      sinkConfigsCount: order.sinkConfigurations?.length,
      basinConfigsCount: order.basinConfigurations?.length,
      faucetConfigsCount: order.faucetConfigurations?.length,
      sprayerConfigsCount: order.sprayerConfigurations?.length,
      accessoriesCount: order.selectedAccessories?.length
    })
    
    // Early validation - check if order has any configurations at all
    const hasConfigurations = (order.sinkConfigurations?.length || 0) > 0 || 
                             (order.basinConfigurations?.length || 0) > 0
    
    if (!hasConfigurations) {
      console.warn(`⚠️ Order ${orderId} has no configurations - this order may have been created incompletely`)
      return NextResponse.json(
        { 
          success: false, 
          message: `Order ${order.poNumber} appears to be missing configuration data. This may happen if the order was created without completing the configuration steps. Please create a new order or contact support to add configurations to this order.`,
          missingConfigurations: true,
          orderId: orderId,
          poNumber: order.poNumber,
          error: 'INCOMPLETE_ORDER_DATA',
          suggestion: 'Create a new order through the order creation wizard to ensure all configuration data is properly saved.'
        },
        { status: 400 }
      )
    }

    // Convert order data to BOM generation format
    const bomRequestData = {
      customer: {
        customerName: order.customerName,
        poNumber: order.poNumber,
        projectName: order.projectName,
        salesPerson: order.salesPerson,
        language: order.language,
        wantDate: order.wantDate?.toISOString(),
        notes: order.notes
      },
      buildNumbers: order.buildNumbers,
      configurations: Object.fromEntries(
        order.buildNumbers.map(buildNumber => {
          const sinkConfig = order.sinkConfigurations?.find(sc => sc.buildNumber === buildNumber)
          const basinConfigs = order.basinConfigurations?.filter(bc => bc.buildNumber === buildNumber) || []
          const faucetConfigs = order.faucetConfigurations?.filter(fc => fc.buildNumber === buildNumber) || []
          const sprayerConfigs = order.sprayerConfigurations?.filter(sc => sc.buildNumber === buildNumber) || []
          
          if (!sinkConfig) {
            console.warn(`⚠️ No sink configuration found for build number: ${buildNumber}`)
            throw new Error(`Order is missing configuration data for build number: ${buildNumber}. This order may have been created without complete configuration data. Please edit the order to add sink configurations, or create a new order with complete specifications.`)
          }
          
          // Check for missing basin configurations
          if (!basinConfigs || basinConfigs.length === 0) {
            console.warn(`⚠️ No basin configurations found for build number: ${buildNumber}`)
            throw new Error(`Order is missing basin configuration data for build number: ${buildNumber}. At least one basin configuration is required for BOM generation. Please edit the order to add basin configurations.`)
          }
          
          return [buildNumber, {
            sinkModelId: sinkConfig.sinkModelId,
            width: sinkConfig.width,
            length: sinkConfig.length,
            legsTypeId: sinkConfig.legsTypeId,
            feetTypeId: sinkConfig.feetTypeId,
            workflowDirection: sinkConfig.workflowDirection,
            pegboard: sinkConfig.pegboard,
            pegboardTypeId: sinkConfig.pegboardTypeId,
            pegboardColorId: sinkConfig.pegboardColorId,
            controlBoxId: sinkConfig.controlBoxId,
            basins: basinConfigs.map(bc => ({
              basinTypeId: bc.basinTypeId,
              basinType: bc.basinTypeId,
              basinSizePartNumber: bc.basinSizePartNumber,
              customWidth: bc.customWidth,
              customLength: bc.customLength,
              customDepth: bc.customDepth,
              addonIds: bc.addonIds || []
            })),
            faucets: faucetConfigs.map(fc => ({
              faucetTypeId: fc.faucetTypeId,
              quantity: fc.faucetQuantity || 1,
              placement: fc.faucetPlacement
            })),
            sprayers: sprayerConfigs.flatMap(sc => 
              sc.sprayerTypeIds?.map((typeId: string, index: number) => ({
                sprayerTypeId: typeId,
                location: sc.sprayerLocations?.[index] || 'Center',
                quantity: 1
              })) || []
            )
          }]
        })
      ),
      accessories: Object.fromEntries(
        order.buildNumbers.map(buildNumber => [
          buildNumber,
          order.selectedAccessories?.filter(sa => sa.buildNumber === buildNumber) || []
        ])
      )
    }

    console.log('BOM request data prepared:', JSON.stringify(bomRequestData, null, 2))

    // Generate BOM using the native service
    console.log('Calling generateBOMForOrder...')
    const bomResult = await generateBOMForOrder(bomRequestData)
    const bomData = bomResult.hierarchical
    console.log('BOM generated successfully, item count:', bomResult.totalItems)

    // Begin transaction to save BOM
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing BOM if present
      if (order.generatedBoms.length > 0) {
        const bomIds = order.generatedBoms.map(bom => bom.id)
        await tx.bomItem.deleteMany({ where: { bomId: { in: bomIds } } })
        await tx.bom.deleteMany({ where: { orderId } })
      }

      // Create new BOM
      const newBom = await tx.bom.create({
        data: {
          orderId,
          generatedAt: new Date()
        }
      })

      // Create BOM items recursively
      for (const item of bomData) {
        await createBomItemRecursive(tx, newBom.id, item, null)
      }

      // Create history log entry (ensure user exists in database)
      let validUserId = user.id
      
      // Check if user exists in database, create if needed
      const dbUser = await tx.user.findUnique({ where: { id: user.id } })
      if (!dbUser) {
        // Try to find by email/username
        const existingUser = await tx.user.findFirst({
          where: {
            OR: [
              { email: user.email },
              { username: user.username }
            ]
          }
        })
        
        if (existingUser) {
          validUserId = existingUser.id
        } else {
          // Create user if doesn't exist
          const newUser = await tx.user.create({
            data: {
              id: user.id,
              username: user.username,
              email: user.email,
              passwordHash: 'SESSION_USER_NO_PASSWORD',
              fullName: user.name,
              role: user.role as any,
              initials: user.initials
            }
          })
          validUserId = newUser.id
        }
      }
      
      await tx.orderHistoryLog.create({
        data: {
          orderId,
          userId: validUserId,
          action: 'BOM_GENERATED',
          oldStatus: order.orderStatus,
          newStatus: order.orderStatus,
          notes: 'BOM generated for order'
        }
      })

      return { bomId: newBom.id, itemCount: bomResult.totalItems }
    })

    return NextResponse.json({
      success: true,
      message: 'BOM generated and saved successfully',
      data: {
        bomId: result.bomId,
        itemCount: result.itemCount,
        totalItems: bomResult.totalItems
      }
    })

  } catch (error) {
    console.error('Error generating BOM for order:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to generate BOM',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
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