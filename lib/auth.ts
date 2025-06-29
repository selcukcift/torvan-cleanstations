import { auth, currentUser } from "@clerk/nextjs/server"
import { NextRequest } from "next/server"
import { prisma } from "./prisma"

export interface AuthUser {
  id: string
  username: string
  email: string
  name: string
  role: string
  initials: string
  clerkId?: string
}

export async function getAuthUser(req?: NextRequest): Promise<AuthUser | null> {
  const { userId } = await auth()
  
  if (!userId) {
    return null
  }

  try {
    // Get user details from Clerk
    const clerkUser = await currentUser()
    if (!clerkUser) return null

    // Get additional user data from our database
    let dbUser = await prisma.user.findFirst({
      where: { 
        OR: [
          { clerkId: userId },
          { email: clerkUser.emailAddresses[0]?.emailAddress }
        ]
      }
    })

    if (!dbUser) {
      // Create user in database if not exists
      const email = clerkUser.emailAddresses[0]?.emailAddress || `${userId}@clerk.user`
      const username = clerkUser.username || email.split('@')[0]
      const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || username
      const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      
      dbUser = await prisma.user.create({
        data: {
          clerkId: userId,
          email,
          username,
          fullName,
          initials,
          role: (clerkUser.publicMetadata?.role as string) || 'ASSEMBLER',
          passwordHash: 'CLERK_USER' // Placeholder for Clerk users
        }
      })
    } else if (!dbUser.clerkId) {
      // Update existing user with Clerk ID
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { 
          clerkId: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress || dbUser.email
        }
      })
    }

    return {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      name: dbUser.fullName,
      role: dbUser.role,
      initials: dbUser.initials,
      clerkId: userId
    }
  } catch (error) {
    console.error('Error fetching user data:', error)
    return null
  }
}

export async function requireRole(roles: string[], request?: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(request)
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  if (!roles.includes(user.role)) {
    throw new Error(`Insufficient permissions. Required: ${roles.join(' or ')}, Got: ${user.role}`)
  }
  
  return user
}

export async function requireAdmin(request?: NextRequest): Promise<AuthUser> {
  return requireRole(['ADMIN'], request)
}

export function checkUserRole(user: AuthUser | null, allowedRoles: string[]): boolean {
  if (!user) return false
  return allowedRoles.includes(user.role)
}

export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false

  const rolePermissions: Record<string, string[]> = {
    'ADMIN': ['*'],
    'PRODUCTION_COORDINATOR': [
      'orders.create', 'orders.read', 'orders.update',
      'bom.generate', 'bom.read',
      'production.manage', 'qc.assign'
    ],
    'QC_PERSON': [
      'orders.read', 'qc.perform', 'qc.read', 'qc.update'
    ],
    'ASSEMBLER': [
      'orders.read', 'production.execute', 'tasks.update'
    ],
    'PROCUREMENT_SPECIALIST': [
      'parts.read', 'parts.order', 'suppliers.manage', 'service-orders.manage'
    ],
    'SERVICE_DEPARTMENT': [
      'service-orders.create', 'service-orders.read', 'service-orders.update',
      'parts.read'
    ]
  }

  const userPermissions = rolePermissions[user.role] || []
  
  if (userPermissions.includes('*')) {
    return true
  }
  
  return userPermissions.includes(permission)
}

export async function canAccessOrder(orderId: string, request?: NextRequest): Promise<boolean> {
  const user = await getAuthUser(request)
  
  if (!user) {
    return false
  }

  // Admin and production coordinators can access all orders
  if (user.role === 'ADMIN' || user.role === 'PRODUCTION_COORDINATOR') {
    return true
  }

  // Other roles can access orders based on their assignments
  // This is a simplified check - you may want to add more sophisticated logic
  return true
}