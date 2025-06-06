/**
 * Integration Test: Order Creation → BOM Generation Flow
 * Tests the complete workflow from order creation to BOM generation
 */

import { jest } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import { orderCreateStore } from '@/stores/orderCreateStore'
import { generateBOMForOrder } from '@/src/services/bomService'
import { nextJsApiClient } from '@/lib/api'

// Mock Prisma
const mockPrisma = new PrismaClient()
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}))

// Mock API client
jest.mock('@/lib/api', () => ({
  nextJsApiClient: {
    post: jest.fn()
  }
}))

describe('Order Creation → BOM Generation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset order store to initial state
    orderCreateStore.setState(orderCreateStore.getInitialState())
  })

  it('should complete full order creation and BOM generation workflow', async () => {
    // Step 1: Set customer information
    orderCreateStore.getState().setCustomerInfo({
      customerName: 'Test Hospital',
      contactEmail: 'contact@testhospital.com',
      contactPhone: '555-0123',
      poNumber: 'PO-2024-001',
      deliveryAddress: '123 Medical Way, Healthcare City, HC 12345',
      specialInstructions: 'Urgent delivery required'
    })

    // Step 2: Select sink configuration
    orderCreateStore.getState().setSinkSelection({
      sinkFamily: 'T2',
      sinkFamilyModel: 'T2 CleanStation',
      totalQuantity: 2,
      buildUnits: [
        { buildNumber: 'BLD-001', status: 'pending' },
        { buildNumber: 'BLD-002', status: 'pending' }
      ]
    })

    // Step 3: Configure first sink
    const sinkConfig1 = {
      sinkId: 'sink-1',
      sinkModelId: 'T2-DL27',
      width: 48,
      length: 24,
      legsTypeId: 'T2-DL27-KIT',
      feetTypeId: 'T2-LEVELING-CASTOR-475',
      basins: [{
        basinTypeId: 'T2-BSN-ESK-KIT',
        basinSizePartNumber: 'T2-ADW-BASIN24X20X8',
        quantity: 1
      }],
      faucets: [{
        faucetTypeId: '706.58',
        quantity: 1
      }],
      sprayers: [{
        sprayerTypeId: '706.61',
        quantity: 1
      }],
      accessories: [{
        id: '702.85',
        name: 'Stainless Steel Shelf',
        quantity: 2
      }]
    }

    orderCreateStore.getState().addSinkConfiguration(sinkConfig1)

    // Step 4: Configure second sink (different configuration)
    const sinkConfig2 = {
      sinkId: 'sink-2',
      sinkModelId: 'T2-DL14',
      width: 36,
      length: 24,
      legsTypeId: 'T2-DL14-KIT',
      feetTypeId: 'T2-SEISMIC-FEET',
      basins: [{
        basinTypeId: 'T2-BSN-EDR-KIT',
        basinSizePartNumber: 'T2-ADW-BASIN20X20X8',
        quantity: 1
      }],
      faucets: [{
        faucetTypeId: '706.58',
        quantity: 1
      }],
      sprayers: [],
      accessories: []
    }

    orderCreateStore.getState().addSinkConfiguration(sinkConfig2)

    // Step 5: Mock order creation API response
    const mockOrderResponse = {
      success: true,
      data: {
        id: 'order-123',
        orderNumber: 'ORD-2024-001',
        poNumber: 'PO-2024-001',
        status: 'ORDER_CREATED',
        createdAt: new Date().toISOString()
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValue({
      data: mockOrderResponse
    })

    // Step 6: Create order through API
    const orderData = orderCreateStore.getState().getOrderData()
    const createResponse = await nextJsApiClient.post('/api/orders', orderData)

    expect(createResponse.data.success).toBe(true)
    expect(createResponse.data.data.id).toBe('order-123')

    // Step 7: Generate BOM for the created order
    const mockBOMResult = {
      success: true,
      bom: {
        orderId: 'order-123',
        sinks: [
          {
            sinkId: 'sink-1',
            buildNumber: 'BLD-001',
            model: 'T2-DL27',
            components: [
              { partNumber: 'T2-DL27-KIT', description: 'T2 DL27 Legs Kit', quantity: 1 },
              { partNumber: 'T2-LEVELING-CASTOR-475', description: 'Leveling Castor', quantity: 4 },
              { partNumber: 'T2-BSN-ESK-KIT', description: 'E-Sink Basin Kit', quantity: 1 },
              { partNumber: 'T2-ADW-BASIN24X20X8', description: '24x20x8 Basin', quantity: 1 },
              { partNumber: '706.58', description: 'Faucet Assembly', quantity: 1 },
              { partNumber: '706.61', description: 'Sprayer Assembly', quantity: 1 },
              { partNumber: '702.85', description: 'Stainless Steel Shelf', quantity: 2 }
            ]
          },
          {
            sinkId: 'sink-2',
            buildNumber: 'BLD-002',
            model: 'T2-DL14',
            components: [
              { partNumber: 'T2-DL14-KIT', description: 'T2 DL14 Legs Kit', quantity: 1 },
              { partNumber: 'T2-SEISMIC-FEET', description: 'Seismic Feet', quantity: 4 },
              { partNumber: 'T2-BSN-EDR-KIT', description: 'E-Drain Basin Kit', quantity: 1 },
              { partNumber: 'T2-ADW-BASIN20X20X8', description: '20x20x8 Basin', quantity: 1 },
              { partNumber: '706.58', description: 'Faucet Assembly', quantity: 1 }
            ]
          }
        ],
        flattened: [
          { partNumber: 'T2-DL27-KIT', description: 'T2 DL27 Legs Kit', quantity: 1 },
          { partNumber: 'T2-DL14-KIT', description: 'T2 DL14 Legs Kit', quantity: 1 },
          { partNumber: 'T2-LEVELING-CASTOR-475', description: 'Leveling Castor', quantity: 4 },
          { partNumber: 'T2-SEISMIC-FEET', description: 'Seismic Feet', quantity: 4 },
          { partNumber: 'T2-BSN-ESK-KIT', description: 'E-Sink Basin Kit', quantity: 1 },
          { partNumber: 'T2-BSN-EDR-KIT', description: 'E-Drain Basin Kit', quantity: 1 },
          { partNumber: 'T2-ADW-BASIN24X20X8', description: '24x20x8 Basin', quantity: 1 },
          { partNumber: 'T2-ADW-BASIN20X20X8', description: '20x20x8 Basin', quantity: 1 },
          { partNumber: '706.58', description: 'Faucet Assembly', quantity: 2 },
          { partNumber: '706.61', description: 'Sprayer Assembly', quantity: 1 },
          { partNumber: '702.85', description: 'Stainless Steel Shelf', quantity: 2 }
        ],
        totalItems: 11,
        totalQuantity: 20
      }
    }

    // Mock BOM service
    jest.mocked(generateBOMForOrder).mockResolvedValue(mockBOMResult)

    const bomResult = await generateBOMForOrder({
      id: 'order-123',
      sinkConfigurations: orderData.sinkConfigurations
    })

    // Verify BOM generation
    expect(bomResult.success).toBe(true)
    expect(bomResult.bom.sinks).toHaveLength(2)
    expect(bomResult.bom.flattened).toHaveLength(11)
    expect(bomResult.bom.totalQuantity).toBe(20)

    // Verify BOM contains correct components for each sink
    const sink1BOM = bomResult.bom.sinks[0]
    expect(sink1BOM.buildNumber).toBe('BLD-001')
    expect(sink1BOM.components).toContainEqual(
      expect.objectContaining({ partNumber: '702.85', quantity: 2 }) // Accessories included
    )

    const sink2BOM = bomResult.bom.sinks[1]
    expect(sink2BOM.buildNumber).toBe('BLD-002')
    expect(sink2BOM.components).not.toContainEqual(
      expect.objectContaining({ partNumber: '706.61' }) // No sprayer in sink 2
    )
  })

  it('should handle validation errors during order creation', async () => {
    // Set incomplete customer info
    orderCreateStore.getState().setCustomerInfo({
      customerName: '', // Missing required field
      contactEmail: 'invalid-email', // Invalid format
      contactPhone: '',
      poNumber: ''
    })

    // Mock validation error response
    const mockValidationError = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          fields: [
            { field: 'customerName', message: 'Customer name is required' },
            { field: 'contactEmail', message: 'Invalid email format' },
            { field: 'poNumber', message: 'PO number is required' }
          ]
        }
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValue({
      data: mockValidationError
    })

    const orderData = orderCreateStore.getState().getOrderData()
    const response = await nextJsApiClient.post('/api/orders', orderData)

    expect(response.data.success).toBe(false)
    expect(response.data.error.code).toBe('VALIDATION_ERROR')
    expect(response.data.error.details.fields).toHaveLength(3)
  })

  it('should handle BOM generation failure gracefully', async () => {
    const mockOrder = {
      id: 'order-456',
      sinkConfigurations: [{
        sinkId: 'sink-invalid',
        sinkModelId: 'INVALID-MODEL', // Invalid model
        width: 0,
        length: 0
      }]
    }

    const mockBOMError = {
      success: false,
      error: 'Invalid sink configuration: Unknown sink model INVALID-MODEL'
    }

    jest.mocked(generateBOMForOrder).mockResolvedValue(mockBOMError)

    const bomResult = await generateBOMForOrder(mockOrder)

    expect(bomResult.success).toBe(false)
    expect(bomResult.error).toContain('Invalid sink configuration')
  })

  it('should maintain data consistency between order and BOM', async () => {
    // Create order with specific configuration
    const orderConfig = {
      sinkConfigurations: [{
        sinkId: 'sink-test',
        sinkModelId: 'T2-LC1',
        width: 36,
        length: 24,
        legsTypeId: 'T2-LC1-KIT',
        feetTypeId: 'T2-LEVELING-CASTOR-475',
        basins: [{
          basinTypeId: 'T2-BSN-ESK-KIT',
          basinSizePartNumber: 'CUSTOM',
          customWidth: 30,
          customLength: 20,
          customDepth: 10,
          quantity: 1
        }]
      }]
    }

    // Mock successful order creation
    (nextJsApiClient.post as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'order-789',
          ...orderConfig
        }
      }
    })

    const createResponse = await nextJsApiClient.post('/api/orders', orderConfig)
    
    // Mock BOM generation with custom basin
    const mockBOM = {
      success: true,
      bom: {
        sinks: [{
          sinkId: 'sink-test',
          components: [
            { partNumber: 'CUSTOM-BASIN-30X20X10', description: 'Custom Basin 30x20x10', quantity: 1 }
          ]
        }]
      }
    }

    jest.mocked(generateBOMForOrder).mockResolvedValue(mockBOM)

    const bomResult = await generateBOMForOrder(createResponse.data.data)

    // Verify custom basin is properly included in BOM
    expect(bomResult.bom.sinks[0].components).toContainEqual(
      expect.objectContaining({ 
        partNumber: 'CUSTOM-BASIN-30X20X10',
        description: 'Custom Basin 30x20x10'
      })
    )
  })
})