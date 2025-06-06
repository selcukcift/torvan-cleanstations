import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'

// Mock session for testing
const mockSession = {
  user: {
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    fullName: 'Test User',
    role: 'ADMIN',
    initials: 'TU',
  },
  expires: '2025-12-31',
}

// Custom providers for tests
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider session={mockSession}>
      {children}
    </SessionProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Test data factories
export const createMockOrder = (overrides = {}) => ({
  id: 'test-order-1',
  orderNumber: 'ORD-2025-001',
  poNumber: 'PO-12345',
  customerName: 'Test Customer',
  projectName: 'Test Project',
  salesPerson: 'Test Sales',
  wantDate: new Date('2025-12-31'),
  language: 'EN',
  notes: 'Test notes',
  sinkFamily: 'MDRD',
  sinkQuantity: 1,
  buildNumbers: ['BN-001'],
  status: 'ORDER_CREATED',
  ...overrides,
})

export const createMockSinkConfiguration = (overrides = {}) => ({
  sinkModelId: 'T2-B2',
  width: 60,
  length: 72,
  legTypeId: 'T2-DL27-KIT',
  feetTypeId: 'T2-LEVELING-CASTOR-475',
  workflowDirection: 'LEFT_TO_RIGHT',
  pegboard: false,
  basins: [
    {
      basinType: 'E_SINK',
      basinTypeId: '713.109',
      basinSize: '712.102',
      basinSizePartNumber: '712.102',
      addonIds: [],
    }
  ],
  faucets: [
    {
      id: 'faucet-1',
      faucetTypeId: '706.58',
      placement: 'CENTER',
    }
  ],
  sprayers: [],
  controlBoxId: 'T2-CTRL-ESK1',
  ...overrides,
})

export const createMockBOMItem = (overrides = {}) => ({
  id: '709.82',
  name: 'T2-BODY-48-60-HA',
  quantity: 1,
  category: 'SINK_BODY',
  type: 'ASSEMBLY',
  components: [],
  ...overrides,
})