import { test, expect } from '@playwright/test'

test.describe('BOM Preview and Generation', () => {
  test.use({ storageState: 'playwright/.auth/user.json' })

  test('displays hierarchical BOM structure', async ({ page }) => {
    // Navigate to an existing order
    await page.goto('/orders')
    await page.click('tr:has-text("ORD-"):first')
    
    // Wait for order details to load
    await expect(page.locator('h1:has-text("Order Details")')).toBeVisible()
    
    // Check BOM section
    await expect(page.locator('text=Bill of Materials')).toBeVisible()
    
    // Verify hierarchical display
    const bomItems = page.locator('[data-testid="bom-item"]')
    await expect(bomItems).toHaveCount({ minimum: 1 })
    
    // Expand a top-level assembly
    await page.click('button[aria-label="Expand"]:first')
    
    // Check for child components
    await expect(page.locator('[data-testid="bom-child-item"]')).toBeVisible()
    
    // Verify part details are shown
    await expect(page.locator('text=/ID: \\d+/')).toBeVisible()
    await expect(page.locator('text=/Type: (ASSEMBLY|PART|KIT)/')).toBeVisible()
    await expect(page.locator('text=/×\\d+/')).toBeVisible()
  })

  test('exports BOM to different formats', async ({ page }) => {
    await page.goto('/orders')
    await page.click('tr:has-text("ORD-"):first')
    
    // Click export button
    await page.click('button:has-text("Export BOM")')
    
    // Check export options
    await expect(page.locator('text=Export as PDF')).toBeVisible()
    await expect(page.locator('text=Export as Excel')).toBeVisible()
    await expect(page.locator('text=Export as CSV')).toBeVisible()
    
    // Test PDF export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export as PDF")')
    ])
    
    expect(download.suggestedFilename()).toMatch(/BOM.*\.pdf/)
  })
})