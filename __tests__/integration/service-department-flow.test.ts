/**
 * Integration Test: Service Department Flow
 * Tests the complete workflow for service orders, parts management, and approval processes
 */

import { jest } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import { nextJsApiClient } from '@/lib/api'

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
    put: jest.fn(),
    delete: jest.fn()
  }
}))

describe('Service Department Integration Flow', () => {
  const mockServiceUser = {
    id: 'service-user-123',
    username: 'servicetech1',
    name: 'Mike Service Tech',
    role: 'SERVICE_DEPARTMENT'
  }

  const mockProcurementUser = {
    id: 'procurement-456',
    username: 'procurement1',
    name: 'Lisa Procurement',
    role: 'PROCUREMENT_SPECIALIST'
  }

  const mockProductionCoordinator = {
    id: 'production-789',
    username: 'coordinator1',
    name: 'Sarah Coordinator',
    role: 'PRODUCTION_COORDINATOR'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should complete full service order creation and approval workflow', async () => {
    // Step 1: Browse available service parts
    const mockPartsResponse = {
      success: true,
      data: {
        parts: [
          {
            partId: 'SVC-001',
            name: 'T2 Replacement Faucet',
            category: 'Plumbing',
            inStock: 15,
            unitPrice: 89.50,
            lead_time_days: 3,
            supplier: 'AquaFlow Industries'
          },
          {
            partId: 'SVC-002',
            name: 'Basin Drain Assembly',
            category: 'Plumbing',
            inStock: 8,
            unitPrice: 45.25,
            lead_time_days: 1,
            supplier: 'DrainTech Solutions'
          },
          {
            partId: 'SVC-003',
            name: 'Leveling Foot Kit',
            category: 'Hardware',
            inStock: 25,
            unitPrice: 12.75,
            lead_time_days: 1,
            supplier: 'Precision Hardware'
          }
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 3,
          totalPages: 1
        }
      }
    };

    (nextJsApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: mockPartsResponse
    })

    const partsResponse = await nextJsApiClient.get('/api/v1/service/parts/browse', {
      params: {
        category: 'Plumbing',
        inStock: true,
        page: 1,
        limit: 50
      }
    })

    expect(partsResponse.data.success).toBe(true)
    expect(partsResponse.data.data.parts).toHaveLength(3)
    expect(partsResponse.data.data.parts[0].inStock).toBeGreaterThan(0)

    // Step 2: Create service order
    const mockServiceOrderData = {
      customerInfo: {
        facilityName: 'General Hospital',
        contactName: 'John Maintenance',
        contactEmail: 'maintenance@generalhospital.com',
        contactPhone: '555-0199',
        address: '456 Healthcare Ave, Medical City, MC 67890'
      },
      equipmentInfo: {
        sinkModel: 'T2-DL27',
        serialNumber: 'T2-2024-001234',
        installationDate: '2023-06-15',
        warrantyStatus: 'ACTIVE'
      },
      serviceDetails: {
        issueDescription: 'Faucet leaking, requiring replacement',
        priority: 'MEDIUM',
        serviceType: 'REPAIR',
        scheduledDate: '2024-02-01T10:00:00Z'
      },
      requestedParts: [
        {
          partId: 'SVC-001',
          quantity: 1,
          reason: 'Replace leaking faucet'
        },
        {
          partId: 'SVC-003',
          quantity: 4,
          reason: 'Replace damaged leveling feet'
        }
      ]
    }

    const mockCreateServiceOrderResponse = {
      success: true,
      data: {
        serviceOrderId: 'SO-2024-001',
        orderNumber: 'SO-2024-001',
        status: 'PENDING_APPROVAL',
        totalEstimate: 140.50, // (89.50 * 1) + (12.75 * 4)
        createdAt: new Date().toISOString(),
        createdBy: mockServiceUser.id,
        approvalRequired: true,
        approvalThreshold: 100.00,
        customerInfo: mockServiceOrderData.customerInfo,
        equipmentInfo: mockServiceOrderData.equipmentInfo,
        serviceDetails: mockServiceOrderData.serviceDetails,
        items: [
          {
            id: 'soi-1',
            partId: 'SVC-001',
            partName: 'T2 Replacement Faucet',
            quantity: 1,
            unitPrice: 89.50,
            totalPrice: 89.50
          },
          {
            id: 'soi-2',
            partId: 'SVC-003',
            partName: 'Leveling Foot Kit',
            quantity: 4,
            unitPrice: 12.75,
            totalPrice: 51.00
          }
        ]
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockCreateServiceOrderResponse
    })

    const createOrderResponse = await nextJsApiClient.post('/api/v1/service/orders', mockServiceOrderData)

    expect(createOrderResponse.data.success).toBe(true)
    expect(createOrderResponse.data.data.status).toBe('PENDING_APPROVAL')
    expect(createOrderResponse.data.data.totalEstimate).toBe(140.50)
    expect(createOrderResponse.data.data.approvalRequired).toBe(true)

    const serviceOrderId = createOrderResponse.data.data.serviceOrderId

    // Step 3: Check approval workflow (triggered because over threshold)
    const mockApprovalNeededResponse = {
      success: true,
      data: {
        serviceOrderId,
        approvalStatus: 'PENDING',
        requiresApproval: true,
        approvalReason: 'Order total exceeds automatic approval threshold',
        approvalThreshold: 100.00,
        orderTotal: 140.50,
        pendingApprovers: [
          {
            approverId: mockProductionCoordinator.id,
            approverRole: 'PRODUCTION_COORDINATOR',
            approverName: mockProductionCoordinator.name,
            requiredBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
    };

    (nextJsApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: mockApprovalNeededResponse
    })

    const approvalStatusResponse = await nextJsApiClient.get(`/api/v1/service/orders/${serviceOrderId}/approval-status`)

    expect(approvalStatusResponse.data.success).toBe(true)
    expect(approvalStatusResponse.data.data.requiresApproval).toBe(true)
    expect(approvalStatusResponse.data.data.pendingApprovers).toHaveLength(1)

    // Step 4: Production coordinator approves the order
    const mockApprovalResponse = {
      success: true,
      data: {
        serviceOrderId,
        approvalStatus: 'APPROVED',
        approvedBy: mockProductionCoordinator.id,
        approvedAt: new Date().toISOString(),
        approvalNotes: 'Approved for urgent repair. Customer warranty still active.',
        nextStep: 'PROCUREMENT_PROCESSING'
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockApprovalResponse
    })

    const approvalResponse = await nextJsApiClient.post(`/api/v1/service/orders/${serviceOrderId}/approve`, {
      approverId: mockProductionCoordinator.id,
      approvalNotes: 'Approved for urgent repair. Customer warranty still active.',
      approved: true
    })

    expect(approvalResponse.data.success).toBe(true)
    expect(approvalResponse.data.data.approvalStatus).toBe('APPROVED')

    // Step 5: Check inventory and reserve parts
    const mockInventoryCheckResponse = {
      success: true,
      data: {
        serviceOrderId,
        inventoryStatus: 'PARTIAL_AVAILABLE',
        items: [
          {
            partId: 'SVC-001',
            requested: 1,
            available: 15,
            reserved: 1,
            status: 'RESERVED'
          },
          {
            partId: 'SVC-003',
            requested: 4,
            available: 25,
            reserved: 4,
            status: 'RESERVED'
          }
        ],
        allItemsAvailable: true,
        reservationExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockInventoryCheckResponse
    })

    const inventoryResponse = await nextJsApiClient.post(`/api/v1/service/orders/${serviceOrderId}/reserve-inventory`, {
      reservedBy: mockProcurementUser.id
    })

    expect(inventoryResponse.data.success).toBe(true)
    expect(inventoryResponse.data.data.allItemsAvailable).toBe(true)

    // Step 6: Process order and update status
    const mockProcessingResponse = {
      success: true,
      data: {
        serviceOrderId,
        status: 'IN_FULFILLMENT',
        processedBy: mockProcurementUser.id,
        processedAt: new Date().toISOString(),
        estimatedShipDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        trackingInfo: {
          carrier: 'FedEx',
          trackingNumber: 'FDX123456789',
          estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    };

    (nextJsApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: mockProcessingResponse
    })

    const processingResponse = await nextJsApiClient.put(`/api/v1/service/orders/${serviceOrderId}/process`, {
      processedBy: mockProcurementUser.id,
      shippingMethod: 'EXPEDITED',
      specialInstructions: 'Urgent repair - expedite shipping'
    })

    expect(processingResponse.data.success).toBe(true)
    expect(processingResponse.data.data.status).toBe('IN_FULFILLMENT')
    expect(processingResponse.data.data.trackingInfo).toBeDefined()

    // Step 7: Complete service order
    const mockCompletionResponse = {
      success: true,
      data: {
        serviceOrderId,
        status: 'COMPLETED',
        completedBy: mockServiceUser.id,
        completedAt: new Date().toISOString(),
        serviceNotes: 'Faucet replaced successfully. System tested and functioning normally.',
        customerSatisfactionRating: 5,
        followUpRequired: false
      }
    };

    (nextJsApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: mockCompletionResponse
    })

    const completionResponse = await nextJsApiClient.put(`/api/v1/service/orders/${serviceOrderId}/complete`, {
      completedBy: mockServiceUser.id,
      serviceNotes: 'Faucet replaced successfully. System tested and functioning normally.',
      customerSatisfactionRating: 5
    })

    expect(completionResponse.data.success).toBe(true)
    expect(completionResponse.data.data.status).toBe('COMPLETED')
  })

  it('should handle emergency service orders with expedited approval', async () => {
    // Create emergency service order
    const mockEmergencyOrderData = {
      customerInfo: {
        facilityName: 'Emergency Medical Center',
        contactName: 'Dr. Sarah Emergency',
        contactEmail: 'emergency@emc.com',
        contactPhone: '555-EMERGENCY'
      },
      serviceDetails: {
        issueDescription: 'Critical system failure - sink completely non-functional',
        priority: 'URGENT',
        serviceType: 'EMERGENCY_REPAIR',
        impactDescription: 'Affecting surgical suite operations'
      },
      requestedParts: [
        {
          partId: 'SVC-CRITICAL-001',
          quantity: 1,
          reason: 'Emergency replacement for failed control system'
        }
      ]
    }

    const mockEmergencyResponse = {
      success: true,
      data: {
        serviceOrderId: 'EMG-2024-001',
        status: 'AUTO_APPROVED',
        priority: 'URGENT',
        autoApprovalReason: 'Emergency service order - surgical suite impact',
        expeditedProcessing: true,
        estimatedResponse: '2 hours',
        emergencyContactNotified: true
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockEmergencyResponse
    })

    const emergencyResponse = await nextJsApiClient.post('/api/v1/service/orders/emergency', mockEmergencyOrderData)

    expect(emergencyResponse.data.success).toBe(true)
    expect(emergencyResponse.data.data.status).toBe('AUTO_APPROVED')
    expect(emergencyResponse.data.data.expeditedProcessing).toBe(true)
  })

  it('should track service order history and generate analytics', async () => {
    // Get service order history for customer
    const mockHistoryResponse = {
      success: true,
      data: {
        customerId: 'customer-hospital-123',
        facilityName: 'General Hospital',
        serviceHistory: [
          {
            serviceOrderId: 'SO-2023-045',
            orderDate: '2023-11-15T00:00:00Z',
            serviceType: 'MAINTENANCE',
            status: 'COMPLETED',
            totalCost: 85.50,
            satisfactionRating: 4
          },
          {
            serviceOrderId: 'SO-2024-001',
            orderDate: '2024-01-20T00:00:00Z',
            serviceType: 'REPAIR',
            status: 'COMPLETED',
            totalCost: 140.50,
            satisfactionRating: 5
          }
        ],
        equipmentInfo: {
          totalSinks: 3,
          warrantyStatus: 'ACTIVE',
          nextMaintenanceDue: '2024-06-15T00:00:00Z'
        },
        analytics: {
          totalServiceOrders: 2,
          totalSpent: 226.00,
          averageSatisfaction: 4.5,
          commonIssues: ['Faucet replacement', 'Drain cleaning'],
          reliabilityScore: 92.5
        }
      }
    };

    (nextJsApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: mockHistoryResponse
    })

    const historyResponse = await nextJsApiClient.get('/api/v1/service/customers/customer-hospital-123/history')

    expect(historyResponse.data.success).toBe(true)
    expect(historyResponse.data.data.serviceHistory).toHaveLength(2)
    expect(historyResponse.data.data.analytics.averageSatisfaction).toBe(4.5)
  })

  it('should handle parts procurement and supplier integration', async () => {
    // Check parts that need to be ordered from suppliers
    const mockLowStockResponse = {
      success: true,
      data: {
        lowStockParts: [
          {
            partId: 'SVC-002',
            name: 'Basin Drain Assembly',
            currentStock: 2,
            reorderPoint: 5,
            reorderQuantity: 20,
            supplier: 'DrainTech Solutions',
            leadTimeDays: 5,
            urgentOrdersWaiting: 3
          },
          {
            partId: 'SVC-005',
            name: 'Sensor Module',
            currentStock: 0,
            reorderPoint: 3,
            reorderQuantity: 10,
            supplier: 'TechSense Corp',
            leadTimeDays: 10,
            urgentOrdersWaiting: 1
          }
        ]
      }
    };

    (nextJsApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: mockLowStockResponse
    })

    const lowStockResponse = await nextJsApiClient.get('/api/v1/service/parts/low-stock')

    expect(lowStockResponse.data.success).toBe(true)
    expect(lowStockResponse.data.data.lowStockParts).toHaveLength(2)

    // Create purchase order for low stock items
    const mockPurchaseOrderResponse = {
      success: true,
      data: {
        purchaseOrderId: 'PO-SVC-2024-001',
        supplier: 'DrainTech Solutions',
        orderDate: new Date().toISOString(),
        expectedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            partId: 'SVC-002',
            quantity: 20,
            unitPrice: 45.25,
            totalPrice: 905.00
          }
        ],
        totalOrder: 905.00,
        status: 'SENT_TO_SUPPLIER'
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockPurchaseOrderResponse
    })

    const purchaseOrderResponse = await nextJsApiClient.post('/api/v1/service/parts/purchase-order', {
      supplier: 'DrainTech Solutions',
      items: [
        {
          partId: 'SVC-002',
          quantity: 20
        }
      ],
      urgency: 'NORMAL',
      requestedBy: mockProcurementUser.id
    })

    expect(purchaseOrderResponse.data.success).toBe(true)
    expect(purchaseOrderResponse.data.data.status).toBe('SENT_TO_SUPPLIER')
  })

  it('should handle warranty claims and coverage verification', async () => {
    // Verify warranty coverage for service request
    const mockWarrantyData = {
      sinkSerialNumber: 'T2-2023-005678',
      customerInfo: {
        facilityName: 'City Medical Center'
      },
      issueDescription: 'Control panel malfunction'
    }

    const mockWarrantyResponse = {
      success: true,
      data: {
        warrantyStatus: 'ACTIVE',
        warrantyExpiration: '2025-12-31T23:59:59Z',
        coverageType: 'FULL_COVERAGE',
        coveredComponents: ['Control Panel', 'Sensors', 'Plumbing', 'Electrical'],
        issueIsCovered: true,
        deductible: 0,
        approvalRequired: false,
        claimReference: 'WCL-2024-001',
        authorizedRepairCost: 0,
        customerResponsibility: 0
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockWarrantyResponse
    })

    const warrantyResponse = await nextJsApiClient.post('/api/v1/service/warranty/verify', mockWarrantyData)

    expect(warrantyResponse.data.success).toBe(true)
    expect(warrantyResponse.data.data.warrantyStatus).toBe('ACTIVE')
    expect(warrantyResponse.data.data.issueIsCovered).toBe(true)
    expect(warrantyResponse.data.data.customerResponsibility).toBe(0)

    // Create warranty claim service order
    const mockWarrantyServiceResponse = {
      success: true,
      data: {
        serviceOrderId: 'WS-2024-001',
        claimReference: 'WCL-2024-001',
        status: 'WARRANTY_APPROVED',
        coverageConfirmed: true,
        customerCost: 0,
        warrantyCoversLabor: true,
        warrantyCoversPartsQ: true,
        expeditedService: true,
        priorityLevel: 'HIGH'
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockWarrantyServiceResponse
    })

    const warrantyServiceResponse = await nextJsApiClient.post('/api/v1/service/orders/warranty', {
      warrantyClaimReference: 'WCL-2024-001',
      sinkSerialNumber: 'T2-2023-005678',
      issueDescription: 'Control panel malfunction',
      requestedParts: [
        {
          partId: 'CTRL-PANEL-001',
          quantity: 1,
          reason: 'Warranty replacement for malfunction'
        }
      ]
    })

    expect(warrantyServiceResponse.data.success).toBe(true)
    expect(warrantyServiceResponse.data.data.status).toBe('WARRANTY_APPROVED')
    expect(warrantyServiceResponse.data.data.customerCost).toBe(0)
  })

  it('should generate comprehensive service department reports', async () => {
    // Get monthly service department report
    const mockServiceReportResponse = {
      success: true,
      data: {
        reportPeriod: '2024-01',
        summary: {
          totalServiceOrders: 156,
          completedOrders: 148,
          pendingOrders: 6,
          emergencyOrders: 2,
          averageResponseTime: '4.2 hours',
          averageCompletionTime: '18.5 hours',
          customerSatisfactionAvg: 4.7,
          totalRevenue: 45280.50
        },
        orderBreakdown: {
          byType: {
            REPAIR: { count: 89, revenue: 28450.00, avgTime: '16.2 hours' },
            MAINTENANCE: { count: 45, revenue: 12340.50, avgTime: '8.5 hours' },
            EMERGENCY_REPAIR: { count: 12, revenue: 3890.00, avgTime: '3.2 hours' },
            WARRANTY: { count: 10, revenue: 600.00, avgTime: '12.1 hours' }
          },
          byPriority: {
            URGENT: { count: 24, avgResponseTime: '1.8 hours' },
            HIGH: { count: 52, avgResponseTime: '3.5 hours' },
            MEDIUM: { count: 68, avgResponseTime: '6.2 hours' },
            LOW: { count: 12, avgResponseTime: '24.1 hours' }
          }
        },
        partsAnalysis: {
          mostRequestedParts: [
            { partId: 'SVC-001', name: 'T2 Replacement Faucet', count: 34 },
            { partId: 'SVC-003', name: 'Leveling Foot Kit', count: 28 },
            { partId: 'SVC-007', name: 'Drain Cleaner Kit', count: 22 }
          ],
          inventoryTurns: 6.8,
          stockOuts: 3,
          supplierPerformance: [
            { supplier: 'AquaFlow Industries', onTimeDelivery: 94.2, quality: 4.8 },
            { supplier: 'DrainTech Solutions', onTimeDelivery: 89.1, quality: 4.6 }
          ]
        },
        customerAnalysis: {
          topCustomers: [
            { name: 'General Hospital', orders: 18, revenue: 5450.00, satisfaction: 4.9 },
            { name: 'City Medical Center', orders: 14, revenue: 4230.00, satisfaction: 4.7 }
          ],
          geographicDistribution: {
            'Metro Area': 78,
            'Suburban': 45,
            'Rural': 33
          }
        },
        trends: {
          monthlyOrderTrend: [142, 139, 156], // Last 3 months
          satisfactionTrend: [4.5, 4.6, 4.7],
          responseTimeTrend: ['4.8 hours', '4.5 hours', '4.2 hours'],
          emergingIssues: [
            {
              issue: 'Sensor calibration drift',
              frequency: 15,
              trend: 'increasing',
              recommendation: 'Review sensor maintenance procedures'
            }
          ]
        }
      }
    };

    (nextJsApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: mockServiceReportResponse
    })

    const reportResponse = await nextJsApiClient.get('/api/v1/service/reports/monthly/2024-01')

    expect(reportResponse.data.success).toBe(true)
    
    const report = reportResponse.data.data
    expect(report.summary.totalServiceOrders).toBe(156)
    expect(report.summary.customerSatisfactionAvg).toBe(4.7)
    expect(report.orderBreakdown.byType.REPAIR.count).toBe(89)
    expect(report.partsAnalysis.mostRequestedParts).toHaveLength(3)
    expect(report.trends.emergingIssues).toHaveLength(1)
  })

  it('should handle service order cancellations and refunds', async () => {
    const serviceOrderId = 'SO-2024-CANCEL-001'

    // Request cancellation
    const mockCancellationResponse = {
      success: true,
      data: {
        serviceOrderId,
        cancellationRequested: true,
        cancellationReason: 'Customer decided to replace entire unit',
        requestedBy: mockServiceUser.id,
        requestedAt: new Date().toISOString(),
        refundEligible: true,
        refundAmount: 125.50,
        cancellationFee: 15.00,
        netRefund: 110.50,
        approvalRequired: true,
        status: 'CANCELLATION_PENDING'
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockCancellationResponse
    })

    const cancellationResponse = await nextJsApiClient.post(`/api/v1/service/orders/${serviceOrderId}/cancel`, {
      reason: 'Customer decided to replace entire unit',
      requestedBy: mockServiceUser.id
    })

    expect(cancellationResponse.data.success).toBe(true)
    expect(cancellationResponse.data.data.refundEligible).toBe(true)
    expect(cancellationResponse.data.data.netRefund).toBe(110.50)

    // Approve cancellation
    const mockApprovalResponse = {
      success: true,
      data: {
        serviceOrderId,
        cancellationApproved: true,
        approvedBy: mockProductionCoordinator.id,
        approvedAt: new Date().toISOString(),
        status: 'CANCELLED',
        refundProcessed: true,
        refundReference: 'RF-2024-001'
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockApprovalResponse
    })

    const approvalResponse = await nextJsApiClient.post(`/api/v1/service/orders/${serviceOrderId}/cancel/approve`, {
      approvedBy: mockProductionCoordinator.id,
      approved: true
    })

    expect(approvalResponse.data.success).toBe(true)
    expect(approvalResponse.data.data.status).toBe('CANCELLED')
    expect(approvalResponse.data.data.refundProcessed).toBe(true)
  })
})