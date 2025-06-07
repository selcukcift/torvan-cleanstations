import { test, expect } from '@playwright/test'

test.describe('Assembly Workflow', () => {
  test('should complete assembly workflow as Assembler', async ({ page }) => {
    // Login as Assembler
    await page.goto('/login')
    await page.fill('input[name="email"]', 'assembler@torvan.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to dashboard
    await page.waitForURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Assembler Dashboard')
    
    // Find an order that is ReadyForProduction
    const orderCard = page.locator('[data-testid="order-card"]').filter({ hasText: 'ReadyForProduction' }).first()
    await expect(orderCard).toBeVisible()
    
    // Get the order ID from the card
    const orderId = await orderCard.getAttribute('data-order-id')
    expect(orderId).toBeTruthy()
    
    // Click on the Start Assembly button
    await orderCard.locator('button:has-text("Start Assembly")').click()
    
    // Should navigate to order detail page
    await page.waitForURL(`/orders/${orderId}`)
    await expect(page.locator('h1')).toContainText('Order Details')
    
    // Verify TaskManagement component is visible
    await expect(page.locator('[data-testid="task-management"]')).toBeVisible()
    
    // Verify assembly tasks are listed
    await expect(page.locator('text=Assembly Tasks')).toBeVisible()
    
    // Complete each assembly task by checking the checkboxes
    const assemblyTasks = page.locator('[data-testid="assembly-task"]')
    const assemblyTaskCount = await assemblyTasks.count()
    
    for (let i = 0; i < assemblyTaskCount; i++) {
      const task = assemblyTasks.nth(i)
      
      // Expand the task if it's collapsible
      const trigger = task.locator('[data-testid="task-trigger"]')
      if (await trigger.isVisible()) {
        await trigger.click()
      }
      
      // Check the completion checkbox
      const checkbox = task.locator('input[type="checkbox"]')
      await checkbox.check()
      
      // Verify checkbox is checked
      await expect(checkbox).toBeChecked()
    }
    
    // Verify packaging checklist appears
    await expect(page.locator('text=Packaging Checklist')).toBeVisible()
    
    // Complete packaging checklist items
    const packagingItems = page.locator('[data-testid="packaging-item"]')
    const packagingItemCount = await packagingItems.count()
    
    for (let i = 0; i < packagingItemCount; i++) {
      const item = packagingItems.nth(i)
      const checkbox = item.locator('input[type="checkbox"]')
      await checkbox.check()
      await expect(checkbox).toBeChecked()
    }
    
    // Verify "Complete Assembly & Send to QC" button becomes enabled
    const completeButton = page.locator('button:has-text("Complete Assembly & Send to QC")')
    await expect(completeButton).toBeEnabled()
    
    // Click the complete button
    await completeButton.click()
    
    // Should show success message
    await expect(page.locator('text=Assembly completed successfully')).toBeVisible()
    
    // Verify the order status has changed to ReadyForFinalQC
    await page.goto('/dashboard')
    const updatedOrderCard = page.locator(`[data-order-id="${orderId}"]`)
    await expect(updatedOrderCard).toContainText('ReadyForFinalQC')
  })

  test('should show assembly progress correctly', async ({ page }) => {
    // Login as Assembler
    await page.goto('/login')
    await page.fill('input[name="email"]', 'assembler@torvan.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to dashboard and find a ReadyForProduction order
    await page.waitForURL('/dashboard')
    const orderCard = page.locator('[data-testid="order-card"]').filter({ hasText: 'ReadyForProduction' }).first()
    await expect(orderCard).toBeVisible()
    
    const orderId = await orderCard.getAttribute('data-order-id')
    await orderCard.locator('button:has-text("Start Assembly")').click()
    
    // Navigate to order detail page
    await page.waitForURL(`/orders/${orderId}`)
    
    // Verify progress indicator starts at 0%
    const progressBar = page.locator('[data-testid="assembly-progress"]')
    await expect(progressBar).toBeVisible()
    
    // Complete first task and verify progress updates
    const firstTask = page.locator('[data-testid="assembly-task"]').first()
    const firstCheckbox = firstTask.locator('input[type="checkbox"]')
    await firstCheckbox.check()
    
    // Progress should update (not 0% anymore)
    const progressText = page.locator('[data-testid="progress-text"]')
    await expect(progressText).not.toContainText('0%')
    
    // Verify task status indicators
    await expect(firstTask).toHaveClass(/.*completed.*/)
    
    // Verify instructions and requirements are displayed
    await expect(page.locator('text=Required Tools')).toBeVisible()
    await expect(page.locator('text=Required Parts')).toBeVisible()
  })

  test('should prevent completion with incomplete tasks', async ({ page }) => {
    // Login as Assembler
    await page.goto('/login')
    await page.fill('input[name="email"]', 'assembler@torvan.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to dashboard and find a ReadyForProduction order
    await page.waitForURL('/dashboard')
    const orderCard = page.locator('[data-testid="order-card"]').filter({ hasText: 'ReadyForProduction' }).first()
    await expect(orderCard).toBeVisible()
    
    const orderId = await orderCard.getAttribute('data-order-id')
    await orderCard.locator('button:has-text("Start Assembly")').click()
    
    // Navigate to order detail page
    await page.waitForURL(`/orders/${orderId}`)
    
    // Do NOT complete all tasks - only complete first task
    const firstTask = page.locator('[data-testid="assembly-task"]').first()
    await firstTask.locator('input[type="checkbox"]').check()
    
    // Verify "Complete Assembly" button is disabled
    const completeButton = page.locator('button:has-text("Complete Assembly & Send to QC")')
    await expect(completeButton).toBeDisabled()
    
    // Complete a few more tasks but not all
    const secondTask = page.locator('[data-testid="assembly-task"]').nth(1)
    await secondTask.locator('input[type="checkbox"]').check()
    
    // Button should still be disabled
    await expect(completeButton).toBeDisabled()
  })

  test('should display work instructions correctly', async ({ page }) => {
    // Login as Assembler
    await page.goto('/login')
    await page.fill('input[name="email"]', 'assembler@torvan.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to dashboard and find a ReadyForProduction order
    await page.waitForURL('/dashboard')
    const orderCard = page.locator('[data-testid="order-card"]').filter({ hasText: 'ReadyForProduction' }).first()
    await expect(orderCard).toBeVisible()
    
    const orderId = await orderCard.getAttribute('data-order-id')
    await orderCard.locator('button:has-text("Start Assembly")').click()
    
    // Navigate to order detail page
    await page.waitForURL(`/orders/${orderId}`)
    
    // Click on a task to expand it
    const firstTask = page.locator('[data-testid="assembly-task"]').first()
    const taskTrigger = firstTask.locator('[data-testid="task-trigger"]')
    await taskTrigger.click()
    
    // Verify work instructions are displayed
    await expect(page.locator('[data-testid="work-instructions"]')).toBeVisible()
    
    // Verify step-by-step instructions
    const instructionSteps = page.locator('[data-testid="instruction-step"]')
    await expect(instructionSteps.first()).toBeVisible()
    
    // Verify required tools section
    await expect(page.locator('[data-testid="required-tools"]')).toBeVisible()
    
    // Verify required parts section
    await expect(page.locator('[data-testid="required-parts"]')).toBeVisible()
  })
})