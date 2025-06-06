import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createStandardAPIResponse, createStandardErrorResponse } from '@/lib/apiResponse'
import { getAuthUser } from '@/lib/auth'

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const resolvedParams = await params
    const user = await getAuthUser()
    
    if (!user) {
      return createStandardErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    // Only admins can change user roles
    if (user.role !== 'ADMIN') {
      return createStandardErrorResponse('FORBIDDEN', 'Only administrators can change user roles', 403)
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.role) {
      return createStandardErrorResponse('VALIDATION_ERROR', 'Role is required')
    }

    // Validate role
    const validRoles = ['ADMIN', 'PRODUCTION_COORDINATOR', 'PROCUREMENT_SPECIALIST', 'QC_PERSON', 'ASSEMBLER', 'SERVICE_DEPARTMENT']
    if (!validRoles.includes(body.role)) {
      return createStandardErrorResponse(
        'VALIDATION_ERROR',
        `Invalid role. Must be one of: ${validRoles.join(', ')}`
      )
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: resolvedParams.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    })

    if (!targetUser) {
      return createStandardErrorResponse('NOT_FOUND', 'User not found', 404)
    }

    // Prevent self-demotion from admin
    if (user.id === resolvedParams.userId && user.role === 'ADMIN' && body.role !== 'ADMIN') {
      return createStandardErrorResponse(
        'VALIDATION_ERROR',
        'Cannot remove admin role from yourself'
      )
    }

    // Check if this would leave the system without any admins
    if (targetUser.role === 'ADMIN' && body.role !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: {
          role: 'ADMIN',
          isActive: true,
          id: { not: resolvedParams.userId }
        }
      })

      if (adminCount === 0) {
        return createStandardErrorResponse(
          'VALIDATION_ERROR',
          'Cannot remove admin role - system must have at least one active administrator'
        )
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.userId },
      data: { 
        role: body.role,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'ROLE_CHANGED',
        entityType: 'USER',
        entityId: resolvedParams.userId,
        userId: user.id,
        metadata: {
          previousRole: targetUser.role,
          newRole: body.role,
          targetUserName: targetUser.name,
          targetUserEmail: targetUser.email
        }
      }
    })

    return createStandardAPIResponse({
      user: updatedUser,
      message: `User role updated from ${targetUser.role} to ${body.role}`
    })

  } catch (error) {
    console.error('Error updating user role:', error)
    return createStandardErrorResponse('INTERNAL_ERROR', 'Failed to update user role')
  } finally {
    await prisma.$disconnect()
  }
}