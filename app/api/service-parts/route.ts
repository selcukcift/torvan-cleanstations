import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser, checkUserRole } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser()
    
    if (!checkUserRole(user, ['SERVICE_DEPARTMENT', 'PROCUREMENT_SPECIALIST', 'ADMIN'])) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to browse service parts' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Build search filters
    const where: any = {
      // Filter for parts that are suitable for service
      OR: [
        { type: 'COMPONENT' },
        { type: 'MATERIAL' }
      ],
      status: 'ACTIVE' // Only show active parts
    }

    // Add text search if provided
    if (search) {
      where.AND = [
        where.AND || {},
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { partId: { contains: search, mode: 'insensitive' } },
            { manufacturerPartNumber: { contains: search, mode: 'insensitive' } }
          ]
        }
      ]
    }

    // Add type filter if provided
    if (type && ['COMPONENT', 'MATERIAL'].includes(type)) {
      where.type = type
    }

    // Fetch parts with pagination
    const [parts, totalCount] = await Promise.all([
      prisma.part.findMany({
        where,
        select: {
          partId: true,
          name: true,
          manufacturerPartNumber: true,
          type: true,
          status: true,
          photoURL: true,
          technicalDrawingURL: true,
          // Include assembly components to show if this part is used in assemblies
          assemblyComponents: {
            take: 3, // Limit to avoid too much data
            select: {
              parentAssembly: {
                select: {
                  assemblyId: true,
                  name: true,
                  type: true
                }
              }
            }
          }
        },
        orderBy: [
          { name: 'asc' },
          { partId: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.part.count({ where })
    ])

    // Also fetch available assemblies that could be service parts
    const serviceAssemblies = await prisma.assembly.findMany({
      where: {
        OR: [
          { type: 'SERVICE_PART' },
          { type: 'KIT' }
        ]
      },
      select: {
        assemblyId: true,
        name: true,
        type: true,
        categoryCode: true,
        subcategoryCode: true
      },
      take: 50 // Limit assemblies for now
    })

    const totalPages = Math.ceil(totalCount / limit)

    // Get categories for filtering
    const categories = await prisma.category.findMany({
      select: {
        categoryId: true,
        categoryName: true
      },
      orderBy: {
        categoryName: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        parts,
        serviceAssemblies,
        categories,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    })

  } catch (error) {
    console.error('Error fetching service parts:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}