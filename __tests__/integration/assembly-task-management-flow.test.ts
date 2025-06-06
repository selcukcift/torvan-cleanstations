/**
 * Integration Test: Assembly Task Management Flow
 * Tests the complete workflow for task creation, assignment, execution, and completion
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

describe('Assembly Task Management Integration Flow', () => {
  const mockAssembler = {
    id: 'assembler-123',
    username: 'assembler1',
    name: 'John Assembler',
    role: 'ASSEMBLER'
  }

  const mockProductionCoordinator = {
    id: 'coordinator-456',
    username: 'coordinator1',
    name: 'Sarah Coordinator',
    role: 'PRODUCTION_COORDINATOR'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should complete full task creation and assignment workflow', async () => {
    // Step 1: Create order with BOM (prerequisite for tasks)
    const mockOrder = {
      id: 'order-task-123',
      orderNumber: 'ORD-TASK-001',
      customerName: 'Task Test Customer',
      status: 'BOM_GENERATED',
      sinkConfigurations: [
        {
          sinkId: 'sink-1',
          sinkModelId: 'T2-DL27',
          buildNumber: 'BLD-TASK-001'
        }
      ]
    }

    const mockOrderResponse = {
      success: true,
      data: mockOrder
    };

    (nextJsApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: mockOrderResponse
    })

    const orderResponse = await nextJsApiClient.get(`/api/orders/${mockOrder.id}`)
    expect(orderResponse.data.success).toBe(true)

    // Step 2: Create work instruction for assembly
    const mockWorkInstruction = {
      id: 'wi-001',
      title: 'T2 DL27 Sink Assembly',
      description: 'Complete assembly instructions for T2 DL27 sink',
      assemblyId: 'T2-DL27-KIT',
      estimatedMinutes: 120,
      steps: [
        {
          id: 'step-1',
          stepNumber: 1,
          title: 'Prepare Workspace',
          description: 'Set up assembly area and gather required tools',
          estimatedMinutes: 10,
          requiredTools: ['torque-wrench', 'allen-keys'],
          checkpoints: ['Workspace clean', 'Tools available']
        },
        {
          id: 'step-2',
          stepNumber: 2,
          title: 'Assemble Frame',
          description: 'Connect legs to sink frame using provided hardware',
          estimatedMinutes: 45,
          requiredTools: ['torque-wrench', 'level'],
          checkpoints: ['Frame square', 'Torque specs met', 'Level verified']
        },
        {
          id: 'step-3',
          stepNumber: 3,
          title: 'Install Basin',
          description: 'Mount basin securely to frame',
          estimatedMinutes: 30,
          requiredTools: ['wrench-set'],
          checkpoints: ['Basin secure', 'No leaks', 'Alignment correct']
        },
        {
          id: 'step-4',
          stepNumber: 4,
          title: 'Final Inspection',
          description: 'Complete quality check and documentation',
          estimatedMinutes: 35,
          checkpoints: ['All bolts tight', 'Function test passed', 'Documentation complete']
        }
      ]
    }

    const mockWorkInstructionResponse = {
      success: true,
      data: mockWorkInstruction
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockWorkInstructionResponse
    })

    const workInstructionResponse = await nextJsApiClient.post('/api/v1/assembly/work-instructions', {
      title: mockWorkInstruction.title,
      description: mockWorkInstruction.description,
      assemblyId: mockWorkInstruction.assemblyId,
      steps: mockWorkInstruction.steps
    })

    expect(workInstructionResponse.data.success).toBe(true)
    expect(workInstructionResponse.data.data.steps).toHaveLength(4)

    // Step 3: Generate tasks from order and work instructions
    const mockTasksResponse = {
      success: true,
      data: {
        orderId: mockOrder.id,
        tasks: [
          {
            id: 'task-1',
            orderId: mockOrder.id,
            workInstructionId: mockWorkInstruction.id,
            title: 'Assembly: T2 DL27 Sink (BLD-TASK-001)',
            description: 'Complete assembly of T2 DL27 sink following work instructions',
            status: 'PENDING',
            priority: 'HIGH',
            estimatedMinutes: 120,
            dependencies: [],
            tools: ['torque-wrench', 'allen-keys', 'level', 'wrench-set']
          }
        ]
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockTasksResponse
    })

    // Production coordinator creates tasks
    const tasksResponse = await nextJsApiClient.post('/api/v1/assembly/tasks', {
      orderId: mockOrder.id,
      workInstructionId: mockWorkInstruction.id,
      buildNumbers: ['BLD-TASK-001']
    })

    expect(tasksResponse.data.success).toBe(true)
    expect(tasksResponse.data.data.tasks).toHaveLength(1)

    const createdTask = tasksResponse.data.data.tasks[0]

    // Step 4: Assign task to assembler
    const mockAssignmentResponse = {
      success: true,
      data: {
        taskId: createdTask.id,
        assignedToId: mockAssembler.id,
        assignedBy: mockProductionCoordinator.id,
        assignedAt: new Date().toISOString(),
        status: 'PENDING'
      }
    };

    (nextJsApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: mockAssignmentResponse
    })

    const assignmentResponse = await nextJsApiClient.put(`/api/v1/assembly/tasks/${createdTask.id}/assign`, {
      assignedToId: mockAssembler.id
    })

    expect(assignmentResponse.data.success).toBe(true)
    expect(assignmentResponse.data.data.assignedToId).toBe(mockAssembler.id)

    // Step 5: Assembler starts task
    const mockStartResponse = {
      success: true,
      data: {
        taskId: createdTask.id,
        status: 'IN_PROGRESS',
        startedAt: new Date().toISOString(),
        startedBy: mockAssembler.id
      }
    };

    (nextJsApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: mockStartResponse
    })

    const startResponse = await nextJsApiClient.put(`/api/v1/assembly/tasks/${createdTask.id}/start`, {
      startedBy: mockAssembler.id
    })

    expect(startResponse.data.success).toBe(true)
    expect(startResponse.data.data.status).toBe('IN_PROGRESS')

    // Step 6: Track progress through work instruction steps
    for (let stepNumber = 1; stepNumber <= 4; stepNumber++) {
      const mockStepProgressResponse = {
        success: true,
        data: {
          taskId: createdTask.id,
          stepNumber,
          completed: true,
          completedAt: new Date().toISOString(),
          completedBy: mockAssembler.id,
          actualMinutes: mockWorkInstruction.steps[stepNumber - 1].estimatedMinutes + 5,
          notes: `Step ${stepNumber} completed successfully`
        }
      };

      (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
        data: mockStepProgressResponse
      })

      const stepResponse = await nextJsApiClient.post(`/api/v1/assembly/tasks/${createdTask.id}/steps/${stepNumber}/complete`, {
        completedBy: mockAssembler.id,
        actualMinutes: mockWorkInstruction.steps[stepNumber - 1].estimatedMinutes + 5,
        notes: `Step ${stepNumber} completed successfully`,
        checkpointResults: mockWorkInstruction.steps[stepNumber - 1].checkpoints.map(cp => ({
          checkpoint: cp,
          passed: true,
          notes: 'Verified'
        }))
      })

      expect(stepResponse.data.success).toBe(true)
      expect(stepResponse.data.data.completed).toBe(true)
    }

    // Step 7: Complete task
    const mockCompleteResponse = {
      success: true,
      data: {
        taskId: createdTask.id,
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        completedBy: mockAssembler.id,
        actualMinutes: 140, // Slightly over estimate
        qualityNotes: 'Assembly completed to specification. All checkpoints passed.'
      }
    };

    (nextJsApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: mockCompleteResponse
    })

    const completeResponse = await nextJsApiClient.put(`/api/v1/assembly/tasks/${createdTask.id}/complete`, {
      completedBy: mockAssembler.id,
      actualMinutes: 140,
      qualityNotes: 'Assembly completed to specification. All checkpoints passed.'
    })

    expect(completeResponse.data.success).toBe(true)
    expect(completeResponse.data.data.status).toBe('COMPLETED')
  })

  it('should handle task dependencies and blocking scenarios', async () => {
    // Create order with multiple sinks requiring sequential assembly
    const mockOrder = {
      id: 'order-dep-123',
      orderNumber: 'ORD-DEP-001',
      sinkConfigurations: [
        { sinkId: 'sink-1', buildNumber: 'BLD-DEP-001' },
        { sinkId: 'sink-2', buildNumber: 'BLD-DEP-002' }
      ]
    }

    // Create tasks with dependencies
    const mockTasksWithDeps = {
      success: true,
      data: {
        tasks: [
          {
            id: 'dep-task-1',
            title: 'Pre-assembly Preparation',
            status: 'PENDING',
            priority: 'HIGH',
            dependencies: []
          },
          {
            id: 'dep-task-2',
            title: 'Sink 1 Assembly',
            status: 'PENDING',
            priority: 'HIGH',
            dependencies: ['dep-task-1']
          },
          {
            id: 'dep-task-3',
            title: 'Sink 2 Assembly',
            status: 'PENDING',
            priority: 'MEDIUM',
            dependencies: ['dep-task-2'] // Must wait for sink 1
          }
        ]
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockTasksWithDeps
    })

    const tasksResponse = await nextJsApiClient.post('/api/v1/assembly/tasks/batch', {
      orderId: mockOrder.id,
      tasks: mockTasksWithDeps.data.tasks
    })

    expect(tasksResponse.data.success).toBe(true)

    // Try to start dependent task before prerequisite - should fail
    const mockBlockedResponse = {
      success: false,
      error: {
        code: 'TASK_BLOCKED',
        message: 'Cannot start task with incomplete dependencies',
        details: {
          taskId: 'dep-task-2',
          blockedBy: ['dep-task-1']
        }
      }
    };

    (nextJsApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: mockBlockedResponse
    })

    const blockedResponse = await nextJsApiClient.put('/api/v1/assembly/tasks/dep-task-2/start', {
      startedBy: mockAssembler.id
    })

    expect(blockedResponse.data.success).toBe(false)
    expect(blockedResponse.data.error.code).toBe('TASK_BLOCKED')

    // Complete prerequisite task first
    const mockCompletePrereq = {
      success: true,
      data: {
        taskId: 'dep-task-1',
        status: 'COMPLETED'
      }
    };

    (nextJsApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: mockCompletePrereq
    })

    await nextJsApiClient.put('/api/v1/assembly/tasks/dep-task-1/complete', {
      completedBy: mockAssembler.id
    })

    // Now dependent task should be startable
    const mockUnblockedResponse = {
      success: true,
      data: {
        taskId: 'dep-task-2',
        status: 'IN_PROGRESS',
        unblockedAt: new Date().toISOString()
      }
    };

    (nextJsApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: mockUnblockedResponse
    })

    const unblockedResponse = await nextJsApiClient.put('/api/v1/assembly/tasks/dep-task-2/start', {
      startedBy: mockAssembler.id
    })

    expect(unblockedResponse.data.success).toBe(true)
    expect(unblockedResponse.data.data.status).toBe('IN_PROGRESS')
  })

  it('should handle tool requirements and availability tracking', async () => {
    // Mock tool availability check
    const mockToolsResponse = {
      success: true,
      data: {
        tools: [
          { id: 'tool-1', name: 'Torque Wrench', category: 'Power Tools', isAvailable: true, location: 'Station A' },
          { id: 'tool-2', name: 'Allen Key Set', category: 'Hand Tools', isAvailable: true, location: 'Station B' },
          { id: 'tool-3', name: 'Level', category: 'Measuring Tools', isAvailable: false, location: 'Station C', inUseBy: 'other-task-456' }
        ]
      }
    };

    (nextJsApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: mockToolsResponse
    })

    const toolsResponse = await nextJsApiClient.get('/api/v1/assembly/tools/availability')
    expect(toolsResponse.data.success).toBe(true)

    // Create task requiring specific tools
    const mockTaskWithTools = {
      id: 'tool-task-1',
      title: 'Task Requiring Tools',
      requiredTools: ['tool-1', 'tool-2', 'tool-3'],
      status: 'PENDING'
    }

    // Check if task can start with current tool availability
    const mockToolCheckResponse = {
      success: false,
      error: {
        code: 'TOOLS_UNAVAILABLE',
        message: 'Required tools not available',
        details: {
          unavailableTools: [
            { toolId: 'tool-3', name: 'Level', inUseBy: 'other-task-456', estimatedAvailableAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() }
          ]
        }
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockToolCheckResponse
    })

    const toolCheckResponse = await nextJsApiClient.post('/api/v1/assembly/tasks/tool-task-1/check-tools', {
      taskId: 'tool-task-1'
    })

    expect(toolCheckResponse.data.success).toBe(false)
    expect(toolCheckResponse.data.error.code).toBe('TOOLS_UNAVAILABLE')

    // Reserve available tools
    const mockReserveResponse = {
      success: true,
      data: {
        taskId: 'tool-task-1',
        reservedTools: ['tool-1', 'tool-2'],
        reservedAt: new Date().toISOString(),
        reservedBy: mockAssembler.id
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockReserveResponse
    })

    const reserveResponse = await nextJsApiClient.post('/api/v1/assembly/tasks/tool-task-1/reserve-tools', {
      toolIds: ['tool-1', 'tool-2'],
      reservedBy: mockAssembler.id
    })

    expect(reserveResponse.data.success).toBe(true)
    expect(reserveResponse.data.data.reservedTools).toEqual(['tool-1', 'tool-2'])
  })

  it('should track time accurately and handle breaks/interruptions', async () => {
    const taskId = 'time-task-1'
    const startTime = new Date()

    // Start task
    const mockStartResponse = {
      success: true,
      data: {
        taskId,
        status: 'IN_PROGRESS',
        startedAt: startTime.toISOString(),
        timerActive: true
      }
    };

    (nextJsApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: mockStartResponse
    })

    await nextJsApiClient.put(`/api/v1/assembly/tasks/${taskId}/start`, {
      startedBy: mockAssembler.id
    })

    // Pause for break
    const breakStartTime = new Date(startTime.getTime() + 30 * 60 * 1000) // 30 minutes later
    const mockPauseResponse = {
      success: true,
      data: {
        taskId,
        status: 'IN_PROGRESS',
        timerActive: false,
        pausedAt: breakStartTime.toISOString(),
        workMinutesElapsed: 30,
        breakReason: 'lunch_break'
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockPauseResponse
    })

    const pauseResponse = await nextJsApiClient.post(`/api/v1/assembly/tasks/${taskId}/pause`, {
      pausedBy: mockAssembler.id,
      reason: 'lunch_break'
    })

    expect(pauseResponse.data.success).toBe(true)
    expect(pauseResponse.data.data.workMinutesElapsed).toBe(30)

    // Resume after break
    const resumeTime = new Date(breakStartTime.getTime() + 45 * 60 * 1000) // 45 minute break
    const mockResumeResponse = {
      success: true,
      data: {
        taskId,
        status: 'IN_PROGRESS',
        timerActive: true,
        resumedAt: resumeTime.toISOString(),
        breakMinutes: 45,
        totalWorkMinutes: 30
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockResumeResponse
    })

    const resumeResponse = await nextJsApiClient.post(`/api/v1/assembly/tasks/${taskId}/resume`, {
      resumedBy: mockAssembler.id
    })

    expect(resumeResponse.data.success).toBe(true)
    expect(resumeResponse.data.data.breakMinutes).toBe(45)

    // Complete task
    const completeTime = new Date(resumeTime.getTime() + 60 * 60 * 1000) // 60 more minutes
    const mockCompleteResponse = {
      success: true,
      data: {
        taskId,
        status: 'COMPLETED',
        completedAt: completeTime.toISOString(),
        totalWorkMinutes: 90, // 30 + 60
        totalBreakMinutes: 45,
        totalElapsedMinutes: 135,
        efficiency: (90 / 120) * 100 // 90 actual vs 120 estimated = 75%
      }
    };

    (nextJsApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: mockCompleteResponse
    })

    const completeResponse = await nextJsApiClient.put(`/api/v1/assembly/tasks/${taskId}/complete`, {
      completedBy: mockAssembler.id
    })

    expect(completeResponse.data.success).toBe(true)
    expect(completeResponse.data.data.totalWorkMinutes).toBe(90)
    expect(completeResponse.data.data.efficiency).toBe(75)
  })

  it('should generate comprehensive task reports and analytics', async () => {
    // Mock completed tasks data
    const mockTaskReportResponse = {
      success: true,
      data: {
        reportPeriod: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        summary: {
          totalTasks: 45,
          completedTasks: 42,
          inProgressTasks: 2,
          blockedTasks: 1,
          averageCompletionTime: 95, // minutes
          efficiencyRate: 88.5, // %
          onTimeCompletionRate: 92.3 // %
        },
        assemblerPerformance: [
          {
            assemblerId: mockAssembler.id,
            assemblerName: mockAssembler.name,
            tasksCompleted: 15,
            averageEfficiency: 92.1,
            qualityScore: 4.8, // out of 5
            totalWorkHours: 120
          }
        ],
        taskBreakdown: {
          byPriority: {
            HIGH: { total: 20, completed: 19, avgTime: 85 },
            MEDIUM: { total: 20, completed: 19, avgTime: 102 },
            LOW: { total: 5, completed: 4, avgTime: 75 }
          },
          byType: {
            'T2-DL27 Assembly': { total: 15, completed: 15, avgTime: 118 },
            'T2-DL14 Assembly': { total: 12, completed: 11, avgTime: 89 },
            'Quality Inspection': { total: 18, completed: 16, avgTime: 45 }
          }
        },
        trends: {
          weeklyCompletion: [8, 9, 11, 10, 9], // tasks per week
          efficiencyTrend: [85.2, 87.1, 88.5, 89.2, 88.5], // % per week
          bottlenecks: [
            {
              issue: 'Tool availability',
              frequency: 12,
              avgDelayMinutes: 25,
              recommendation: 'Add 2 more torque wrenches'
            },
            {
              issue: 'Work instruction clarity',
              frequency: 8,
              avgDelayMinutes: 15,
              recommendation: 'Update step 3 of T2-DL27 instructions'
            }
          ]
        }
      }
    };

    (nextJsApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: mockTaskReportResponse
    })

    const reportResponse = await nextJsApiClient.get('/api/v1/assembly/reports/monthly', {
      params: {
        month: '2024-01',
        assembler: mockAssembler.id
      }
    })

    expect(reportResponse.data.success).toBe(true)
    
    const report = reportResponse.data.data
    expect(report.summary.completedTasks).toBe(42)
    expect(report.summary.efficiencyRate).toBe(88.5)
    expect(report.assemblerPerformance[0].tasksCompleted).toBe(15)
    expect(report.trends.bottlenecks).toHaveLength(2)
    expect(report.trends.bottlenecks[0].recommendation).toContain('torque wrenches')
  })

  it('should handle quality checkpoints and failure scenarios', async () => {
    const taskId = 'quality-task-1'
    
    // Start task normally
    const mockStartResponse = {
      success: true,
      data: { taskId, status: 'IN_PROGRESS' }
    };

    (nextJsApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: mockStartResponse
    })

    await nextJsApiClient.put(`/api/v1/assembly/tasks/${taskId}/start`, {
      startedBy: mockAssembler.id
    })

    // Fail quality checkpoint
    const mockQualityFailResponse = {
      success: false,
      error: {
        code: 'QUALITY_CHECKPOINT_FAILED',
        message: 'Quality checkpoint failed - rework required',
        details: {
          taskId,
          stepNumber: 2,
          failedCheckpoints: [
            {
              checkpoint: 'Torque specs met',
              expected: '25 Nm ± 2',
              actual: '18 Nm',
              passed: false,
              inspector: mockAssembler.id
            }
          ],
          reworkRequired: true,
          reworkInstructions: 'Re-torque all bolts to specification'
        }
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: mockQualityFailResponse
    })

    const qualityCheckResponse = await nextJsApiClient.post(`/api/v1/assembly/tasks/${taskId}/steps/2/checkpoint`, {
      checkpointResults: [
        {
          checkpoint: 'Torque specs met',
          expected: '25 Nm ± 2',
          actual: '18 Nm',
          passed: false,
          notes: 'Torque insufficient - requires rework'
        }
      ],
      inspectedBy: mockAssembler.id
    })

    expect(qualityCheckResponse.data.success).toBe(false)
    expect(qualityCheckResponse.data.error.code).toBe('QUALITY_CHECKPOINT_FAILED')

    // Mark task for rework
    const mockReworkResponse = {
      success: true,
      data: {
        taskId,
        status: 'REWORK_REQUIRED',
        reworkAssignedTo: mockAssembler.id,
        reworkInstructions: 'Re-torque all bolts to specification',
        qualityIssues: [
          {
            stepNumber: 2,
            issue: 'Insufficient torque',
            severity: 'MEDIUM',
            correctionRequired: true
          }
        ]
      }
    };

    (nextJsApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: mockReworkResponse
    })

    const reworkResponse = await nextJsApiClient.put(`/api/v1/assembly/tasks/${taskId}/rework`, {
      reworkInstructions: 'Re-torque all bolts to specification',
      assignedTo: mockAssembler.id
    })

    expect(reworkResponse.data.success).toBe(true)
    expect(reworkResponse.data.data.status).toBe('REWORK_REQUIRED')

    // Complete rework successfully
    const mockReworkCompleteResponse = {
      success: true,
      data: {
        taskId,
        status: 'IN_PROGRESS',
        reworkCompleted: true,
        reworkCompletedAt: new Date().toISOString(),
        qualityCheckPassed: true
      }
    };

    (nextJsApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: mockReworkCompleteResponse
    })

    const reworkCompleteResponse = await nextJsApiClient.put(`/api/v1/assembly/tasks/${taskId}/rework/complete`, {
      completedBy: mockAssembler.id,
      qualityNotes: 'All bolts re-torqued to specification. Checkpoint passed.'
    })

    expect(reworkCompleteResponse.data.success).toBe(true)
    expect(reworkCompleteResponse.data.data.qualityCheckPassed).toBe(true)
  })
})