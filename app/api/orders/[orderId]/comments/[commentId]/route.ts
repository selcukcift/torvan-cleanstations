/**
 * Individual Order Comment API
 * Manages individual comment operations (update, delete, resolve)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'


// Validation schema for updating comments
const UpdateCommentSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  category: z.string().optional(),
  isResolved: z.boolean().optional(),
  mentions: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional()
})

// GET /api/orders/[orderId]/comments/[commentId] - Get specific comment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; commentId: string }> }
) {
  const { orderId, commentId } = await params
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const comment = await prisma.orderComment.findFirst({
      where: {
        id: commentId,
        orderId: orderId
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            initials: true,
            role: true
          }
        },
        resolver: {
          select: {
            id: true,
            fullName: true,
            initials: true,
            role: true
          }
        }
      }
    })

    if (!comment) {
      return NextResponse.json(
        { success: false, message: 'Comment not found' },
        { status: 404 }
      )
    }

    // Check if user can view internal comments
    if (comment.isInternal && !['ADMIN', 'PRODUCTION_COORDINATOR', 'QC_PERSON'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: comment
    })

  } catch (error) {
    console.error('Error fetching comment:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch comment' },
      { status: 500 }
    )
  }
}

// PUT /api/orders/[orderId]/comments/[commentId] - Update comment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; commentId: string }> }
) {
  const { orderId, commentId } = await params
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get existing comment
    const existingComment = await prisma.orderComment.findFirst({
      where: {
        id: commentId,
        orderId: orderId
      }
    })

    if (!existingComment) {
      return NextResponse.json(
        { success: false, message: 'Comment not found' },
        { status: 404 }
      )
    }

    // Check permissions: user can edit their own comments, or admins/coordinators can edit any
    const canEdit = existingComment.userId === user.id || 
                   ['ADMIN', 'PRODUCTION_COORDINATOR'].includes(user.role)

    if (!canEdit) {
      return NextResponse.json(
        { success: false, message: 'Permission denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = UpdateCommentSchema.parse(body)

    // Prepare update data
    const updateData: any = {
      ...validatedData,
      updatedAt: new Date()
    }

    // Handle resolution
    if (validatedData.isResolved !== undefined) {
      if (validatedData.isResolved && !existingComment.isResolved) {
        updateData.resolvedAt = new Date()
        updateData.resolvedBy = user.id
      } else if (!validatedData.isResolved) {
        updateData.resolvedAt = null
        updateData.resolvedBy = null
      }
    }

    const updatedComment = await prisma.orderComment.update({
      where: { id: commentId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            initials: true,
            role: true
          }
        },
        resolver: {
          select: {
            id: true,
            fullName: true,
            initials: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedComment,
      message: 'Comment updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid data', errors: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating comment:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update comment' },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[orderId]/comments/[commentId] - Delete comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; commentId: string }> }
) {
  const { orderId, commentId } = await params
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get existing comment
    const existingComment = await prisma.orderComment.findFirst({
      where: {
        id: commentId,
        orderId: orderId
      }
    })

    if (!existingComment) {
      return NextResponse.json(
        { success: false, message: 'Comment not found' },
        { status: 404 }
      )
    }

    // Check permissions: user can delete their own comments, or admins can delete any
    const canDelete = existingComment.userId === user.id || user.role === 'ADMIN'

    if (!canDelete) {
      return NextResponse.json(
        { success: false, message: 'Permission denied' },
        { status: 403 }
      )
    }

    // Delete the comment
    await prisma.orderComment.delete({
      where: { id: commentId }
    })

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}