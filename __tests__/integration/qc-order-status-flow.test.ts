/**
 * Integration Test: QC Form Submission → Order Status Updates
 * Tests the workflow from QC form submission to order status transitions
 */

import { jest } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import { nextJsApiClient } from '@/lib/api'
import { StandardAPIResponse } from '@/lib/apiResponse'

// Mock Prisma
const mockPrisma = new PrismaClient()
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}))

// Mock API client
jest.mock('@/lib/api', () => ({
  nextJsApiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn()
  }
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
  getAuthUser: jest.fn().mockResolvedValue({
    id: 'qc-user-123',
    username: 'qcperson',
    email: 'qc@example.com',
    name: 'QC Person',
    role: 'QC_PERSON',
    initials: 'QP'
  })
}))

describe('QC Form Submission → Order Status Integration', () => {
  const mockOrder = {
    id: 'order-123',
    orderNumber: 'ORD-2024-001',
    poNumber: 'PO-2024-001',
    orderStatus: 'READY_FOR_PRE_QC',
    customerName: 'Test Hospital',
    qcResults: []
  }

  const mockQCTemplate = {
    id: 'template-1',
    name: 'T2 Sink Quality Control',
    formType: 'PRE_QC',
    isActive: true,
    sections: [
      {
        id: 'section-1',
        title: 'Visual Inspection',
        order: 1,
        fields: [
          {
            id: 'field-1',
            fieldName: 'surface_finish',
            fieldType: 'SELECT',
            label: 'Surface Finish Quality',
            required: true,
            options: ['Excellent', 'Good', 'Fair', 'Poor']
          },
          {
            id: 'field-2',
            fieldName: 'scratches_dents',
            fieldType: 'CHECKBOX',
            label: 'No visible scratches or dents',
            required: true
          }
        ]
      },
      {
        id: 'section-2',
        title: 'Dimensional Check',
        order: 2,
        fields: [
          {
            id: 'field-3',
            fieldName: 'width_measurement',
            fieldType: 'NUMBER',
            label: 'Width (inches)',
            required: true,
            validation: { min: 0, max: 100 }
          },
          {
            id: 'field-4',
            fieldName: 'length_measurement',
            fieldType: 'NUMBER',
            label: 'Length (inches)',
            required: true,
            validation: { min: 0, max: 100 }
          }
        ]
      }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should complete Pre-QC form submission and update order status', async () => {
    // Step 1: Get order details
    (nextJsApiClient.get as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/orders/order-123')) {
        return Promise.resolve({
          data: { success: true, data: mockOrder }
        })
      }
      if (url.includes('/api/orders/order-123/qc/template')) {
        return Promise.resolve({
          data: { success: true, data: mockQCTemplate }
        })
      }
      return Promise.resolve({ data: { success: true, data: null } })
    })

    // Step 2: Submit Pre-QC form
    const qcFormData = {
      orderId: 'order-123',
      templateId: 'template-1',
      qcType: 'PRE_QC',
      sections: [
        {
          sectionId: 'section-1',
          fields: [
            { fieldId: 'field-1', value: 'Excellent' },
            { fieldId: 'field-2', value: true }
          ]
        },
        {
          sectionId: 'section-2',
          fields: [
            { fieldId: 'field-3', value: 48 },
            { fieldId: 'field-4', value: 24 }
          ]
        }
      ],
      overallStatus: 'PASS',
      notes: 'All checks passed. Unit ready for production.'
    }

    const mockQCResponse = {
      success: true,
      data: {
        id: 'qc-result-1',
        orderId: 'order-123',
        templateId: 'template-1',
        qcType: 'PRE_QC',
        overallStatus: 'PASS',
        performedById: 'qc-user-123',
        performedAt: new Date().toISOString()
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValue({
      data: mockQCResponse
    })

    const qcResponse = await nextJsApiClient.post('/api/orders/order-123/qc', qcFormData)

    expect(qcResponse.data.success).toBe(true)
    expect(qcResponse.data.data.overallStatus).toBe('PASS')

    // Step 3: Update order status based on QC result
    const statusUpdateData = {
      newStatus: 'READY_FOR_PRODUCTION',
      notes: 'Pre-QC passed. Moving to production.'
    }

    const mockStatusUpdateResponse = {
      success: true,
      data: {
        ...mockOrder,
        orderStatus: 'READY_FOR_PRODUCTION',
        statusHistory: [
          {
            fromStatus: 'READY_FOR_PRE_QC',
            toStatus: 'READY_FOR_PRODUCTION',
            changedAt: new Date().toISOString(),
            changedById: 'qc-user-123',
            notes: 'Pre-QC passed. Moving to production.'
          }
        ]
      }
    };

    (nextJsApiClient.put as jest.Mock).mockResolvedValue({
      data: mockStatusUpdateResponse
    })

    const statusResponse = await nextJsApiClient.put(
      '/api/orders/order-123/status',
      statusUpdateData
    )

    expect(statusResponse.data.success).toBe(true)
    expect(statusResponse.data.data.orderStatus).toBe('READY_FOR_PRODUCTION')
    expect(statusResponse.data.data.statusHistory).toHaveLength(1)
  })

  it('should handle QC failure and update status appropriately', async () => {
    // Submit Pre-QC form with failures
    const failedQCData = {
      orderId: 'order-123',
      templateId: 'template-1',
      qcType: 'PRE_QC',
      sections: [
        {
          sectionId: 'section-1',
          fields: [
            { fieldId: 'field-1', value: 'Poor' },
            { fieldId: 'field-2', value: false }
          ]
        }
      ],
      overallStatus: 'FAIL',
      failureReasons: [
        'Poor surface finish quality',
        'Visible scratches and dents found'
      ],
      notes: 'Multiple quality issues found. Unit requires rework.'
    }

    const mockFailedQCResponse = {
      success: true,
      data: {
        id: 'qc-result-2',
        orderId: 'order-123',
        overallStatus: 'FAIL',
        failureReasons: failedQCData.failureReasons
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValue({
      data: mockFailedQCResponse
    })

    const qcResponse = await nextJsApiClient.post('/api/orders/order-123/qc', failedQCData)

    expect(qcResponse.data.data.overallStatus).toBe('FAIL')

    // Update order status to require rework
    const reworkStatusUpdate = {
      newStatus: 'PRE_QC_FAILED',
      notes: 'QC failed. Sending back for rework.',
      failureReasons: failedQCData.failureReasons
    }

    const mockReworkResponse = {
      success: true,
      data: {
        ...mockOrder,
        orderStatus: 'PRE_QC_FAILED',
        requiresRework: true
      }
    };

    (nextJsApiClient.put as jest.Mock).mockResolvedValue({
      data: mockReworkResponse
    })

    const statusResponse = await nextJsApiClient.put(
      '/api/orders/order-123/status',
      reworkStatusUpdate
    )

    expect(statusResponse.data.data.orderStatus).toBe('PRE_QC_FAILED')
    expect(statusResponse.data.data.requiresRework).toBe(true)
  })

  it('should handle Final QC after production completion', async () => {
    // Order is now in READY_FOR_FINAL_QC status
    const productionCompleteOrder = {
      ...mockOrder,
      orderStatus: 'READY_FOR_FINAL_QC',
      productionCompletedAt: new Date().toISOString()
    };

    (nextJsApiClient.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: productionCompleteOrder }
    })

    // Get Final QC template
    const finalQCTemplate = {
      ...mockQCTemplate,
      id: 'template-2',
      formType: 'FINAL_QC',
      name: 'T2 Sink Final Quality Control',
      sections: [
        ...mockQCTemplate.sections,
        {
          id: 'section-3',
          title: 'Functional Testing',
          order: 3,
          fields: [
            {
              id: 'field-5',
              fieldName: 'water_flow_test',
              fieldType: 'CHECKBOX',
              label: 'Water flow test passed',
              required: true
            },
            {
              id: 'field-6',
              fieldName: 'leak_test',
              fieldType: 'CHECKBOX',
              label: 'No leaks detected',
              required: true
            }
          ]
        }
      ]
    };

    (nextJsApiClient.get as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/orders/order-123/qc/template')) {
        return Promise.resolve({
          data: { success: true, data: finalQCTemplate }
        })
      }
      return Promise.resolve({ data: { success: true, data: null } })
    })

    // Submit Final QC
    const finalQCData = {
      orderId: 'order-123',
      templateId: 'template-2',
      qcType: 'FINAL_QC',
      sections: [
        {
          sectionId: 'section-1',
          fields: [
            { fieldId: 'field-1', value: 'Excellent' },
            { fieldId: 'field-2', value: true }
          ]
        },
        {
          sectionId: 'section-3',
          fields: [
            { fieldId: 'field-5', value: true },
            { fieldId: 'field-6', value: true }
          ]
        }
      ],
      overallStatus: 'PASS',
      notes: 'All final checks passed. Unit ready for shipping.'
    }

    const mockFinalQCResponse = {
      success: true,
      data: {
        id: 'qc-result-3',
        orderId: 'order-123',
        qcType: 'FINAL_QC',
        overallStatus: 'PASS'
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValue({
      data: mockFinalQCResponse
    })

    const finalQCResponse = await nextJsApiClient.post('/api/orders/order-123/qc', finalQCData)

    expect(finalQCResponse.data.data.overallStatus).toBe('PASS')

    // Update to ready for shipping
    const shippingStatusUpdate = {
      newStatus: 'READY_FOR_SHIPPING',
      notes: 'Final QC passed. Ready for shipping.'
    }

    const mockShippingResponse = {
      success: true,
      data: {
        ...productionCompleteOrder,
        orderStatus: 'READY_FOR_SHIPPING',
        qualityApprovedAt: new Date().toISOString()
      }
    };

    (nextJsApiClient.put as jest.Mock).mockResolvedValue({
      data: mockShippingResponse
    })

    const shippingResponse = await nextJsApiClient.put(
      '/api/orders/order-123/status',
      shippingStatusUpdate
    )

    expect(shippingResponse.data.data.orderStatus).toBe('READY_FOR_SHIPPING')
    expect(shippingResponse.data.data.qualityApprovedAt).toBeDefined()
  })

  it('should track QC history across multiple attempts', async () => {
    // Get order with existing QC history
    const orderWithHistory = {
      ...mockOrder,
      qcResults: [
        {
          id: 'qc-1',
          qcType: 'PRE_QC',
          overallStatus: 'FAIL',
          performedAt: '2024-01-01T10:00:00Z'
        },
        {
          id: 'qc-2',
          qcType: 'PRE_QC',
          overallStatus: 'PASS',
          performedAt: '2024-01-02T10:00:00Z'
        }
      ]
    };

    (nextJsApiClient.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: orderWithHistory }
    })

    // Get QC history
    const mockQCHistory = {
      success: true,
      data: {
        orderId: 'order-123',
        totalAttempts: 2,
        passRate: 0.5,
        history: orderWithHistory.qcResults,
        currentStatus: 'READY_FOR_PRODUCTION'
      }
    };

    (nextJsApiClient.get as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/orders/order-123/qc/history')) {
        return Promise.resolve({ data: mockQCHistory })
      }
      return Promise.resolve({ data: { success: true, data: null } })
    })

    const historyResponse = await nextJsApiClient.get('/api/orders/order-123/qc/history')

    expect(historyResponse.data.data.totalAttempts).toBe(2)
    expect(historyResponse.data.data.passRate).toBe(0.5)
    expect(historyResponse.data.data.history).toHaveLength(2)
  })
})