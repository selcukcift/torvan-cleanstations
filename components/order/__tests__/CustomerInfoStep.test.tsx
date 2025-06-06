import { render, screen, fireEvent, waitFor } from '@/test-utils'
import { CustomerInfoStep } from '../CustomerInfoStep'
import { useOrderCreateStore } from '@/stores/orderCreateStore'

// Mock the store
jest.mock('@/stores/orderCreateStore')

describe('CustomerInfoStep', () => {
  const mockUpdateCustomerInfo = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useOrderCreateStore as jest.Mock).mockReturnValue({
      customerInfo: {
        poNumber: '',
        customerName: '',
        projectName: '',
        salesPerson: '',
        wantDate: null,
        language: 'EN',
        notes: '',
      },
      updateCustomerInfo: mockUpdateCustomerInfo,
    })
  })

  it('renders all required fields', () => {
    render(<CustomerInfoStep />)
    
    expect(screen.getByLabelText(/PO Number \*/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Customer Name \*/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Sales Person \*/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Desired Delivery Date \*/)).toBeInTheDocument()
    expect(screen.getByText(/Document Language \*/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Project Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Notes/)).toBeInTheDocument()
  })

  it('updates PO number when typed', async () => {
    render(<CustomerInfoStep />)
    
    const poInput = screen.getByLabelText(/PO Number \*/)
    fireEvent.change(poInput, { target: { value: 'PO-12345' } })
    
    expect(mockUpdateCustomerInfo).toHaveBeenCalledWith({ poNumber: 'PO-12345' })
  })

  it('updates customer name when typed', async () => {
    render(<CustomerInfoStep />)
    
    const customerInput = screen.getByLabelText(/Customer Name \*/)
    fireEvent.change(customerInput, { target: { value: 'Test Hospital' } })
    
    expect(mockUpdateCustomerInfo).toHaveBeenCalledWith({ customerName: 'Test Hospital' })
  })

  it('updates language selection', async () => {
    render(<CustomerInfoStep />)
    
    const frenchRadio = screen.getByLabelText('FR')
    fireEvent.click(frenchRadio)
    
    expect(mockUpdateCustomerInfo).toHaveBeenCalledWith({ language: 'FR' })
  })

  it('displays file upload area', () => {
    render(<CustomerInfoStep />)
    
    expect(screen.getByText(/PO Document Upload/)).toBeInTheDocument()
    expect(screen.getByText(/Click to upload/)).toBeInTheDocument()
  })

  it('handles file upload', async () => {
    render(<CustomerInfoStep />)
    
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    const input = screen.getByLabelText(/Click to upload/).closest('input') as HTMLInputElement
    
    Object.defineProperty(input, 'files', {
      value: [file],
    })
    
    fireEvent.change(input)
    
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })
    
    expect(mockUpdateCustomerInfo).toHaveBeenCalledWith({ poDocument: file })
  })

  it('validates minimum character requirements are shown', () => {
    render(<CustomerInfoStep />)
    
    expect(screen.getByPlaceholderText(/Enter PO Number \(min 3 characters\)/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter Customer Name \(min 3 characters\)/)).toBeInTheDocument()
  })
})