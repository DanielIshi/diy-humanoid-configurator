import { test, expect } from '@playwright/test';

test.describe('Customer Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('complete customer configuration flow', async ({ page }) => {
    // Navigate to configurator
    await page.getByRole('link', { name: /start configuring/i }).click();
    await expect(page).toHaveURL(/.*configurator.*/);

    // Wait for components to load
    await expect(page.getByText('Actuators')).toBeVisible();
    await expect(page.getByText('Controllers')).toBeVisible();
    await expect(page.getByText('Sensors')).toBeVisible();

    // Add servo motor to configuration
    const servoMotor = page.getByText('Standard Servo Motor').first();
    await expect(servoMotor).toBeVisible();
    
    await page.getByRole('button', { name: /add.*standard servo motor/i }).first().click();
    
    // Verify component was added to configuration
    await expect(page.getByText('Configuration Summary')).toBeVisible();
    await expect(page.getByText('Standard Servo Motor')).toBeVisible();
    await expect(page.getByText('x1')).toBeVisible();

    // Add Arduino controller
    await page.getByText('Arduino Uno').click();
    await page.getByRole('button', { name: /add.*arduino uno/i }).click();
    
    // Verify both components are in configuration
    await expect(page.getByText('Arduino Uno')).toBeVisible();
    
    // Check total cost is calculated
    const totalCost = page.getByText(/total.*\$\d+\.\d{2}/i);
    await expect(totalCost).toBeVisible();

    // Name the configuration
    const configNameInput = page.getByPlaceholder('Enter configuration name');
    await configNameInput.fill('My DIY Humanoid Robot');
    
    // Save configuration
    await page.getByRole('button', { name: /save configuration/i }).click();
    
    // Verify save success message
    await expect(page.getByText(/configuration saved/i)).toBeVisible();
  });

  test('generate assembly manual', async ({ page }) => {
    // First create a configuration (reuse previous test setup)
    await page.getByRole('link', { name: /start configuring/i }).click();
    
    // Add components quickly
    await expect(page.getByText('Actuators')).toBeVisible();
    await page.getByRole('button', { name: /add.*standard servo motor/i }).first().click();
    await page.getByRole('button', { name: /add.*arduino uno/i }).first().click();
    
    // Name and save
    await page.getByPlaceholder('Enter configuration name').fill('Test Manual Robot');
    await page.getByRole('button', { name: /save configuration/i }).click();
    
    // Generate manual
    await page.getByRole('button', { name: /generate manual/i }).click();
    
    // Wait for manual generation (this might take a while with OpenAI)
    await expect(page.getByText(/generating manual/i)).toBeVisible();
    
    // Manual should be displayed
    await expect(page.getByText(/assembly manual/i)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/introduction/i)).toBeVisible();
    await expect(page.getByText(/assembly instructions/i)).toBeVisible();
    
    // Check for safety notes
    await expect(page.getByText(/safety/i)).toBeVisible();
    
    // Test manual controls
    await page.getByRole('button', { name: /print manual/i }).click();
    await page.getByRole('button', { name: /download pdf/i }).click();
  });

  test('place order workflow', async ({ page }) => {
    // Create configuration first
    await page.getByRole('link', { name: /start configuring/i }).click();
    await expect(page.getByText('Actuators')).toBeVisible();
    
    // Add components
    await page.getByRole('button', { name: /add.*standard servo motor/i }).first().click();
    await page.getByRole('button', { name: /add.*arduino uno/i }).first().click();
    
    // Save configuration
    await page.getByPlaceholder('Enter configuration name').fill('Order Test Robot');
    await page.getByRole('button', { name: /save configuration/i }).click();
    
    // Proceed to order
    await page.getByRole('button', { name: /place order/i }).click();
    
    // Fill shipping information
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Full Name').fill('John Doe');
    await page.getByLabel('Address').fill('123 Test Street');
    await page.getByLabel('City').fill('Test City');
    await page.getByLabel('ZIP Code').fill('12345');
    await page.getByLabel('Country').selectOption('US');
    
    // Review order
    await expect(page.getByText('Order Summary')).toBeVisible();
    await expect(page.getByText('Standard Servo Motor')).toBeVisible();
    await expect(page.getByText('Arduino Uno')).toBeVisible();
    
    // Check total amount
    await expect(page.getByText(/total.*\$\d+\.\d{2}/i)).toBeVisible();
    
    // Proceed to payment (in real test, this would be mocked)
    await page.getByRole('button', { name: /proceed to payment/i }).click();
    
    // Payment form should be visible
    await expect(page.getByText(/payment information/i)).toBeVisible();
  });

  test('search and filter components', async ({ page }) => {
    await page.getByRole('link', { name: /start configuring/i }).click();
    await expect(page.getByText('Actuators')).toBeVisible();
    
    // Test search functionality
    const searchInput = page.getByPlaceholder(/search components/i);
    await searchInput.fill('servo');
    
    // Should show only servo-related components
    await expect(page.getByText('Standard Servo Motor')).toBeVisible();
    await expect(page.getByText('High Torque Servo')).toBeVisible();
    
    // Clear search
    await searchInput.clear();
    
    // Test category filter
    await page.getByRole('button', { name: /controllers/i }).click();
    
    // Should show only controller components
    await expect(page.getByText('Arduino Uno')).toBeVisible();
    await expect(page.getByText('Standard Servo Motor')).not.toBeVisible();
  });

  test('configuration validation', async ({ page }) => {
    await page.getByRole('link', { name: /start configuring/i }).click();
    await expect(page.getByText('Actuators')).toBeVisible();
    
    // Try to save without naming configuration
    await page.getByRole('button', { name: /save configuration/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/configuration name is required/i)).toBeVisible();
    
    // Try to generate manual without components
    await page.getByRole('button', { name: /generate manual/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/add components.*generate manual/i)).toBeVisible();
  });

  test('responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.getByRole('link', { name: /start configuring/i }).click();
    
    // Mobile menu should be present
    const mobileMenu = page.getByRole('button', { name: /menu/i });
    await expect(mobileMenu).toBeVisible();
    
    // Components should be displayed in mobile-friendly layout
    await expect(page.getByText('Actuators')).toBeVisible();
    
    // Add component on mobile
    await page.getByRole('button', { name: /add.*standard servo motor/i }).first().click();
    
    // Configuration panel should be accessible
    await expect(page.getByText('Configuration Summary')).toBeVisible();
  });

  test('advisor integration', async ({ page }) => {
    // Navigate to advisor
    await page.getByRole('link', { name: /advisor/i }).click();
    await expect(page).toHaveURL(/.*advisor.*/);
    
    // Ask advisor a question
    const chatInput = page.getByPlaceholder(/ask.*question/i);
    await chatInput.fill('What servo motor should I use for arm joints?');
    
    await page.getByRole('button', { name: /send/i }).click();
    
    // Wait for AI response
    await expect(page.getByText(/recommend/i)).toBeVisible({ timeout: 15000 });
    
    // Advisor should provide component recommendations
    await expect(page.getByText(/servo/i)).toBeVisible();
  });

  test('error handling', async ({ page }) => {
    // Simulate network error by intercepting API calls
    await page.route('/api/components', route => {
      route.abort('failed');
    });
    
    await page.getByRole('link', { name: /start configuring/i }).click();
    
    // Should show error message
    await expect(page.getByText(/error.*loading.*components/i)).toBeVisible();
    
    // Should show retry button
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });

  test('accessibility compliance', async ({ page }) => {
    await page.getByRole('link', { name: /start configuring/i }).click();
    
    // Check for proper heading hierarchy
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    
    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
    
    // Check for form labels
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      }
    }
  });

  test('performance benchmarks', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    
    // Test configurator performance
    await page.getByRole('link', { name: /start configuring/i }).click();
    
    const configStartTime = Date.now();
    await expect(page.getByText('Actuators')).toBeVisible();
    const configLoadTime = Date.now() - configStartTime;
    
    expect(configLoadTime).toBeLessThan(2000); // Configurator should load within 2 seconds
  });
});

// Smoke tests for production
test.describe('Production Smoke Tests @smoke', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/diy humanoid configurator/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /start configuring/i })).toBeVisible();
  });

  test('configurator is accessible', async ({ page }) => {
    await page.goto('/configurator');
    await expect(page.getByText('Actuators')).toBeVisible({ timeout: 10000 });
  });

  test('admin panel requires authentication', async ({ page }) => {
    await page.goto('/admin');
    // Should redirect to login or show login form
    await expect(page.getByText(/login/i)).toBeVisible();
  });

  test('API endpoints respond', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const componentsResponse = await page.request.get('/api/components');
    expect(componentsResponse.ok()).toBeTruthy();
  });
});