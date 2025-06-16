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

    // Filter ONLY for Service Parts Category (719) assemblies
    const serviceAssemblyWhere: any = {
      categoryCode: '719' // Only SERVICE PARTS category
    }

    // Add text search if provided
    if (search) {
      serviceAssemblyWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { assemblyId: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Add subcategory filter if provided
    if (category) {
      serviceAssemblyWhere.subcategoryCode = category
    }

    // Fetch SERVICE PARTS assemblies (Category 719 only) with pagination
    const [serviceAssemblies, totalCount] = await Promise.all([
      prisma.assembly.findMany({
        where: serviceAssemblyWhere,
        select: {
          assemblyId: true,
          name: true,
          type: true,
          categoryCode: true,
          subcategoryCode: true,
          isOrderable: true,
          kitComponentsJson: true,
          // Include components if this assembly has them
          components: {
            select: {
              id: true,
              quantity: true,
              notes: true,
              childPart: {
                select: {
                  partId: true,
                  name: true,
                  manufacturerPartNumber: true,
                  type: true,
                  photoURL: true
                }
              },
              childAssembly: {
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
          { subcategoryCode: 'asc' },
          { name: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.assembly.count({ where: serviceAssemblyWhere })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    // Get SERVICE PARTS subcategories (719.xxx) for filtering
    const serviceSubcategories = await prisma.subcategory.findMany({
      where: {
        categoryId: '719' // Only SERVICE PARTS subcategories
      },
      select: {
        subcategoryId: true,
        name: true,
        description: true
      },
      orderBy: {
        subcategoryId: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        serviceAssemblies,
        subcategories: serviceSubcategories,
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