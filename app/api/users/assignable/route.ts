import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'

const prisma = new PrismaClient()

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

    // Check if user has permission to view assignable users
    if (user.role !== 'ADMIN' && user.role !== 'PRODUCTION_COORDINATOR') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const orderStatus = searchParams.get('orderStatus')

    // Build where clause
    let where: any = {
      isActive: true,
      role: {
        in: ['ASSEMBLER', 'QC_PERSON', 'PROCUREMENT_SPECIALIST']
      }
    }

    // Filter by specific role if provided
    if (role) {
      where.role = role
    }

    // Filter by appropriate roles for order status if provided
    if (orderStatus) {
      const appropriateRoles = getAppropriateRolesForStatus(orderStatus)
      where.role = {
        in: appropriateRoles
      }
    }

    // Get assignable users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        fullName: true,
        initials: true,
        role: true,
        isActive: true
      },
      orderBy: [
        { role: 'asc' },
        { fullName: 'asc' }
      ]
    })

    // Group users by role for easier frontend handling
    const groupedUsers = users.reduce((acc, user) => {
      if (!acc[user.role]) {
        acc[user.role] = []
      }
      acc[user.role].push(user)
      return acc
    }, {} as Record<string, typeof users>)

    return NextResponse.json({
      success: true,
      data: {
        users,
        grouped: groupedUsers,
        total: users.length
      }
    })

  } catch (error) {
    console.error('Error fetching assignable users:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to determine appropriate roles for order status (same as in assign route)
function getAppropriateRolesForStatus(status: string): string[] {
  switch (status) {
    case 'ORDER_CREATED':
    case 'PARTS_SENT_WAITING_ARRIVAL':
      return ['PROCUREMENT_SPECIALIST']
    case 'READY_FOR_PRE_QC':
    case 'READY_FOR_FINAL_QC':
      return ['QC_PERSON']
    case 'READY_FOR_PRODUCTION':
    case 'TESTING_COMPLETE':
    case 'PACKAGING_COMPLETE':
      return ['ASSEMBLER']
    default:
      return ['ASSEMBLER', 'QC_PERSON', 'PROCUREMENT_SPECIALIST']
  }
}