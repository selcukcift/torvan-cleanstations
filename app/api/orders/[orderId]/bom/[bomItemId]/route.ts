import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string; bomItemId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, bomItemId } = params
    const body = await request.json()
    const { serialNumber, batchNumber } = body

    // Verify the order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // Verify the BOM item exists and belongs to this order
    const bomItem = await prisma.bomItem.findFirst({
      where: {
        id: bomItemId,
        bom: {
          orderId: orderId
        }
      },
      include: {
        bom: true
      }
    })

    if (!bomItem) {
      return NextResponse.json({ success: false, error: 'BOM item not found' }, { status: 404 })
    }

    // Check if the part requires serial tracking
    let requiresTracking = false
    if (bomItem.itemType === 'PART') {
      const part = await prisma.part.findUnique({
        where: { partId: bomItem.partIdOrAssemblyId }
      })
      requiresTracking = part?.requiresSerialTracking || false
    } else if (bomItem.itemType === 'ASSEMBLY') {
      const assembly = await prisma.assembly.findUnique({
        where: { assemblyId: bomItem.partIdOrAssemblyId }
      })
      requiresTracking = assembly?.requiresSerialTracking || false
    }

    // Validate that required tracking info is provided
    if (requiresTracking && !serialNumber && !batchNumber) {
      return NextResponse.json({ 
        success: false, 
        error: 'This component requires serial or batch number tracking' 
      }, { status: 400 })
    }

    // Update the BOM item with tracking information
    const updatedBomItem = await prisma.bomItem.update({
      where: { id: bomItemId },
      data: {
        serialNumber: serialNumber || null,
        batchNumber: batchNumber || null
      }
    })

    // Log the update in order history
    await prisma.orderHistoryLog.create({
      data: {
        orderId: orderId,
        userId: user.id,
        action: 'BOM_TRACKING_UPDATE',
        notes: `Updated tracking for ${bomItem.name}: ${serialNumber ? `S/N: ${serialNumber}` : ''} ${batchNumber ? `Batch: ${batchNumber}` : ''}`
      }
    })

    // Create a notification if this completes tracking for all critical parts
    const untrackedCriticalParts = await prisma.bomItem.findMany({
      where: {
        bom: {
          orderId: orderId
        },
        serialNumber: null,
        batchNumber: null,
        OR: [
          {
            partIdOrAssemblyId: {
              in: await prisma.part.findMany({
                where: { requiresSerialTracking: true },
                select: { partId: true }
              }).then(parts => parts.map(p => p.partId))
            }
          },
          {
            partIdOrAssemblyId: {
              in: await prisma.assembly.findMany({
                where: { requiresSerialTracking: true },
                select: { assemblyId: true }
              }).then(assemblies => assemblies.map(a => a.assemblyId))
            }
          }
        ]
      }
    })

    if (untrackedCriticalParts.length === 0) {
      await prisma.systemNotification.create({
        data: {
          userId: user.id,
          type: 'ASSEMBLY_MILESTONE',
          title: 'All Critical Parts Tracked',
          message: `All critical components for order ${order.poNumber} have been tracked with serial/batch numbers`,
          data: { orderId, poNumber: order.poNumber }
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedBomItem
    })

  } catch (error) {
    console.error('Error updating BOM item tracking:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update tracking information'
    }, { status: 500 })
  }
}