import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createStandardAPIResponse, createStandardErrorResponse } from '@/lib/apiResponse'
import { getAuthUser } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return createStandardErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    // Check if user has permission to view inventory
    if (!['ADMIN', 'PRODUCTION_COORDINATOR', 'PROCUREMENT_SPECIALIST', 'ASSEMBLER'].includes(user.role)) {
      return createStandardErrorResponse('FORBIDDEN', 'Insufficient permissions to view assemblies', 403)
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { assemblyNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (category) {
      where.category = category
    }

    // Build order by clause
    const orderBy: any = {}
    if (sortBy === 'totalCost') {
      orderBy.totalCost = sortOrder
    } else if (sortBy === 'partCount') {
      orderBy.bomItems = { _count: sortOrder }
    } else {
      orderBy[sortBy] = sortOrder
    }

    const [assemblies, totalCount] = await Promise.all([
      prisma.assembly.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          bomItems: {
            include: {
              part: {
                select: {
                  id: true,
                  name: true,
                  partNumber: true,
                  quantityInStock: true
                }
              }
            }
          },
          _count: {
            select: {
              bomItems: true,
              orderItems: true
            }
          }
        }
      }),
      prisma.assembly.count({ where })
    ])

    // Enrich assemblies with computed fields
    const enrichedAssemblies = assemblies.map(assembly => {
      const partsNeeded = assembly.bomItems.reduce((sum, item) => sum + item.quantity, 0)
      const partsAvailable = assembly.bomItems.reduce((sum, item) => 
        sum + Math.min(item.quantity, item.part.quantityInStock), 0
      )
      const canBuild = assembly.bomItems.every(item => 
        item.part.quantityInStock >= item.quantity
      )
      
      return {
        ...assembly,
        partCount: assembly._count.bomItems,
        orderCount: assembly._count.orderItems,
        partsNeeded,
        partsAvailable,
        canBuild,
        availability: canBuild ? 'available' : 'parts_needed',
        totalCost: assembly.bomItems.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0)
      }
    })

    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return createStandardAPIResponse({
      assemblies: enrichedAssemblies,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        pageSize: limit,
        hasNextPage,
        hasPreviousPage
      },
      summary: {
        totalAssemblies: totalCount,
        canBuild: enrichedAssemblies.filter(a => a.canBuild).length,
        partsNeeded: enrichedAssemblies.filter(a => !a.canBuild).length
      }
    })

  } catch (error) {
    console.error('Error fetching assemblies:', error)
    return createStandardErrorResponse('INTERNAL_ERROR', 'Failed to fetch assemblies')
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return createStandardErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    // Check if user has permission to create assemblies
    if (!['ADMIN', 'PRODUCTION_COORDINATOR'].includes(user.role)) {
      return createStandardErrorResponse('FORBIDDEN', 'Insufficient permissions to create assemblies', 403)
    }

    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['name', 'assemblyNumber', 'category']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return createStandardErrorResponse(
        'VALIDATION_ERROR', 
        `Missing required fields: ${missingFields.join(', ')}`
      )
    }

    // Check if assembly number already exists
    const existingAssembly = await prisma.assembly.findUnique({
      where: { assemblyNumber: body.assemblyNumber }
    })

    if (existingAssembly) {
      return createStandardErrorResponse(
        'VALIDATION_ERROR',
        `Assembly with number ${body.assemblyNumber} already exists`
      )
    }

    const newAssembly = await prisma.assembly.create({
      data: {
        name: body.name,
        assemblyNumber: body.assemblyNumber,
        description: body.description || null,
        category: body.category,
        isActive: body.isActive !== undefined ? body.isActive : true,
        instructions: body.instructions || null
      }
    })

    return createStandardAPIResponse({
      assembly: newAssembly,
      message: 'Assembly created successfully'
    }, 201)

  } catch (error) {
    console.error('Error creating assembly:', error)
    return createStandardErrorResponse('INTERNAL_ERROR', 'Failed to create assembly')
  } finally {
    await prisma.$disconnect()
  }
}