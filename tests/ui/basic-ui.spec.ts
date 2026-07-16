import { test, expect } from '@playwright/test';

test.describe('Development Review Workspace - UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the local instance
    await page.goto('/');
  });

  test('should display the Demo Mode banner on the auth page', async ({ page }) => {
    // Check if the Demo banner is visible
    const banner = page.locator('text=DEMO MODE: This is a demo');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('This is a demo and is meant to show the idea not the functionalities');
  });

  test('should support theme toggling on the auth page', async ({ page }) => {
    // Get the HTML class attribute
    const html = page.locator('html');
    const themeBtn = page.locator('#auth-theme-toggle-btn');
    
    // Toggle theme and verify class change
    await themeBtn.click();
    const hasDarkClass = await html.evaluate((el) => el.classList.contains('dark'));
    
    // Toggle again
    await themeBtn.click();
    const hasDarkClassAgain = await html.evaluate((el) => el.classList.contains('dark'));
    
    expect(hasDarkClass).not.toBe(hasDarkClassAgain);
  });

  test('should display registration forms when toggle is clicked', async ({ page }) => {
    // Click toggle to sign up
    const toggleLink = page.locator('button:has-text("Sign up here")');
    if (await toggleLink.isVisible()) {
      await toggleLink.click();
      
      // Verify Name field appears
      const nameInput = page.locator('placeholder="Full Name"');
      await expect(nameInput).toBeVisible();
      
      // Verify Role selector appears
      const roleSelect = page.locator('select');
      await expect(roleSelect).toBeVisible();
    }
  });
});
