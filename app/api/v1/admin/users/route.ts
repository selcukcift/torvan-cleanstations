import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Validation schemas
const CreateUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(1, 'Full name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'PRODUCTION_COORDINATOR', 'PROCUREMENT_SPECIALIST', 'QC_PERSON', 'ASSEMBLER', 'SERVICE_DEPARTMENT']),
  isActive: z.boolean().default(true),
  initials: z.string().min(1, 'Initials are required').max(3, 'Initials must be 3 characters or less')
})

// GET /api/v1/admin/users - Get all users
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        message: 'Admin access required' 
      }, { status: 403 })
    }

    const users = await prisma.user.findMany({
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
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      users
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST /api/v1/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ 
        success: false, 
        message: 'Admin access required' 
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = CreateUserSchema.parse(body)

    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: validatedData.username },
          { email: validatedData.email }
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: existingUser.username === validatedData.username 
          ? 'Username already exists' 
          : 'Email already exists'
      }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username: validatedData.username,
        email: validatedData.email,
        fullName: validatedData.fullName,
        passwordHash: hashedPassword,
        role: validatedData.role,
        isActive: validatedData.isActive,
        initials: validatedData.initials.toUpperCase()
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        initials: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      user: newUser,
      message: 'User created successfully'
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      }, { status: 400 })
    }

    console.error('Error creating user:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}