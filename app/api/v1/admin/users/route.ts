import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createStandardAPIResponse, createStandardErrorResponse } from '@/lib/apiResponse'
import { getAuthUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return createStandardErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    // Only admins can view all users
    if (user.role !== 'ADMIN') {
      return createStandardErrorResponse('FORBIDDEN', 'Only administrators can view user list', 403)
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search')
    const role = searchParams.get('role')
    const isActive = searchParams.get('isActive')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (role) {
      where.role = role
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    // Build order by clause
    const orderBy: any = {}
    if (sortBy === 'lastLogin') {
      orderBy.lastLoginAt = sortOrder
    } else if (sortBy === 'created') {
      orderBy.createdAt = sortOrder
    } else {
      orderBy[sortBy] = sortOrder
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              orders: true,
              assignedTasks: true,
              qcResults: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ])

    // Enrich users with activity data
    const enrichedUsers = users.map(user => ({
      ...user,
      orderCount: user._count.orders,
      taskCount: user._count.assignedTasks,
      qcCount: user._count.qcResults,
      status: user.isActive ? 'active' : 'inactive',
      daysSinceLogin: user.lastLoginAt ? 
        Math.floor((Date.now() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)) : null
    }))

    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    // Calculate summary statistics
    const roleDistribution = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
      where: { isActive: true }
    })

    return createStandardAPIResponse({
      users: enrichedUsers,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        pageSize: limit,
        hasNextPage,
        hasPreviousPage
      },
      summary: {
        totalUsers: totalCount,
        activeUsers: users.filter(u => u.isActive).length,
        inactiveUsers: users.filter(u => !u.isActive).length,
        roleDistribution: roleDistribution.reduce((acc, item) => {
          acc[item.role] = item._count
          return acc
        }, {} as Record<string, number>)
      }
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return createStandardErrorResponse('INTERNAL_ERROR', 'Failed to fetch users')
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return createStandardErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    // Only admins can create users
    if (user.role !== 'ADMIN') {
      return createStandardErrorResponse('FORBIDDEN', 'Only administrators can create users', 403)
    }

    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'username', 'password', 'role']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return createStandardErrorResponse(
        'VALIDATION_ERROR', 
        `Missing required fields: ${missingFields.join(', ')}`
      )
    }

    // Validate role
    const validRoles = ['ADMIN', 'PRODUCTION_COORDINATOR', 'PROCUREMENT_SPECIALIST', 'QC_PERSON', 'ASSEMBLER', 'SERVICE_DEPARTMENT']
    if (!validRoles.includes(body.role)) {
      return createStandardErrorResponse(
        'VALIDATION_ERROR',
        `Invalid role. Must be one of: ${validRoles.join(', ')}`
      )
    }

    // Check if email or username already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: body.email },
          { username: body.username }
        ]
      }
    })

    if (existingUser) {
      const field = existingUser.email === body.email ? 'email' : 'username'
      return createStandardErrorResponse(
        'VALIDATION_ERROR',
        `User with this ${field} already exists`
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 12)

    const newUser = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        username: body.username,
        password: hashedPassword,
        role: body.role,
        isActive: body.isActive !== undefined ? body.isActive : true
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    return createStandardAPIResponse({
      user: newUser,
      message: 'User created successfully'
    }, 201)

  } catch (error) {
    console.error('Error creating user:', error)
    return createStandardErrorResponse('INTERNAL_ERROR', 'Failed to create user')
  } finally {
    await prisma.$disconnect()
  }
}