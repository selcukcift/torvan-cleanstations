import { NextRequest, NextResponse } from 'next/server'
// [Per Coding Prompt Chains v5 - Hybrid Backend]
// Use src/services/accessoriesService.js for all accessory data
import * as accessoriesService from '@/src/services/accessoriesService'
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
    const query = searchParams.get('query') || ''
    const categories = searchParams.get('categories')?.split(',') || []
    const types = searchParams.get('types')?.split(',') || []
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        accessories: [],
        pagination: { total: 0, limit, offset, hasMore: false },
        filters: { query, categories, types }
      })
    }

    const result = await accessoriesService.searchAccessories({
      query,
      categories,
      types,
      limit,
      offset
    })
    
    return NextResponse.json({ 
      success: true, 
      ...result
    })

  } catch (error) {
    console.error('Error searching accessories:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to search accessories' },
      { status: 500 }
    )
  }
}