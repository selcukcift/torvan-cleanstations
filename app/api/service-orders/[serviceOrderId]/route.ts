import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser, checkUserRole } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schema for updating service orders (for procurement)
const ServiceOrderUpdateSchema = z.object({
  status: z.enum(['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ORDERED', 'RECEIVED']).optional(),
  procurementNotes: z.string().optional(),
  items: z.array(z.object({
    id: z.string(),
    quantityApproved: z.number().min(0).optional(),
    notes: z.string().optional()
  })).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceOrderId: string }> }
) {
  const { serviceOrderId } = await params;
  try {
    // Authenticate user
    const user = await getAuthUser()

    // Fetch the service order
    const serviceOrder = await prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      include: {
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            initials: true,
            email: true,
            role: true
          }
        },
        items: {
          include: {
            part: {
              select: {
                partId: true,
                name: true,
                photoURL: true,
                technicalDrawingURL: true,
                manufacturerPartNumber: true,
                type: true,
                status: true
              }
            }
          },
          orderBy: {
            part: {
              name: 'asc'
            }
          }
        }
      }
    })

    if (!serviceOrder) {
      return NextResponse.json(
        { success: false, message: 'Service order not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    const canAccess = 
      user.role === 'ADMIN' ||
      user.role === 'PROCUREMENT_SPECIALIST' ||
      (user.role === 'SERVICE_DEPARTMENT' && serviceOrder.requestedById === user.id)

    if (!canAccess) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: serviceOrder
    })

  } catch (error) {
    console.error('Error fetching service order:', error)
    
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ serviceOrderId: string }> }
) {
  const { serviceOrderId } = await params;
  try {
    // Authenticate user and check permissions
    const user = await getAuthUser()
    
    if (!checkUserRole(user, ['PROCUREMENT_SPECIALIST', 'ADMIN'])) {
      return NextResponse.json(
        { success: false, message: 'Only Procurement Specialists can update service orders' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = ServiceOrderUpdateSchema.parse(body)

    // Fetch existing service order
    const existingOrder = await prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      include: {
        items: true
      }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, message: 'Service order not found' },
        { status: 404 }
      )
    }

    // Update service order in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the main service order
      const updatedOrder = await tx.serviceOrder.update({
        where: { id: serviceOrderId },
        data: {
          status: validatedData.status || existingOrder.status,
          procurementNotes: validatedData.procurementNotes !== undefined 
            ? validatedData.procurementNotes 
            : existingOrder.procurementNotes
        }
      })

      // Update individual items if provided
      if (validatedData.items && validatedData.items.length > 0) {
        await Promise.all(
          validatedData.items.map(itemUpdate =>
            tx.serviceOrderItem.update({
              where: { id: itemUpdate.id },
              data: {
                quantityApproved: itemUpdate.quantityApproved,
                notes: itemUpdate.notes !== undefined ? itemUpdate.notes : undefined
              }
            })
          )
        )
      }

      return updatedOrder
    })

    // Fetch the complete updated service order
    const completeServiceOrder = await prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
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
      message: 'Service order updated successfully',
      data: completeServiceOrder
    })

  } catch (error) {
    console.error('Error updating service order:', error)
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serviceOrderId: string }> }
) {
  const { serviceOrderId } = await params;
  try {
    // Authenticate user
    const user = await getAuthUser()

    // Fetch the service order to check ownership
    const serviceOrder = await prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      select: { 
        id: true, 
        requestedById: true, 
        status: true 
      }
    })

    if (!serviceOrder) {
      return NextResponse.json(
        { success: false, message: 'Service order not found' },
        { status: 404 }
      )
    }

    // Check permissions: only the creator or admin can delete, and only if pending
    const canDelete = 
      (user.role === 'SERVICE_DEPARTMENT' && serviceOrder.requestedById === user.id) ||
      user.role === 'ADMIN'

    if (!canDelete) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    // Only allow deletion of pending orders
    if (serviceOrder.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { success: false, message: 'Can only delete pending service orders' },
        { status: 400 }
      )
    }

    // Delete the service order (cascade will handle items)
    await prisma.serviceOrder.delete({
      where: { id: serviceOrderId }
    })

    return NextResponse.json({
      success: true,
      message: 'Service order deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting service order:', error)
    
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