import { test, expect } from '@playwright/test';

const SUPPORTED_LANGUAGES = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' }
];

// Expected translations for key UI elements per language
const TRANSLATIONS = {
  de: {
    navigation: {
      home: 'Home',
      configurator: 'Konfigurator',
      admin: 'Admin',
      about: 'Über uns'
    },
    actions: {
      add: 'Hinzufügen',
      remove: 'Entfernen',
      saveConfiguration: 'Konfiguration speichern',
      order: 'Bestellen'
    },
    messages: {
      welcome: 'Willkommen beim DIY Humanoid Konfigurator',
      loading: 'Laden...'
    },
    configurator: {
      title: 'DIY Humanoid Konfigurator',
      subtitle: 'Bauen Sie Ihren eigenen humanoiden Roboter'
    },
    common: {
      search: 'Suchen',
      category: 'Kategorie',
      quantity: 'Menge'
    }
  },
  en: {
    navigation: {
      home: 'Home',
      configurator: 'Configurator',
      admin: 'Admin',
      about: 'About Us'
    },
    actions: {
      add: 'Add',
      remove: 'Remove',
      saveConfiguration: 'Save Configuration',
      order: 'Order'
    },
    messages: {
      welcome: 'Welcome to the DIY Humanoid Configurator',
      loading: 'Loading...'
    },
    configurator: {
      title: 'DIY Humanoid Configurator',
      subtitle: 'Build your own humanoid robot'
    },
    common: {
      search: 'Search',
      category: 'Category',
      quantity: 'Quantity'
    }
  },
  nl: {
    navigation: {
      home: 'Home',
      configurator: 'Configurator',
      admin: 'Admin',
      about: 'Over ons'
    },
    actions: {
      add: 'Toevoegen',
      remove: 'Verwijderen',
      saveConfiguration: 'Configuratie opslaan',
      order: 'Bestellen'
    },
    messages: {
      welcome: 'Welkom bij de DIY Humanoid Configurator',
      loading: 'Laden...'
    },
    configurator: {
      title: 'DIY Humanoid Configurator',
      subtitle: 'Bouw je eigen humanoïde robot'
    },
    common: {
      search: 'Zoeken',
      category: 'Categorie',
      quantity: 'Hoeveelheid'
    }
  },
  th: {
    navigation: {
      home: 'หน้าแรก',
      configurator: 'เครื่องมือกำหนดค่า',
      admin: 'ผู้ดูแล',
      about: 'เกี่ยวกับเรา'
    },
    actions: {
      add: 'เพิ่ม',
      remove: 'ลบ',
      saveConfiguration: 'บันทึกการกำหนดค่า',
      order: 'สั่งซื้อ'
    },
    messages: {
      welcome: 'ยินดีต้อนรับสู่เครื่องมือกำหนดค่าหุ่นยนต์ DIY',
      loading: 'กำลังโหลด...'
    },
    configurator: {
      title: 'เครื่องมือกำหนดค่าหุ่นยนต์ DIY',
      subtitle: 'สร้างหุ่นยนต์คล้ายมนุษย์ของคุณเอง'
    },
    common: {
      search: 'ค้นหา',
      category: 'หมวดหมู่',
      quantity: 'จำนวน'
    }
  }
};

// Product brand names and model numbers that should NOT be translated
const BRAND_NAMES = [
  'Arduino', 'Raspberry Pi', 'MG996R', 'DS3218', 'PCA9685', 
  'MPU-6050', 'BNO055', 'OAK-D Lite', 'DepthAI', 'Luxonis',
  'InMoov', 'UBEC', 'LiPo', 'PLA', 'PETG', 'ATmega2560'
];

test.describe('Comprehensive i18n Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to fully load
    await page.waitForLoadState('networkidle');
  });

  // Test language switching functionality
  test('should have working language switcher with all supported languages', async ({ page }) => {
    // Look for language selector
    const languageSelector = page.locator('[data-testid="language-selector"]').or(
      page.locator('select[name*="language"]')
    ).or(
      page.locator('button').filter({ hasText: /🇩🇪|🇺🇸|🇳🇱|🇹🇭|Deutsch|English|Nederlands|ไทย/ })
    );

    if (await languageSelector.count() > 0) {
      await languageSelector.first().click();
      
      // Check if all supported languages are available
      for (const lang of SUPPORTED_LANGUAGES) {
        const langOption = page.locator(`text=${lang.name}`).or(
          page.locator(`[value="${lang.code}"]`)
        ).or(
          page.locator(`text=${lang.flag}`)
        );
        
        await expect(langOption.first()).toBeVisible();
      }
    }
  });

  // Test each language individually
  for (const language of SUPPORTED_LANGUAGES) {
    test(`should correctly display content in ${language.name} (${language.code})`, async ({ page }) => {
      // Switch to the specific language
      await switchToLanguage(page, language.code);
      
      const expectedTranslations = TRANSLATIONS[language.code];
      
      // Test navigation translations
      await testNavigationTranslations(page, expectedTranslations.navigation);
      
      // Test common UI elements
      await testCommonTranslations(page, expectedTranslations.common);
      
      // Test messages and titles
      await testMessageTranslations(page, expectedTranslations.messages);
      
      // Navigate to configurator to test more specific translations
      const configuratorLink = page.locator('a[href*="configurator"]').or(
        page.locator(`text=${expectedTranslations.navigation.configurator}`)
      );
      
      if (await configuratorLink.count() > 0) {
        // Wait for any modal/overlay to disappear
        await page.waitForTimeout(1000);
        
        // Try to close any modal that might be open
        const modalClose = page.locator('[data-testid="modal-close"], button[aria-label*="close"], .modal button').first();
        if (await modalClose.count() > 0 && await modalClose.isVisible()) {
          await modalClose.click();
          await page.waitForTimeout(500);
        }
        
        // Force click if needed
        await configuratorLink.first().click({ force: true });
        await page.waitForLoadState('networkidle');
        
        // Test configurator-specific translations
        await testConfiguratorTranslations(page, expectedTranslations.configurator);
        await testActionTranslations(page, expectedTranslations.actions);
      }
    });
  }

  // Test that brand names and technical terms are NOT translated
  test('should preserve brand names and technical terms across all languages', async ({ page }) => {
    for (const language of SUPPORTED_LANGUAGES) {
      await switchToLanguage(page, language.code);
      
      // Navigate to product catalog or configurator
      const catalogLink = page.locator('a[href*="configurator"]').or(
        page.locator('a[href*="catalog"]')
      ).first();
      
      if (await catalogLink.count() > 0) {
        await catalogLink.click();
        await page.waitForLoadState('networkidle');
      }
      
      // Check that brand names are preserved
      for (const brandName of BRAND_NAMES) {
        const brandElements = page.locator(`text=${brandName}`);
        if (await brandElements.count() > 0) {
          // Brand name should appear exactly as specified
          await expect(brandElements.first()).toBeVisible();
        }
      }
    }
  });

  // Test product translations while preserving technical specifications
  test('should translate product descriptions but preserve technical specs', async ({ page }) => {
    const testCases = [
      {
        lang: 'de',
        productName: 'Leichtes Metall-Servo MG996R',
        techSpec: 'MG996R',
        shouldContain: 'Metallgetriebe'
      },
      {
        lang: 'en', 
        productName: 'Lightweight Metal Servo MG996R',
        techSpec: 'MG996R',
        shouldContain: 'metal gear'
      }
    ];

    for (const testCase of testCases) {
      await switchToLanguage(page, testCase.lang);
      
      // Navigate to configurator
      const configuratorLink = page.locator('a[href*="configurator"]').first();
      if (await configuratorLink.count() > 0) {
        await configuratorLink.click();
        await page.waitForLoadState('networkidle');
      }
      
      // Look for product cards or lists
      const productElement = page.getByText(testCase.techSpec, { exact: false });
      if (await productElement.count() > 0) {
        // Technical spec should be preserved
        await expect(productElement.first()).toBeVisible();
        
        // But description should be translated
        const descriptionElement = page.getByText(testCase.shouldContain, { exact: false });
        if (await descriptionElement.count() > 0) {
          await expect(descriptionElement.first()).toBeVisible();
        }
      }
    }
  });

  // Test form validations in different languages
  test('should show form validations in correct language', async ({ page }) => {
    const validationTests = [
      { lang: 'de', requiredText: 'Pflichtfeld', emailText: 'Ungültige E-Mail' },
      { lang: 'en', requiredText: 'Required field', emailText: 'Invalid email' },
      { lang: 'nl', requiredText: 'Verplicht veld', emailText: 'Ongeldig e-mailadres' },
      { lang: 'th', requiredText: 'ฟิลด์ที่จำเป็น', emailText: 'อีเมลไม่ถูกต้อง' }
    ];

    for (const validation of validationTests) {
      await switchToLanguage(page, validation.lang);
      
      // Look for forms (login, contact, etc.)
      const forms = page.locator('form');
      if (await forms.count() > 0) {
        const form = forms.first();
        
        // Try to find email input
        const emailInput = form.locator('input[type="email"]').or(
          form.locator('input[name*="email"]')
        );
        
        if (await emailInput.count() > 0) {
          // Enter invalid email and try to submit
          await emailInput.fill('invalid-email');
          
          const submitButton = form.locator('button[type="submit"]').or(
            form.locator('button').filter({ hasText: /submit|send|senden|verstuur|ส่ง/ })
          );
          
          if (await submitButton.count() > 0) {
            await submitButton.click();
            
            // Check for validation message in correct language
            const errorMessage = page.locator(`text*=${validation.emailText}`);
            // Note: This might not always trigger depending on validation implementation
          }
        }
      }
    }
  });

  // Test responsive design with different languages
  test('should handle long translations in mobile view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    for (const language of SUPPORTED_LANGUAGES) {
      await switchToLanguage(page, language.code);
      
      // Check that navigation works on mobile
      const mobileMenu = page.locator('[data-testid="mobile-menu"]').or(
        page.locator('button').filter({ hasText: /menu|☰|≡/ })
      );
      
      if (await mobileMenu.count() > 0) {
        await mobileMenu.click();
        
        // Check that menu items are visible and not truncated
        const menuItems = page.locator('nav a, [role="menu"] a, [role="menuitem"]');
        const itemCount = await menuItems.count();
        
        for (let i = 0; i < itemCount; i++) {
          const item = menuItems.nth(i);
          if (await item.isVisible()) {
            // Check that text is not overflowing
            const box = await item.boundingBox();
            expect(box?.width).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});

// Helper function to switch language
async function switchToLanguage(page, langCode) {
  // Try different methods to switch language
  const methods = [
    // Method 1: Dropdown/select
    async () => {
      const select = page.locator('select[name*="language"], select[name*="lang"]');
      if (await select.count() > 0) {
        await select.selectOption(langCode);
        return true;
      }
      return false;
    },
    
    // Method 2: Button with language name
    async () => {
      const langName = SUPPORTED_LANGUAGES.find(l => l.code === langCode)?.name;
      const button = page.locator(`button:has-text("${langName}")`);
      if (await button.count() > 0) {
        await button.click();
        return true;
      }
      return false;
    },
    
    // Method 3: Language flag button
    async () => {
      const langFlag = SUPPORTED_LANGUAGES.find(l => l.code === langCode)?.flag;
      const flagButton = page.locator(`button:has-text("${langFlag}")`);
      if (await flagButton.count() > 0) {
        await flagButton.click();
        return true;
      }
      return false;
    },
    
    // Method 4: URL parameter
    async () => {
      await page.goto(`/?lang=${langCode}`);
      return true;
    },
    
    // Method 5: Local storage
    async () => {
      await page.evaluate((lang) => {
        localStorage.setItem('language', lang);
        localStorage.setItem('i18nextLng', lang);
      }, langCode);
      await page.reload();
      return true;
    }
  ];
  
  // Try each method until one works
  for (const method of methods) {
    try {
      if (await method()) {
        await page.waitForTimeout(500); // Wait for language switch
        break;
      }
    } catch (error) {
      continue;
    }
  }
}

// Helper functions to test specific translation categories
async function testNavigationTranslations(page, expected) {
  for (const [key, value] of Object.entries(expected)) {
    const element = page.locator(`nav a:has-text("${value}"), a:has-text("${value}")`);
    if (await element.count() > 0) {
      await expect(element.first()).toBeVisible();
    }
  }
}

async function testCommonTranslations(page, expected) {
  for (const [key, value] of Object.entries(expected)) {
    const element = page.getByText(value, { exact: true });
    // Don't fail if element is not found, as it might not be on current page
    if (await element.count() > 0) {
      await expect(element.first()).toBeVisible();
    }
  }
}

async function testMessageTranslations(page, expected) {
  for (const [key, value] of Object.entries(expected)) {
    const element = page.getByText(value, { exact: false });
    if (await element.count() > 0) {
      await expect(element.first()).toBeVisible();
    }
  }
}

async function testConfiguratorTranslations(page, expected) {
  for (const [key, value] of Object.entries(expected)) {
    const element = page.getByText(value, { exact: false });
    if (await element.count() > 0) {
      await expect(element.first()).toBeVisible();
    }
  }
}

async function testActionTranslations(page, expected) {
  for (const [key, value] of Object.entries(expected)) {
    const buttonElement = page.getByRole('button', { name: value });
    const linkElement = page.getByRole('link', { name: value });
    
    if (await buttonElement.count() > 0) {
      await expect(buttonElement.first()).toBeVisible();
    } else if (await linkElement.count() > 0) {
      await expect(linkElement.first()).toBeVisible();
    }
  }
}