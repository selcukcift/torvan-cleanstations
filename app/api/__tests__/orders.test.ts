import { createMocks } from 'node-mocks-http'
import { POST } from '../orders/route'
import { GET as GET_ORDER } from '../orders/[orderId]/route'
import { prisma } from '@/lib/authOptions'
import { getAuthUser } from '@/lib/auth'

// Mock dependencies
jest.mock('@/lib/auth')
jest.mock('@/lib/authOptions', () => ({
  prisma: {
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    sinkConfiguration: {
      createMany: jest.fn(),
    },
    basinConfiguration: {
      createMany: jest.fn(),
    },
    faucetConfiguration: {
      createMany: jest.fn(),
    },
    sprayerConfiguration: {
      createMany: jest.fn(),
    },
    selectedAccessory: {
      createMany: jest.fn(),
    },
    orderHistoryLog: {
      create: jest.fn(),
    },
    bom: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}))

jest.mock('@/src/services/bomService', () => ({
  generateBOMForOrder: jest.fn(() => [
    {
      id: '709.82',
      name: 'T2-BODY-48-60-HA',
      quantity: 1,
      category: 'SINK_BODY',
      type: 'ASSEMBLY',
      components: []
    }
  ])
}))

describe('/api/orders', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAuthUser as jest.Mock).mockResolvedValue({
      id: 'test-user-id',
      username: 'testuser',
      role: 'PRODUCTION_COORDINATOR'
    })
  })

  describe('POST /api/orders', () => {
    it('creates an order successfully with valid data', async () => {
      const orderData = {
        customerInfo: {
          poNumber: 'PO-12345',
          customerName: 'Test Hospital',
          projectName: 'Test Project',
          salesPerson: 'John Doe',
          wantDate: '2025-12-31T00:00:00.000Z',
          language: 'EN',
          notes: 'Test notes'
        },
        sinkSelection: {
          sinkModelId: 'MDRD',
          quantity: 1,
          buildNumbers: ['BN-001']
        },
        configurations: {
          'BN-001': {
            sinkModelId: 'T2-B2',
            width: 60,
            length: 72,
            legTypeId: 'T2-DL27-KIT',
            feetTypeId: 'T2-LEVELING-CASTOR-475',
            workflowDirection: 'LEFT_TO_RIGHT',
            basins: [
              {
                basinType: 'E_SINK',
                basinTypeId: '713.109',
                basinSizePartNumber: '712.102'
              }
            ],
            faucets: [
              {
                faucetTypeId: '706.58',
                quantity: 1
              }
            ],
            controlBoxId: 'T2-CTRL-ESK1'
          }
        },
        accessories: {
          'BN-001': []
        }
      }

      ;(prisma.order.create as jest.Mock).mockResolvedValue({
        id: 'order-123',
        orderNumber: 'ORD-2025-0001',
        ...orderData.customerInfo,
        userId: 'test-user-id'
      })

      ;(prisma.$transaction as jest.Mock).mockResolvedValue({})

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: orderData,
      })

      const response = await POST(req as any)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.orderId).toBe('order-123')
      expect(json.message).toBe('Order created successfully')
      expect(prisma.order.create).toHaveBeenCalled()
    })

    it('returns 401 when not authenticated', async () => {
      ;(getAuthUser as jest.Mock).mockResolvedValue(null)

      const { req } = createMocks({
        method: 'POST',
        body: {},
      })

      const response = await POST(req as any)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.success).toBe(false)
      expect(json.message).toBe('Authentication required')
    })

    it('returns 403 when user lacks permissions', async () => {
      ;(getAuthUser as jest.Mock).mockResolvedValue({
        id: 'test-user-id',
        username: 'testuser',
        role: 'QC_PERSON' // No permission to create orders
      })

      const { req } = createMocks({
        method: 'POST',
        body: {},
      })

      const response = await POST(req as any)
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.message).toBe('Insufficient permissions to create orders')
    })

    it('returns 400 for validation errors', async () => {
      const invalidData = {
        customerInfo: {
          poNumber: '', // Required field
          customerName: 'Test',
          language: 'INVALID' // Invalid enum
        },
        sinkSelection: {},
        configurations: {},
        accessories: {}
      }

      const { req } = createMocks({
        method: 'POST',
        body: invalidData,
      })

      const response = await POST(req as any)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.message).toBe('Validation error')
      expect(json.errors).toBeDefined()
    })
  })

  describe('GET /api/orders/[orderId]', () => {
    it('retrieves order successfully', async () => {
      const mockOrder = {
        id: 'order-123',
        orderNumber: 'ORD-2025-0001',
        poNumber: 'PO-12345',
        customerName: 'Test Hospital',
        userId: 'test-user-id',
        user: {
          id: 'test-user-id',
          username: 'testuser'
        },
        sinkConfigurations: [],
        basinConfigurations: [],
        faucetConfigurations: [],
        sprayerConfigurations: [],
        selectedAccessories: [],
        generatedBoms: []
      }

      ;(prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder)

      const { req } = createMocks({
        method: 'GET',
      })

      const params = { orderId: 'order-123' }
      const response = await GET_ORDER(req as any, { params: Promise.resolve(params) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockOrder)
    })

    it('returns 404 when order not found', async () => {
      ;(prisma.order.findUnique as jest.Mock).mockResolvedValue(null)

      const { req } = createMocks({
        method: 'GET',
      })

      const params = { orderId: 'non-existent' }
      const response = await GET_ORDER(req as any, { params: Promise.resolve(params) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.message).toBe('Order not found')
    })

    it('returns 403 when user cannot access order', async () => {
      ;(getAuthUser as jest.Mock).mockResolvedValue({
        id: 'different-user',
        username: 'otheruser',
        role: 'ASSEMBLER'
      })

      const mockOrder = {
        id: 'order-123',
        userId: 'test-user-id', // Different from current user
        user: {
          id: 'test-user-id',
          username: 'testuser'
        }
      }

      ;(prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder)

      const { req } = createMocks({
        method: 'GET',
      })

      const params = { orderId: 'order-123' }
      const response = await GET_ORDER(req as any, { params: Promise.resolve(params) })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.message).toBe('You do not have permission to view this order')
    })
  })
})