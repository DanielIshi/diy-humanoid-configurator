import { test, expect } from '@playwright/test';

test.describe('i18n - Comprehensive Translation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('preferred-language', 'de'); } catch {}
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('German (DE) - Navigation and Product Content', async ({ page }) => {
    // Navigation elements in German
    await expect(page.getByRole('heading', { level: 1 })).toContainText('DIY Humanoid Konfigurator');
    await expect(page.getByRole('link', { name: /konfigurator/i })).toBeVisible();
    
    // Product categories in German
    await expect(page.locator('text=Servo').first()).toBeVisible();
    await expect(page.getByText('Steuerung', { exact: false })).toBeVisible();
    await expect(page.getByText('Sensor', { exact: false })).toBeVisible();
    
    // Units and pricing in German
    await expect(page.getByText('/ Stk.', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Menge:', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Hinzufügen', { exact: false }).first()).toBeVisible();
    
    // Search functionality in German
    await expect(page.getByPlaceholder(/produktname.*kategorie.*spezifikation/i)).toBeVisible();
    await expect(page.getByText('Alle Kategorien', { exact: false })).toBeVisible();
  });

  test('English (EN) - Complete Language Switch', async ({ page }) => {
    // Switch to English
    const langButton = page.getByRole('button', { name: /sprache auswählen|select language/i });
    await langButton.click();
    await page.getByRole('option', { name: /english/i }).click();
    await page.waitForTimeout(500);

    // Navigation in English
    await expect(page.getByRole('heading', { level: 1 })).toContainText('DIY Humanoid Configurator');
    await expect(page.getByRole('link', { name: /configurator/i })).toBeVisible();
    
    // Product categories in English
    await expect(page.locator('text=Servo Motors').first()).toBeVisible();
    await expect(page.getByText('Controllers', { exact: false })).toBeVisible();
    await expect(page.getByText('Sensors', { exact: false })).toBeVisible();
    
    // Units and controls in English
    await expect(page.getByText('/ pcs', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Quantity:', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Add', { exact: false }).first()).toBeVisible();
    
    // Search in English
    await expect(page.getByPlaceholder(/product name.*category.*specification/i)).toBeVisible();
    await expect(page.getByText('All Categories', { exact: false })).toBeVisible();
    
    // Product descriptions in English
    await expect(page.getByText('Reliable servo with metal gearing', { exact: false })).toBeVisible();
    await expect(page.getByText('High-performance servo', { exact: false })).toBeVisible();
  });

  test('Dutch (NL) - Full Translation Validation', async ({ page }) => {
    // Switch to Dutch
    const langButton = page.getByRole('button', { name: /sprache auswählen|select language/i });
    await langButton.click();
    await page.getByRole('option', { name: /nederlands/i }).click();
    await page.waitForTimeout(500);

    // Navigation in Dutch
    await expect(page.getByRole('heading', { level: 1 })).toContainText('DIY Humanoid Configurator');
    await expect(page.getByRole('link', { name: /configurator/i })).toBeVisible();
    
    // Product categories in Dutch
    await expect(page.getByText('Servo Motoren', { exact: false })).toBeVisible();
    await expect(page.getByText('Controllers', { exact: false })).toBeVisible();
    await expect(page.getByText('Sensoren', { exact: false })).toBeVisible();
    
    // Units and controls in Dutch
    await expect(page.getByText('/ st', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Aantal:', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Toevoegen', { exact: false }).first()).toBeVisible();
    
    // Search in Dutch
    await expect(page.getByPlaceholder(/productnaam.*categorie.*specificatie/i)).toBeVisible();
    await expect(page.getByText('Alle categorieën', { exact: false })).toBeVisible();
    
    // Product descriptions in Dutch
    await expect(page.getByText('Betrouwbare servo met metalen tandwielen', { exact: false })).toBeVisible();
  });

  test('Thai (TH) - Unicode and RTL Support', async ({ page }) => {
    // Switch to Thai
    const langButton = page.getByRole('button', { name: /sprache auswählen|select language/i });
    await langButton.click();
    await page.getByRole('option', { name: /ไทย/i }).click();
    await page.waitForTimeout(500);

    // Navigation in Thai
    await expect(page.getByRole('heading', { level: 1 })).toContainText('DIY Humanoid Configurator');
    await expect(page.getByRole('link', { name: /ตัวกำหนดค่า/i })).toBeVisible();
    
    // Product categories in Thai
    await expect(page.getByText('เซอร์โวมอเตอร์', { exact: false })).toBeVisible();
    await expect(page.getByText('ตัวควบคุม', { exact: false })).toBeVisible();
    await expect(page.getByText('เซ็นเซอร์', { exact: false })).toBeVisible();
    
    // Units and controls in Thai
    await expect(page.getByText('/ ชิ้น', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('จำนวน:', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('เพิ่ม', { exact: false }).first()).toBeVisible();
    
    // Search in Thai
    await expect(page.getByPlaceholder(/ชื่อผลิตภัณฑ์.*หมวดหมู่/i)).toBeVisible();
    await expect(page.getByText('ทุกหมวดหมู่', { exact: false })).toBeVisible();
    
    // Thai currency symbol
    await expect(page.getByText('฿', { exact: false }).first()).toBeVisible();
  });

  test('Language Persistence and Product Search', async ({ page }) => {
    // Switch to English and test search functionality
    const langButton = page.getByRole('button', { name: /sprache auswählen|select language/i });
    await langButton.click();
    await page.getByRole('option', { name: /english/i }).click();
    await page.waitForTimeout(500);

    // Test search in English
    const searchInput = page.getByPlaceholder(/product name.*category.*specification/i);
    await searchInput.fill('servo');
    await page.waitForTimeout(500);

    // Should show servo products with English names
    await expect(page.getByText('Servo Motors', { exact: false })).toBeVisible();
    await expect(page.getByText('Lightweight Metal Servo', { exact: false })).toBeVisible();
    
    // Test category filter
    await page.selectOption('select:has-text("All Categories")', 'SERVO');
    await page.waitForTimeout(500);
    
    // Should only show servo category
    await expect(page.getByText('Servo Motors', { exact: false })).toBeVisible();
    
    // Refresh page and check language persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still be in English
    await expect(page.getByText('All Categories', { exact: false })).toBeVisible();
    await expect(page.getByText('Servo Motors', { exact: false })).toBeVisible();
  });

  test('Product Details and Technical Specs - Eigennamen Validation', async ({ page }) => {
    // Switch to English
    const langButton = page.getByRole('button', { name: /sprache auswählen|select language/i });
    await langButton.click();
    await page.getByRole('option', { name: /english/i }).click();
    await page.waitForTimeout(500);

    // Technical specifications should remain in English/original language
    await expect(page.getByText('MG996R', { exact: false })).toBeVisible();
    await expect(page.getByText('ATmega2560', { exact: false })).toBeVisible();
    await expect(page.getByText('PCA9685', { exact: false })).toBeVisible();
    await expect(page.getByText('MPU-6050', { exact: false })).toBeVisible();
    await expect(page.getByText('BNO055', { exact: false })).toBeVisible();
    await expect(page.getByText('Arduino Mega 2560', { exact: false })).toBeVisible();
    await expect(page.getByText('Raspberry Pi 5', { exact: false })).toBeVisible();
    
    // Switch to German and verify technical specs stay the same
    const langButtonDE = page.getByRole('button', { name: /select language|sprache auswählen/i });
    await langButtonDE.click();
    await page.getByRole('option', { name: /deutsch/i }).click();
    await page.waitForTimeout(500);
    
    // Technical model numbers should still be unchanged
    await expect(page.getByText('MG996R', { exact: false })).toBeVisible();
    await expect(page.getByText('ATmega2560', { exact: false })).toBeVisible();
    await expect(page.getByText('I²C', { exact: false })).toBeVisible();
    await expect(page.getByText('6 DOF', { exact: false })).toBeVisible();
  });

  test('Mobile Responsive Language Switch', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Mobile language switcher should work
    const langButton = page.getByRole('button', { name: /sprache auswählen|select language/i });
    await langButton.click();
    await page.getByRole('option', { name: /english/i }).click();
    await page.waitForTimeout(500);

    // Mobile navigation should be translated
    await expect(page.getByText('All Categories', { exact: false })).toBeVisible();
    await expect(page.getByText('Search', { exact: false })).toBeVisible();
    
    // Product grid should be responsive and translated
    await expect(page.getByText('Servo Motors', { exact: false })).toBeVisible();
    await expect(page.getByText('Quantity:', { exact: false }).first()).toBeVisible();
  });

  test('Language Switch Performance and Error Handling', async ({ page }) => {
    // Rapidly switch languages to test performance
    const languages = ['english', 'deutsch', 'nederlands', 'ไทย'];
    
    for (const lang of languages) {
      const langButton = page.getByRole('button', { name: /sprache auswählen|select language|taal selecteren|เลือกภาษา/i });
      await langButton.click();
      await page.getByRole('option', { name: new RegExp(lang, 'i') }).click();
      await page.waitForTimeout(300);
      
      // Verify page doesn't break and shows content
      await expect(page.getByRole('heading', { level: 1 })).toContainText('DIY Humanoid Configurator');
    }
    
    // Test with missing translation keys (should fall back gracefully)
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator('body')).not.toContainText('{{');
  });
});
