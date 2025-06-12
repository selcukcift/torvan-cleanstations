/**
 * Recent Comments API
 * Retrieves recent comments across all orders for dashboard widgets
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'

const prisma = new PrismaClient()

// GET /api/comments/recent - Get recent comments across all orders
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only allow certain roles to view cross-order comments
    if (!['ADMIN', 'PRODUCTION_COORDINATOR', 'QC_PERSON'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get search parameters
    const { searchParams } = new URL(request.url)
    const includeInternal = searchParams.get('includeInternal') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')
    const isResolved = searchParams.get('isResolved')

    // Build filter conditions
    const whereConditions: {
      isInternal?: boolean;
      priority?: string;
      category?: string;
      isResolved?: boolean;
    } = {}

    // Filter by internal status based on user role and request
    if (!includeInternal || !['ADMIN', 'PRODUCTION_COORDINATOR', 'QC_PERSON'].includes(user.role)) {
      whereConditions.isInternal = false
    }

    if (priority) {
      whereConditions.priority = priority
    }

    if (category) {
      whereConditions.category = category
    }

    if (isResolved !== null && isResolved !== undefined) {
      whereConditions.isResolved = isResolved === 'true'
    }

    // Get recent comments with related data
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
        order: {
          select: {
            id: true,
            poNumber: true,
            customerName: true,
            orderStatus: true
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

    // Get statistics for summary
    const stats = await prisma.orderComment.groupBy({
      by: ['priority', 'isResolved'],
      where: whereConditions,
      _count: true
    })

    // Get total count for pagination
    const totalCount = await prisma.orderComment.count({
      where: whereConditions
    })

    // Calculate summary statistics
    const summary = {
      total: totalCount,
      unresolved: comments.filter(c => !c.isResolved).length,
      highPriority: comments.filter(c => ['HIGH', 'URGENT'].includes(c.priority)).length,
      categoryCounts: stats.reduce((acc, stat) => {
        acc[stat.priority] = (acc[stat.priority] || 0) + stat._count
        return acc
      }, {} as Record<string, number>)
    }

    return NextResponse.json({
      success: true,
      data: {
        comments,
        stats,
        summary,
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount
        }
      }
    })

  } catch (error) {
    console.error('Error fetching recent comments:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch recent comments' },
      { status: 500 }
    )
  }
}