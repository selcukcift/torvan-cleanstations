import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { inventoryBrowserService } from '@/lib/inventoryBrowserService'

/**
 * GET /api/procurement/inventory/category/[categoryId]
 * 
 * Returns all assemblies in a specific category.
 * Independent from BOM generation logic.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
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

    const { categoryId } = await params

    // Get category assemblies
    const assemblies = await inventoryBrowserService.getCategoryAssemblies(categoryId)

    // Get full hierarchy to find category details
    const categories = await inventoryBrowserService.getCategoryHierarchy()
    const category = categories.find(cat => cat.id === categoryId)

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        category,
        assemblies,
        assemblyCount: assemblies.length
      }
    })

  } catch (error) {
    console.error('Error fetching category assemblies:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch category assemblies' },
      { status: 500 }
    )
  }
}