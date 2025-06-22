import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { inventoryBrowserService } from '@/lib/inventoryBrowserService'

/**
 * GET /api/procurement/inventory/part/[partId]
 * 
 * Returns detailed information about a specific part including
 * where it's used across assemblies. Independent from BOM logic.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    // Check authentication
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions
    if (!['ADMIN', 'PROCUREMENT_SPECIALIST', 'PRODUCTION_COORDINATOR'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to view inventory' },
        { status: 403 }
      )
    }

    const { partId } = await params

    // Get part details
    const part = await inventoryBrowserService.getPartDetails(partId)
    
    if (!part) {
      return NextResponse.json(
        { success: false, message: 'Part not found' },
        { status: 404 }
      )
    }

    // Get usage information
    const usedInAssemblies = await inventoryBrowserService.getPartUsage(partId)

    return NextResponse.json({
      success: true,
      data: {
        part,
        usedInAssemblies,
        usageCount: usedInAssemblies.length
      }
    })

  } catch (error) {
    console.error('Error fetching part details:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch part details' },
      { status: 500 }
    )
  }
}