import { test, expect } from '@playwright/test';

test('App renders key sections', async ({ page }) => {
  await page.goto('/');
  // Expect UI sections from the configurator to be visible
  await expect(page.getByText('Anleitungen zusammenstellen')).toBeVisible();
  await expect(page.getByText('Roadmap')).toBeVisible();
});

