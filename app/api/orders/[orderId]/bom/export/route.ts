import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'

const prisma = new PrismaClient()

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
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'

    // Verify order exists and user has access
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        id: true, 
        poNumber: true, 
        createdById: true,
        customerName: true,
        createdAt: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this order
    const hasAccess = user.role === 'ADMIN' || 
                     user.role === 'PRODUCTION_COORDINATOR' ||
                     user.role === 'PROCUREMENT_SPECIALIST' ||
                     order.createdById === user.id

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Fetch BOM data with hierarchy
    const bom = await prisma.bom.findFirst({
      where: { orderId },
      include: {
        bomItems: {
          orderBy: [
            { category: 'asc' },
            { name: 'asc' }
          ]
        }
      }
    })

    if (!bom) {
      return NextResponse.json(
        { error: 'BOM not found for this order' },
        { status: 404 }
      )
    }

    // Generate export based on format
    if (format === 'csv') {
      return generateCSVResponse(bom, order)
    } else if (format === 'pdf') {
      // PDF generation placeholder - can be implemented later
      return NextResponse.json(
        { error: 'PDF export not yet implemented' },
        { status: 501 }
      )
    } else {
      return NextResponse.json(
        { error: 'Invalid format. Supported formats: csv, pdf' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error exporting BOM:', error)
    return NextResponse.json(
      { error: 'Failed to export BOM' },
      { status: 500 }
    )
  }
}

/**
 * Generate CSV response for BOM export
 */
function generateCSVResponse(bom: any, order: any) {
  try {
    // CSV headers
    const headers = [
      'Level',
      'Part Number',
      'Description',
      'Quantity',
      'Type',
      'Category',
      'Notes'
    ]

    // Group items by category for better organization
    const groupedItems = bom.bomItems.reduce((acc: any, item: any) => {
      const category = item.category || 'MISCELLANEOUS'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(item)
      return acc
    }, {})

    // Generate CSV rows
    const csvRows = [headers]

    // Add order information as comment rows
    csvRows.push([
      `# Order Information`,
      `PO: ${order.poNumber}`,
      `Customer: ${order.customerName}`,
      `Generated: ${new Date().toISOString()}`,
      '', '', ''
    ])
    csvRows.push(['', '', '', '', '', '', '']) // Empty row

    // Add BOM items organized by category
    Object.entries(groupedItems).forEach(([category, items]) => {
      // Category header
      csvRows.push([
        `## ${category}`,
        '', '', '', '', '', ''
      ])

      // Items in this category
      (items as any[]).forEach((item, index) => {
        csvRows.push([
          '1', // Level - can be enhanced with actual hierarchy
          item.partIdOrAssemblyId,
          item.name,
          item.quantity.toString(),
          item.itemType,
          item.category || '',
          '' // Notes placeholder
        ])
      })

      csvRows.push(['', '', '', '', '', '', '']) // Empty row between categories
    })

    // Convert to CSV string
    const csvContent = csvRows
      .map(row => 
        row.map(field => {
          // Escape quotes and wrap in quotes if necessary
          const stringField = String(field || '')
          if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`
          }
          return stringField
        }).join(',')
      )
      .join('\n')

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `bom_${order.poNumber}_${timestamp}.csv`

    // Return CSV response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Error generating CSV:', error)
    throw new Error('Failed to generate CSV export')
  }
}

/**
 * Generate BOM summary for quick overview
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get BOM summary statistics
    const bomStats = await prisma.bom.findFirst({
      where: { orderId },
      select: {
        id: true,
        generatedAt: true,
        buildNumber: true,
        _count: {
          select: {
            bomItems: true
          }
        },
        bomItems: {
          select: {
            category: true,
            itemType: true,
            quantity: true
          }
        }
      }
    })

    if (!bomStats) {
      return NextResponse.json(
        { error: 'BOM not found' },
        { status: 404 }
      )
    }

    // Calculate summary statistics
    const summary = {
      totalItems: bomStats._count.bomItems,
      totalQuantity: bomStats.bomItems.reduce((sum, item) => sum + item.quantity, 0),
      categoriesCount: new Set(bomStats.bomItems.map(item => item.category)).size,
      itemsByType: bomStats.bomItems.reduce((acc: any, item) => {
        acc[item.itemType] = (acc[item.itemType] || 0) + 1
        return acc
      }, {}),
      itemsByCategory: bomStats.bomItems.reduce((acc: any, item) => {
        const category = item.category || 'MISCELLANEOUS'
        acc[category] = (acc[category] || 0) + item.quantity
        return acc
      }, {}),
      generatedAt: bomStats.generatedAt,
      buildNumber: bomStats.buildNumber
    }

    return NextResponse.json({
      success: true,
      summary
    })

  } catch (error) {
    console.error('Error generating BOM summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate BOM summary' },
      { status: 500 }
    )
  }
}