import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Go to the login page
  await page.goto('/login')
  
  // Perform authentication steps
  await page.fill('input[name="username"]', 'admin')
  await page.fill('input[name="password"]', 'admin123')
  await page.click('button[type="submit"]')
  
  // Wait until the page receives the cookies
  await page.waitForURL('/dashboard')
  
  // Verify we're logged in
  await expect(page.locator('text=Admin User')).toBeVisible()
  
  // Save signed-in state
  await page.context().storageState({ path: authFile })
})