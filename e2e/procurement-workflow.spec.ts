import { test, expect } from '@playwright/test'

test.describe('Procurement Workflow', () => {
  test('should approve BOM for production as Procurement Specialist', async ({ page }) => {
    // Login as Procurement Specialist
    await page.goto('/login')
    await page.fill('input[name="email"]', 'procurement@torvan.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to dashboard
    await page.waitForURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Procurement Specialist Dashboard')
    
    // Find an order that is OrderCreated
    const orderCard = page.locator('[data-testid="order-card"]').filter({ hasText: 'OrderCreated' }).first()
    await expect(orderCard).toBeVisible()
    
    // Get the order ID from the card
    const orderId = await orderCard.getAttribute('data-order-id')
    expect(orderId).toBeTruthy()
    
    // Click on the order to view BOM
    await orderCard.click()
    
    // Should open BOM dialog or navigate to order details
    const bomViewer = page.locator('[data-testid="bom-viewer"]')
    await expect(bomViewer).toBeVisible()
    
    // Verify BOM data is displayed
    await expect(page.locator('text=Bill of Materials')).toBeVisible()
    await expect(page.locator('[data-testid="bom-item"]')).toHaveCount({ min: 1 })
    
    // Verify BOM statistics
    await expect(page.locator('[data-testid="total-parts"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-assemblies"]')).toBeVisible()
    
    // Click "Approve BOM for Production" button
    const approveBomButton = page.locator('button:has-text("Approve BOM for Production")')
    await expect(approveBomButton).toBeVisible()
    await approveBomButton.click()
    
    // Should show confirmation dialog
    await expect(page.locator('text=Approve BOM for Production')).toBeVisible()
    await page.click('button:has-text("Confirm")')
    
    // Should show success message
    await expect(page.locator('text=BOM approved successfully')).toBeVisible()
    
    // Verify the order status has changed to PartsSent
    await page.goto('/dashboard')
    const updatedOrderCard = page.locator(`[data-order-id="${orderId}"]`)
    await expect(updatedOrderCard).toContainText('PartsSent')
  })

  test('should confirm parts arrival as Procurement Specialist', async ({ page }) => {
    // Login as Procurement Specialist
    await page.goto('/login')
    await page.fill('input[name="email"]', 'procurement@torvan.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to dashboard
    await page.waitForURL('/dashboard')
    
    // Find an order that is PartsSent (waiting for arrival)
    const orderCard = page.locator('[data-testid="order-card"]').filter({ hasText: 'PartsSent' }).first()
    await expect(orderCard).toBeVisible()
    
    // Get the order ID from the card
    const orderId = await orderCard.getAttribute('data-order-id')
    expect(orderId).toBeTruthy()
    
    // Click on the order
    await orderCard.click()
    
    // Click "Confirm Parts Arrival" button
    const confirmArrivalButton = page.locator('button:has-text("Confirm Parts Arrival")')
    await expect(confirmArrivalButton).toBeVisible()
    await confirmArrivalButton.click()
    
    // Should show confirmation dialog
    await expect(page.locator('text=Confirm Parts Arrival')).toBeVisible()
    await page.click('button:has-text("Confirm")')
    
    // Should show success message
    await expect(page.locator('text=Parts arrival confirmed')).toBeVisible()
    
    // Verify the order status has changed to ReadyForPreQC
    await page.goto('/dashboard')
    const updatedOrderCard = page.locator(`[data-order-id="${orderId}"]`)
    await expect(updatedOrderCard).toContainText('ReadyForPreQC')
  })

  test('should handle service order approval workflow', async ({ page }) => {
    // Login as Procurement Specialist
    await page.goto('/login')
    await page.fill('input[name="email"]', 'procurement@torvan.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to dashboard
    await page.waitForURL('/dashboard')
    
    // Switch to Service Requests tab
    await page.click('button:has-text("Service Requests")')
    
    // Verify service requests are displayed
    await expect(page.locator('[data-testid="service-order-card"]')).toHaveCount({ min: 0 })
    
    // If there are service orders, test approval
    const serviceOrderCards = page.locator('[data-testid="service-order-card"]')
    const serviceOrderCount = await serviceOrderCards.count()
    
    if (serviceOrderCount > 0) {
      const firstServiceOrder = serviceOrderCards.first()
      const serviceOrderId = await firstServiceOrder.getAttribute('data-service-order-id')
      
      // Click "Approve & Fulfill" button
      const approveButton = firstServiceOrder.locator('button:has-text("Approve & Fulfill")')
      await approveButton.click()
      
      // Should show confirmation dialog
      await expect(page.locator('text=Approve Service Order')).toBeVisible()
      await page.click('button:has-text("Approve")')
      
      // Should show success message
      await expect(page.locator('text=Service order approved')).toBeVisible()
      
      // Verify the service order status updated
      const updatedServiceOrder = page.locator(`[data-service-order-id="${serviceOrderId}"]`)
      await expect(updatedServiceOrder).toContainText('Approved')
    }
  })

  test('should display BOM breakdown correctly', async ({ page }) => {
    // Login as Procurement Specialist
    await page.goto('/login')
    await page.fill('input[name="email"]', 'procurement@torvan.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to dashboard
    await page.waitForURL('/dashboard')
    
    // Find any order with BOM data
    const orderCard = page.locator('[data-testid="order-card"]').first()
    await expect(orderCard).toBeVisible()
    
    // Click on the order to view BOM
    await orderCard.click()
    
    // Verify BOM structure
    const bomViewer = page.locator('[data-testid="bom-viewer"]')
    await expect(bomViewer).toBeVisible()
    
    // Verify hierarchical display
    await expect(page.locator('[data-testid="bom-assembly"]')).toHaveCount({ min: 1 })
    await expect(page.locator('[data-testid="bom-part"]')).toHaveCount({ min: 1 })
    
    // Verify quantity aggregation
    await expect(page.locator('[data-testid="total-quantity"]')).toBeVisible()
    
    // Verify expandable/collapsible structure
    const expandableItems = page.locator('[data-testid="bom-expandable"]')
    if (await expandableItems.count() > 0) {
      const firstExpandable = expandableItems.first()
      await firstExpandable.click()
      
      // Verify child items become visible
      await expect(page.locator('[data-testid="bom-child-item"]')).toHaveCount({ min: 1 })
    }
  })

  test('should show procurement statistics', async ({ page }) => {
    // Login as Procurement Specialist
    await page.goto('/login')
    await page.fill('input[name="email"]', 'procurement@torvan.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to dashboard
    await page.waitForURL('/dashboard')
    
    // Verify procurement statistics cards are displayed
    await expect(page.locator('[data-testid="stat-card"]')).toHaveCount(5)
    
    // Verify specific statistics
    await expect(page.locator('text=Pending Approval')).toBeVisible()
    await expect(page.locator('text=Parts Sent')).toBeVisible()
    await expect(page.locator('text=Service Requests')).toBeVisible()
    await expect(page.locator('text=Avg Processing Time')).toBeVisible()
    await expect(page.locator('text=Total Value')).toBeVisible()
    
    // Verify statistics have numeric values
    const statValues = page.locator('[data-testid="stat-value"]')
    await expect(statValues.first()).toBeVisible()
  })

  test('should filter orders by status', async ({ page }) => {
    // Login as Procurement Specialist
    await page.goto('/login')
    await page.fill('input[name="email"]', 'procurement@torvan.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to dashboard
    await page.waitForURL('/dashboard')
    
    // Test filtering by different statuses
    const statusFilters = ['All', 'OrderCreated', 'PartsSent']
    
    for (const status of statusFilters) {
      const filterButton = page.locator(`button:has-text("${status}")`)
      if (await filterButton.isVisible()) {
        await filterButton.click()
        
        // Wait for filter to apply
        await page.waitForTimeout(500)
        
        // Verify appropriate orders are shown
        const orderCards = page.locator('[data-testid="order-card"]')
        const orderCount = await orderCards.count()
        
        if (status !== 'All' && orderCount > 0) {
          // Verify all visible orders have the correct status
          for (let i = 0; i < orderCount; i++) {
            const card = orderCards.nth(i)
            await expect(card).toContainText(status)
          }
        }
      }
    }
  })
})