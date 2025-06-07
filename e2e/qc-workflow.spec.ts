import { test, expect } from '@playwright/test'

test.describe('QC Workflow', () => {
  test('should complete Pre-QC workflow as QC Person', async ({ page }) => {
    // Login as QC Person
    await page.goto('/login')
    await page.fill('input[name="email"]', 'qc@torvan.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to dashboard
    await page.waitForURL('/dashboard')
    await expect(page.locator('h1')).toContainText('QC Person Dashboard')
    
    // Find an order that is ReadyForPreQC
    const orderCard = page.locator('[data-testid="order-card"]').filter({ hasText: 'ReadyForPreQC' }).first()
    await expect(orderCard).toBeVisible()
    
    // Get the order ID from the card
    const orderId = await orderCard.getAttribute('data-order-id')
    expect(orderId).toBeTruthy()
    
    // Click on the QC button
    await orderCard.locator('button:has-text("Start Pre-QC")').click()
    
    // Should navigate to QC page
    await page.waitForURL(`/orders/${orderId}/qc`)
    await expect(page.locator('h1')).toContainText('Quality Control')
    
    // Verify Pre-Production Check template is loaded
    await expect(page.locator('text=Pre-Production Check')).toBeVisible()
    
    // Fill out the QC form - check all Pass/Fail items as PASS
    const checklistItems = page.locator('[data-testid="checklist-item"]')
    const itemCount = await checklistItems.count()
    
    for (let i = 0; i < itemCount; i++) {
      const item = checklistItems.nth(i)
      const itemType = await item.getAttribute('data-item-type')
      
      if (itemType === 'PASS_FAIL') {
        await item.locator('input[value="PASS"]').check()
      } else if (itemType === 'TEXT_INPUT') {
        await item.locator('input[type="text"]').fill('Inspected and verified')
      } else if (itemType === 'NUMERIC_INPUT') {
        await item.locator('input[type="number"]').fill('10')
      } else if (itemType === 'CHECKBOX') {
        await item.locator('input[type="checkbox"]').check()
      }
    }
    
    // Add notes
    await page.fill('textarea[name="notes"]', 'Pre-QC inspection completed successfully. All items passed.')
    
    // Submit the QC form
    await page.click('button:has-text("Submit QC Results")')
    
    // Should show success message
    await expect(page.locator('text=QC results submitted successfully')).toBeVisible()
    
    // Verify the order status has changed to ReadyForProduction
    await page.goto('/dashboard')
    const updatedOrderCard = page.locator(`[data-order-id="${orderId}"]`)
    await expect(updatedOrderCard).toContainText('ReadyForProduction')
  })

  test('should complete Final QC workflow as QC Person', async ({ page }) => {
    // Login as QC Person
    await page.goto('/login')
    await page.fill('input[name="email"]', 'qc@torvan.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to dashboard
    await page.waitForURL('/dashboard')
    
    // Find an order that is ReadyForFinalQC
    const orderCard = page.locator('[data-testid="order-card"]').filter({ hasText: 'ReadyForFinalQC' }).first()
    await expect(orderCard).toBeVisible()
    
    // Get the order ID from the card
    const orderId = await orderCard.getAttribute('data-order-id')
    expect(orderId).toBeTruthy()
    
    // Click on the Final QC button
    await orderCard.locator('button:has-text("Start Final QC")').click()
    
    // Should navigate to QC page
    await page.waitForURL(`/orders/${orderId}/qc`)
    
    // Verify Final QC template is loaded
    await expect(page.locator('text=Final QC')).toBeVisible()
    
    // Fill out the Final QC form
    const checklistItems = page.locator('[data-testid="checklist-item"]')
    const itemCount = await checklistItems.count()
    
    for (let i = 0; i < itemCount; i++) {
      const item = checklistItems.nth(i)
      const itemType = await item.getAttribute('data-item-type')
      
      if (itemType === 'PASS_FAIL') {
        await item.locator('input[value="PASS"]').check()
      } else if (itemType === 'TEXT_INPUT') {
        await item.locator('input[type="text"]').fill('Final inspection passed')
      } else if (itemType === 'NUMERIC_INPUT') {
        await item.locator('input[type="number"]').fill('15')
      } else if (itemType === 'CHECKBOX') {
        await item.locator('input[type="checkbox"]').check()
      }
    }
    
    // Add notes
    await page.fill('textarea[name="notes"]', 'Final QC inspection completed. Product ready for shipment.')
    
    // Submit the QC form
    await page.click('button:has-text("Submit QC Results")')
    
    // Should show success message
    await expect(page.locator('text=QC results submitted successfully')).toBeVisible()
    
    // Verify the order status has changed to ReadyForShip
    await page.goto('/dashboard')
    const updatedOrderCard = page.locator(`[data-order-id="${orderId}"]`)
    await expect(updatedOrderCard).toContainText('ReadyForShip')
  })

  test('should handle QC failure workflow', async ({ page }) => {
    // Login as QC Person
    await page.goto('/login')
    await page.fill('input[name="email"]', 'qc@torvan.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to dashboard and find a ReadyForPreQC order
    await page.waitForURL('/dashboard')
    const orderCard = page.locator('[data-testid="order-card"]').filter({ hasText: 'ReadyForPreQC' }).first()
    await expect(orderCard).toBeVisible()
    
    const orderId = await orderCard.getAttribute('data-order-id')
    await orderCard.locator('button:has-text("Start Pre-QC")').click()
    
    // Navigate to QC page
    await page.waitForURL(`/orders/${orderId}/qc`)
    
    // Fill out form with some failures
    const checklistItems = page.locator('[data-testid="checklist-item"]')
    const firstItem = checklistItems.first()
    
    // Mark first item as FAIL
    await firstItem.locator('input[value="FAIL"]').check()
    
    // Add failure notes
    await page.fill('textarea[name="notes"]', 'Item failed inspection. Requires rework.')
    
    // Submit the QC form
    await page.click('button:has-text("Submit QC Results")')
    
    // Should show success message for submission
    await expect(page.locator('text=QC results submitted successfully')).toBeVisible()
    
    // Verify the order status remains the same (not progressed) due to failure
    await page.goto('/dashboard')
    const updatedOrderCard = page.locator(`[data-order-id="${orderId}"]`)
    // Status should not have changed to ReadyForProduction
    await expect(updatedOrderCard).not.toContainText('ReadyForProduction')
  })
})