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
    if (!['ADMIN', 'PRODUCTION_COORDINATOR', 'PROCUREMENT_SPECIALIST'].includes(user.role)) {
      return createStandardErrorResponse('FORBIDDEN', 'Insufficient permissions to view inventory', 403)
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const inStock = searchParams.get('inStock')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (category) {
      where.category = category
    }

    if (inStock === 'true') {
      where.quantityInStock = { gt: 0 }
    } else if (inStock === 'false') {
      where.quantityInStock = { lte: 0 }
    }

    // Build order by clause
    const orderBy: any = {}
    if (sortBy === 'stock') {
      orderBy.quantityInStock = sortOrder
    } else if (sortBy === 'price') {
      orderBy.unitPrice = sortOrder
    } else {
      orderBy[sortBy] = sortOrder
    }

    const [parts, totalCount] = await Promise.all([
      prisma.part.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          partNumber: true,
          description: true,
          category: true,
          unitPrice: true,
          quantityInStock: true,
          minimumStockLevel: true,
          supplier: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              bomItems: true
            }
          }
        }
      }),
      prisma.part.count({ where })
    ])

    // Add computed fields
    const enrichedParts = parts.map(part => ({
      ...part,
      stockStatus: part.quantityInStock <= part.minimumStockLevel ? 'low' : 
                   part.quantityInStock === 0 ? 'out_of_stock' : 'in_stock',
      usageCount: part._count.bomItems,
      totalValue: part.quantityInStock * part.unitPrice
    }))

    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return createStandardAPIResponse({
      parts: enrichedParts,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        pageSize: limit,
        hasNextPage,
        hasPreviousPage
      },
      summary: {
        totalParts: totalCount,
        inStock: parts.filter(p => p.quantityInStock > 0).length,
        lowStock: parts.filter(p => p.quantityInStock <= p.minimumStockLevel && p.quantityInStock > 0).length,
        outOfStock: parts.filter(p => p.quantityInStock === 0).length
      }
    })

  } catch (error) {
    console.error('Error fetching inventory parts:', error)
    return createStandardErrorResponse('INTERNAL_ERROR', 'Failed to fetch inventory parts')
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

    // Check if user has permission to create parts
    if (!['ADMIN', 'PROCUREMENT_SPECIALIST'].includes(user.role)) {
      return createStandardErrorResponse('FORBIDDEN', 'Insufficient permissions to create parts', 403)
    }

    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['name', 'partNumber', 'category', 'unitPrice']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return createStandardErrorResponse(
        'VALIDATION_ERROR', 
        `Missing required fields: ${missingFields.join(', ')}`
      )
    }

    // Check if part number already exists
    const existingPart = await prisma.part.findUnique({
      where: { partNumber: body.partNumber }
    })

    if (existingPart) {
      return createStandardErrorResponse(
        'VALIDATION_ERROR',
        `Part with number ${body.partNumber} already exists`
      )
    }

    const newPart = await prisma.part.create({
      data: {
        name: body.name,
        partNumber: body.partNumber,
        description: body.description || null,
        category: body.category,
        unitPrice: parseFloat(body.unitPrice),
        quantityInStock: parseInt(body.quantityInStock || '0'),
        minimumStockLevel: parseInt(body.minimumStockLevel || '0'),
        supplier: body.supplier || null,
        specifications: body.specifications || null
      }
    })

    return createStandardAPIResponse({
      part: newPart,
      message: 'Part created successfully'
    }, 201)

  } catch (error) {
    console.error('Error creating part:', error)
    return createStandardErrorResponse('INTERNAL_ERROR', 'Failed to create part')
  } finally {
    await prisma.$disconnect()
  }
}