import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { inventoryBrowserService } from '@/lib/inventoryBrowserService'

/**
 * GET /api/procurement/inventory/search
 * 
 * Search for parts and assemblies across the inventory.
 * Independent from BOM generation logic.
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

    // Check permissions
    if (!['ADMIN', 'PROCUREMENT_SPECIALIST', 'PRODUCTION_COORDINATOR'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to view inventory' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') // 'parts', 'assemblies', or 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Perform search
    const searchResults = await inventoryBrowserService.search(query.trim())
    
    // Filter results based on type
    let filteredResults = searchResults
    if (type === 'parts') {
      filteredResults = { parts: searchResults.parts, assemblies: [] }
    } else if (type === 'assemblies') {
      filteredResults = { parts: [], assemblies: searchResults.assemblies }
    }

    // Apply limit
    const limitedResults = {
      parts: filteredResults.parts.slice(0, limit),
      assemblies: filteredResults.assemblies.slice(0, limit)
    }

    return NextResponse.json({
      success: true,
      data: {
        query: query.trim(),
        results: limitedResults,
        totalFound: {
          parts: filteredResults.parts.length,
          assemblies: filteredResults.assemblies.length,
          total: filteredResults.parts.length + filteredResults.assemblies.length
        },
        limitApplied: limit
      }
    })

  } catch (error) {
    console.error('Error performing inventory search:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to perform search' },
      { status: 500 }
    )
  }
}