import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let whereClause: any = {}
    
    if (search) {
      whereClause.OR = [
        { assemblyId: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (type) {
      whereClause.type = type
    }

    const [assemblies, total] = await Promise.all([
      prisma.assembly.findMany({
        where: whereClause,
        include: {
          components: {
            include: {
              childPart: true,
              childAssembly: true
            }
          }
        },
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' }
      }),
      prisma.assembly.count({ where: whereClause })
    ])

    return NextResponse.json({
      success: true,
      data: assemblies,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Error fetching assemblies:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch assemblies',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}