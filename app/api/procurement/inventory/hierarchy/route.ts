import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { inventoryBrowserService } from '@/lib/inventoryBrowserService'

/**
 * GET /api/procurement/inventory/hierarchy
 * 
 * Returns the complete inventory hierarchy for procurement browsing.
 * This is completely independent from BOM generation logic.
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has permission to view inventory
    if (!['ADMIN', 'PROCUREMENT_SPECIALIST', 'PRODUCTION_COORDINATOR'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to view inventory' },
        { status: 403 }
      )
    }

    // Get hierarchy data
    const categories = await inventoryBrowserService.getCategoryHierarchy()
    const stats = await inventoryBrowserService.getInventoryStats()

    return NextResponse.json({
      success: true,
      data: {
        categories,
        stats
      }
    })

  } catch (error) {
    console.error('Error fetching inventory hierarchy:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch inventory hierarchy' },
      { status: 500 }
    )
  }
}