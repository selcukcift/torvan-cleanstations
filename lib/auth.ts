import { getServerSession } from 'next-auth/next'
import { NextRequest } from 'next/server'
import { authOptions } from './authOptions'

export interface AuthUser {
  id: string
  username: string
  email: string
  name: string
  role: string
  initials: string
}

/**
 * Get authenticated user from NextAuth session
 */
export async function getAuthUser(request?: NextRequest): Promise<AuthUser | null> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return null
    }

    return {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email!,
      name: session.user.name!,
      role: session.user.role,
      initials: session.user.initials
    }
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return null
  }
}

/**
 * Check if user has required role
 */
export function checkUserRole(user: AuthUser, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role)
}

/**
 * Check if user can access specific order
 */
export function canAccessOrder(user: AuthUser, order: any): boolean {
  // Admin can access all orders
  if (user.role === 'ADMIN') {
    return true
  }
  
  // Production Coordinator can access all orders
  if (user.role === 'PRODUCTION_COORDINATOR') {
    return true
  }
  
  // Order creator can access their own orders
  if (order.createdById === user.id) {
    return true
  }
  
  // Assemblers can access orders assigned to them or in specific statuses
  if (user.role === 'ASSEMBLER') {
    return order.currentAssignee === user.id || 
           ['READY_FOR_PRODUCTION', 'TESTING_COMPLETE'].includes(order.orderStatus)
  }
  
  // QC can access orders ready for QC
  if (user.role === 'QC_PERSON') {
    return ['READY_FOR_PRE_QC', 'READY_FOR_FINAL_QC'].includes(order.orderStatus)
  }
  
  // Procurement can access orders that need parts management
  if (user.role === 'PROCUREMENT_SPECIALIST') {
    return ['ORDER_CREATED', 'SINK_BODY_EXTERNAL_PRODUCTION'].includes(order.orderStatus)
  }
  
  return false
}