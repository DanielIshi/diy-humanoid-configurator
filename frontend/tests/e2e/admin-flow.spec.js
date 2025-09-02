import { test, expect } from '@playwright/test';

test.describe('Admin Panel Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin authentication for testing
    await page.goto('/admin');
    
    // In real implementation, handle login flow
    // For testing, we'll mock the authentication state
    await page.evaluate(() => {
      localStorage.setItem('admin-auth-token', 'test-admin-token');
      localStorage.setItem('admin-user', JSON.stringify({
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin'
      }));
    });
    
    await page.goto('/admin');
  });

  test('admin dashboard loads correctly', async ({ page }) => {
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
    await expect(page.getByText('Order Management')).toBeVisible();
    await expect(page.getByText('Component Management')).toBeVisible();
    await expect(page.getByText('Payment Settings')).toBeVisible();
  });

  test('order management workflow', async ({ page }) => {
    // Navigate to order management
    await page.getByRole('link', { name: /order management/i }).click();
    
    await expect(page.getByText('Order Management')).toBeVisible();
    
    // Orders should be loaded
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /customer/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /amount/i })).toBeVisible();
    
    // Test order filtering
    const statusFilter = page.getByRole('combobox', { name: /filter by status/i });
    await statusFilter.selectOption('PENDING');
    
    // Test order search
    const searchInput = page.getByPlaceholder(/search by customer email/i);
    await searchInput.fill('john@example.com');
    
    // Test order details view
    const viewDetailsButton = page.getByRole('button', { name: /view details/i }).first();
    await viewDetailsButton.click();
    
    await expect(page.getByText('Order Details')).toBeVisible();
    await expect(page.getByText(/order id/i)).toBeVisible();
    await expect(page.getByText(/items/i)).toBeVisible();
    
    // Close details modal
    await page.getByRole('button', { name: /close/i }).click();
  });

  test('update order status', async ({ page }) => {
    await page.getByRole('link', { name: /order management/i }).click();
    
    // Find first order and update its status
    const statusUpdateButton = page.getByRole('button', { name: /update status/i }).first();
    await statusUpdateButton.click();
    
    // Status update modal should appear
    await expect(page.getByText('Update Order Status')).toBeVisible();
    
    // Select new status
    const statusSelect = page.getByRole('combobox');
    await statusSelect.selectOption('PROCESSING');
    
    // Add optional note
    const noteInput = page.getByPlaceholder(/add note/i);
    await noteInput.fill('Order is being processed');
    
    // Confirm update
    await page.getByRole('button', { name: /update status/i }).click();
    
    // Success message should appear
    await expect(page.getByText(/status updated successfully/i)).toBeVisible();
  });

  test('component management', async ({ page }) => {
    await page.getByRole('link', { name: /component management/i }).click();
    
    await expect(page.getByText('Component Management')).toBeVisible();
    
    // Components table should be visible
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /category/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /price/i })).toBeVisible();
    
    // Test adding new component
    await page.getByRole('button', { name: /add component/i }).click();
    
    await expect(page.getByText('Add New Component')).toBeVisible();
    
    // Fill component form
    await page.getByLabel('Component Name').fill('Test Servo Motor');
    await page.getByLabel('Category').selectOption('actuators');
    await page.getByLabel('Price').fill('29.99');
    await page.getByLabel('Description').fill('High-quality test servo motor');
    
    // Add specifications
    await page.getByLabel('Voltage').fill('5V');
    await page.getByLabel('Torque').fill('2.0kg·cm');
    
    // Submit form
    await page.getByRole('button', { name: /save component/i }).click();
    
    // Success message
    await expect(page.getByText(/component added successfully/i)).toBeVisible();
    
    // New component should appear in table
    await expect(page.getByText('Test Servo Motor')).toBeVisible();
  });

  test('edit existing component', async ({ page }) => {
    await page.getByRole('link', { name: /component management/i }).click();
    
    // Find first component and edit it
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    await editButton.click();
    
    await expect(page.getByText('Edit Component')).toBeVisible();
    
    // Update price
    const priceInput = page.getByLabel('Price');
    await priceInput.clear();
    await priceInput.fill('34.99');
    
    // Update description
    const descInput = page.getByLabel('Description');
    await descInput.clear();
    await descInput.fill('Updated component description');
    
    // Save changes
    await page.getByRole('button', { name: /save changes/i }).click();
    
    await expect(page.getByText(/component updated successfully/i)).toBeVisible();
  });

  test('delete component', async ({ page }) => {
    await page.getByRole('link', { name: /component management/i }).click();
    
    // Find delete button and click it
    const deleteButton = page.getByRole('button', { name: /delete/i }).first();
    await deleteButton.click();
    
    // Confirmation dialog should appear
    await expect(page.getByText('Confirm Deletion')).toBeVisible();
    await expect(page.getByText(/are you sure/i)).toBeVisible();
    
    // Confirm deletion
    await page.getByRole('button', { name: /confirm delete/i }).click();
    
    await expect(page.getByText(/component deleted successfully/i)).toBeVisible();
  });

  test('payment settings management', async ({ page }) => {
    await page.getByRole('link', { name: /payment settings/i }).click();
    
    await expect(page.getByText('Payment Settings')).toBeVisible();
    
    // Stripe settings section
    await expect(page.getByText('Stripe Configuration')).toBeVisible();
    
    // Test API key update (masked)
    const publicKeyInput = page.getByLabel(/publishable key/i);
    await expect(publicKeyInput).toBeVisible();
    
    // Test webhook settings
    await expect(page.getByText(/webhook/i)).toBeVisible();
    
    // Test payment methods toggle
    const cardPaymentsToggle = page.getByRole('checkbox', { name: /credit cards/i });
    await cardPaymentsToggle.check();
    
    const paypalToggle = page.getByRole('checkbox', { name: /paypal/i });
    await paypalToggle.check();
    
    // Save settings
    await page.getByRole('button', { name: /save settings/i }).click();
    
    await expect(page.getByText(/settings saved successfully/i)).toBeVisible();
  });

  test('user management', async ({ page }) => {
    await page.getByRole('link', { name: /user management/i }).click();
    
    await expect(page.getByText('User Management')).toBeVisible();
    
    // Users table should be visible
    await expect(page.getByRole('table')).toBeVisible();
    
    // Test user search
    const searchInput = page.getByPlaceholder(/search users/i);
    await searchInput.fill('admin@example.com');
    
    // Test user role update
    const roleSelect = page.getByRole('combobox', { name: /role/i }).first();
    await roleSelect.selectOption('moderator');
    
    // Save role change
    await page.getByRole('button', { name: /update role/i }).first().click();
    
    await expect(page.getByText(/role updated successfully/i)).toBeVisible();
  });

  test('analytics dashboard', async ({ page }) => {
    await page.getByRole('link', { name: /analytics/i }).click();
    
    await expect(page.getByText('Analytics Dashboard')).toBeVisible();
    
    // Check for key metrics
    await expect(page.getByText(/total orders/i)).toBeVisible();
    await expect(page.getByText(/revenue/i)).toBeVisible();
    await expect(page.getByText(/popular components/i)).toBeVisible();
    
    // Test date range picker
    const dateRangeButton = page.getByRole('button', { name: /date range/i });
    await dateRangeButton.click();
    
    // Select last 30 days
    await page.getByRole('button', { name: /last 30 days/i }).click();
    
    // Charts should update
    await expect(page.locator('[data-testid="orders-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
  });

  test('export functionality', async ({ page }) => {
    await page.getByRole('link', { name: /order management/i }).click();
    
    // Mock download functionality
    const downloadPromise = page.waitForEvent('download');
    
    await page.getByRole('button', { name: /export to csv/i }).click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/orders.*\.csv/);
  });

  test('bulk operations', async ({ page }) => {
    await page.getByRole('link', { name: /order management/i }).click();
    
    // Select multiple orders
    const checkboxes = page.getByRole('checkbox');
    await checkboxes.nth(1).check(); // First order (0 is select all)
    await checkboxes.nth(2).check(); // Second order
    
    // Bulk actions should be available
    await expect(page.getByText(/2 orders selected/i)).toBeVisible();
    
    // Test bulk status update
    await page.getByRole('button', { name: /bulk update status/i }).click();
    
    await expect(page.getByText('Bulk Status Update')).toBeVisible();
    
    const statusSelect = page.getByRole('combobox');
    await statusSelect.selectOption('SHIPPED');
    
    await page.getByRole('button', { name: /update all/i }).click();
    
    await expect(page.getByText(/orders updated successfully/i)).toBeVisible();
  });

  test('admin permissions', async ({ page }) => {
    // Test that admin has access to all features
    await expect(page.getByRole('link', { name: /order management/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /component management/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /user management/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /payment settings/i })).toBeVisible();
    
    // Test dangerous operations require confirmation
    await page.getByRole('link', { name: /component management/i }).click();
    
    const deleteButton = page.getByRole('button', { name: /delete/i }).first();
    await deleteButton.click();
    
    // Should require confirmation
    await expect(page.getByText(/are you sure/i)).toBeVisible();
  });

  test('admin logout', async ({ page }) => {
    // Find logout button
    const logoutButton = page.getByRole('button', { name: /logout/i });
    await logoutButton.click();
    
    // Should redirect to login page
    await expect(page.getByText(/login/i)).toBeVisible();
    
    // Should clear authentication
    const token = await page.evaluate(() => localStorage.getItem('admin-auth-token'));
    expect(token).toBeFalsy();
  });

  test('responsive admin interface', async ({ page }) => {
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Navigation should adapt
    const mobileMenuButton = page.getByRole('button', { name: /menu/i });
    await expect(mobileMenuButton).toBeVisible();
    
    // Tables should be responsive
    await page.getByRole('link', { name: /order management/i }).click();
    await expect(page.getByRole('table')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Should show mobile-optimized layout
    await expect(mobileMenuButton).toBeVisible();
  });

  test('error handling in admin panel', async ({ page }) => {
    // Simulate API error
    await page.route('/api/admin/orders', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.getByRole('link', { name: /order management/i }).click();
    
    // Should show error message
    await expect(page.getByText(/error.*loading.*orders/i)).toBeVisible();
    
    // Should show retry button
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });
});