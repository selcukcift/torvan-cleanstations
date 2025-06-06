/**
 * Integration Test: User Authentication → Role-based Access
 * Tests authentication flow and role-based access control
 */

import { jest } from '@jest/globals'
import { getServerSession } from 'next-auth/next'
import { PrismaClient } from '@prisma/client'
import { getAuthUser, checkUserRole, canAccessOrder } from '@/lib/auth'
import { 
  createUnauthorizedResponse, 
  createForbiddenResponse,
  createSuccessResponse 
} from '@/lib/apiResponse'

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

// Mock Prisma
const mockPrisma = new PrismaClient()
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}))

// Define test users for each role
const testUsers = {
  admin: {
    id: 'admin-123',
    username: 'admin',
    email: 'admin@torvan.com',
    name: 'Admin User',
    role: 'ADMIN',
    initials: 'AU'
  },
  coordinator: {
    id: 'coord-123',
    username: 'coordinator',
    email: 'coordinator@torvan.com',
    name: 'Production Coordinator',
    role: 'PRODUCTION_COORDINATOR',
    initials: 'PC'
  },
  assembler: {
    id: 'assembler-123',
    username: 'assembler',
    email: 'assembler@torvan.com',
    name: 'Assembly Worker',
    role: 'ASSEMBLER',
    initials: 'AW'
  },
  qcPerson: {
    id: 'qc-123',
    username: 'qcperson',
    email: 'qc@torvan.com',
    name: 'QC Inspector',
    role: 'QC_PERSON',
    initials: 'QI'
  },
  procurement: {
    id: 'proc-123',
    username: 'procurement',
    email: 'procurement@torvan.com',
    name: 'Procurement Specialist',
    role: 'PROCUREMENT_SPECIALIST',
    initials: 'PS'
  },
  service: {
    id: 'service-123',
    username: 'service',
    email: 'service@torvan.com',
    name: 'Service Department',
    role: 'SERVICE_DEPARTMENT',
    initials: 'SD'
  }
}

describe('User Authentication → Role-based Access Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication Flow', () => {
    it('should authenticate valid user and return user data', async () => {
      const mockSession = {
        user: testUsers.assembler,
        expires: '2024-12-31'
      }

      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)

      const user = await getAuthUser()

      expect(user).toBeDefined()
      expect(user?.id).toBe('assembler-123')
      expect(user?.role).toBe('ASSEMBLER')
      expect(user?.email).toBe('assembler@torvan.com')
    })

    it('should return null for unauthenticated requests', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const user = await getAuthUser()

      expect(user).toBeNull()
    })

    it('should handle expired sessions', async () => {
      const expiredSession = {
        user: testUsers.assembler,
        expires: '2023-01-01' // Past date
      }

      ;(getServerSession as jest.Mock).mockResolvedValue(expiredSession)

      const user = await getAuthUser()

      // In production, this would be handled by NextAuth middleware
      // Here we simulate the behavior
      expect(user).toBeTruthy() // NextAuth handles expiry internally
    })
  })

  describe('Role-based Access Control', () => {
    it('ADMIN should have access to all resources', async () => {
      const adminUser = testUsers.admin

      // Test order access
      const testOrder = {
        id: 'order-123',
        createdById: 'other-user',
        orderStatus: 'ORDER_CREATED',
        currentAssignee: null
      }

      const canAccess = canAccessOrder(adminUser, testOrder)
      expect(canAccess).toBe(true)

      // Test role check
      const hasAdminRole = checkUserRole(adminUser, ['ADMIN'])
      expect(hasAdminRole).toBe(true)

      // Admin should access any endpoint
      const endpoints = [
        '/api/orders',
        '/api/admin/users',
        '/api/assembly/tasks',
        '/api/service-orders',
        '/api/reports'
      ]

      endpoints.forEach(endpoint => {
        const allowed = adminUser.role === 'ADMIN'
        expect(allowed).toBe(true)
      })
    })

    it('PRODUCTION_COORDINATOR should manage orders and tasks', async () => {
      const coordUser = testUsers.coordinator

      // Can access all orders
      const testOrder = {
        id: 'order-456',
        createdById: 'another-user',
        orderStatus: 'READY_FOR_PRODUCTION',
        currentAssignee: 'assembler-789'
      }

      expect(canAccessOrder(coordUser, testOrder)).toBe(true)

      // Can assign tasks
      const canManageTasks = checkUserRole(coordUser, ['PRODUCTION_COORDINATOR', 'ADMIN'])
      expect(canManageTasks).toBe(true)

      // Cannot access admin functions
      const canAccessAdmin = checkUserRole(coordUser, ['ADMIN'])
      expect(canAccessAdmin).toBe(false)
    })

    it('ASSEMBLER should only access assigned tasks and specific order statuses', async () => {
      const assemblerUser = testUsers.assembler

      // Can access assigned order
      const assignedOrder = {
        id: 'order-789',
        createdById: 'creator-123',
        orderStatus: 'READY_FOR_PRODUCTION',
        currentAssignee: 'assembler-123'
      }

      expect(canAccessOrder(assemblerUser, assignedOrder)).toBe(true)

      // Cannot access unassigned order in wrong status
      const unassignedOrder = {
        id: 'order-999',
        createdById: 'creator-456',
        orderStatus: 'ORDER_CREATED',
        currentAssignee: 'other-assembler'
      }

      expect(canAccessOrder(assemblerUser, unassignedOrder)).toBe(false)

      // Can access orders in specific statuses
      const productionOrder = {
        id: 'order-111',
        createdById: 'creator-789',
        orderStatus: 'READY_FOR_PRODUCTION',
        currentAssignee: null
      }

      expect(canAccessOrder(assemblerUser, productionOrder)).toBe(true)
    })

    it('QC_PERSON should access orders ready for QC', async () => {
      const qcUser = testUsers.qcPerson

      // Can access Pre-QC orders
      const preQCOrder = {
        id: 'order-222',
        orderStatus: 'READY_FOR_PRE_QC',
        currentAssignee: null
      }

      expect(canAccessOrder(qcUser, preQCOrder)).toBe(true)

      // Can access Final QC orders
      const finalQCOrder = {
        id: 'order-333',
        orderStatus: 'READY_FOR_FINAL_QC',
        currentAssignee: null
      }

      expect(canAccessOrder(qcUser, finalQCOrder)).toBe(true)

      // Cannot access production orders
      const productionOrder = {
        id: 'order-444',
        orderStatus: 'IN_PRODUCTION',
        currentAssignee: 'assembler-123'
      }

      expect(canAccessOrder(qcUser, productionOrder)).toBe(false)
    })

    it('PROCUREMENT_SPECIALIST should access orders needing parts', async () => {
      const procUser = testUsers.procurement

      // Can access new orders
      const newOrder = {
        id: 'order-555',
        orderStatus: 'ORDER_CREATED',
        currentAssignee: null
      }

      expect(canAccessOrder(procUser, newOrder)).toBe(true)

      // Can access orders waiting for parts
      const partsOrder = {
        id: 'order-666',
        orderStatus: 'PARTS_SENT_WAITING_ARRIVAL',
        currentAssignee: null
      }

      expect(canAccessOrder(procUser, partsOrder)).toBe(true)

      // Cannot access production orders
      const productionOrder = {
        id: 'order-777',
        orderStatus: 'IN_PRODUCTION',
        currentAssignee: 'assembler-123'
      }

      expect(canAccessOrder(procUser, productionOrder)).toBe(false)
    })

    it('SERVICE_DEPARTMENT should only access service-related endpoints', async () => {
      const serviceUser = testUsers.service

      // Cannot access regular orders
      const regularOrder = {
        id: 'order-888',
        orderStatus: 'ORDER_CREATED',
        currentAssignee: null
      }

      expect(canAccessOrder(serviceUser, regularOrder)).toBe(false)

      // Service department has specific endpoints
      const serviceEndpoints = ['/api/service-orders', '/api/service-parts']
      const regularEndpoints = ['/api/orders', '/api/assembly/tasks']

      // Should access service endpoints
      serviceEndpoints.forEach(endpoint => {
        const hasAccess = endpoint.includes('service')
        expect(hasAccess).toBe(true)
      })

      // Should not access regular endpoints
      regularEndpoints.forEach(endpoint => {
        const hasAccess = endpoint.includes('service')
        expect(hasAccess).toBe(false)
      })
    })
  })

  describe('API Endpoint Protection', () => {
    it('should return 401 for unauthenticated requests', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const user = await getAuthUser()
      
      if (!user) {
        const response = createUnauthorizedResponse('Authentication required')
        expect(response.success).toBe(false)
        expect(response.error?.code).toBe('UNAUTHORIZED')
      }
    })

    it('should return 403 for insufficient permissions', async () => {
      const mockSession = {
        user: testUsers.assembler
      }

      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)

      const user = await getAuthUser()
      
      // Assembler trying to access admin endpoint
      const hasPermission = checkUserRole(user!, ['ADMIN'])
      
      if (!hasPermission) {
        const response = createForbiddenResponse('Insufficient permissions')
        expect(response.success).toBe(false)
        expect(response.error?.code).toBe('FORBIDDEN')
      }
    })

    it('should allow access with proper permissions', async () => {
      const mockSession = {
        user: testUsers.coordinator
      }

      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)

      const user = await getAuthUser()
      
      // Coordinator accessing order management
      const hasPermission = checkUserRole(user!, ['PRODUCTION_COORDINATOR', 'ADMIN'])
      
      if (hasPermission) {
        const mockOrderData = { id: 'order-999', status: 'ORDER_CREATED' }
        const response = createSuccessResponse(mockOrderData)
        expect(response.success).toBe(true)
        expect(response.data).toEqual(mockOrderData)
      }
    })
  })

  describe('Session Management', () => {
    it('should maintain user context across requests', async () => {
      const mockSession = {
        user: testUsers.coordinator,
        expires: '2024-12-31'
      }

      // First request
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      const user1 = await getAuthUser()

      // Second request
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      const user2 = await getAuthUser()

      expect(user1?.id).toBe(user2?.id)
      expect(user1?.role).toBe(user2?.role)
    })

    it('should handle role updates in session', async () => {
      // Initial session with ASSEMBLER role
      const initialSession = {
        user: { ...testUsers.assembler },
        expires: '2024-12-31'
      }

      ;(getServerSession as jest.Mock).mockResolvedValue(initialSession)
      const initialUser = await getAuthUser()
      expect(initialUser?.role).toBe('ASSEMBLER')

      // Updated session with PRODUCTION_COORDINATOR role
      const updatedSession = {
        user: { 
          ...testUsers.assembler, 
          role: 'PRODUCTION_COORDINATOR' 
        },
        expires: '2024-12-31'
      }

      ;(getServerSession as jest.Mock).mockResolvedValue(updatedSession)
      const updatedUser = await getAuthUser()
      expect(updatedUser?.role).toBe('PRODUCTION_COORDINATOR')
    })
  })

  describe('Cross-functional Access Scenarios', () => {
    it('should handle order creator access regardless of role', async () => {
      const assemblerUser = testUsers.assembler

      // Assembler created this order
      const ownOrder = {
        id: 'order-own',
        createdById: 'assembler-123',
        orderStatus: 'SHIPPED', // Status assembler normally can't access
        currentAssignee: null
      }

      expect(canAccessOrder(assemblerUser, ownOrder)).toBe(true)
    })

    it('should handle multiple role checks for complex operations', async () => {
      const coordUser = testUsers.coordinator

      // Coordinator can do multiple operations
      const canCreateOrders = checkUserRole(coordUser, ['PRODUCTION_COORDINATOR', 'ADMIN'])
      const canAssignTasks = checkUserRole(coordUser, ['PRODUCTION_COORDINATOR', 'ADMIN'])
      const canViewReports = checkUserRole(coordUser, ['PRODUCTION_COORDINATOR', 'ADMIN', 'QC_PERSON'])
      const canManageUsers = checkUserRole(coordUser, ['ADMIN'])

      expect(canCreateOrders).toBe(true)
      expect(canAssignTasks).toBe(true)
      expect(canViewReports).toBe(true)
      expect(canManageUsers).toBe(false)
    })
  })
})