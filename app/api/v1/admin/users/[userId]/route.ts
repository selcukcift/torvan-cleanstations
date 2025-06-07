import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Validation schema for user updates
const UpdateUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  fullName: z.string().min(1, 'Full name is required').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.enum(['ADMIN', 'PRODUCTION_COORDINATOR', 'PROCUREMENT_SPECIALIST', 'QC_PERSON', 'ASSEMBLER', 'SERVICE_DEPARTMENT']).optional(),
  isActive: z.boolean().optional(),
  initials: z.string().min(1, 'Initials are required').max(3, 'Initials must be 3 characters or less').optional()
})

// PUT /api/v1/admin/users/[userId] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  try {
    const user = await getAuthUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        message: 'Admin access required' 
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = UpdateUserSchema.parse(body)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 })
    }

    // Check for username/email conflicts (excluding current user)
    if (validatedData.username || validatedData.email) {
      const conflictUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: userId } },
            {
              OR: [
                ...(validatedData.username ? [{ username: validatedData.username }] : []),
                ...(validatedData.email ? [{ email: validatedData.email }] : [])
              ]
            }
          ]
        }
      })

      if (conflictUser) {
        return NextResponse.json({
          success: false,
          message: conflictUser.username === validatedData.username 
            ? 'Username already exists' 
            : 'Email already exists'
        }, { status: 400 })
      }
    }

    // Prepare update data
    const updateData: any = {}
    
    if (validatedData.username) updateData.username = validatedData.username
    if (validatedData.email) updateData.email = validatedData.email
    if (validatedData.fullName) updateData.fullName = validatedData.fullName
    if (validatedData.role) updateData.role = validatedData.role
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive
    if (validatedData.initials) updateData.initials = validatedData.initials.toUpperCase()

    // Hash new password if provided
    if (validatedData.password) {
      updateData.passwordHash = await bcrypt.hash(validatedData.password, 12)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        initials: true,
        createdAt: true,
        lastLoginAt: true,
        loginAttempts: true,
        lockedUntil: true
      }
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      }, { status: 400 })
    }

    console.error('Error updating user:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}

// DELETE /api/v1/admin/users/[userId] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  try {
    const user = await getAuthUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        message: 'Admin access required' 
      }, { status: 403 })
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json({
        success: false,
        message: 'Cannot delete your own account'
      }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 })
    }

    // Check if user has associated data that would prevent deletion
    const userHasOrders = await prisma.order.findFirst({
      where: { createdById: userId }
    })

    if (userHasOrders) {
      return NextResponse.json({
        success: false,
        message: 'Cannot delete user with associated orders. Deactivate instead.'
      }, { status: 400 })
    }

    // Delete user (this will cascade to related records based on schema)
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}