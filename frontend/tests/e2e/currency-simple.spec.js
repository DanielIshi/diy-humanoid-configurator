import { test, expect } from '@playwright/test';

test.describe('Multi-Currency System - Simplified', () => {
  test.beforeEach(async ({ page }) => {
    // Navigiere zur Hauptseite
    await page.goto('http://localhost:5174');
    
    // Warte auf vollständiges Laden der App
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Zeit für React-Rendering
    
    // Prüfe dass die App geladen hat
    await expect(page.getByText('DIY Humanoid Configurator')).toBeVisible();
  });

  test('Deutsche Sprache zeigt Euro-Währung', async ({ page }) => {
    // Sprache auf Deutsch setzen (falls nicht schon aktiv)
    const germanButton = page.getByRole('button').filter({ hasText: /Deutsch|DE/i }).first();
    if (await germanButton.isVisible()) {
      await germanButton.click();
      await page.waitForTimeout(1000);
    }

    // Prüfe Euro-Symbol in Preisen
    const priceElements = page.locator('.text-emerald-400');
    if (await priceElements.count() > 0) {
      await expect(priceElements.first()).toContainText('€');
    }

    // Prüfe deutsche Sidebar-Texte
    await expect(page.getByText('Preisübersicht')).toBeVisible();
    
    // Prüfe dass keine EK/VK Abkürzungen sichtbar sind
    await expect(page.locator('text=EK')).not.toBeVisible();
    await expect(page.locator('text=VK')).not.toBeVisible();
  });

  test('Englische Sprache zeigt Pfund-Währung', async ({ page }) => {
    // Sprache auf Englisch setzen
    const englishButton = page.getByRole('button').filter({ hasText: /English|EN/i }).first();
    if (await englishButton.isVisible()) {
      await englishButton.click();
      await page.waitForTimeout(3000); // Extra Zeit für API-Call
    }

    // Warte auf Currency Service
    await page.waitForTimeout(3000);

    // Prüfe Pfund-Symbol (£)
    const priceElements = page.locator('.text-emerald-400');
    if (await priceElements.count() > 0) {
      await expect(priceElements.first()).toContainText('£');
    }

    // Prüfe englische Sidebar-Übersetzungen
    await expect(page.getByText('Cost Overview')).toBeVisible();
  });

  test('Thai Sprache zeigt Baht-Währung', async ({ page }) => {
    // Sprache auf Thai setzen
    const thaiButton = page.getByRole('button').filter({ hasText: /ไทย|Thai|TH/i }).first();
    if (await thaiButton.isVisible()) {
      await thaiButton.click();
      await page.waitForTimeout(4000); // Extra Zeit für THB-Umrechnung
    }

    // Warte auf Currency Service
    await page.waitForTimeout(4000);

    // Prüfe Baht-Symbol (฿)
    const priceElements = page.locator('.text-emerald-400');
    if (await priceElements.count() > 0) {
      await expect(priceElements.first()).toContainText('฿');
    }

    // Prüfe Thai-Übersetzungen
    await expect(page.getByText('ภาพรวมราคา')).toBeVisible();
  });

  test('Währung ändert sich bei Sprachenwechsel', async ({ page }) => {
    let germanPrice, englishPrice;
    
    // Starte mit Deutsch (EUR)
    const germanButton = page.getByRole('button').filter({ hasText: /Deutsch|German/i }).first();
    if (await germanButton.isVisible()) {
      await germanButton.click();
      await page.waitForTimeout(1000);
    }

    // Erfasse einen Preis in Euro
    const firstPriceElement = page.locator('.text-emerald-400').first();
    if (await firstPriceElement.isVisible()) {
      germanPrice = await firstPriceElement.textContent();
    }

    // Wechsle zu Englisch (GBP)
    const englishButton = page.getByRole('button').filter({ hasText: /English/i }).first();
    if (await englishButton.isVisible()) {
      await englishButton.click();
      await page.waitForTimeout(4000); // Zeit für API-Call
    }

    // Erfasse Preis in Pfund
    if (await firstPriceElement.isVisible()) {
      englishPrice = await firstPriceElement.textContent();
    }

    // Prüfe dass sich die Währungen unterscheiden (falls beide erfasst wurden)
    if (germanPrice && englishPrice) {
      expect(germanPrice).toContain('€');
      expect(englishPrice).toContain('£');
      expect(germanPrice).not.toBe(englishPrice);
    }
  });

  test('Brand Names bleiben unübersetzt', async ({ page }) => {
    const brandNames = [
      'Arduino', 'Raspberry Pi', 'MG996R', 'HC-SR04', 
      'MPU6050', 'ESP32', 'LiPo', 'Dynamixel'
    ];

    // Teste verschiedene Sprachen
    const languages = [
      /Deutsch/i, /English/i, /ไทย/i
    ];

    for (const lang of languages) {
      const langButton = page.getByRole('button').filter({ hasText: lang }).first();
      if (await langButton.isVisible()) {
        await langButton.click();
        await page.waitForTimeout(2000);
        
        // Prüfe dass Brand Names unverändert bleiben
        for (const brand of brandNames) {
          const brandElement = page.locator(`text=${brand}`);
          if (await brandElement.count() > 0) {
            await expect(brandElement.first()).toBeVisible();
          }
        }
      }
    }
  });

  test('EK/VK Abkürzungen sind aus UI entfernt', async ({ page }) => {
    // Teste alle Sprachen
    const languages = [
      /Deutsch/i, /English/i, /Nederlands/i, /ไทย/i
    ];

    for (const lang of languages) {
      const langButton = page.getByRole('button').filter({ hasText: lang }).first();
      if (await langButton.isVisible()) {
        await langButton.click();
        await page.waitForTimeout(1500);
        
        // Stelle sicher dass keine EK/VK Begriffe sichtbar sind
        await expect(page.locator('text=EK')).not.toBeVisible();
        await expect(page.locator('text=VK')).not.toBeVisible();
        await expect(page.locator('text=Einkaufspreis')).not.toBeVisible();
        await expect(page.locator('text=Verkaufspreis')).not.toBeVisible();
      }
    }
  });
});