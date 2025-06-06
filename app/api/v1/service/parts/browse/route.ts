/**
 * Service Parts Browse API Endpoint
 * Enhanced browsing functionality for service department parts catalog
 */

import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import {
  createSuccessResponse,
  createErrorResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
  createAPIResponse,
  getRequestId,
  handleAPIError,
  API_ERROR_CODES
} from '@/lib/apiResponse'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const partsQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(['COMPONENT', 'MATERIAL']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  assemblyType: z.enum(['SIMPLE', 'COMPLEX', 'SERVICE_PART', 'KIT']).optional(),
  inStock: z.string().transform(val => val === 'true').optional(),
  lowStock: z.string().transform(val => val === 'true').optional(),
  sortBy: z.enum(['name', 'partId', 'category', 'stock', 'recentlyUsed']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.string().transform(Number).pipe(z.number().int().positive()).default(1),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default(20)
})

const partDetailsQuerySchema = z.object({
  includeInventory: z.string().transform(val => val === 'true').default(false),
  includeUsage: z.string().transform(val => val === 'true').default(false),
  includeAlternatives: z.string().transform(val => val === 'true').default(false)
})

/**
 * GET /api/v1/service/parts/browse
 * Browse parts catalog with advanced filtering and search
 */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  
  try {
    const user = await getAuthUser()
    if (!user) {
      return createAPIResponse(
        createUnauthorizedResponse('Authentication required', requestId),
        401
      )
    }

    // Check permissions - Service department and higher roles
    if (!['ADMIN', 'PRODUCTION_COORDINATOR', 'PROCUREMENT_SPECIALIST', 'SERVICE_DEPARTMENT'].includes(user.role)) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Insufficient permissions to browse parts catalog'
        }, requestId),
        403
      )
    }

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    
    const validation = partsQuerySchema.safeParse(queryParams)
    if (!validation.success) {
      const validationErrors = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
      return createAPIResponse(
        createValidationErrorResponse(validationErrors, requestId),
        400
      )
    }

    const {
      search,
      category,
      type,
      status,
      assemblyType,
      inStock,
      lowStock,
      sortBy,
      sortOrder,
      page,
      limit
    } = validation.data

    const offset = (page - 1) * limit

    // Build where clause for parts
    const partsWhere: any = {}
    if (search) {
      partsWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { partId: { contains: search, mode: 'insensitive' } },
        { manufacturerPartNumber: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (type) partsWhere.type = type
    if (status) partsWhere.status = status

    // Build where clause for assemblies
    const assembliesWhere: any = {}
    if (search) {
      assembliesWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { assemblyId: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (assemblyType) assembliesWhere.type = assemblyType
    if (category) {
      assembliesWhere.subcategories = {
        some: {
          category: {
            categoryId: category
          }
        }
      }
    }

    // Get parts and assemblies in parallel
    const [parts, assemblies, partsCount, assembliesCount] = await Promise.all([
      // Parts query
      prisma.part.findMany({
        where: partsWhere,
        include: {
          serviceOrderItems: {
            include: {
              serviceOrder: {
                select: {
                  id: true,
                  requestTimestamp: true,
                  status: true
                }
              }
            },
            orderBy: {
              serviceOrder: {
                requestTimestamp: 'desc'
              }
            },
            take: 3
          },
          ...(inStock || lowStock ? {
            inventoryItems: {
              select: {
                quantityOnHand: true,
                quantityAvailable: true,
                reorderPoint: true,
                location: true
              }
            }
          } : {})
        },
        orderBy: getSortOrder(sortBy, sortOrder),
        skip: offset,
        take: limit
      }),
      
      // Assemblies query
      prisma.assembly.findMany({
        where: assembliesWhere,
        include: {
          subcategories: {
            include: {
              category: {
                select: {
                  categoryId: true,
                  name: true
                }
              }
            }
          },
          components: {
            include: {
              childPart: {
                select: {
                  partId: true,
                  name: true,
                  status: true
                }
              },
              childAssembly: {
                select: {
                  assemblyId: true,
                  name: true
                }
              }
            },
            take: 5
          }
        },
        orderBy: getSortOrder(sortBy, sortOrder, true),
        skip: Math.max(0, offset - limit), // Offset for assemblies
        take: limit
      }),

      // Counts
      prisma.part.count({ where: partsWhere }),
      prisma.assembly.count({ where: assembliesWhere })
    ])

    // Filter by stock levels if requested
    let filteredParts = parts
    if (inStock || lowStock) {
      filteredParts = parts.filter(part => {
        const inventory = part.inventoryItems?.[0]
        if (!inventory) return !inStock // If no inventory data, exclude from "in stock" filter
        
        if (inStock && inventory.quantityAvailable <= 0) return false
        if (lowStock && inventory.reorderPoint && inventory.quantityOnHand > inventory.reorderPoint) return false
        
        return true
      })
    }

    // Combine and format results
    const combinedResults = [
      ...filteredParts.map(part => ({
        id: part.partId,
        name: part.name,
        type: 'PART' as const,
        category: 'Part',
        partType: part.type,
        status: part.status,
        manufacturerPartNumber: part.manufacturerPartNumber,
        photoURL: part.photoURL,
        technicalDrawingURL: part.technicalDrawingURL,
        inventory: part.inventoryItems?.[0] ? {
          quantityOnHand: part.inventoryItems[0].quantityOnHand,
          quantityAvailable: part.inventoryItems[0].quantityAvailable,
          reorderPoint: part.inventoryItems[0].reorderPoint,
          location: part.inventoryItems[0].location,
          isLowStock: part.inventoryItems[0].reorderPoint 
            ? part.inventoryItems[0].quantityOnHand <= part.inventoryItems[0].reorderPoint
            : false
        } : null,
        recentUsage: part.serviceOrderItems.map(item => ({
          orderId: item.serviceOrder.id,
          requestDate: item.serviceOrder.requestTimestamp,
          status: item.serviceOrder.status,
          quantity: item.quantityRequested
        }))
      })),
      ...assemblies.map(assembly => ({
        id: assembly.assemblyId,
        name: assembly.name,
        type: 'ASSEMBLY' as const,
        category: assembly.subcategories[0]?.category.name || 'Uncategorized',
        assemblyType: assembly.type,
        categoryCode: assembly.categoryCode,
        subcategoryCode: assembly.subcategoryCode,
        componentCount: assembly.components.length,
        components: assembly.components.slice(0, 3).map(comp => ({
          type: comp.childPart ? 'part' : 'assembly',
          id: comp.childPart?.partId || comp.childAssembly?.assemblyId,
          name: comp.childPart?.name || comp.childAssembly?.name,
          quantity: comp.quantity
        })),
        qrData: assembly.qrData
      }))
    ]

    // Sort combined results if needed
    const sortedResults = sortCombinedResults(combinedResults, sortBy, sortOrder)

    // Add usage statistics
    const usageStats = await getUsageStats(
      filteredParts.map(p => p.partId),
      assemblies.map(a => a.assemblyId)
    )

    return createAPIResponse(
      createSuccessResponse({
        items: sortedResults,
        totalItems: partsCount + assembliesCount,
        partsCount,
        assembliesCount,
        usageStats,
        filters: {
          categories: await getAvailableCategories(),
          partTypes: ['COMPONENT', 'MATERIAL'],
          assemblyTypes: ['SIMPLE', 'COMPLEX', 'SERVICE_PART', 'KIT'],
          statuses: ['ACTIVE', 'INACTIVE']
        }
      }, { page, limit, total: partsCount + assembliesCount }, requestId)
    )

  } catch (error) {
    console.error('Error browsing parts catalog:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}

// Helper functions

function getSortOrder(sortBy: string, sortOrder: string, isAssembly = false) {
  const direction = sortOrder as 'asc' | 'desc'
  
  switch (sortBy) {
    case 'name':
      return { name: direction }
    case 'partId':
      return isAssembly ? { assemblyId: direction } : { partId: direction }
    case 'category':
      return isAssembly 
        ? { subcategories: { some: { category: { name: direction } } } }
        : { type: direction }
    case 'recentlyUsed':
      return isAssembly
        ? { updatedAt: 'desc' as const }
        : { serviceOrderItems: { some: { serviceOrder: { requestTimestamp: 'desc' as const } } } }
    default:
      return { name: direction }
  }
}

function sortCombinedResults(results: any[], sortBy: string, sortOrder: string) {
  return results.sort((a, b) => {
    let aValue, bValue
    
    switch (sortBy) {
      case 'name':
        aValue = a.name
        bValue = b.name
        break
      case 'category':
        aValue = a.category
        bValue = b.category
        break
      case 'partId':
        aValue = a.id
        bValue = b.id
        break
      default:
        aValue = a.name
        bValue = b.name
    }
    
    if (sortOrder === 'desc') {
      return bValue.localeCompare(aValue)
    }
    return aValue.localeCompare(bValue)
  })
}

async function getUsageStats(partIds: string[], assemblyIds: string[]) {
  const [recentOrders, popularParts] = await Promise.all([
    // Recent service orders
    prisma.serviceOrder.findMany({
      where: {
        items: {
          some: {
            partId: { in: partIds }
          }
        }
      },
      include: {
        items: {
          include: {
            part: {
              select: {
                partId: true,
                name: true
              }
            }
          }
        },
        requestedBy: {
          select: {
            fullName: true,
            initials: true
          }
        }
      },
      orderBy: {
        requestTimestamp: 'desc'
      },
      take: 10
    }),

    // Most requested parts
    prisma.serviceOrderItem.groupBy({
      by: ['partId'],
      where: {
        partId: { in: partIds }
      },
      _sum: {
        quantityRequested: true
      },
      _count: {
        partId: true
      },
      orderBy: {
        _sum: {
          quantityRequested: 'desc'
        }
      },
      take: 5
    })
  ])

  return {
    recentOrders: recentOrders.map(order => ({
      id: order.id,
      requestDate: order.requestTimestamp,
      status: order.status,
      requestedBy: order.requestedBy.fullName,
      itemCount: order.items.length,
      items: order.items.slice(0, 3).map(item => ({
        partId: item.part.partId,
        name: item.part.name,
        quantity: item.quantityRequested
      }))
    })),
    popularParts: popularParts.map(stat => ({
      partId: stat.partId,
      totalRequested: stat._sum.quantityRequested || 0,
      orderCount: stat._count.partId
    }))
  }
}

async function getAvailableCategories() {
  const categories = await prisma.category.findMany({
    include: {
      subcategories: {
        select: {
          subcategoryId: true,
          name: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  })

  return categories.map(cat => ({
    id: cat.categoryId,
    name: cat.name,
    subcategories: cat.subcategories
  }))
}