# Testing Guide for CleanStation Application

## Overview

This application uses a comprehensive testing strategy with three levels of testing:
- **Unit Tests**: Jest + React Testing Library for components and business logic
- **Integration Tests**: Jest + Supertest for API endpoints
- **E2E Tests**: Playwright for full user workflows

## Running Tests

### Unit & Integration Tests

```bash
# Run all Jest tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only unit tests (components, stores, lib)
npm run test:unit

# Run only integration tests (API routes)
npm run test:integration
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI mode (interactive)
npm run test:e2e:ui

# Debug E2E tests
npm run test:e2e:debug

# Run all tests (unit, integration, and E2E)
npm run test:all
```

## Test Structure

### Unit Tests
Located alongside the components they test:
- `components/order/__tests__/CustomerInfoStep.test.tsx`
- `stores/__tests__/orderCreateStore.test.ts`

### Integration Tests
Located in API directories:
- `app/api/__tests__/orders.test.ts`
- `app/api/__tests__/configurator.test.ts`

### E2E Tests
Located in the `e2e/` directory:
- `e2e/order-creation.spec.ts` - Complete order creation workflow
- `e2e/bom-preview.spec.ts` - BOM generation and display
- `e2e/role-based-access.spec.ts` - Role-based access control

## Writing Tests

### Unit Test Example

```typescript
import { render, screen, fireEvent } from '@/test-utils'
import { MyComponent } from '../MyComponent'

describe('MyComponent', () => {
  it('handles user interaction', async () => {
    render(<MyComponent />)
    
    const button = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument()
    })
  })
})
```

### Integration Test Example

```typescript
import { createMocks } from 'node-mocks-http'
import { POST } from '../route'

describe('POST /api/orders', () => {
  it('creates order successfully', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: { /* test data */ }
    })
    
    const response = await POST(req)
    const json = await response.json()
    
    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test('user can create order', async ({ page }) => {
  await page.goto('/orders/create')
  
  // Fill form
  await page.fill('input[name="poNumber"]', 'PO-123')
  await page.click('button:has-text("Next")')
  
  // Verify result
  await expect(page.locator('text=Order created')).toBeVisible()
})
```

## Test Utilities

### Custom Render Function
The `test-utils/index.tsx` provides a custom render function that wraps components with necessary providers:

```typescript
import { render } from '@/test-utils'

// Automatically wrapped with SessionProvider
render(<MyComponent />)
```

### Test Data Factories
Use the provided factories for consistent test data:

```typescript
import { createMockOrder, createMockSinkConfiguration } from '@/test-utils'

const order = createMockOrder({ poNumber: 'TEST-001' })
const config = createMockSinkConfiguration({ sinkModelId: 'T2-B2' })
```

## Authentication in Tests

### Unit/Integration Tests
Mock authentication using Jest:

```typescript
jest.mock('@/lib/auth')
import { getAuthUser } from '@/lib/auth'

beforeEach(() => {
  (getAuthUser as jest.Mock).mockResolvedValue({
    id: 'test-user',
    role: 'ADMIN'
  })
})
```

### E2E Tests
Use the auth setup file to maintain session:

```typescript
test.use({ storageState: 'playwright/.auth/user.json' })
```

## Debugging Tests

### Jest Tests
- Use `console.log()` for quick debugging
- Use `screen.debug()` to see the current DOM
- Run specific test: `npm test -- CustomerInfoStep.test.tsx`

### Playwright Tests
- Use `--debug` flag: `npm run test:e2e:debug`
- Use UI mode: `npm run test:e2e:ui`
- Add `await page.pause()` to pause execution

## Coverage Reports

After running `npm run test:coverage`, open `coverage/lcov-report/index.html` to view the coverage report.

## CI/CD Integration

The test suite is designed to run in CI environments:
- Jest tests run in parallel by default
- Playwright tests run in headless mode
- Set `CI=true` environment variable for CI-specific behavior

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External Dependencies**: Mock API calls, database queries
3. **Use Test IDs**: Add `data-testid` attributes for reliable E2E selectors
4. **Test User Flows**: Focus on critical user journeys
5. **Keep Tests Fast**: Mock heavy operations, use test databases
6. **Meaningful Assertions**: Test behavior, not implementation details