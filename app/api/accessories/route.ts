import { NextRequest, NextResponse } from 'next/server'
import accessoriesService from '@/lib/accessoriesService.native'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Add authentication as per Prompt 2.B
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const categoryCode = searchParams.get('categoryCode')
    const featured = searchParams.get('featured')
    const getCategories = searchParams.get('getCategories')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Handle get categories request
    if (getCategories === 'true') {
      const categories = await accessoriesService.getAccessoryCategories()
      return NextResponse.json({ success: true, categories })
    }

    // Handle featured accessories request
    if (featured === 'true') {
      const data = await accessoriesService.getFeaturedAccessories()
      return NextResponse.json({ success: true, data })
    }

    // Handle category-specific accessories request
    if (categoryCode) {
      const data = await accessoriesService.getAccessoriesByCategory(categoryCode)
      return NextResponse.json({ success: true, data })
    }

    // Handle general accessories request with pagination
    const searchTerm = searchParams.get('search') || ''
    // const categoryFilter = searchParams.get('category') // TODO: Implement category filtering || ''
    
    const result = await accessoriesService.getAllAccessories({ 
      search: searchTerm, 
      limit, 
      offset 
    })
    
    // Transform the result to match expected format
    const totalPages = Math.ceil(result.total / limit)
    const currentPage = Math.floor(offset / limit) + 1
    
    return NextResponse.json({ 
      success: true, 
      accessories: result.accessories,
      pagination: {
        total: result.total,
        page: currentPage,
        limit: limit,
        totalPages: totalPages
      }
    })

  } catch (error) {
    console.error('Error fetching accessories:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
