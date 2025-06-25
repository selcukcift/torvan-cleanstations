import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = params
    const { searchParams } = new URL(request.url)
    const buildNumber = searchParams.get('buildNumber')

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        generatedBoms: {
          where: buildNumber ? { buildNumber } : undefined,
          include: {
            bomItems: {
              orderBy: [
                { category: 'asc' },
                { name: 'asc' }
              ]
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // Get the most recent BOM
    const bom = order.generatedBoms[0]
    if (!bom) {
      return NextResponse.json({ 
        success: false, 
        error: 'No BOM generated for this order' 
      }, { status: 404 })
    }

    // Enrich BOM items with part/assembly details
    const enrichedItems = await Promise.all(
      bom.bomItems.map(async (item) => {
        let part = null
        let assembly = null
        
        // Try to find as part first
        part = await prisma.part.findUnique({
          where: { partId: item.partIdOrAssemblyId },
          select: {
            partId: true,
            name: true,
            requiresSerialTracking: true,
            isOutsourced: true,
            manufacturerName: true,
            manufacturerPartNumber: true
          }
        })

        // If not found as part, try as assembly
        if (!part) {
          assembly = await prisma.assembly.findUnique({
            where: { assemblyId: item.partIdOrAssemblyId },
            select: {
              assemblyId: true,
              name: true,
              requiresSerialTracking: true,
              isOutsourced: true
            }
          })
        }

        return {
          ...item,
          part,
          assembly
        }
      })
    )

    // Calculate tracking statistics
    const criticalParts = enrichedItems.filter(
      item => item.part?.requiresSerialTracking || item.assembly?.requiresSerialTracking
    )
    const trackedParts = criticalParts.filter(
      item => item.serialNumber || item.batchNumber
    )
    const outsourcedParts = enrichedItems.filter(
      item => item.part?.isOutsourced || item.assembly?.isOutsourced
    )

    return NextResponse.json({
      success: true,
      data: {
        bomId: bom.id,
        buildNumber: bom.buildNumber,
        generatedAt: bom.generatedAt,
        items: enrichedItems,
        statistics: {
          totalItems: enrichedItems.length,
          criticalParts: criticalParts.length,
          trackedParts: trackedParts.length,
          untrackedCritical: criticalParts.length - trackedParts.length,
          outsourcedParts: outsourcedParts.length
        }
      }
    })

  } catch (error) {
    console.error('Error fetching BOM:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch BOM data'
    }, { status: 500 })
  }
}