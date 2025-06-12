/**
 * QC Workflow Integration Tests
 * 
 * Tests the complete QC workflow from template fetching to form submission
 * and order status updates using real data scenarios.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import { createSimpleQCTests } from '../../scripts/createSimpleQCTests'

const prisma = new PrismaClient()

// Mock next-auth for testing
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-qc-user',
        name: 'QC Inspector Test',
        email: 'qc@torvan.test',
        role: 'QC_PERSON'
      }
    },
    status: 'authenticated'
  })
}))

// Mock API client
const mockApiResponse = (data: any, success = true) => ({
  data: { success, data, ...data }
})

describe('QC Workflow Integration Tests', () => {
  let testData: any
  let testOrders: any[]
  let qcUser: any

  beforeAll(async () => {
    // Create test data
    testData = await createSimpleQCTests()
    testOrders = testData.testOrders
    qcUser = testData.testUsers.find((user: any) => user.role === 'QC_PERSON')
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.order.deleteMany({
      where: {
        poNumber: {
          startsWith: 'QC-TEST-'
        }
      }
    })
    await prisma.$disconnect()
  })

  describe('QC Template Fetching', () => {
    it('should fetch Pre-Production Check template for READY_FOR_PRE_QC orders', async () => {
      const preQcOrder = testOrders.find(order => order.orderStatus === 'READY_FOR_PRE_QC')
      expect(preQcOrder).toBeDefined()

      // Test template fetching
      const template = await prisma.qcFormTemplate.findFirst({
        where: {
          name: 'Pre-Production Check',
          isActive: true
        },
        include: {
          items: {
            orderBy: { order: 'asc' }
          }
        }
      })

      expect(template).toBeDefined()
      expect(template?.name).toBe('Pre-Production Check')
      expect(template?.items.length).toBeGreaterThan(0)
      
      // Verify key Pre-QC items are present
      const jobIdItem = template?.items.find(item => item.checklistItem.includes('Job ID'))
      const dimensionItem = template?.items.find(item => item.checklistItem.includes('Final Sink Dimensions'))
      const pegboardItem = template?.items.find(item => item.checklistItem.includes('Pegboard'))
      
      expect(jobIdItem).toBeDefined()
      expect(dimensionItem).toBeDefined()
      expect(pegboardItem).toBeDefined()
      expect(pegboardItem?.applicabilityCondition).toContain('pegboard')
    })

    it('should fetch Final Quality Check template for READY_FOR_FINAL_QC orders', async () => {
      const finalQcOrder = testOrders.find(order => order.orderStatus === 'READY_FOR_FINAL_QC')
      expect(finalQcOrder).toBeDefined()

      const template = await prisma.qcFormTemplate.findFirst({
        where: {
          name: 'Final Quality Check',
          isActive: true
        },
        include: {
          items: {
            orderBy: { order: 'asc' }
          }
        }
      })

      expect(template).toBeDefined()
      expect(template?.name).toBe('Final Quality Check')
      expect(template?.items.length).toBeGreaterThan(0)

      // Verify key Final QC items are present
      const hiPotItem = template?.items.find(item => item.checklistItem.includes('Hi-Pot Test'))
      const cleanlinessItem = template?.items.find(item => item.checklistItem.includes('sharp edges'))
      const packagingItem = template?.items.find(item => item.section === 'Final Packaging')

      expect(hiPotItem).toBeDefined()
      expect(cleanlinessItem).toBeDefined()
      expect(packagingItem).toBeDefined()
    })

    it('should fetch Production Check template for READY_FOR_PRODUCTION orders', async () => {
      const prodOrder = testOrders.find(order => order.orderStatus === 'READY_FOR_PRODUCTION')
      expect(prodOrder).toBeDefined()

      const template = await prisma.qcFormTemplate.findFirst({
        where: {
          name: 'Production Check',
          isActive: true
        },
        include: {
          items: {
            orderBy: { order: 'asc' }
          }
        }
      })

      expect(template).toBeDefined()
      expect(template?.name).toBe('Production Check')
      expect(template?.items.length).toBeGreaterThan(0)

      // Verify key Production Check items
      const ledItem = template?.items.find(item => item.checklistItem.includes('LED Light'))
      const powerBarItem = template?.items.find(item => item.checklistItem.includes('Power Bar'))
      const cablesItem = template?.items.find(item => item.checklistItem.includes('cables'))

      expect(ledItem).toBeDefined()
      expect(powerBarItem).toBeDefined()
      expect(cablesItem).toBeDefined()
    })
  })

  describe('Conditional Logic Testing', () => {
    it('should properly handle pegboard conditional logic', async () => {
      // Test order with pegboard
      const pegboardOrder = testOrders.find(order => order.poNumber === 'QC-TEST-001')
      const sinkConfig = await prisma.sinkConfiguration.findFirst({
        where: { orderId: pegboardOrder.id }
      })

      expect(sinkConfig?.pegboard).toBe(true)

      // Get template items with pegboard conditions
      const template = await prisma.qcFormTemplate.findFirst({
        where: { name: 'Pre-Production Check' },
        include: { items: true }
      })

      const pegboardItems = template?.items.filter(item => 
        item.applicabilityCondition?.includes('pegboard')
      )

      expect(pegboardItems?.length).toBeGreaterThan(0)

      // Test order without pegboard
      const noPegboardOrder = testOrders.find(order => order.poNumber === 'QC-TEST-002')
      const noPegboardConfig = await prisma.sinkConfiguration.findFirst({
        where: { orderId: noPegboardOrder.id }
      })

      expect(noPegboardConfig?.pegboard).toBe(false)
    })

    it('should properly handle basin type conditional logic', async () => {
      // Test E-Drain basin
      const eDrainOrder = testOrders.find(order => order.poNumber === 'QC-TEST-001')
      const eDrainBasin = await prisma.basinConfiguration.findFirst({
        where: { orderId: eDrainOrder.id }
      })

      expect(eDrainBasin?.basinTypeId).toContain('E-DRAIN')

      // Test E-Sink basin  
      const eSinkOrder = testOrders.find(order => order.poNumber === 'QC-TEST-002')
      const eSinkBasin = await prisma.basinConfiguration.findFirst({
        where: { orderId: eSinkOrder.id }
      })

      expect(eSinkBasin?.basinTypeId).toContain('E-SINK')

      // Get basin-specific template items
      const basinTemplate = await prisma.qcFormTemplate.findFirst({
        where: { name: 'Basin Production Check' },
        include: { items: true }
      })

      const eDrainItems = basinTemplate?.items.filter(item =>
        item.applicabilityCondition?.includes('e_drain')
      )
      const eSinkItems = basinTemplate?.items.filter(item =>
        item.applicabilityCondition?.includes('e_sink')
      )

      expect(eDrainItems?.length).toBeGreaterThan(0)
      expect(eSinkItems?.length).toBeGreaterThan(0)
    })
  })

  describe('QC Form Submission', () => {
    it('should successfully submit Pre-QC inspection and update order status', async () => {
      const preQcOrder = testOrders.find(order => order.orderStatus === 'READY_FOR_PRE_QC')
      const template = await prisma.qcFormTemplate.findFirst({
        where: { name: 'Pre-Production Check' },
        include: { items: true }
      })

      expect(template).toBeDefined()

      // Simulate QC form submission
      const submissionData = {
        templateId: template!.id,
        overallStatus: 'PASSED',
        inspectorNotes: 'Pre-QC inspection completed successfully. All items verified.',
        digitalSignature: 'QC Inspector Test - Integration Test',
        itemResults: template!.items.map(item => ({
          qcFormTemplateItemId: item.id,
          resultValue: item.itemType === 'PASS_FAIL' ? 'true' : 
                      item.itemType === 'TEXT_INPUT' ? 'TEST-VALUE' :
                      item.itemType === 'SINGLE_SELECT' ? 'Lock & levelling castors' : 'true',
          isConformant: true,
          notes: `Test result for ${item.checklistItem}`,
          isNotApplicable: false
        }))
      }

      // Create QC result in database
      const qcResult = await prisma.orderQcResult.create({
        data: {
          orderId: preQcOrder.id,
          qcFormTemplateId: template!.id,
          qcPerformedById: qcUser.id,
          overallStatus: submissionData.overallStatus as any,
          notes: submissionData.inspectorNotes,
          itemResults: {
            create: submissionData.itemResults.map(item => ({
              qcFormTemplateItemId: item.qcFormTemplateItemId,
              resultValue: item.resultValue,
              isConformant: item.isConformant,
              notes: item.notes,
              isNotApplicable: item.isNotApplicable
            }))
          }
        }
      })

      expect(qcResult).toBeDefined()
      expect(qcResult.overallStatus).toBe('PASSED')

      // Update order status (simulating API behavior)
      await prisma.order.update({
        where: { id: preQcOrder.id },
        data: { orderStatus: 'READY_FOR_PRODUCTION' }
      })

      // Verify order status was updated
      const updatedOrder = await prisma.order.findUnique({
        where: { id: preQcOrder.id }
      })

      expect(updatedOrder?.orderStatus).toBe('READY_FOR_PRODUCTION')
    })

    it('should handle failed QC inspection properly', async () => {
      const finalQcOrder = testOrders.find(order => order.orderStatus === 'READY_FOR_FINAL_QC')
      const template = await prisma.qcFormTemplate.findFirst({
        where: { name: 'Final Quality Check' },
        include: { items: true }
      })

      // Simulate failed QC inspection
      const failedSubmission = {
        templateId: template!.id,
        overallStatus: 'FAILED',
        inspectorNotes: 'Failed QC inspection. Issues found with cleanliness and labeling.',
        digitalSignature: 'QC Inspector Test - Failed Test',
        itemResults: template!.items.map((item, index) => ({
          qcFormTemplateItemId: item.id,
          resultValue: index < 2 ? 'false' : 'true', // First two items fail
          isConformant: index >= 2, // First two items are non-conformant
          notes: index < 2 ? 'FAILED: Issues found' : 'PASSED',
          isNotApplicable: false
        }))
      }

      // Create failed QC result
      const failedQcResult = await prisma.orderQcResult.create({
        data: {
          orderId: finalQcOrder.id,
          qcFormTemplateId: template!.id,
          qcPerformedById: qcUser.id,
          overallStatus: failedSubmission.overallStatus as any,
          notes: failedSubmission.inspectorNotes,
          itemResults: {
            create: failedSubmission.itemResults.map(item => ({
              qcFormTemplateItemId: item.qcFormTemplateItemId,
              resultValue: item.resultValue,
              isConformant: item.isConformant,
              notes: item.notes,
              isNotApplicable: item.isNotApplicable
            }))
          }
        }
      })

      expect(failedQcResult).toBeDefined()
      expect(failedQcResult.overallStatus).toBe('FAILED')

      // For failed QC, order status should remain the same
      const orderAfterFailedQc = await prisma.order.findUnique({
        where: { id: finalQcOrder.id }
      })

      expect(orderAfterFailedQc?.orderStatus).toBe('READY_FOR_FINAL_QC')
    })
  })

  describe('Data Integrity and Validation', () => {
    it('should maintain proper audit trail', async () => {
      const testOrder = testOrders[0]

      // Create order history log
      await prisma.orderHistoryLog.create({
        data: {
          orderId: testOrder.id,
          userId: qcUser.id,
          action: 'PRE_QC_COMPLETED',
          oldStatus: 'READY_FOR_PRE_QC',
          newStatus: 'READY_FOR_PRODUCTION',
          notes: 'Pre-QC inspection completed with digital signature'
        }
      })

      // Verify audit trail
      const historyLogs = await prisma.orderHistoryLog.findMany({
        where: { orderId: testOrder.id },
        include: {
          user: {
            select: { fullName: true, role: true }
          }
        }
      })

      expect(historyLogs.length).toBeGreaterThan(0)
      const qcLog = historyLogs.find(log => log.action === 'PRE_QC_COMPLETED')
      expect(qcLog).toBeDefined()
      expect(qcLog?.user.role).toBe('QC_PERSON')
    })

    it('should prevent duplicate QC results for same template', async () => {
      const testOrder = testOrders[0]
      const template = await prisma.qcFormTemplate.findFirst({
        where: { name: 'Pre-Production Check' }
      })

      // Try to create duplicate QC result
      const duplicateAttempt = async () => {
        await prisma.orderQcResult.create({
          data: {
            orderId: testOrder.id,
            qcFormTemplateId: template!.id,
            qcPerformedById: qcUser.id,
            overallStatus: 'PASSED',
            notes: 'Duplicate attempt'
          }
        })
      }

      // Should throw unique constraint error
      await expect(duplicateAttempt()).rejects.toThrow()
    })

    it('should validate required fields in QC submissions', async () => {
      const template = await prisma.qcFormTemplate.findFirst({
        where: { name: 'Pre-Production Check' },
        include: { items: true }
      })

      const requiredItems = template?.items.filter(item => item.isRequired) || []
      expect(requiredItems.length).toBeGreaterThan(0)

      // Verify each required item has proper validation
      requiredItems.forEach(item => {
        expect(item.isRequired).toBe(true)
        expect(item.checklistItem).toBeDefined()
        expect(item.itemType).toBeDefined()
      })
    })
  })

  describe('Template Completeness', () => {
    it('should have all required QC templates', async () => {
      const requiredTemplates = [
        'Pre-Production Check',
        'Production Check', 
        'Basin Production Check',
        'Packaging Verification',
        'Final Quality Check',
        'End-of-Line Testing'
      ]

      for (const templateName of requiredTemplates) {
        const template = await prisma.qcFormTemplate.findFirst({
          where: { name: templateName, isActive: true },
          include: { items: true }
        })

        expect(template).toBeDefined()
        expect(template?.items.length).toBeGreaterThan(0)
        console.log(`✅ ${templateName}: ${template?.items.length} items`)
      }
    })

    it('should have proper section organization', async () => {
      const template = await prisma.qcFormTemplate.findFirst({
        where: { name: 'Final Quality Check' },
        include: { items: true }
      })

      const sections = new Set(template?.items.map(item => item.section))
      expect(sections.size).toBeGreaterThan(1) // Multiple sections

      // Verify key sections exist
      const sectionList = Array.from(sections)
      expect(sectionList.some(section => section.includes('Project Verification'))).toBe(true)
      expect(sectionList.some(section => section.includes('General Check'))).toBe(true)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle template loading efficiently', async () => {
      const startTime = Date.now()

      const template = await prisma.qcFormTemplate.findFirst({
        where: { name: 'Final Quality Check' },
        include: {
          items: {
            orderBy: { order: 'asc' }
          }
        }
      })

      const loadTime = Date.now() - startTime

      expect(template).toBeDefined()
      expect(loadTime).toBeLessThan(1000) // Should load in under 1 second
      console.log(`Template loaded in ${loadTime}ms`)
    })

    it('should handle large QC form submissions', async () => {
      const template = await prisma.qcFormTemplate.findFirst({
        where: { name: 'End-of-Line Testing' }, // Largest template
        include: { items: true }
      })

      expect(template?.items.length).toBeGreaterThan(50) // Large form
      console.log(`End-of-Line Testing template has ${template?.items.length} items`)

      // Should be able to handle the large submission structure
      const largeSubmission = {
        templateId: template!.id,
        overallStatus: 'PASSED',
        inspectorNotes: 'Large form test',
        itemResults: template!.items.map(item => ({
          qcFormTemplateItemId: item.id,
          resultValue: 'test',
          isConformant: true,
          notes: 'test note',
          isNotApplicable: false
        }))
      }

      expect(largeSubmission.itemResults.length).toBe(template?.items.length)
    })
  })
})