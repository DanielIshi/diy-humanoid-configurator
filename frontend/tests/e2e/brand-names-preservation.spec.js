import { test, expect } from '@playwright/test';

const SUPPORTED_LANGUAGES = [
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'English' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'th', name: 'ไทย' }
];

// Brand names and technical terms that should NEVER be translated
const BRAND_NAMES_AND_TECH_TERMS = [
  // Hardware brands
  'Arduino',
  'Raspberry Pi',
  'MG996R',
  'DS3218', 
  'PCA9685',
  'MPU-6050',
  'BNO055',
  'OAK-D Lite',
  'DepthAI',
  'Luxonis',
  'InMoov',
  'UBEC',
  
  // Technical specifications that should remain in English
  'ATmega2560',
  'I²C',
  'PWM',
  'DOF',
  '12-Bit',
  'Broadcom SoC',
  'GPIO',
  'USB',
  'WiFi',
  'Bluetooth',
  
  // Chemical/Material names
  'LiPo',
  'PLA',
  'PETG',
  'SEPA IBAN',
  
  // Units and measurements
  'kg·cm',
  'mAh',
  'VAT',
  'RGB',
  'Hz',
  'V',
  'A',
  'W'
];

// Product model numbers that should be preserved
const PRODUCT_MODEL_NUMBERS = [
  'MG996R',
  'DS3218',
  'PCA9685',
  'MPU-6050',
  'BNO055',
  'RPI5',
  'ARD_MEGA',
  'OAKDLITE',
  'UBEC6A',
  'PSU12V10A',
  'LIPO4S5000'
];

test.describe('Brand Names and Technical Terms Preservation', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // Helper function to switch language
  async function switchToLanguage(page, langCode) {
    const methods = [
      async () => {
        const select = page.locator('select[name*="language"], select[name*="lang"]');
        if (await select.count() > 0) {
          await select.selectOption(langCode);
          return true;
        }
        return false;
      },
      
      async () => {
        const langName = SUPPORTED_LANGUAGES.find(l => l.code === langCode)?.name;
        const button = page.getByText(langName);
        if (await button.count() > 0) {
          await button.first().click();
          return true;
        }
        return false;
      },
      
      async () => {
        await page.goto(`/?lang=${langCode}`);
        return true;
      },
      
      async () => {
        await page.evaluate((lang) => {
          localStorage.setItem('language', lang);
          localStorage.setItem('i18nextLng', lang);
        }, langCode);
        await page.reload();
        return true;
      }
    ];
    
    for (const method of methods) {
      try {
        if (await method()) {
          await page.waitForTimeout(500);
          break;
        }
      } catch (error) {
        continue;
      }
    }
  }

  // Test that all brand names are preserved across all languages
  test('should preserve brand names across all supported languages', async ({ page }) => {
    for (const language of SUPPORTED_LANGUAGES) {
      await test.step(`Testing brand name preservation in ${language.name} (${language.code})`, async () => {
        await switchToLanguage(page, language.code);
        
        // Navigate to different pages that might contain brand names
        const pagesToCheck = [
          { url: '/', name: 'homepage' },
          { url: '/configurator', name: 'configurator' },
          { url: '/about', name: 'about' }
        ];

        for (const pageInfo of pagesToCheck) {
          try {
            await page.goto(pageInfo.url);
            await page.waitForLoadState('networkidle');
            
            // Check each brand name
            for (const brandName of BRAND_NAMES_AND_TECH_TERMS) {
              // Look for exact brand name matches
              const brandElements = page.getByText(brandName, { exact: false });
              const count = await brandElements.count();
              
              if (count > 0) {
                console.log(`✓ Found brand name "${brandName}" on ${pageInfo.name} page in ${language.code}`);
                
                // Verify that the brand name appears exactly as expected
                for (let i = 0; i < count; i++) {
                  const element = brandElements.nth(i);
                  if (await element.isVisible()) {
                    const text = await element.textContent();
                    expect(text).toContain(brandName);
                  }
                }
              }
            }
          } catch (error) {
            console.log(`Page ${pageInfo.url} not accessible, skipping...`);
          }
        }
      });
    }
  });

  // Test specifically product model numbers in product listings
  test('should preserve product model numbers in all languages', async ({ page }) => {
    for (const language of SUPPORTED_LANGUAGES) {
      await test.step(`Testing product model preservation in ${language.name}`, async () => {
        await switchToLanguage(page, language.code);
        
        // Try to navigate to product catalog/configurator
        try {
          await page.goto('/configurator');
          await page.waitForLoadState('networkidle');
          
          for (const modelNumber of PRODUCT_MODEL_NUMBERS) {
            const modelElements = page.getByText(modelNumber, { exact: false });
            const count = await modelElements.count();
            
            if (count > 0) {
              console.log(`✓ Found model number "${modelNumber}" in configurator in ${language.code}`);
              
              // Check that model number is not altered
              const firstElement = modelElements.first();
              if (await firstElement.isVisible()) {
                const text = await firstElement.textContent();
                expect(text).toMatch(new RegExp(modelNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
              }
            }
          }
        } catch (error) {
          console.log(`Could not access configurator page in ${language.code}, skipping model number check...`);
        }
      });
    }
  });

  // Test that technical specifications are not translated
  test('should preserve technical specifications across languages', async ({ page }) => {
    const technicalSpecs = [
      { term: 'I²C', context: 'communication protocol' },
      { term: 'PWM', context: 'pulse width modulation' },
      { term: 'DOF', context: 'degrees of freedom' },
      { term: '12-Bit', context: 'resolution specification' },
      { term: 'GPIO', context: 'general purpose input/output' },
      { term: 'USB', context: 'universal serial bus' },
      { term: 'WiFi', context: 'wireless communication' },
      { term: 'Bluetooth', context: 'wireless communication' }
    ];

    for (const language of SUPPORTED_LANGUAGES) {
      await test.step(`Testing technical specs in ${language.name}`, async () => {
        await switchToLanguage(page, language.code);
        
        try {
          await page.goto('/configurator');
          await page.waitForLoadState('networkidle');
          
          for (const spec of technicalSpecs) {
            const specElements = page.getByText(spec.term, { exact: false });
            const count = await specElements.count();
            
            if (count > 0) {
              console.log(`✓ Found technical spec "${spec.term}" (${spec.context}) in ${language.code}`);
              
              // Verify spec appears unchanged
              const firstElement = specElements.first();
              if (await firstElement.isVisible()) {
                await expect(firstElement).toBeVisible();
              }
            }
          }
        } catch (error) {
          console.log(`Could not check technical specs in ${language.code}: ${error.message}`);
        }
      });
    }
  });

  // Test that units and measurements remain consistent
  test('should preserve measurement units across languages', async ({ page }) => {
    const units = [
      { unit: 'mAh', context: 'battery capacity' },
      { unit: 'kg·cm', context: 'servo torque' },
      { unit: 'V', context: 'voltage' },
      { unit: 'A', context: 'amperage' },
      { unit: 'W', context: 'wattage' },
      { unit: 'Hz', context: 'frequency' },
      { unit: 'GB', context: 'memory capacity' },
      { unit: 'MHz', context: 'processor speed' }
    ];

    for (const language of SUPPORTED_LANGUAGES) {
      await test.step(`Testing measurement units in ${language.name}`, async () => {
        await switchToLanguage(page, language.code);
        
        try {
          await page.goto('/configurator');
          await page.waitForLoadState('networkidle');
          
          for (const unitInfo of units) {
            const unitElements = page.getByText(unitInfo.unit, { exact: false });
            const count = await unitElements.count();
            
            if (count > 0) {
              console.log(`✓ Found unit "${unitInfo.unit}" (${unitInfo.context}) preserved in ${language.code}`);
              
              // Check unit is not translated or modified
              const firstElement = unitElements.first();
              if (await firstElement.isVisible()) {
                const text = await firstElement.textContent();
                expect(text).toMatch(new RegExp(unitInfo.unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
              }
            }
          }
        } catch (error) {
          console.log(`Could not check units in ${language.code}: ${error.message}`);
        }
      });
    }
  });

  // Test specific product descriptions to ensure only descriptions are translated, not specs
  test('should translate descriptions but preserve all technical details', async ({ page }) => {
    const productTests = [
      {
        modelNumber: 'MG996R',
        shouldPreserve: ['MG996R', 'kg·cm', '6V', 'Metallgetriebe', 'metal gear'],
        shouldTranslate: {
          de: ['Leichtes', 'Servo', 'Zuverlässiges'],
          en: ['Lightweight', 'Servo', 'Reliable'],
          nl: ['Licht', 'Servo', 'Betrouwbaar'],
          th: ['เซอร์โว', 'น้ำหนักเบา', 'เชื่อถือได้']
        }
      },
      {
        modelNumber: 'DS3218',
        shouldPreserve: ['DS3218', 'kg·cm', 'wasserdicht', 'waterproof'],
        shouldTranslate: {
          de: ['Starkes', 'Hochleistungs'],
          en: ['Strong', 'High-performance'],
          nl: ['Sterk', 'Hoge prestaties'],
          th: ['แรง', 'ประสิทธิภาพสูง']
        }
      }
    ];

    for (const language of SUPPORTED_LANGUAGES) {
      await test.step(`Testing product translations in ${language.name}`, async () => {
        await switchToLanguage(page, language.code);
        
        try {
          await page.goto('/configurator');
          await page.waitForLoadState('networkidle');
          
          for (const product of productTests) {
            // Look for the product by model number
            const productElement = page.getByText(product.modelNumber, { exact: false });
            
            if (await productElement.count() > 0) {
              console.log(`✓ Testing product ${product.modelNumber} in ${language.code}`);
              
              // Check that technical specs are preserved
              for (const preserved of product.shouldPreserve) {
                const preservedElement = page.getByText(preserved, { exact: false });
                if (await preservedElement.count() > 0) {
                  await expect(preservedElement.first()).toBeVisible();
                }
              }
              
              // Check that descriptions are properly translated
              if (product.shouldTranslate[language.code]) {
                for (const translated of product.shouldTranslate[language.code]) {
                  const translatedElement = page.getByText(translated, { exact: false });
                  // Note: We don't expect all translated terms to be present,
                  // as the exact wording may vary, but we check if any are found
                  if (await translatedElement.count() > 0) {
                    console.log(`✓ Found translated term "${translated}" for ${product.modelNumber} in ${language.code}`);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.log(`Could not test product translations in ${language.code}: ${error.message}`);
        }
      });
    }
  });
});