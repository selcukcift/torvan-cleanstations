import { test, expect } from '@playwright/test'

test.describe('Role-Based Access Control', () => {
  test('admin sees all dashboard sections', async ({ page }) => {
    // Login as admin
    await page.goto('/login')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('/dashboard')
    
    // Check all sections are visible
    await expect(page.locator('text=System Overview')).toBeVisible()
    await expect(page.locator('text=User Management')).toBeVisible()
    await expect(page.locator('text=QC Templates')).toBeVisible()
    await expect(page.locator('text=All Orders')).toBeVisible()
    await expect(page.locator('text=Analytics')).toBeVisible()
  })

  test('assembler has limited access', async ({ page }) => {
    // Login as assembler
    await page.goto('/login')
    await page.fill('input[name="username"]', 'assembler')
    await page.fill('input[name="password"]', 'assembler123')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('/dashboard')
    
    // Check visible sections
    await expect(page.locator('text=My Assigned Orders')).toBeVisible()
    await expect(page.locator('text=In Progress')).toBeVisible()
    
    // Check hidden sections
    await expect(page.locator('text=User Management')).not.toBeVisible()
    await expect(page.locator('text=QC Templates')).not.toBeVisible()
    
    // Try to access admin route directly
    await page.goto('/admin/users')
    await expect(page.locator('text=Access Denied')).toBeVisible()
  })

  test('QC person can access quality control features', async ({ page }) => {
    // Login as QC person
    await page.goto('/login')
    await page.fill('input[name="username"]', 'qcperson')
    await page.fill('input[name="password"]', 'qc123')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('/dashboard')
    
    // Check QC-specific features
    await expect(page.locator('text=QC Queue')).toBeVisible()
    await expect(page.locator('text=Pending QC')).toBeVisible()
    await expect(page.locator('text=QC Reports')).toBeVisible()
    
    // Navigate to an order
    await page.click('tr:has-text("READY_FOR_QC"):first')
    
    // Check QC form access
    await expect(page.locator('button:has-text("Start QC")')).toBeVisible()
    await page.click('button:has-text("Start QC")')
    await expect(page.locator('text=Quality Control Form')).toBeVisible()
  })
})