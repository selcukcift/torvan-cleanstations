import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereClause: any = {}
    
    if (search) {
      whereClause.OR = [
        { partId: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (category) {
      whereClause.category = { name: { contains: category, mode: 'insensitive' } }
    }

    const [parts, total] = await Promise.all([
      prisma.part.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' }
      }),
      prisma.part.count({ where: whereClause })
    ])

    return NextResponse.json({
      success: true,
      data: parts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Error fetching parts:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch parts',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}