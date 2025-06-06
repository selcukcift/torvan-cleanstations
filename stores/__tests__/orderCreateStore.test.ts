import { act, renderHook } from '@testing-library/react'
import { useOrderCreateStore } from '../orderCreateStore'

describe('orderCreateStore', () => {
  beforeEach(() => {
    // Clear the store before each test
    const { result } = renderHook(() => useOrderCreateStore())
    act(() => {
      result.current.resetForm()
    })
  })

  it('initializes with default values', () => {
    const { result } = renderHook(() => useOrderCreateStore())
    
    expect(result.current.currentStep).toBe(1)
    expect(result.current.customerInfo).toEqual({
      poNumber: '',
      customerName: '',
      projectName: '',
      salesPerson: '',
      wantDate: null,
      language: 'EN',
      notes: ''
    })
    expect(result.current.sinkSelection).toEqual({
      sinkModelId: '',
      quantity: 0,
      buildNumbers: []
    })
    expect(result.current.configurations).toEqual({})
    expect(result.current.accessories).toEqual({})
  })

  it('updates customer info', () => {
    const { result } = renderHook(() => useOrderCreateStore())
    
    act(() => {
      result.current.updateCustomerInfo({
        poNumber: 'PO-12345',
        customerName: 'Test Hospital'
      })
    })
    
    expect(result.current.customerInfo.poNumber).toBe('PO-12345')
    expect(result.current.customerInfo.customerName).toBe('Test Hospital')
  })

  it('updates sink selection', () => {
    const { result } = renderHook(() => useOrderCreateStore())
    
    act(() => {
      result.current.updateSinkSelection({
        sinkFamily: 'MDRD',
        quantity: 2,
        buildNumbers: ['BN-001', 'BN-002']
      })
    })
    
    expect(result.current.sinkSelection.sinkFamily).toBe('MDRD')
    expect(result.current.sinkSelection.quantity).toBe(2)
    expect(result.current.sinkSelection.buildNumbers).toEqual(['BN-001', 'BN-002'])
  })

  it('updates sink configuration for specific build number', () => {
    const { result } = renderHook(() => useOrderCreateStore())
    
    act(() => {
      result.current.updateSinkConfiguration('BN-001', {
        sinkModelId: 'T2-B2',
        width: 60,
        length: 72,
        workflowDirection: 'LEFT_TO_RIGHT'
      })
    })
    
    expect(result.current.configurations['BN-001']).toEqual({
      sinkModelId: 'T2-B2',
      width: 60,
      length: 72,
      workflowDirection: 'LEFT_TO_RIGHT'
    })
  })

  it('updates accessories for specific build number', () => {
    const { result } = renderHook(() => useOrderCreateStore())
    
    const accessories = [
      { assemblyId: '702.4', quantity: 2 },
      { assemblyId: '702.5', quantity: 1 }
    ]
    
    act(() => {
      result.current.updateAccessories('BN-001', accessories)
    })
    
    expect(result.current.accessories['BN-001']).toEqual(accessories)
  })

  it('validates step 1 (customer info)', () => {
    const { result } = renderHook(() => useOrderCreateStore())
    
    // Initially invalid
    expect(result.current.isStepValid(1)).toBe(false)
    
    // Update with valid data
    act(() => {
      result.current.updateCustomerInfo({
        poNumber: 'PO-12345',
        customerName: 'Test Hospital',
        salesPerson: 'John Doe',
        wantDate: new Date()
      })
    })
    
    expect(result.current.isStepValid(1)).toBe(true)
  })

  it('validates step 2 (sink selection)', () => {
    const { result } = renderHook(() => useOrderCreateStore())
    
    // Initially invalid
    expect(result.current.isStepValid(2)).toBe(false)
    
    // Update with valid data
    act(() => {
      result.current.updateSinkSelection({
        sinkFamily: 'MDRD',
        quantity: 2,
        buildNumbers: ['BN-001', 'BN-002']
      })
    })
    
    expect(result.current.isStepValid(2)).toBe(true)
    
    // Test invalid case - duplicate build numbers
    act(() => {
      result.current.updateSinkSelection({
        sinkFamily: 'MDRD',
        quantity: 2,
        buildNumbers: ['BN-001', 'BN-001']
      })
    })
    
    expect(result.current.isStepValid(2)).toBe(false)
  })

  it('validates step 3 (configurations)', () => {
    const { result } = renderHook(() => useOrderCreateStore())
    
    // Setup sink selection first
    act(() => {
      result.current.updateSinkSelection({
        sinkFamily: 'MDRD',
        quantity: 1,
        buildNumbers: ['BN-001']
      })
    })
    
    // Initially invalid (no configuration)
    expect(result.current.isStepValid(3)).toBe(false)
    
    // Add configuration
    act(() => {
      result.current.updateSinkConfiguration('BN-001', {
        sinkModelId: 'T2-B2'
      })
    })
    
    expect(result.current.isStepValid(3)).toBe(true)
  })

  it('resets form to initial state', () => {
    const { result } = renderHook(() => useOrderCreateStore())
    
    // Add some data
    act(() => {
      result.current.updateCustomerInfo({ poNumber: 'PO-12345' })
      result.current.setCurrentStep(3)
    })
    
    // Reset
    act(() => {
      result.current.resetForm()
    })
    
    expect(result.current.currentStep).toBe(1)
    expect(result.current.customerInfo.poNumber).toBe('')
  })

  it('persists state across re-renders', () => {
    const { result, unmount } = renderHook(() => useOrderCreateStore())
    
    // Update state
    act(() => {
      result.current.updateCustomerInfo({ poNumber: 'PO-12345' })
    })
    
    // Unmount and remount
    unmount()
    const { result: newResult } = renderHook(() => useOrderCreateStore())
    
    // State should be persisted
    expect(newResult.current.customerInfo.poNumber).toBe('PO-12345')
  })
})