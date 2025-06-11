/**
 * Order Comments API
 * Manages comments for specific orders
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schema for creating comments
const CreateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(2000, 'Comment too long'),
  isInternal: z.boolean().optional().default(false),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
  category: z.string().optional(),
  mentions: z.array(z.string()).optional().default([]),
  attachments: z.array(z.string()).optional().default([])
})

// GET /api/orders/[orderId]/comments - Get all comments for an order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get search parameters
    const { searchParams } = new URL(request.url)
    const includeInternal = searchParams.get('includeInternal') === 'true'
    const category = searchParams.get('category')
    const isResolved = searchParams.get('isResolved')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build filter conditions
    const whereConditions: any = {
      orderId: orderId
    }

    // Filter by internal status based on user role
    if (!includeInternal || !['ADMIN', 'PRODUCTION_COORDINATOR', 'QC_PERSON'].includes(user.role)) {
      whereConditions.isInternal = false
    }

    if (category) {
      whereConditions.category = category
    }

    if (isResolved !== null && isResolved !== undefined) {
      whereConditions.isResolved = isResolved === 'true'
    }

    // Get comments with user information
    const comments = await prisma.orderComment.findMany({
      where: whereConditions,
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
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Get total count for pagination
    const totalCount = await prisma.orderComment.count({
      where: whereConditions
    })

    // Get comment statistics
    const stats = await prisma.orderComment.groupBy({
      by: ['priority', 'isResolved', 'category'],
      where: { orderId: orderId },
      _count: true
    })

    return NextResponse.json({
      success: true,
      data: {
        comments,
        totalCount,
        stats,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      }
    })

  } catch (error) {
    console.error('Error fetching order comments:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

// POST /api/orders/[orderId]/comments - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, poNumber: true, customerName: true }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = CreateCommentSchema.parse(body)

    // Create the comment
    const comment = await prisma.orderComment.create({
      data: {
        orderId: orderId,
        userId: user.id,
        content: validatedData.content,
        isInternal: validatedData.isInternal,
        priority: validatedData.priority,
        category: validatedData.category,
        mentions: validatedData.mentions,
        attachments: validatedData.attachments
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            initials: true,
            role: true
          }
        }
      }
    })

    // Send notifications for mentions (async, non-blocking)
    if (validatedData.mentions.length > 0) {
      setImmediate(async () => {
        try {
          // Create notifications for mentioned users
          const notifications = validatedData.mentions.map(mentionedUserId => ({
            userId: mentionedUserId,
            message: `${user.fullName} mentioned you in a comment on order ${order.poNumber}`,
            linkToOrder: orderId,
            type: 'COMMENT_MENTION'
          }))

          await prisma.notification.createMany({
            data: notifications
          })
        } catch (error) {
          console.error('Failed to create mention notifications:', error)
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: comment,
      message: 'Comment created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid data', errors: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating order comment:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create comment' },
      { status: 500 }
    )
  }
}