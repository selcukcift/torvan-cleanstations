/**
 * WorkInstructionViewer Component Unit Tests
 * Tests step-by-step instruction display and progress tracking
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import { WorkInstructionViewer } from '@/components/assembly/WorkInstructionViewer'

// Mock API client
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn()
}

jest.mock('@/lib/api', () => ({
  nextJsApiClient: mockApiClient
}))

// Mock data
const mockWorkInstruction = {
  id: 'wi-1',
  title: 'T2 Basin Assembly Instructions',
  description: 'Complete assembly instructions for T2 basin',
  estimatedMinutes: 120,
  version: '1.0',
  isActive: true,
  steps: [
    {
      id: 'step-1',
      stepNumber: 1,
      title: 'Prepare Components',
      description: 'Unpack and inspect all components for damage',
      estimatedMinutes: 10,
      images: ['/instructions/step1-image1.jpg'],
      videos: [],
      checkpoints: [
        'All components present',
        'No visible damage',
        'Hardware counted'
      ]
    },
    {
      id: 'step-2',
      stepNumber: 2,
      title: 'Install Basin',
      description: 'Position basin in frame and secure mounting points',
      estimatedMinutes: 30,
      images: ['/instructions/step2-image1.jpg', '/instructions/step2-image2.jpg'],
      videos: ['/instructions/step2-video1.mp4'],
      checkpoints: [
        'Basin properly aligned',
        'All mounting points secure',
        'Level verified'
      ]
    },
    {
      id: 'step-3',
      stepNumber: 3,
      title: 'Connect Plumbing',
      description: 'Connect supply lines and drainage system',
      estimatedMinutes: 45,
      images: ['/instructions/step3-image1.jpg'],
      videos: [],
      checkpoints: [
        'Supply lines connected',
        'No leaks detected',
        'Proper drainage flow'
      ]
    }
  ]
}

const mockStepProgress = {
  'step-1': {
    completed: true,
    completedAt: '2024-01-01T10:30:00Z',
    checkpoints: {
      'All components present': true,
      'No visible damage': true,
      'Hardware counted': true
    }
  },
  'step-2': {
    completed: false,
    startedAt: '2024-01-01T10:40:00Z',
    checkpoints: {
      'Basin properly aligned': true,
      'All mounting points secure': false,
      'Level verified': false
    }
  },
  'step-3': {
    completed: false,
    checkpoints: {}
  }
}

describe('WorkInstructionViewer Component', () => {
  const defaultProps = {
    workInstructionId: 'wi-1',
    currentTaskId: 'task-1',
    onStepComplete: jest.fn(),
    readonly: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock API responses
    mockApiClient.get.mockImplementation((url) => {
      if (url.includes('/api/v1/assembly/work-instructions/wi-1')) {
        return Promise.resolve({
          data: {
            success: true,
            data: mockWorkInstruction
          }
        })
      }
      if (url.includes('/tasks/task-1/progress')) {
        return Promise.resolve({
          data: {
            success: true,
            data: mockStepProgress
          }
        })
      }
      return Promise.resolve({ data: { success: true, data: {} } })
    })
    
    // Mock console methods to avoid noise
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('Rendering', () => {
    it('should render work instruction title and description', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('T2 Basin Assembly Instructions')).toBeInTheDocument()
        expect(screen.getByText('Complete assembly instructions for T2 basin')).toBeInTheDocument()
      })
    })

    it('should render all instruction steps', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('1. Prepare Components')).toBeInTheDocument()
        expect(screen.getByText('2. Install Basin')).toBeInTheDocument()
        expect(screen.getByText('3. Connect Plumbing')).toBeInTheDocument()
      })
    })

    it('should show estimated time for each step', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('10 min')).toBeInTheDocument()
        expect(screen.getByText('30 min')).toBeInTheDocument()
        expect(screen.getByText('45 min')).toBeInTheDocument()
      })
    })

    it('should display step descriptions', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Unpack and inspect all components for damage')).toBeInTheDocument()
        expect(screen.getByText('Position basin in frame and secure mounting points')).toBeInTheDocument()
      })
    })
  })

  describe('Step Navigation', () => {
    it('should highlight current step', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        const step2 = screen.getByText('2. Install Basin').closest('[data-testid]')
        expect(step2).toHaveClass('bg-blue-50') // Current step highlighting
      })
    })

    it('should allow navigation to different steps', async () => {
      const user = userEvent.setup()
      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('1. Prepare Components')).toBeInTheDocument()
      })

      // Click on step 3
      const step3 = screen.getByText('3. Connect Plumbing')
      await user.click(step3)

      await waitFor(() => {
        expect(screen.getByText('Connect supply lines and drainage system')).toBeVisible()
      })
    })

    it('should show previous/next navigation buttons', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /previous step/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /next step/i })).toBeInTheDocument()
      })
    })

    it('should disable previous button on first step', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      // Navigate to first step
      const user = userEvent.setup()
      const step1 = screen.getByText('1. Prepare Components')
      await user.click(step1)

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous step/i })
        expect(prevButton).toBeDisabled()
      })
    })

    it('should disable next button on last step', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      // Navigate to last step
      const user = userEvent.setup()
      const step3 = screen.getByText('3. Connect Plumbing')
      await user.click(step3)

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next step/i })
        expect(nextButton).toBeDisabled()
      })
    })
  })

  describe('Step Progress Tracking', () => {
    it('should show completed steps with checkmark', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        const step1 = screen.getByText('1. Prepare Components').closest('[data-testid]')
        expect(step1).toHaveTextContent('✓') // Completed indicator
      })
    })

    it('should show in-progress steps differently', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        const step2 = screen.getByText('2. Install Basin').closest('[data-testid]')
        expect(step2).toHaveClass('border-blue-500') // In-progress styling
      })
    })

    it('should display checkpoint progress', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      // Navigate to step 2 to see checkpoint progress
      const user = userEvent.setup()
      const step2 = screen.getByText('2. Install Basin')
      await user.click(step2)

      await waitFor(() => {
        expect(screen.getByText('Basin properly aligned')).toBeInTheDocument()
        expect(screen.getByText('All mounting points secure')).toBeInTheDocument()
        expect(screen.getByText('Level verified')).toBeInTheDocument()
      })

      // Check that first checkpoint is marked complete
      const checkpoint1 = screen.getByText('Basin properly aligned').closest('div')
      expect(checkpoint1).toHaveTextContent('✓')
    })

    it('should allow checking off checkpoints', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      const user = userEvent.setup()
      const step2 = screen.getByText('2. Install Basin')
      await user.click(step2)

      await waitFor(() => {
        const checkpoint = screen.getByText('All mounting points secure')
        const checkbox = checkpoint.closest('div')?.querySelector('input[type="checkbox"]')
        expect(checkbox).toBeInTheDocument()
      })

      // Click the checkbox
      const checkbox = screen.getByLabelText('All mounting points secure')
      await user.click(checkbox)

      expect(checkbox).toBeChecked()
    })
  })

  describe('Media Display', () => {
    it('should display step images', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        const images = screen.getAllByRole('img')
        expect(images.length).toBeGreaterThan(0)
      })
    })

    it('should display video players when videos are available', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      const user = userEvent.setup()
      const step2 = screen.getByText('2. Install Basin')
      await user.click(step2)

      await waitFor(() => {
        const video = screen.getByTestId('instruction-video')
        expect(video).toBeInTheDocument()
        expect(video).toHaveAttribute('src', '/instructions/step2-video1.mp4')
      })
    })

    it('should allow fullscreen image viewing', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      const user = userEvent.setup()
      await waitFor(() => {
        const firstImage = screen.getAllByRole('img')[0]
        expect(firstImage).toBeInTheDocument()
      })

      const firstImage = screen.getAllByRole('img')[0]
      await user.click(firstImage)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument() // Modal for fullscreen
      })
    })
  })

  describe('Step Completion', () => {
    it('should allow marking a step as complete', async () => {
      const onStepComplete = jest.fn()
      render(<WorkInstructionViewer {...defaultProps} onStepComplete={onStepComplete} />)

      const user = userEvent.setup()
      const step3 = screen.getByText('3. Connect Plumbing')
      await user.click(step3)

      await waitFor(() => {
        const completeButton = screen.getByRole('button', { name: /complete step/i })
        expect(completeButton).toBeInTheDocument()
      })

      const completeButton = screen.getByRole('button', { name: /complete step/i })
      await user.click(completeButton)

      expect(onStepComplete).toHaveBeenCalledWith('step-3', true)
    })

    it('should require all checkpoints before allowing completion', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      const user = userEvent.setup()
      const step2 = screen.getByText('2. Install Basin')
      await user.click(step2)

      await waitFor(() => {
        const completeButton = screen.getByRole('button', { name: /complete step/i })
        expect(completeButton).toBeDisabled() // Should be disabled until all checkpoints complete
      })
    })

    it('should show completion time for completed steps', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      const user = userEvent.setup()
      const step1 = screen.getByText('1. Prepare Components')
      await user.click(step1)

      await waitFor(() => {
        expect(screen.getByText(/completed at/i)).toBeInTheDocument()
        expect(screen.getByText('10:30 AM')).toBeInTheDocument()
      })
    })
  })

  describe('Readonly Mode', () => {
    it('should disable interactions in readonly mode', async () => {
      render(<WorkInstructionViewer {...defaultProps} readonly={true} />)

      await waitFor(() => {
        const checkboxes = screen.queryAllByRole('checkbox')
        checkboxes.forEach(checkbox => {
          expect(checkbox).toBeDisabled()
        })
      })

      expect(screen.queryByRole('button', { name: /complete step/i })).not.toBeInTheDocument()
    })

    it('should still allow navigation in readonly mode', async () => {
      render(<WorkInstructionViewer {...defaultProps} readonly={true} />)

      const user = userEvent.setup()
      await waitFor(() => {
        const step2 = screen.getByText('2. Install Basin')
        expect(step2).toBeInTheDocument()
      })

      const step2 = screen.getByText('2. Install Basin')
      await user.click(step2)

      await waitFor(() => {
        expect(screen.getByText('Position basin in frame and secure mounting points')).toBeVisible()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error when work instruction fails to load', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Failed to load work instruction'))

      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/error loading work instruction/i)).toBeInTheDocument()
      })
    })

    it('should handle missing work instruction gracefully', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Work instruction not found' }
        }
      })

      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/work instruction not found/i)).toBeInTheDocument()
      })
    })

    it('should handle missing media files gracefully', async () => {
      const instructionWithMissingMedia = {
        ...mockWorkInstruction,
        steps: [
          {
            ...mockWorkInstruction.steps[0],
            images: ['/missing-image.jpg'],
            videos: ['/missing-video.mp4']
          }
        ]
      }

      mockApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: instructionWithMissingMedia
        }
      })

      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        const images = screen.getAllByRole('img')
        images.forEach(img => {
          expect(img).toHaveAttribute('alt', expect.stringContaining('Step'))
        })
      })
    })
  })

  describe('Performance', () => {
    it('should lazy load images', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        const images = screen.getAllByRole('img')
        images.forEach(img => {
          expect(img).toHaveAttribute('loading', 'lazy')
        })
      })
    })

    it('should not re-render unnecessarily on prop changes', async () => {
      const renderCount = jest.fn()
      
      function TestComponent(props: any) {
        renderCount()
        return <WorkInstructionViewer {...props} />
      }

      const { rerender } = render(<TestComponent {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('T2 Basin Assembly Instructions')).toBeInTheDocument()
      })

      // Re-render with same props
      rerender(<TestComponent {...defaultProps} />)

      // Should not trigger additional renders beyond initial and data loading
      expect(renderCount).toHaveBeenCalledTimes(2)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: /step navigation/i })).toBeInTheDocument()
        expect(screen.getByRole('main', { name: /work instruction content/i })).toBeInTheDocument()
      })
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('1. Prepare Components')).toBeInTheDocument()
      })

      // Tab navigation should work
      await user.tab()
      expect(document.activeElement).toHaveClass('focus-visible')
    })

    it('should announce step changes to screen readers', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument() // Live region for announcements
      })
    })

    it('should have proper heading hierarchy', async () => {
      render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument() // Main title
        expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0) // Step titles
      })
    })
  })

  describe('Integration', () => {
    it('should sync with external task progress', async () => {
      const { rerender } = render(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('1. Prepare Components')).toBeInTheDocument()
      })

      // Simulate external progress update
      const updatedProgress = {
        ...mockStepProgress,
        'step-3': {
          completed: true,
          completedAt: '2024-01-01T11:00:00Z',
          checkpoints: {
            'Supply lines connected': true,
            'No leaks detected': true,
            'Proper drainage flow': true
          }
        }
      }

      mockApiClient.get.mockImplementation((url) => {
        if (url.includes('/tasks/task-1/progress')) {
          return Promise.resolve({
            data: {
              success: true,
              data: updatedProgress
            }
          })
        }
        return Promise.resolve({
          data: {
            success: true,
            data: mockWorkInstruction
          }
        })
      })

      rerender(<WorkInstructionViewer {...defaultProps} />)

      await waitFor(() => {
        const step3 = screen.getByText('3. Connect Plumbing').closest('[data-testid]')
        expect(step3).toHaveTextContent('✓') // Now shows as completed
      })
    })
  })
})