import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { testApiHandler } from 'next-test-api-route-handler'
import { PrismaClient } from '@prisma/client'
import GET_handler, { POST as POST_handler } from '@/app/api/v1/assembly/work-instructions/route'

const prisma = new PrismaClient()

// Mock NextAuth session
const mockSession = {
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'PRODUCTION_COORDINATOR'
  }
}

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve(mockSession))
}))

describe('/api/v1/assembly/work-instructions', () => {
  let testWorkInstructionId: string
  let testToolId: string

  beforeAll(async () => {
    // Create test data
    const testTool = await prisma.tool.create({
      data: {
        name: 'Test Torque Wrench',
        description: 'Test tool for work instructions',
        category: 'Hand Tools'
      }
    })
    testToolId = testTool.id
  })

  afterAll(async () => {
    // Cleanup test data
    await prisma.taskTool.deleteMany({
      where: {
        toolId: testToolId
      }
    })
    
    if (testWorkInstructionId) {
      await prisma.workInstructionStep.deleteMany({
        where: { workInstructionId: testWorkInstructionId }
      })
      await prisma.workInstruction.delete({
        where: { id: testWorkInstructionId }
      })
    }
    
    await prisma.tool.delete({
      where: { id: testToolId }
    })
    
    await prisma.$disconnect()
  })

  describe('GET /api/v1/assembly/work-instructions', () => {
    it('should return empty list when no work instructions exist', async () => {
      await testApiHandler({
        handler: GET_handler,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          const data = await res.json()
          
          expect(res.status).toBe(200)
          expect(data.success).toBe(true)
          expect(Array.isArray(data.data)).toBe(true)
          expect(data.metadata.pagination).toBeDefined()
        }
      })
    })

    it('should reject unauthenticated requests', async () => {
      // Temporarily override mock to return null
      const getServerSession = require('next-auth').getServerSession
      getServerSession.mockImplementationOnce(() => Promise.resolve(null))

      await testApiHandler({
        handler: GET_handler,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          const data = await res.json()
          
          expect(res.status).toBe(401)
          expect(data.success).toBe(false)
          expect(data.error.code).toBe('UNAUTHORIZED')
        }
      })
    })
  })

  describe('POST /api/v1/assembly/work-instructions', () => {
    it('should create a new work instruction with steps', async () => {
      const workInstructionData = {
        title: 'Test Assembly Instruction',
        description: 'Test description for assembly',
        version: '1.0',
        steps: [
          {
            stepNumber: 1,
            title: 'Step 1: Prepare Components',
            description: 'Gather all required components for assembly',
            estimatedMinutes: 15,
            checkpoints: ['Components counted', 'Quality check passed'],
            requiredToolIds: [testToolId]
          },
          {
            stepNumber: 2,
            title: 'Step 2: Initial Assembly',
            description: 'Begin assembling the main components',
            estimatedMinutes: 30,
            checkpoints: ['Main assembly complete', 'Torque specifications met'],
            requiredToolIds: [testToolId]
          }
        ]
      }

      await testApiHandler({
        handler: POST_handler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            body: JSON.stringify(workInstructionData),
            headers: {
              'Content-Type': 'application/json'
            }
          })
          const data = await res.json()
          
          expect(res.status).toBe(201)
          expect(data.success).toBe(true)
          expect(data.data.title).toBe(workInstructionData.title)
          expect(data.data.steps).toHaveLength(2)
          
          // Store ID for cleanup
          testWorkInstructionId = data.data.id
        }
      })
    })

    it('should reject invalid work instruction data', async () => {
      const invalidData = {
        title: '', // Empty title should fail validation
        steps: [
          {
            stepNumber: 0, // Invalid step number
            title: '',
            description: ''
          }
        ]
      }

      await testApiHandler({
        handler: POST_handler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            body: JSON.stringify(invalidData),
            headers: {
              'Content-Type': 'application/json'
            }
          })
          const data = await res.json()
          
          expect(res.status).toBe(400)
          expect(data.success).toBe(false)
          expect(data.error.code).toBe('VALIDATION_ERROR')
        }
      })
    })

    it('should reject requests from unauthorized roles', async () => {
      // Mock as assembler role
      const getServerSession = require('next-auth').getServerSession
      getServerSession.mockImplementationOnce(() => Promise.resolve({
        user: { ...mockSession.user, role: 'ASSEMBLER' }
      }))

      await testApiHandler({
        handler: POST_handler,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            body: JSON.stringify({
              title: 'Test Instruction',
              description: 'Test description'
            }),
            headers: {
              'Content-Type': 'application/json'
            }
          })
          const data = await res.json()
          
          expect(res.status).toBe(403)
          expect(data.success).toBe(false)
          expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS')
        }
      })
    })
  })

  describe('Response Format Validation', () => {
    it('should return standardized API response format', async () => {
      await testApiHandler({
        handler: GET_handler,
        test: async ({ fetch }) => {
          const res = await fetch({ method: 'GET' })
          const data = await res.json()
          
          // Validate standard response structure
          expect(data).toHaveProperty('success')
          expect(data).toHaveProperty('data')
          expect(data).toHaveProperty('error')
          expect(data).toHaveProperty('metadata')
          expect(data.metadata).toHaveProperty('timestamp')
          expect(data.metadata).toHaveProperty('version')
          expect(data.metadata.version).toBe('v1')
        }
      })
    })
  })
})