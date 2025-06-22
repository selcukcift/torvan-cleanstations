import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for delivery updates
const DeliveryUpdateSchema = z.object({
  orderId: z.string(),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  expectedArrivalDate: z.string().transform((str) => new Date(str)),
  actualArrivalDate: z.string().transform((str) => new Date(str)).optional(),
  deliveryStatus: z.enum([
    'SHIPPED_BACK',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'DELAYED',
    'EXCEPTION'
  ]),
  notes: z.string().optional(),
  notifyStakeholders: z.boolean().default(true)
})

/**
 * GET /api/procurement/delivery-tracking
 * 
 * Get orders with active delivery tracking
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions - wider access for viewing
    if (!['ADMIN', 'PROCUREMENT_SPECIALIST', 'PRODUCTION_COORDINATOR', 'QC_PERSON'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const includeDelivered = searchParams.get('includeDelivered') === 'true'

    // Build where clause
    let where: any = {
      orderStatus: 'SINK_BODY_EXTERNAL_PRODUCTION',
      procurementData: {
        not: null
      }
    }

    if (!includeDelivered) {
      where.procurementData = {
        ...where.procurementData,
        path: ['deliveryStatus'],
        not: 'DELIVERED'
      }
    }

    // Get orders with delivery tracking
    const orders = await prisma.order.findMany({
      where,
      include: {
        createdBy: {
          select: {
            fullName: true,
            email: true
          }
        },
        basinConfigurations: true,
        sinkConfigurations: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Transform orders to include delivery info
    const ordersWithDelivery = orders.map(order => {
      const procurementData = order.procurementData as any || {}
      const deliveryInfo = procurementData.deliveryTracking || {}
      
      return {
        id: order.id,
        poNumber: order.poNumber,
        customerName: order.customerName,
        projectName: order.projectName,
        wantDate: order.wantDate,
        orderStatus: order.orderStatus,
        buildNumbers: order.buildNumbers,
        sinkCount: order.buildNumbers.length,
        deliveryTracking: {
          trackingNumber: deliveryInfo.trackingNumber,
          carrier: deliveryInfo.carrier,
          expectedArrivalDate: deliveryInfo.expectedArrivalDate,
          actualArrivalDate: deliveryInfo.actualArrivalDate,
          deliveryStatus: deliveryInfo.deliveryStatus || 'SHIPPED_BACK',
          lastUpdated: deliveryInfo.lastUpdated,
          updatedBy: deliveryInfo.updatedBy,
          notes: deliveryInfo.notes
        }
      }
    })

    // Get summary stats
    const stats = {
      total: ordersWithDelivery.length,
      inExternalProduction: ordersWithDelivery.filter(o => o.deliveryTracking.deliveryStatus === 'IN_TRANSIT').length,
      outForDelivery: ordersWithDelivery.filter(o => o.deliveryTracking.deliveryStatus === 'OUT_FOR_DELIVERY').length,
      delayed: ordersWithDelivery.filter(o => o.deliveryTracking.deliveryStatus === 'DELAYED').length,
      exception: ordersWithDelivery.filter(o => o.deliveryTracking.deliveryStatus === 'EXCEPTION').length
    }

    return NextResponse.json({
      success: true,
      data: ordersWithDelivery,
      stats
    })

  } catch (error) {
    console.error('Error fetching delivery tracking:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch delivery tracking' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/procurement/delivery-tracking
 * 
 * Update delivery tracking information and notify stakeholders
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions - only procurement can update
    if (!['ADMIN', 'PROCUREMENT_SPECIALIST'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Only procurement specialists can update delivery tracking' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const validatedData = DeliveryUpdateSchema.parse(body)

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      include: {
        createdBy: {
          select: {
            fullName: true,
            email: true
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

    // Prepare delivery tracking data
    const deliveryTracking = {
      trackingNumber: validatedData.trackingNumber,
      carrier: validatedData.carrier,
      expectedArrivalDate: validatedData.expectedArrivalDate.toISOString(),
      actualArrivalDate: validatedData.actualArrivalDate?.toISOString(),
      deliveryStatus: validatedData.deliveryStatus,
      lastUpdated: new Date().toISOString(),
      updatedBy: user.fullName,
      updatedById: user.id,
      notes: validatedData.notes
    }

    // Update order with delivery tracking
    const currentProcurementData = (order.procurementData as any) || {}
    const updatedOrder = await prisma.order.update({
      where: { id: validatedData.orderId },
      data: {
        procurementData: {
          ...currentProcurementData,
          deliveryTracking
        },
        // Update order status if delivered
        ...(validatedData.deliveryStatus === 'DELIVERED' ? {
          orderStatus: 'READY_FOR_PRE_QC'
        } : {})
      }
    })

    // Create history log
    await prisma.orderHistoryLog.create({
      data: {
        orderId: order.id,
        userId: user.id,
        action: 'DELIVERY_TRACKING_UPDATED',
        oldStatus: order.orderStatus,
        newStatus: validatedData.deliveryStatus === 'DELIVERED' ? 'READY_FOR_PRE_QC' : order.orderStatus,
        notes: `Delivery tracking updated: ${validatedData.deliveryStatus}${validatedData.trackingNumber ? ` - Tracking: ${validatedData.trackingNumber}` : ''}`
      }
    })

    // Notify stakeholders if requested
    if (validatedData.notifyStakeholders) {
      await notifyStakeholders(order, deliveryTracking, user)
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        poNumber: order.poNumber,
        deliveryStatus: validatedData.deliveryStatus,
        expectedArrival: validatedData.expectedArrivalDate,
        notificationsSent: validatedData.notifyStakeholders
      },
      message: 'Delivery tracking updated successfully'
    })

  } catch (error) {
    console.error('Error updating delivery tracking:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update delivery tracking' },
      { status: 500 }
    )
  }
}

/**
 * Notify relevant stakeholders about delivery updates
 */
async function notifyStakeholders(
  order: any, 
  deliveryTracking: any,
  updatedBy: any
) {
  try {
    // Get users to notify based on roles
    const stakeholders = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'QC_PERSON' },
          { role: 'PRODUCTION_COORDINATOR' },
          { role: 'ADMIN' },
          { id: order.createdById } // Order creator
        ],
        isActive: true
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true
      }
    })

    // Create notifications for each stakeholder
    const notifications = stakeholders.map(stakeholder => {
      let title = `Sink Delivery Update: ${order.poNumber}`
      let message = ''

      switch (deliveryTracking.deliveryStatus) {
        case 'SHIPPED_BACK':
          message = `Sink body for order ${order.poNumber} has been shipped back from manufacturer. Expected arrival: ${new Date(deliveryTracking.expectedArrivalDate).toLocaleDateString()}`
          break
        case 'IN_TRANSIT':
          message = `Sink body for order ${order.poNumber} is in transit. Tracking: ${deliveryTracking.trackingNumber || 'N/A'}`
          break
        case 'OUT_FOR_DELIVERY':
          message = `Sink body for order ${order.poNumber} is out for delivery today!`
          break
        case 'DELIVERED':
          message = `Sink body for order ${order.poNumber} has been delivered. Ready for Pre-QC inspection.`
          break
        case 'DELAYED':
          message = `Delivery for order ${order.poNumber} has been delayed. New expected date: ${new Date(deliveryTracking.expectedArrivalDate).toLocaleDateString()}`
          break
        case 'EXCEPTION':
          message = `Delivery exception for order ${order.poNumber}. ${deliveryTracking.notes || 'Please check with procurement for details.'}`
          break
      }

      return {
        userId: stakeholder.id,
        type: 'PROCUREMENT_UPDATE',
        title,
        message,
        priority: deliveryTracking.deliveryStatus === 'DELIVERED' || deliveryTracking.deliveryStatus === 'EXCEPTION' ? 'HIGH' : 'NORMAL',
        data: {
          orderId: order.id,
          poNumber: order.poNumber,
          deliveryStatus: deliveryTracking.deliveryStatus,
          trackingNumber: deliveryTracking.trackingNumber,
          expectedArrivalDate: deliveryTracking.expectedArrivalDate
        }
      }
    })

    // Bulk create notifications
    await prisma.systemNotification.createMany({
      data: notifications
    })

    // Send email notifications for critical updates
    if (['DELIVERED', 'DELAYED', 'EXCEPTION'].includes(deliveryTracking.deliveryStatus)) {
      // This would integrate with your email service
      // For now, we'll just log it
      console.log(`Email notifications would be sent to ${stakeholders.length} stakeholders for order ${order.poNumber}`)
    }

  } catch (error) {
    console.error('Error notifying stakeholders:', error)
    // Don't throw - notifications are not critical to the update
  }
}