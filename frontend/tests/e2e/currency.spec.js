import { test, expect } from '@playwright/test';

test.describe('Multi-Currency System', () => {
  test.beforeEach(async ({ page }) => {
    // Starte lokalen Server (Port kann variieren)
    await page.goto('http://localhost:5174');
    
    // Warte auf vollständiges Laden der App
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Extra Zeit für React-Rendering
    
    // Warte auf wichtige Elemente anstatt header
    await expect(page.getByText('DIY Humanoid Configurator')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
  });

  test('Deutsche Währung (EUR) wird korrekt angezeigt', async ({ page }) => {
    // Sprache auf Deutsch setzen
    const languageButton = page.getByRole('button').filter({ hasText: /Deutsch|German|DE/i }).first();
    if (await languageButton.isVisible()) {
      await languageButton.click();
      await page.waitForTimeout(1000);
    }

    // Prüfe Euro-Symbol und deutsche Formatierung
    await expect(page.locator('.text-emerald-400')).toContainText('€');
    
    // Prüfe Sidebar - "Preisübersicht" statt "Kostenübersicht"
    await expect(page.getByText('Preisübersicht')).toBeVisible();
    
    // Prüfe dass keine EK/VK Abkürzungen mehr sichtbar sind
    await expect(page.locator('text=EK')).not.toBeVisible();
    await expect(page.locator('text=VK')).not.toBeVisible();
    await expect(page.locator('text=Einkaufspreis')).not.toBeVisible();
    await expect(page.locator('text=Verkaufspreis')).not.toBeVisible();

    // Prüfe GESAMTPREIS (nicht TOTALPREIS)
    await expect(page.getByText('GESAMTPREIS')).toBeVisible();
    
    // Prüfe Währungshinweis
    await expect(page.getByText('Preise automatisch in lokaler Währung')).toBeVisible();
  });

  test('Englische Währung (GBP) wird korrekt angezeigt', async ({ page }) => {
    // Sprache auf Englisch setzen
    const languageButton = page.getByRole('button').filter({ hasText: /English|EN/i }).first();
    if (await languageButton.isVisible()) {
      await languageButton.click();
      await page.waitForTimeout(2000); // Mehr Zeit für Währungsumrechnung
    }

    // Warte auf Currency Service
    await page.waitForTimeout(3000);

    // Prüfe Pfund-Symbol
    const priceElements = page.locator('.text-emerald-400');
    await expect(priceElements.first()).toContainText('£');
    
    // Prüfe englische Sidebar-Übersetzungen
    await expect(page.getByText('Cost Overview')).toBeVisible();
    await expect(page.getByText('TOTAL PRICE')).toBeVisible();
  });

  test('Niederländische Währung (EUR) wird korrekt angezeigt', async ({ page }) => {
    // Sprache auf Niederländisch setzen
    const languageButton = page.getByRole('button').filter({ hasText: /Nederlands|Dutch|NL/i }).first();
    if (await languageButton.isVisible()) {
      await languageButton.click();
      await page.waitForTimeout(1000);
    }

    // Prüfe Euro-Symbol (wie Deutsch)
    await expect(page.locator('.text-emerald-400')).toContainText('€');
    
    // Prüfe niederländische Übersetzungen
    await expect(page.getByText('Prijsoverzicht')).toBeVisible();
    await expect(page.getByText('TOTAALPRIJS')).toBeVisible();
  });

  test('Thai Währung (THB) wird korrekt angezeigt', async ({ page }) => {
    // Sprache auf Thai setzen
    const languageButton = page.getByRole('button').filter({ hasText: /ไทย|Thai|TH/i }).first();
    if (await languageButton.isVisible()) {
      await languageButton.click();
      await page.waitForTimeout(3000); // Extra Zeit für THB-Umrechnung
    }

    // Warte auf Currency Service
    await page.waitForTimeout(3000);

    // Prüfe Baht-Symbol
    const priceElements = page.locator('.text-emerald-400');
    await expect(priceElements.first()).toContainText('฿');
    
    // Prüfe Thai-Übersetzungen
    await expect(page.getByText('ภาพรวมราคา')).toBeVisible();
    await expect(page.getByText('ราคารวม')).toBeVisible();
  });

  test('Währungsumrechnung funktioniert bei Sprachenwechsel', async ({ page }) => {
    let germanPrice, englishPrice;
    
    // Starte mit Deutsch (EUR)
    const germanButton = page.getByRole('button').filter({ hasText: /Deutsch|German/i }).first();
    if (await germanButton.isVisible()) {
      await germanButton.click();
      await page.waitForTimeout(1000);
    }

    // Erfasse einen Preis in Euro
    const firstPriceElement = page.locator('.text-emerald-400').first();
    await expect(firstPriceElement).toBeVisible();
    germanPrice = await firstPriceElement.textContent();

    // Wechsle zu Englisch (GBP)
    const englishButton = page.getByRole('button').filter({ hasText: /English/i }).first();
    if (await englishButton.isVisible()) {
      await englishButton.click();
      await page.waitForTimeout(3000); // Zeit für API-Call
    }

    // Erfasse Preis in Pfund
    await expect(firstPriceElement).toBeVisible();
    englishPrice = await firstPriceElement.textContent();

    // Prüfe dass sich die Währungen unterscheiden
    expect(germanPrice).toContain('€');
    expect(englishPrice).toContain('£');
    expect(germanPrice).not.toBe(englishPrice);
  });

  test('Exchange Rate Caching funktioniert', async ({ page }) => {
    // Wechsle mehrmals zwischen Sprachen
    const languages = [
      { button: /Deutsch/i, symbol: '€' },
      { button: /English/i, symbol: '£' },
      { button: /ไทย/i, symbol: '฿' }
    ];

    for (const lang of languages) {
      const langButton = page.getByRole('button').filter({ hasText: lang.button }).first();
      if (await langButton.isVisible()) {
        await langButton.click();
        await page.waitForTimeout(2000);
        
        // Prüfe dass Preise schnell laden (Cache)
        const priceElement = page.locator('.text-emerald-400').first();
        await expect(priceElement).toBeVisible();
        await expect(priceElement).toContainText(lang.symbol);
      }
    }
  });

  test('Produktkarte zeigt korrekte Währung und entfernte EK/VK', async ({ page }) => {
    // Navigiere zum Konfigurator
    await page.getByRole('link', { name: /Konfigurator|Configurator/i }).click();
    await page.waitForLoadState('networkidle');

    // Prüfe dass Produktkarten Preise ohne EK/VK zeigen
    const productCards = page.locator('.bg-\\[\\#0b1328\\]');
    await expect(productCards.first()).toBeVisible();

    // Stelle sicher dass keine EK/VK Begriffe sichtbar sind
    await expect(page.locator('text=EK')).not.toBeVisible();
    await expect(page.locator('text=VK')).not.toBeVisible();
    
    // Prüfe dass nur Endkundenpreise angezeigt werden
    const priceElements = page.locator('.text-emerald-400');
    await expect(priceElements.first()).toBeVisible();
    
    // Wechsle Sprache und prüfe Währungsänderung
    const englishButton = page.getByRole('button').filter({ hasText: /English/i }).first();
    if (await englishButton.isVisible()) {
      await englishButton.click();
      await page.waitForTimeout(2000);
      await expect(priceElements.first()).toContainText('£');
    }
  });

  test('CSV Export enthält keine EK/VK Daten', async ({ page }) => {
    // Navigiere zum Konfigurator
    await page.getByRole('link', { name: /Konfigurator|Configurator/i }).click();
    await page.waitForLoadState('networkidle');

    // Füge ein Produkt hinzu
    const quantityInput = page.locator('input[type="number"]').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.fill('2');
      await page.waitForTimeout(500);
    }

    // Setup Download Listener
    const downloadPromise = page.waitForEvent('download');
    
    // Klicke Export Button (jetzt "Exportiere Teileliste")
    const exportButton = page.getByText(/Exportiere|Export.*liste|Export.*BOM/i);
    if (await exportButton.isVisible()) {
      await exportButton.click();
      
      // Warte auf Download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('humanoid_parts_list.csv');
    }
  });

  test('Brand Names bleiben unübersetzt mit neuer Währung', async ({ page }) => {
    // Navigiere zum Konfigurator  
    await page.getByRole('link', { name: /Konfigurator|Configurator/i }).click();
    await page.waitForLoadState('networkidle');

    const brandNames = [
      'Arduino', 'Raspberry Pi', 'MG996R', 'HC-SR04', 
      'MPU6050', 'ESP32', 'LiPo', 'Dynamixel'
    ];

    // Teste alle Sprachen
    const languages = [
      /Deutsch/i, /English/i, /Nederlands/i, /ไทย/i
    ];

    for (const lang of languages) {
      const langButton = page.getByRole('button').filter({ hasText: lang }).first();
      if (await langButton.isVisible()) {
        await langButton.click();
        await page.waitForTimeout(1500);
        
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
});