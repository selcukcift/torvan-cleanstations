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
    const categoryFilter = searchParams.get('category') || ''
    
    const result = await accessoriesService.getAllAccessories({ 
      searchTerm, 
      categoryFilter, 
      limit, 
      offset 
    }) as { accessories: Array<{
      id: string;
      name: string;
      category: string;
      description?: string;
      price?: number;
      imageUrl?: string;
    }>, pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    } }
    
    return NextResponse.json({ 
      success: true, 
      accessories: result.accessories,
      pagination: result.pagination
    })

  } catch (error) {
    console.error('Error fetching accessories:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
