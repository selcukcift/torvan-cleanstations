import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser, checkUserRole } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schema for creating service orders
const ServiceOrderCreateSchema = z.object({
  items: z.array(z.object({
    partId: z.string(),
    quantityRequested: z.number().min(1),
    notes: z.string().optional()
  })).min(1),
  notes: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Build filter based on user role
    const where: any = {}
    
    if (user.role === 'SERVICE_DEPARTMENT') {
      // Service department can only see their own orders
      where.requestedById = user.id
    } else if (user.role === 'PROCUREMENT_SPECIALIST' || user.role === 'ADMIN') {
      // Procurement and admin can see all orders
      // No additional filter needed
    } else if (user.role === 'ASSEMBLER' || user.role === 'QC_PERSON' || user.role === 'PRODUCTION_COORDINATOR') {
      // Production staff can see approved and ordered service orders (for visibility into parts availability)
      where.status = { in: ['APPROVED', 'ORDERED', 'RECEIVED'] }
    } else {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Add status filter if provided
    if (status) {
      where.status = status
    }

    // Fetch service orders with pagination
    const [serviceOrders, totalCount] = await Promise.all([
      prisma.serviceOrder.findMany({
        where,
        include: {
          requestedBy: {
            select: {
              id: true,
              fullName: true,
              initials: true,
              email: true
            }
          },
          items: {
            include: {
              part: {
                select: {
                  partId: true,
                  name: true,
                  photoURL: true,
                  manufacturerPartNumber: true
                }
              }
            }
          }
        },
        orderBy: {
          requestTimestamp: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.serviceOrder.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data: {
        serviceOrders,
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
    console.error('Error fetching service orders:', error)
    
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

export async function POST(request: NextRequest) {
  try {
    // Authenticate user and check role
    const user = await getAuthUser()
    
    if (!checkUserRole(user, ['SERVICE_DEPARTMENT', 'ADMIN'])) {
      return NextResponse.json(
        { success: false, message: 'Only Service Department users can create service orders' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = ServiceOrderCreateSchema.parse(body)

    // Verify all parts exist
    const partIds = validatedData.items.map(item => item.partId)
    const parts = await prisma.part.findMany({
      where: { 
        partId: { in: partIds },
        // Optionally filter for service-appropriate parts
        // type: { in: ['COMPONENT', 'MATERIAL'] }
      },
      select: { partId: true, name: true }
    })

    if (parts.length !== partIds.length) {
      const missingParts = partIds.filter(id => !parts.find(p => p.partId === id))
      return NextResponse.json(
        { 
          success: false, 
          message: `Invalid part IDs: ${missingParts.join(', ')}` 
        },
        { status: 400 }
      )
    }

    // Create service order with items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the service order
      const serviceOrder = await tx.serviceOrder.create({
        data: {
          requestedById: user.id,
          notes: validatedData.notes || null,
          status: 'PENDING_APPROVAL'
        }
      })

      // Create service order items
      const serviceOrderItems = await Promise.all(
        validatedData.items.map(item =>
          tx.serviceOrderItem.create({
            data: {
              serviceOrderId: serviceOrder.id,
              partId: item.partId,
              quantityRequested: item.quantityRequested,
              notes: item.notes || null
            }
          })
        )
      )

      return { serviceOrder, serviceOrderItems }
    })

    // Fetch the complete service order with relations
    const completeServiceOrder = await prisma.serviceOrder.findUnique({
      where: { id: result.serviceOrder.id },
      include: {
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            initials: true,
            email: true
          }
        },
        items: {
          include: {
            part: {
              select: {
                partId: true,
                name: true,
                photoURL: true,
                manufacturerPartNumber: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Service order created successfully',
      data: completeServiceOrder
    })

  } catch (error) {
    console.error('Error creating service order:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation error', 
          errors: error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        },
        { status: 400 }
      )
    }

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