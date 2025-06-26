import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { generateBOMForOrder } from '@/lib/bomService.native'
import BOMExportService from '@/lib/bomExportService'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Get authenticated user
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = params
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'hierarchical' // 'hierarchical' or 'aggregated'
    const filename = url.searchParams.get('filename') || `BOM_${orderId}_${format}.pdf`

    // Get order data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        orderItems: {
          include: {
            configurations: true,
            accessories: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check permissions (users can only export their own orders unless admin)
    if (user.role !== 'ADMIN' && order.userId !== user.id) {
      return NextResponse.json({ 
        error: 'You do not have permission to export this order\'s BOM' 
      }, { status: 403 })
    }

    // Transform order data to BOM generation format
    const orderData = {
      customer: {
        language: order.customer?.preferredLanguage || 'EN'
      },
      buildNumbers: order.orderItems.map(item => item.buildNumber),
      configurations: {} as Record<string, any>,
      accessories: {} as Record<string, any>
    }

    // Transform configurations
    order.orderItems.forEach(item => {
      if (item.configurations) {
        orderData.configurations[item.buildNumber] = {
          ...item.configurations,
          sinkModelId: item.sinkModelId,
          length: item.sinkLength,
          legsTypeId: item.legTypeId,
          feetTypeId: item.feetTypeId
        }
      }
      
      if (item.accessories) {
        orderData.accessories[item.buildNumber] = item.accessories
      }
    })

    console.log('🔧 BOM PDF Export: Generating BOM for order:', orderId)
    
    // Generate BOM using the same service as the regular BOM endpoint
    const bomResult = await generateBOMForOrder(orderData)
    
    console.log('🔧 BOM PDF Export: BOM generated successfully')
    console.log('🔧 BOM PDF Export: Hierarchical items:', bomResult.hierarchical?.length || 0)
    console.log('🔧 BOM PDF Export: Total items:', bomResult.totalItems || 0)

    // Prepare order info for export
    const orderInfo = {
      orderId: order.id,
      customerName: order.customer?.name || 'Unknown Customer',
      orderDate: order.createdAt.toISOString().split('T')[0],
      buildNumbers: orderData.buildNumbers,
      projectName: `CleanStation Order ${order.id}`
    }

    // Convert BOM to export format
    const exportData = BOMExportService.flattenBOMForExport(
      bomResult.hierarchical || [], 
      orderInfo
    )

    console.log('🔧 BOM PDF Export: Export data prepared')
    console.log('🔧 BOM PDF Export: Export items:', exportData.items.length)
    console.log('🔧 BOM PDF Export: Max depth:', exportData.summary.maxDepth)

    // Generate aggregated version if requested
    const finalExportData = format === 'aggregated' 
      ? BOMExportService.generateAggregatedBOM(exportData)
      : exportData

    console.log('🔧 BOM PDF Export: Final export format:', format)
    console.log('🔧 BOM PDF Export: Final items count:', finalExportData.items.length)

    // Generate PDF
    const pdfBuffer = await BOMExportService.generatePDF(finalExportData)
    
    console.log('🔧 BOM PDF Export: PDF generated successfully')
    console.log('🔧 BOM PDF Export: PDF size:', pdfBuffer.byteLength, 'bytes')

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('🔧 BOM PDF Export Error:', error)
    
    // Enhanced error handling
    let errorMessage = 'Failed to generate BOM PDF export'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.'
        statusCode = 429
      } else if (error.message.includes('not found')) {
        errorMessage = 'Order or required data not found'
        statusCode = 404
      } else if (error.message.includes('permission')) {
        errorMessage = 'You do not have permission to export this BOM'
        statusCode = 403
      } else {
        errorMessage = `BOM PDF Export failed: ${error.message}`
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: statusCode })
  } finally {
    await prisma.$disconnect()
  }
}