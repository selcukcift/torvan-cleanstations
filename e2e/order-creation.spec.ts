import { test, expect } from '@playwright/test'

test.describe('Order Creation Flow', () => {
  test.use({ storageState: 'playwright/.auth/user.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/orders/create')
  })

  test('complete order creation flow', async ({ page }) => {
    // Step 1: Customer Information
    await expect(page.locator('h2:has-text("Customer & Order Information")')).toBeVisible()
    
    // Fill customer info
    await page.fill('input[id="poNumber"]', 'PO-TEST-001')
    await page.fill('input[id="customerName"]', 'Test Hospital')
    await page.fill('input[id="salesPerson"]', 'John Doe')
    await page.click('button:has-text("Desired Delivery Date")')
    await page.click('button[name="day"]:has-text("15")')
    await page.fill('textarea[id="notes"]', 'E2E test order')
    
    // Select language
    await page.click('label:has-text("EN")')
    
    // Go to next step
    await page.click('button:has-text("Next")')
    
    // Step 2: Sink Selection
    await expect(page.locator('h2:has-text("Sink Selection & Quantities")')).toBeVisible()
    
    // Select sink family
    await page.click('button[role="combobox"]:has-text("Select a sink family")')
    await page.click('div[role="option"]:has-text("MDRD CleanStation")')
    
    // Select quantity
    await page.click('button[role="combobox"]:has-text("Select quantity")')
    await page.click('div[role="option"]:has-text("2 Sinks")')
    
    // Enter build numbers
    await page.fill('input[placeholder="Enter unique build number"]:first', 'BN-TEST-001')
    await page.fill('input[placeholder="Enter unique build number"]:last', 'BN-TEST-002')
    
    // Wait for validation
    await expect(page.locator('text=Build numbers are valid')).toBeVisible()
    
    // Go to next step
    await page.click('button:has-text("Next")')
    
    // Step 3: Sink Configuration
    await expect(page.locator('h2:has-text("Sink Configuration")')).toBeVisible()
    await expect(page.locator('text=Configuring Build Number: BN-TEST-001')).toBeVisible()
    
    // Configure sink body
    await page.click('button[role="combobox"]:has-text("Select sink model")')
    await page.click('div[role="option"]:has-text("T2-B2")')
    
    await page.fill('input[id="width"]', '60')
    await page.fill('input[id="length"]', '72')
    
    await page.click('button[role="combobox"]:has-text("Select leg type")')
    await page.click('div[role="option"]:has-text("T2-DL27-KIT")')
    
    await page.click('button[role="combobox"]:has-text("Select feet type")')
    await page.click('div[role="option"]:has-text("LOCK_LEVELING_CASTERS")')
    
    await page.click('label:has-text("Left to Right")')
    
    // Configure basins
    await page.click('button[role="tab"]:has-text("Basins")')
    await page.click('button:has-text("Add Basin")')
    
    await page.click('button[role="combobox"]:has-text("Select basin type")')
    await page.click('div[role="option"]:has-text("E-Sink")')
    
    await page.click('button[role="combobox"]:has-text("Select basin size")')
    await page.click('div[role="option"]:has-text("20X20X8")')
    
    // Configure faucets
    await page.click('button[role="tab"]:has-text("Faucets")')
    await page.click('button:has-text("Add Faucet")')
    
    await page.click('button[role="combobox"]:has-text("Select faucet type")')
    await page.click('div[role="option"]:has-text("WRIST BLADE")')
    
    // Skip to next build number
    await page.click('button:has-text("Next Sink")')
    await expect(page.locator('text=Configuring Build Number: BN-TEST-002')).toBeVisible()
    
    // Quick config for second sink
    await page.click('button[role="combobox"]:has-text("Select sink model")')
    await page.click('div[role="option"]:has-text("T2-B1")')
    
    await page.fill('input[id="width"]', '48')
    await page.fill('input[id="length"]', '60')
    
    // Go to next step
    await page.click('button:has-text("Next")')
    
    // Step 4: Accessories (optional)
    await expect(page.locator('h2:has-text("Accessories & Add-ons")')).toBeVisible()
    
    // Add an accessory
    await page.fill('input[placeholder="Search accessories..."]', 'bin rail')
    await page.click('text=BIN RAIL, 24" KIT')
    await page.click('button:has-text("Add to BN-TEST-001")')
    
    // Go to review
    await page.click('button:has-text("Review Order")')
    
    // Step 5: Review
    await expect(page.locator('h2:has-text("Review Your Order")')).toBeVisible()
    
    // Verify order details
    await expect(page.locator('text=PO-TEST-001')).toBeVisible()
    await expect(page.locator('text=Test Hospital')).toBeVisible()
    await expect(page.locator('text=2 sinks')).toBeVisible()
    
    // Preview BOM
    await page.click('button:has-text("Preview BOM")')
    await expect(page.locator('text=BOM Preview Generated')).toBeVisible()
    
    // Submit order
    await page.click('button:has-text("Submit Order")')
    
    // Wait for success
    await expect(page.locator('text=Order Submitted Successfully!')).toBeVisible()
    await expect(page.locator('text=ORD-')).toBeVisible()
  })

  test('validates required fields', async ({ page }) => {
    // Try to go to next step without filling required fields
    await page.click('button:has-text("Next")')
    
    // Should stay on same page
    await expect(page.locator('h2:has-text("Customer & Order Information")')).toBeVisible()
    
    // Fill minimum required fields
    await page.fill('input[id="poNumber"]', 'PO')
    await page.fill('input[id="customerName"]', 'Te')
    
    // Check validation messages
    await expect(page.locator('input[id="poNumber"]:invalid')).toBeVisible()
    await expect(page.locator('input[id="customerName"]:invalid')).toBeVisible()
  })

  test('handles duplicate build numbers', async ({ page }) => {
    // Navigate to sink selection
    await page.fill('input[id="poNumber"]', 'PO-12345')
    await page.fill('input[id="customerName"]', 'Test Customer')
    await page.fill('input[id="salesPerson"]', 'Sales Person')
    await page.click('button:has-text("Desired Delivery Date")')
    await page.click('button[name="day"]:visible:first')
    await page.click('button:has-text("Next")')
    
    // Select sink family and quantity
    await page.click('button[role="combobox"]:has-text("Select a sink family")')
    await page.click('div[role="option"]:has-text("MDRD CleanStation")')
    await page.click('button[role="combobox"]:has-text("Select quantity")')
    await page.click('div[role="option"]:has-text("2 Sinks")')
    
    // Enter duplicate build numbers
    await page.fill('input[placeholder="Enter unique build number"]:first', 'BN-001')
    await page.fill('input[placeholder="Enter unique build number"]:last', 'BN-001')
    
    // Check validation
    await expect(page.locator('text=Build numbers must be unique')).toBeVisible()
    await expect(page.locator('input[value="BN-001"]:last')).toHaveClass(/border-red-500/)
  })
})