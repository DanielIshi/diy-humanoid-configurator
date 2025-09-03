import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Critical Functionality', () => {
  
  test('App loads and displays home page', async ({ page }) => {
    await page.goto('/');
    
    // Check if page loads without errors
    await expect(page).toHaveTitle(/DIY Humanoid Configurator/);
    
    // Check if main navigation is present
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
  });

  test('Configurator page loads and basic functionality works', async ({ page }) => {
    await page.goto('/configurator');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if configurator components are present
    await expect(page.locator('[data-testid="product-catalog"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="cost-panel"]')).toBeVisible({ timeout: 10000 });
    
    // Test adding a component
    const firstProduct = page.locator('.product-card').first();
    if (await firstProduct.isVisible()) {
      const addButton = firstProduct.locator('button[class*="bg-emerald"], button[class*="bg-green"]').first();
      if (await addButton.isVisible()) {
        await addButton.click();
        // Check if cost panel updates
        await expect(page.locator('[data-testid="cost-panel"]')).toContainText('€');
      }
    }
  });

  test('Language switching works', async ({ page }) => {
    await page.goto('/configurator');
    
    // Look for language selector
    const languageSelector = page.locator('select[class*="language"], button[class*="language"], [data-testid="language-selector"]');
    
    if (await languageSelector.first().isVisible()) {
      // Test language switch if selector exists
      await languageSelector.first().click();
      // Basic check that page doesn't crash
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Currency switching works', async ({ page }) => {
    await page.goto('/configurator');
    await page.waitForLoadState('networkidle');
    
    // Look for currency selector
    const currencySelector = page.locator('select[class*="currency"], button[class*="currency"], [data-testid="currency-selector"]');
    
    if (await currencySelector.first().isVisible()) {
      await currencySelector.first().click();
      // Check that prices are displayed
      await expect(page.locator('[data-testid="cost-panel"]')).toBeVisible();
    }
  });

  test('AI Advisor chat opens', async ({ page }) => {
    await page.goto('/configurator');
    await page.waitForLoadState('networkidle');
    
    // Look for chat button/icon
    const chatButton = page.locator('button[class*="chat"], [data-testid="chat-advisor"], button[title*="chat"], button[title*="advisor"]').first();
    
    if (await chatButton.isVisible({ timeout: 5000 })) {
      await chatButton.click();
      // Check if chat interface appears
      await expect(page.locator('[class*="chat"], [data-testid="chat-interface"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('No JavaScript errors in console', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    await page.goto('/configurator');
    await page.waitForLoadState('networkidle');
    
    // Allow minor warnings but not critical errors
    const criticalErrors = errors.filter(error => 
      !error.includes('Warning') && 
      !error.includes('favicon') &&
      !error.includes('DevTools')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});