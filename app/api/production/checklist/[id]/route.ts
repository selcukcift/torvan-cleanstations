import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

const UpdateChecklistSchema = z.object({
  sections: z.record(z.any()).optional(),
  signatures: z.record(z.any()).optional(),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED']).optional(),
  completedAt: z.string().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const checklist = await prisma.productionChecklist.findUnique({
      where: { id: params.id },
      include: {
        order: {
          select: {
            poNumber: true,
            customerName: true,
            orderStatus: true,
            wantDate: true,
            buildNumbers: true
          }
        },
        performer: {
          select: {
            fullName: true,
            initials: true,
            role: true
          }
        }
      }
    })

    if (!checklist) {
      return NextResponse.json(
        { success: false, message: 'Production checklist not found' },
        { status: 404 }
      )
    }

    // Role-based access control
    if (user.role === 'ASSEMBLER' && checklist.performedById !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Access denied - you can only view your own checklists' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: checklist
    })

  } catch (error) {
    console.error('Error fetching production checklist:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = UpdateChecklistSchema.parse(body)

    // Get existing checklist
    const existingChecklist = await prisma.productionChecklist.findUnique({
      where: { id: params.id },
      include: {
        order: true
      }
    })

    if (!existingChecklist) {
      return NextResponse.json(
        { success: false, message: 'Production checklist not found' },
        { status: 404 }
      )
    }

    // Role-based access control
    if (user.role === 'ASSEMBLER' && existingChecklist.performedById !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Access denied - you can only update your own checklists' },
        { status: 403 }
      )
    }

    // QC persons can only approve completed checklists
    if (user.role === 'QC_PERSON' && validatedData.status && validatedData.status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, message: 'QC personnel can only approve completed checklists' },
        { status: 403 }
      )
    }

    // Validate status transitions
    if (validatedData.status) {
      const validTransitions: Record<string, string[]> = {
        'DRAFT': ['IN_PROGRESS'],
        'IN_PROGRESS': ['COMPLETED', 'DRAFT'],
        'COMPLETED': ['APPROVED', 'IN_PROGRESS'],
        'APPROVED': [] // Final state
      }

      const allowedNext = validTransitions[existingChecklist.status] || []
      if (!allowedNext.includes(validatedData.status)) {
        return NextResponse.json(
          { success: false, message: `Invalid status transition from ${existingChecklist.status} to ${validatedData.status}` },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}
    
    if (validatedData.sections) {
      updateData.sections = validatedData.sections
    }
    
    if (validatedData.signatures) {
      updateData.signatures = validatedData.signatures
    }
    
    if (validatedData.status) {
      updateData.status = validatedData.status
      
      // Set completion timestamp when marked as completed
      if (validatedData.status === 'COMPLETED') {
        updateData.completedAt = new Date()
      }
    }

    if (validatedData.completedAt) {
      updateData.completedAt = new Date(validatedData.completedAt)
    }

    // Update checklist
    const updatedChecklist = await prisma.productionChecklist.update({
      where: { id: params.id },
      data: updateData,
      include: {
        order: {
          select: {
            poNumber: true,
            customerName: true,
            orderStatus: true
          }
        },
        performer: {
          select: {
            fullName: true,
            initials: true
          }
        }
      }
    })

    // Update order status if checklist is completed
    if (validatedData.status === 'COMPLETED') {
      // Check if all checklists for the order are completed
      const allChecklists = await prisma.productionChecklist.findMany({
        where: { orderId: existingChecklist.orderId }
      })

      const allCompleted = allChecklists.every(c => 
        c.id === params.id ? true : c.status === 'COMPLETED' || c.status === 'APPROVED'
      )

      if (allCompleted && existingChecklist.order.orderStatus === 'READY_FOR_PRODUCTION') {
        await prisma.order.update({
          where: { id: existingChecklist.orderId },
          data: { orderStatus: 'TESTING_COMPLETE' }
        })

        // Create history log
        await prisma.orderHistoryLog.create({
          data: {
            orderId: existingChecklist.orderId,
            userId: user.id,
            action: 'PRODUCTION_COMPLETED',
            oldStatus: 'READY_FOR_PRODUCTION',
            newStatus: 'TESTING_COMPLETE',
            notes: 'All production checklists completed'
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedChecklist,
      message: 'Production checklist updated successfully'
    })

  } catch (error) {
    console.error('Error updating production checklist:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only admins and production coordinators can delete checklists
    if (!['ADMIN', 'PRODUCTION_COORDINATOR'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to delete production checklists' },
        { status: 403 }
      )
    }

    const checklist = await prisma.productionChecklist.findUnique({
      where: { id: params.id }
    })

    if (!checklist) {
      return NextResponse.json(
        { success: false, message: 'Production checklist not found' },
        { status: 404 }
      )
    }

    // Cannot delete approved checklists
    if (checklist.status === 'APPROVED') {
      return NextResponse.json(
        { success: false, message: 'Cannot delete approved production checklists' },
        { status: 400 }
      )
    }

    await prisma.productionChecklist.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Production checklist deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting production checklist:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}