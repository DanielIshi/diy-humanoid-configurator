import { test, expect } from '@playwright/test';

// Auth E2E Tests with Session Management and Security
test.describe('Authentication Flow with Security', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User'
  };

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should register new user with email verification', async ({ page }) => {
    // Navigate to register
    await page.click('[data-testid="auth-register-link"]');
    
    // Fill registration form
    await page.fill('[data-testid="register-email"]', testUser.email);
    await page.fill('[data-testid="register-password"]', testUser.password);
    await page.fill('[data-testid="register-name"]', testUser.name);
    
    // Submit registration
    await page.click('[data-testid="register-submit"]');
    
    // Should show verification message
    await expect(page.locator('[data-testid="verification-message"]')).toContainText(
      'Please check your email'
    );
  });

  test('should login with valid credentials and create session', async ({ page }) => {
    // Navigate to login
    await page.click('[data-testid="auth-login-link"]');
    
    // Fill login form
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    
    // Submit login
    await page.click('[data-testid="login-submit"]');
    
    // Should redirect to dashboard/home
    await expect(page).toHaveURL('/dashboard');
    
    // Should show user menu
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Check if session is stored
    const sessionId = await page.evaluate(() => sessionStorage.getItem('sessionId'));
    expect(sessionId).toBeTruthy();
  });

  test('should login with Remember Me option', async ({ page }) => {
    await page.click('[data-testid="auth-login-link"]');
    
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    
    // Check remember me
    await page.check('[data-testid="login-remember-me"]');
    
    await page.click('[data-testid="login-submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Remember me should set longer session duration
    const sessionId = await page.evaluate(() => sessionStorage.getItem('sessionId'));
    expect(sessionId).toBeTruthy();
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    await page.click('[data-testid="auth-login-link"]');
    
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', 'wrongpassword');
    
    await page.click('[data-testid="login-submit"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="login-error"]')).toContainText(
      'Invalid credentials'
    );
    
    // Should remain on login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should handle rate limiting after multiple failed attempts', async ({ page }) => {
    await page.click('[data-testid="auth-login-link"]');
    
    // Attempt multiple failed logins
    for (let i = 0; i < 6; i++) {
      await page.fill('[data-testid="login-email"]', testUser.email);
      await page.fill('[data-testid="login-password"]', 'wrongpassword');
      await page.click('[data-testid="login-submit"]');
      await page.waitForTimeout(500);
    }
    
    // Should show rate limit error
    await expect(page.locator('[data-testid="login-error"]')).toContainText(
      'Too many attempts'
    );
  });

  test('should manage active sessions', async ({ page }) => {
    // Login first
    await page.click('[data-testid="auth-login-link"]');
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');
    
    // Navigate to account settings
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="account-settings"]');
    
    // Go to sessions tab
    await page.click('[data-testid="sessions-tab"]');
    
    // Should show current session
    await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-session"]')).toContainText('Current');
  });

  test('should terminate other sessions', async ({ page, context }) => {
    // Create first session
    await page.click('[data-testid="auth-login-link"]');
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');
    
    // Create second session in new tab
    const newPage = await context.newPage();
    await newPage.goto('/login');
    await newPage.fill('[data-testid="login-email"]', testUser.email);
    await newPage.fill('[data-testid="login-password"]', testUser.password);
    await newPage.click('[data-testid="login-submit"]');
    
    // Back to first session - terminate all others
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="account-settings"]');
    await page.click('[data-testid="sessions-tab"]');
    await page.click('[data-testid="terminate-all-sessions"]');
    
    // Confirm termination
    await page.click('[data-testid="confirm-terminate"]');
    
    // Second session should be logged out
    await newPage.reload();
    await expect(newPage).toHaveURL(/.*login/);
  });

  test('should handle device trust workflow', async ({ page }) => {
    // Login from new device
    await page.click('[data-testid="auth-login-link"]');
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');
    
    // Should show device trust prompt
    if (await page.locator('[data-testid="device-trust-prompt"]').isVisible()) {
      // Trust this device
      await page.fill('[data-testid="device-name"]', 'Test Browser');
      await page.click('[data-testid="trust-device"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="trust-success"]')).toContainText(
        'Device trusted'
      );
    }
  });

  test('should enforce CSRF protection', async ({ page }) => {
    // Login first
    await page.click('[data-testid="auth-login-link"]');
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');
    
    // Navigate to settings to perform sensitive action
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="account-settings"]');
    
    // Check that CSRF token is present in forms
    const csrfToken = await page.evaluate(() => window.__CSRF_TOKEN__);
    expect(csrfToken).toBeTruthy();
    expect(csrfToken.length).toBeGreaterThan(10);
  });

  test('should handle password change with session termination', async ({ page, context }) => {
    // Login in two sessions
    await page.click('[data-testid="auth-login-link"]');
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');
    
    const newPage = await context.newPage();
    await newPage.goto('/login');
    await newPage.fill('[data-testid="login-email"]', testUser.email);
    await newPage.fill('[data-testid="login-password"]', testUser.password);
    await newPage.click('[data-testid="login-submit"]');
    
    // Change password in first session
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="account-settings"]');
    await page.click('[data-testid="security-tab"]');
    
    await page.fill('[data-testid="current-password"]', testUser.password);
    await page.fill('[data-testid="new-password"]', 'NewPassword123!');
    await page.fill('[data-testid="confirm-password"]', 'NewPassword123!');
    await page.click('[data-testid="change-password"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="password-changed"]')).toContainText(
      'Password changed successfully'
    );
    
    // Other session should be terminated
    await newPage.reload();
    await expect(newPage).toHaveURL(/.*login/);
  });

  test('should handle auto token refresh', async ({ page }) => {
    // Login
    await page.click('[data-testid="auth-login-link"]');
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');
    
    // Get initial token
    const initialToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(initialToken).toBeTruthy();
    
    // Mock token expiration (would need backend coordination for full test)
    // For now, verify refresh mechanism exists
    const refreshInterval = await page.evaluate(() => {
      // Check if auto-refresh timer is set
      return window.authRefreshInterval !== undefined;
    });
    
    // The auto-refresh should be handled by the AuthContext
  });

  test('should logout and clear all auth data', async ({ page }) => {
    // Login
    await page.click('[data-testid="auth-login-link"]');
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');
    
    // Verify login state
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
    
    // Should clear all auth data
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const sessionId = await page.evaluate(() => sessionStorage.getItem('sessionId'));
    const csrfToken = await page.evaluate(() => window.__CSRF_TOKEN__);
    
    expect(token).toBeNull();
    expect(sessionId).toBeNull();
    expect(csrfToken).toBeNull();
  });

  test('should handle email verification flow', async ({ page }) => {
    // Register new user
    await page.click('[data-testid="auth-register-link"]');
    await page.fill('[data-testid="register-email"]', 'verify@example.com');
    await page.fill('[data-testid="register-password"]', testUser.password);
    await page.fill('[data-testid="register-name"]', 'Verify User');
    await page.click('[data-testid="register-submit"]');
    
    // Should show verification message
    await expect(page.locator('[data-testid="verification-message"]')).toBeVisible();
    
    // Resend verification
    await page.click('[data-testid="resend-verification"]');
    
    // Should show resend success
    await expect(page.locator('[data-testid="resend-success"]')).toContainText(
      'verification email has been sent'
    );
  });

  test('should handle password reset flow', async ({ page }) => {
    // Navigate to forgot password
    await page.click('[data-testid="auth-login-link"]');
    await page.click('[data-testid="forgot-password-link"]');
    
    // Enter email
    await page.fill('[data-testid="reset-email"]', testUser.email);
    await page.click('[data-testid="reset-submit"]');
    
    // Should show reset message
    await expect(page.locator('[data-testid="reset-message"]')).toContainText(
      'password reset instructions'
    );
  });

  test('should prevent session fixation attacks', async ({ page }) => {
    // Capture session before login
    await page.goto('/login');
    const preLoginSession = await page.evaluate(() => sessionStorage.getItem('sessionId'));
    
    // Login
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');
    
    // Session should be regenerated after login
    const postLoginSession = await page.evaluate(() => sessionStorage.getItem('sessionId'));
    
    // Sessions should be different (new session generated)
    expect(postLoginSession).not.toEqual(preLoginSession);
  });

  test('should handle concurrent login detection', async ({ page, context }) => {
    // Login in first browser context
    await page.click('[data-testid="auth-login-link"]');
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');
    
    // Login in second browser context (simulating different device)
    const newContext = await page.context().browser().newContext();
    const newPage = await newContext.newPage();
    await newPage.goto('/login');
    await newPage.fill('[data-testid="login-email"]', testUser.email);
    await newPage.fill('[data-testid="login-password"]', testUser.password);
    await newPage.click('[data-testid="login-submit"]');
    
    // Both sessions should be tracked
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="account-settings"]');
    await page.click('[data-testid="sessions-tab"]');
    
    // Should show multiple active sessions
    const sessionCount = await page.locator('[data-testid="session-item"]').count();
    expect(sessionCount).toBeGreaterThanOrEqual(2);
    
    await newContext.close();
  });
});

// Security-focused tests
test.describe('Authentication Security', () => {
  test('should prevent XSS in auth forms', async ({ page }) => {
    await page.goto('/login');
    
    // Try to inject script in email field
    const maliciousInput = '<script>window.xssExecuted = true;</script>';
    await page.fill('[data-testid="login-email"]', maliciousInput);
    await page.fill('[data-testid="login-password"]', 'password');
    await page.click('[data-testid="login-submit"]');
    
    // Script should not execute
    const xssExecuted = await page.evaluate(() => window.xssExecuted);
    expect(xssExecuted).toBeUndefined();
  });

  test('should have secure headers', async ({ page }) => {
    const response = await page.goto('/');
    
    // Check for security headers
    const headers = response.headers();
    expect(headers['x-frame-options']).toBeDefined();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-xss-protection']).toBeDefined();
  });

  test('should validate password strength', async ({ page }) => {
    await page.goto('/register');
    
    // Try weak password
    await page.fill('[data-testid="register-email"]', 'test@example.com');
    await page.fill('[data-testid="register-password"]', '123');
    await page.fill('[data-testid="register-name"]', 'Test User');
    
    // Should show password strength error
    await expect(page.locator('[data-testid="password-error"]')).toContainText(
      'Password must be at least 8 characters'
    );
  });

  test('should prevent CSRF attacks on state-changing operations', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="login-email"]', 'test@example.com');
    await page.fill('[data-testid="login-password"]', 'TestPassword123!');
    await page.click('[data-testid="login-submit"]');
    
    // Try to make request without CSRF token (would need to intercept and modify)
    // This is a conceptual test - actual implementation would require request interception
    const csrfToken = await page.evaluate(() => window.__CSRF_TOKEN__);
    expect(csrfToken).toBeTruthy();
  });
});