/**
 * TaskManagement Component Unit Tests
 * Tests the main task dashboard functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import { TaskManagement } from '@/components/assembly/TaskManagement'

// Mock next-auth
const mockSession = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'ASSEMBLER'
  }
}

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: mockSession,
    status: 'authenticated'
  })
}))

// Mock API client
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}

jest.mock('@/lib/api', () => ({
  nextJsApiClient: mockApiClient
}))

// Mock child components
jest.mock('@/components/assembly/TaskTimer', () => {
  return function MockTaskTimer(props: any) {
    return <div data-testid="task-timer">Task Timer: {props.task?.title}</div>
  }
})

jest.mock('@/components/assembly/WorkInstructionViewer', () => {
  return function MockWorkInstructionViewer(props: any) {
    return <div data-testid="work-instruction-viewer">Work Instructions: {props.workInstructionId}</div>
  }
})

jest.mock('@/components/assembly/TaskDependencyGraph', () => {
  return function MockTaskDependencyGraph(props: any) {
    return <div data-testid="dependency-graph">Dependencies for order: {props.orderId}</div>
  }
})

jest.mock('@/components/assembly/ToolRequirements', () => {
  return function MockToolRequirements(props: any) {
    return <div data-testid="tool-requirements">Tools for task: {props.taskId}</div>
  }
})

// Mock data
const mockTasks = [
  {
    id: 'task-1',
    title: 'Basin Assembly',
    description: 'Assemble main basin component',
    status: 'PENDING',
    priority: 'HIGH',
    estimatedMinutes: 120,
    actualMinutes: null,
    assignedToId: 'user-123',
    assignedTo: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com'
    },
    workInstructionId: 'wi-1',
    workInstruction: {
      id: 'wi-1',
      title: 'Basin Assembly Instructions',
      estimatedMinutes: 120
    },
    dependencies: [],
    tools: [],
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z'
  },
  {
    id: 'task-2',
    title: 'Frame Preparation',
    description: 'Prepare frame components',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    estimatedMinutes: 90,
    actualMinutes: 45,
    assignedToId: 'user-456',
    assignedTo: {
      id: 'user-456',
      name: 'Other User',
      email: 'other@example.com'
    },
    workInstructionId: 'wi-2',
    dependencies: [],
    tools: [],
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-01-01T11:00:00Z',
    startedAt: '2024-01-01T10:00:00Z'
  },
  {
    id: 'task-3',
    title: 'Quality Inspection',
    description: 'Final quality control',
    status: 'COMPLETED',
    priority: 'HIGH',
    estimatedMinutes: 30,
    actualMinutes: 25,
    assignedToId: 'user-789',
    assignedTo: {
      id: 'user-789',
      name: 'QC User',
      email: 'qc@example.com'
    },
    dependencies: ['task-1', 'task-2'],
    tools: [],
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z',
    startedAt: '2024-01-01T11:30:00Z',
    completedAt: '2024-01-01T11:55:00Z'
  }
]

const mockTaskStats = {
  total: 3,
  pending: 1,
  inProgress: 1,
  completed: 1,
  overdue: 0,
  avgCompletionTime: 35
}

describe('TaskManagement Component', () => {
  const defaultProps = {
    orderId: 'order-123',
    userRole: 'ASSEMBLER' as const
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful API responses
    mockApiClient.get.mockImplementation((url) => {
      if (url.includes('/assembly/tasks')) {
        return Promise.resolve({
          data: {
            success: true,
            data: mockTasks,
            metadata: {
              pagination: {
                total: mockTasks.length,
                page: 1,
                totalPages: 1
              }
            }
          }
        })
      }
      if (url.includes('/assembly/tasks/stats')) {
        return Promise.resolve({
          data: {
            success: true,
            data: mockTaskStats
          }
        })
      }
      return Promise.resolve({ data: { success: true, data: [] } })
    })
  })

  describe('Rendering', () => {
    it('should render task management dashboard', async () => {
      render(<TaskManagement {...defaultProps} />)

      expect(screen.getByText('Task Management')).toBeInTheDocument()
      expect(screen.getByText('Assembly workflow and task coordination')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByText('Basin Assembly')).toBeInTheDocument()
      })
    })

    it('should render task statistics', async () => {
      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument() // Total tasks
        expect(screen.getByText('1')).toBeInTheDocument() // Pending tasks
        expect(screen.getByText('35m')).toBeInTheDocument() // Avg completion time
      })
    })

    it('should render tasks in different view modes', async () => {
      render(<TaskManagement {...defaultProps} />)

      // Wait for tasks to load
      await waitFor(() => {
        expect(screen.getByText('Basin Assembly')).toBeInTheDocument()
      })

      // Test Kanban view
      const kanbanTab = screen.getByRole('tab', { name: /kanban/i })
      await userEvent.click(kanbanTab)

      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('should render timeline view', async () => {
      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Basin Assembly')).toBeInTheDocument()
      })

      const timelineTab = screen.getByRole('tab', { name: /timeline/i })
      await userEvent.click(timelineTab)

      expect(screen.getByText('Task Timeline')).toBeInTheDocument()
    })
  })

  describe('Task Filtering', () => {
    it('should filter tasks by status', async () => {
      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Basin Assembly')).toBeInTheDocument()
      })

      // Open status filter
      const statusFilter = screen.getByDisplayValue('All Status')
      await userEvent.click(statusFilter)
      
      const pendingOption = screen.getByText('Pending')
      await userEvent.click(pendingOption)

      // Should filter API call
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('status=PENDING')
        )
      })
    })

    it('should filter tasks by priority', async () => {
      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Basin Assembly')).toBeInTheDocument()
      })

      const priorityFilter = screen.getByDisplayValue('All Priorities')
      await userEvent.click(priorityFilter)
      
      const highOption = screen.getByText('High')
      await userEvent.click(highOption)

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('priority=HIGH')
        )
      })
    })

    it('should search tasks by title', async () => {
      const user = userEvent.setup()
      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Basin Assembly')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search tasks...')
      await user.type(searchInput, 'Basin')

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('search=Basin')
        )
      }, { timeout: 1000 })
    })
  })

  describe('Task Actions', () => {
    it('should start a task when user clicks start button', async () => {
      mockApiClient.put.mockResolvedValue({
        data: {
          success: true,
          data: { ...mockTasks[0], status: 'IN_PROGRESS', startedAt: new Date().toISOString() }
        }
      })

      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Basin Assembly')).toBeInTheDocument()
      })

      const startButton = screen.getByRole('button', { name: /start task/i })
      await userEvent.click(startButton)

      await waitFor(() => {
        expect(mockApiClient.put).toHaveBeenCalledWith(
          '/api/v1/assembly/tasks/task-1/status',
          { status: 'IN_PROGRESS' }
        )
      })
    })

    it('should complete a task when user clicks complete button', async () => {
      mockApiClient.put.mockResolvedValue({
        data: {
          success: true,
          data: { ...mockTasks[1], status: 'COMPLETED', completedAt: new Date().toISOString() }
        }
      })

      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Frame Preparation')).toBeInTheDocument()
      })

      const completeButton = screen.getByRole('button', { name: /complete task/i })
      await userEvent.click(completeButton)

      await waitFor(() => {
        expect(mockApiClient.put).toHaveBeenCalledWith(
          '/api/v1/assembly/tasks/task-2/status',
          { status: 'COMPLETED' }
        )
      })
    })

    it('should open task details when task is clicked', async () => {
      render(<TaskManagement {...defaultProps} onTaskSelect={jest.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Basin Assembly')).toBeInTheDocument()
      })

      const taskCard = screen.getByText('Basin Assembly')
      await userEvent.click(taskCard)

      // Should show task details in modal or sidebar
      await waitFor(() => {
        expect(screen.getByText('Task Details')).toBeInTheDocument()
      })
    })
  })

  describe('Role-based Features', () => {
    it('should show task creation button for coordinators', async () => {
      render(<TaskManagement {...defaultProps} userRole="PRODUCTION_COORDINATOR" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument()
      })
    })

    it('should hide task creation button for assemblers', async () => {
      render(<TaskManagement {...defaultProps} userRole="ASSEMBLER" />)

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /create task/i })).not.toBeInTheDocument()
      })
    })

    it('should show assignment controls for coordinators', async () => {
      render(<TaskManagement {...defaultProps} userRole="PRODUCTION_COORDINATOR" />)

      await waitFor(() => {
        expect(screen.getByText('Basin Assembly')).toBeInTheDocument()
      })

      // Should show assignment dropdown or buttons
      expect(screen.getByText('Assign')).toBeInTheDocument()
    })

    it('should filter tasks by current user for assemblers', async () => {
      render(<TaskManagement {...defaultProps} userRole="ASSEMBLER" />)

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('assignedTo=user-123')
        )
      })
    })
  })

  describe('Task Status Indicators', () => {
    it('should display correct status badges', async () => {
      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
        expect(screen.getByText('In Progress')).toBeInTheDocument()
        expect(screen.getByText('Completed')).toBeInTheDocument()
      })
    })

    it('should display priority indicators', async () => {
      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getAllByText('High')).toHaveLength(2) // Two high priority tasks
        expect(screen.getByText('Medium')).toBeInTheDocument()
      })
    })

    it('should show time estimates and actual time', async () => {
      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('120m')).toBeInTheDocument() // Estimated time
        expect(screen.getByText('45m')).toBeInTheDocument() // Actual time
      })
    })
  })

  describe('Integration with Child Components', () => {
    it('should render TaskTimer when task is selected', async () => {
      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Basin Assembly')).toBeInTheDocument()
      })

      // Select a task
      const taskCard = screen.getByText('Basin Assembly')
      await userEvent.click(taskCard)

      await waitFor(() => {
        expect(screen.getByTestId('task-timer')).toBeInTheDocument()
        expect(screen.getByText('Task Timer: Basin Assembly')).toBeInTheDocument()
      })
    })

    it('should render WorkInstructionViewer when work instructions are available', async () => {
      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Basin Assembly')).toBeInTheDocument()
      })

      const taskCard = screen.getByText('Basin Assembly')
      await userEvent.click(taskCard)

      // Switch to instructions tab
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i })
      await userEvent.click(instructionsTab)

      await waitFor(() => {
        expect(screen.getByTestId('work-instruction-viewer')).toBeInTheDocument()
      })
    })

    it('should render ToolRequirements when tools tab is selected', async () => {
      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Basin Assembly')).toBeInTheDocument()
      })

      const taskCard = screen.getByText('Basin Assembly')
      await userEvent.click(taskCard)

      const toolsTab = screen.getByRole('tab', { name: /tools/i })
      await userEvent.click(toolsTab)

      await waitFor(() => {
        expect(screen.getByTestId('tool-requirements')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'))

      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/error loading tasks/i)).toBeInTheDocument()
      })
    })

    it('should show retry button on error', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'))

      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
    })

    it('should handle empty task list', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: [],
          metadata: { pagination: { total: 0 } }
        }
      })

      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/no tasks found/i)).toBeInTheDocument()
      })
    })
  })

  describe('Performance', () => {
    it('should debounce search input', async () => {
      const user = userEvent.setup({ delay: null })
      render(<TaskManagement {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('Search tasks...')
      
      // Type quickly
      await user.type(searchInput, 'Basin')

      // Should only make one API call after debounce
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledTimes(2) // Initial load + search
      }, { timeout: 1000 })
    })

    it('should not re-render unnecessarily', async () => {
      const renderCount = jest.fn()
      
      function TestComponent(props: any) {
        renderCount()
        return <TaskManagement {...props} />
      }

      const { rerender } = render(<TestComponent {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Basin Assembly')).toBeInTheDocument()
      })

      // Re-render with same props
      rerender(<TestComponent {...defaultProps} />)

      // Should not trigger additional renders beyond initial and data loading
      expect(renderCount).toHaveBeenCalledTimes(2)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<TaskManagement {...defaultProps} />)

      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('tablist')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByLabelText(/task search/i)).toBeInTheDocument()
      })
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Basin Assembly')).toBeInTheDocument()
      })

      // Tab navigation should work
      await user.tab()
      expect(document.activeElement).toHaveClass('focus-visible')
    })

    it('should announce status changes to screen readers', async () => {
      render(<TaskManagement {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Basin Assembly')).toBeInTheDocument()
      })

      // Should have live region for status updates
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })
})