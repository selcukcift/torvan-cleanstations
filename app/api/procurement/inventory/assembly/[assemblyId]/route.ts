import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { inventoryBrowserService } from '@/lib/inventoryBrowserService'

/**
 * GET /api/procurement/inventory/assembly/[assemblyId]
 * 
 * Returns detailed information about a specific assembly including
 * all its components. Independent from BOM generation logic.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assemblyId: string }> }
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

    const { assemblyId } = await params
    const { searchParams } = new URL(request.url)
    const includeFlattened = searchParams.get('flattened') === 'true'

    // Get assembly details
    const assembly = await inventoryBrowserService.getAssemblyDetails(assemblyId)
    
    if (!assembly) {
      return NextResponse.json(
        { success: false, message: 'Assembly not found' },
        { status: 404 }
      )
    }

    let flattenedComponents = []
    if (includeFlattened) {
      flattenedComponents = await inventoryBrowserService.getFlattenedAssemblyComponents(assemblyId)
    }

    return NextResponse.json({
      success: true,
      data: {
        assembly,
        flattenedComponents: includeFlattened ? flattenedComponents : undefined
      }
    })

  } catch (error) {
    console.error('Error fetching assembly details:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch assembly details' },
      { status: 500 }
    )
  }
}