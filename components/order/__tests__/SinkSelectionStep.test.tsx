import { render, screen, fireEvent, waitFor } from '@/test-utils'
import { SinkSelectionStep } from '../SinkSelectionStep'
import { useOrderCreateStore } from '@/stores/orderCreateStore'

jest.mock('@/stores/orderCreateStore')

describe('SinkSelectionStep', () => {
  const mockUpdateSinkSelection = jest.fn()
  const mockUpdateSinkConfiguration = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useOrderCreateStore as jest.Mock).mockReturnValue({
      sinkSelection: {
        sinkModelId: '',
        sinkFamily: '',
        quantity: 0,
        buildNumbers: [],
      },
      configurations: {},
      updateSinkSelection: mockUpdateSinkSelection,
      updateSinkConfiguration: mockUpdateSinkConfiguration,
    })
  })

  it('renders sink family selection', () => {
    render(<SinkSelectionStep />)
    
    expect(screen.getByText(/CleanStation Family \*/)).toBeInTheDocument()
    expect(screen.getByText(/Select a sink family/)).toBeInTheDocument()
  })

  it('shows available and unavailable sink families', async () => {
    render(<SinkSelectionStep />)
    
    const selectTrigger = screen.getByText(/Select a sink family/)
    fireEvent.click(selectTrigger)
    
    await waitFor(() => {
      expect(screen.getByText('MDRD CleanStation')).toBeInTheDocument()
      expect(screen.getByText('Endoscope CleanStation')).toBeInTheDocument()
      expect(screen.getByText('InstroSink')).toBeInTheDocument()
      expect(screen.getAllByText('Under Construction').length).toBe(2)
    })
  })

  it('updates sink family when selected', async () => {
    render(<SinkSelectionStep />)
    
    const selectTrigger = screen.getByText(/Select a sink family/)
    fireEvent.click(selectTrigger)
    
    await waitFor(() => {
      const mdrdOption = screen.getByText('MDRD CleanStation')
      fireEvent.click(mdrdOption)
    })
    
    expect(mockUpdateSinkSelection).toHaveBeenCalledWith({ 
      sinkFamily: 'MDRD',
      sinkModelId: 'MDRD' 
    })
  })

  it('shows quantity selector after family selection', () => {
    ;(useOrderCreateStore as jest.Mock).mockReturnValue({
      sinkSelection: {
        sinkModelId: 'MDRD',
        sinkFamily: 'MDRD',
        quantity: 0,
        buildNumbers: [],
      },
      configurations: {},
      updateSinkSelection: mockUpdateSinkSelection,
      updateSinkConfiguration: mockUpdateSinkConfiguration,
    })
    
    render(<SinkSelectionStep />)
    
    expect(screen.getByText(/Number of Sinks \*/)).toBeInTheDocument()
  })

  it('generates build number fields based on quantity', async () => {
    ;(useOrderCreateStore as jest.Mock).mockReturnValue({
      sinkSelection: {
        sinkModelId: 'MDRD',
        sinkFamily: 'MDRD',
        quantity: 2,
        buildNumbers: [],
      },
      configurations: {},
      updateSinkSelection: mockUpdateSinkSelection,
      updateSinkConfiguration: mockUpdateSinkConfiguration,
    })
    
    render(<SinkSelectionStep />)
    
    expect(screen.getByText('Build Number 1')).toBeInTheDocument()
    expect(screen.getByText('Build Number 2')).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText(/Enter unique build number/).length).toBe(2)
  })

  it('validates build number uniqueness', async () => {
    ;(useOrderCreateStore as jest.Mock).mockReturnValue({
      sinkSelection: {
        sinkModelId: 'MDRD',
        sinkFamily: 'MDRD',
        quantity: 2,
        buildNumbers: ['BN-001', 'BN-001'],
      },
      configurations: {},
      updateSinkSelection: mockUpdateSinkSelection,
      updateSinkConfiguration: mockUpdateSinkConfiguration,
    })
    
    render(<SinkSelectionStep />)
    
    expect(screen.getByText(/Build numbers must be unique/)).toBeInTheDocument()
  })

  it('validates build number minimum length', async () => {
    ;(useOrderCreateStore as jest.Mock).mockReturnValue({
      sinkSelection: {
        sinkModelId: 'MDRD',
        sinkFamily: 'MDRD',
        quantity: 1,
        buildNumbers: ['BN'],
      },
      configurations: {},
      updateSinkSelection: mockUpdateSinkSelection,
      updateSinkConfiguration: mockUpdateSinkConfiguration,
    })
    
    render(<SinkSelectionStep />)
    
    const input = screen.getByDisplayValue('BN')
    expect(input).toHaveClass('border-red-500')
  })

  it('creates sink configurations when build number is valid', async () => {
    render(<SinkSelectionStep />)
    
    // First select family and quantity
    ;(useOrderCreateStore as jest.Mock).mockReturnValue({
      sinkSelection: {
        sinkModelId: 'MDRD',
        sinkFamily: 'MDRD',
        quantity: 1,
        buildNumbers: [],
      },
      configurations: {},
      updateSinkSelection: mockUpdateSinkSelection,
      updateSinkConfiguration: mockUpdateSinkConfiguration,
    })
    
    const { rerender } = render(<SinkSelectionStep />)
    
    const buildNumberInput = screen.getByPlaceholderText(/Enter unique build number/)
    fireEvent.change(buildNumberInput, { target: { value: 'BN-001' } })
    
    await waitFor(() => {
      expect(mockUpdateSinkSelection).toHaveBeenCalledWith({
        buildNumbers: ['BN-001']
      })
    })
    
    expect(mockUpdateSinkConfiguration).toHaveBeenCalledWith('BN-001', {
      sinkModelId: 'MDRD'
    })
  })
})