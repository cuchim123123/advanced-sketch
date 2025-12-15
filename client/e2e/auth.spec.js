/**
 * E2E Tests: Authentication Flow
 * Based on SPEC.md FR-AUTH requirements
 * 
 * Test coverage:
 * - FR-AUTH-01: User Registration
 * - FR-AUTH-02: User Login
 * - FR-AUTH-03: Email Verification (limited - can't verify actual email)
 * - FR-AUTH-07: Check Availability
 * - FR-AUTH-08: Get Profile
 */
import { test, expect, testData, authHelpers } from './helpers/test-utils.js';

test.describe('FR-AUTH: Authentication Flow', () => {
  
  test.describe('FR-AUTH-01: User Registration', () => {
    
    test('should display registration form with all required fields', async ({ page }) => {
      await page.goto('/register');
      
      // Per SPEC: username, email, password fields required
      await expect(page.locator('input[name="username"], input[placeholder*="username" i]')).toBeVisible();
      await expect(page.locator('input[name="email"], input[placeholder*="email" i]')).toBeVisible();
      await expect(page.locator('input[name="password"], input[placeholder*="password" i]').first()).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show validation error for username < 3 characters', async ({ page }) => {
      // Per SPEC: username must be 3-30 chars
      await page.goto('/register');
      
      await page.fill('input[name="username"], input[placeholder*="username" i]', 'ab');
      await page.fill('input[name="email"], input[placeholder*="email" i]', 'test@example.com');
      await page.fill('input[name="password"], input[placeholder*="password" i]', 'Password123');
      
      // Try to submit
      await page.click('button[type="submit"]');
      
      // Should show validation error
      await expect(page.locator('text=/username.*3|3.*character|too short/i')).toBeVisible({ timeout: 5000 });
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await page.goto('/register');
      
      await page.fill('input[name="username"], input[placeholder*="username" i]', 'validuser');
      await page.fill('input[name="email"], input[placeholder*="email" i]', 'invalid-email');
      await page.fill('input[name="password"], input[placeholder*="password" i]', 'Password123');
      
      await page.click('button[type="submit"]');
      
      // Should show email validation error
      await expect(page.locator('text=/invalid.*email|email.*valid|email.*format/i')).toBeVisible({ timeout: 5000 });
    });

    test('should show validation error for password < 6 characters', async ({ page }) => {
      // Per SPEC: password minimum 6 characters
      await page.goto('/register');
      
      await page.fill('input[name="username"], input[placeholder*="username" i]', 'validuser');
      await page.fill('input[name="email"], input[placeholder*="email" i]', 'test@example.com');
      await page.fill('input[name="password"], input[placeholder*="password" i]', '12345');
      
      await page.click('button[type="submit"]');
      
      // Should show password validation error
      await expect(page.locator('text=/password.*6|6.*character|too short/i')).toBeVisible({ timeout: 5000 });
    });

    test('should successfully register a new user', async ({ page }) => {
      const user = testData.generateUser();
      
      await page.goto('/register');
      
      await page.fill('input[name="username"], input[placeholder*="username" i]', user.username);
      await page.fill('input[name="email"], input[placeholder*="email" i]', user.email);
      await page.fill('input[name="password"], input[placeholder*="password" i]', user.password);
      
      // Fill confirm password if exists
      const confirmPassword = page.locator('input[name="confirmPassword"], input[placeholder*="confirm" i]');
      if (await confirmPassword.isVisible()) {
        await confirmPassword.fill(user.password);
      }
      
      await page.click('button[type="submit"]');
      
      // Per SPEC: After registration, success message is shown with email verification prompt
      // The page shows "Registration Successful!" message instead of redirecting
      await expect(page.locator('text=/registration successful/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should show error for duplicate email', async ({ page, request }) => {
      // First register a user via API
      const user = testData.generateUser();
      await request.post('http://localhost:5000/api/auth/register', { data: user, headers: { 'x-e2e-test': 'true' } });
      
      // Try to register again with same email
      await page.goto('/register');
      
      await page.fill('input[name="username"], input[placeholder*="username" i]', 'different_user');
      await page.fill('input[name="email"], input[placeholder*="email" i]', user.email);
      await page.fill('input[name="password"], input[placeholder*="password" i]', 'Password123');
      
      const confirmPassword = page.locator('input[name="confirmPassword"], input[placeholder*="confirm" i]');
      if (await confirmPassword.isVisible()) {
        await confirmPassword.fill('Password123');
      }
      
      await page.click('button[type="submit"]');
      
      // Per SPEC: Should return 409 - Email already registered
      await expect(page.locator('text=/email.*registered|email.*exists|already.*registered/i')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('FR-AUTH-02: User Login', () => {
    
    test('should display login form with required fields', async ({ page }) => {
      await page.goto('/login');
      
      // Per SPEC: email/username and password fields (form uses name="email" for the combined field)
      await expect(page.locator('input[name="email"], input[placeholder*="email" i], input[placeholder*="username" i]').first()).toBeVisible();
      await expect(page.locator('input[name="password"], input[placeholder*="password" i]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      
      // Login form uses name="email" for the email/username field
      await page.fill('input[name="email"], input[placeholder*="email" i]', 'nonexistent@example.com');
      await page.fill('input[name="password"], input[placeholder*="password" i]', 'wrongpassword');
      
      await page.click('button[type="submit"]');
      
      // Per SPEC: 401 - Invalid credentials
      await expect(page.locator('text=/invalid.*credentials|incorrect.*password|login.*failed|wrong|not found/i')).toBeVisible({ timeout: 10000 });
    });

    test('should show error for unverified email', async ({ page, request }) => {
      // Register a user but don't verify email
      const user = testData.generateUser();
      await request.post('http://localhost:5000/api/auth/register', { data: user, headers: { 'x-e2e-test': 'true' } });
      
      await page.goto('/login');
      
      // Login form uses name="email" for the email/username field
      await page.fill('input[name="email"], input[placeholder*="email" i]', user.email);
      await page.fill('input[name="password"], input[placeholder*="password" i]', user.password);
      
      await page.click('button[type="submit"]');
      
      // Per SPEC: 403 - Email verification required OR redirects to verify-email-prompt
      const verifyMessage = page.locator('text=/verify.*email|email.*verif|not.*verified/i').first();
      const verifyPromptPage = page.locator('text=/verification|verify/i').first();
      await expect(verifyMessage.or(verifyPromptPage)).toBeVisible({ timeout: 10000 });
    });

    test('should have link to forgot password', async ({ page }) => {
      await page.goto('/login');
      
      // Per SPEC FR-AUTH-05: Password reset flow available
      // Implementation uses a button, not a link
      await expect(page.getByText('Forgot password?')).toBeVisible();
    });

    test('should have link to register', async ({ page }) => {
      await page.goto('/login');
      
      await expect(page.locator('a[href*="register"], a:has-text("Register"), a:has-text("Sign up")')).toBeVisible();
    });
  });

  test.describe('FR-AUTH-07: Check Availability', () => {
    
    test('should show username availability feedback during registration', async ({ page, request }) => {
      // First create a user to test uniqueness
      const existingUser = testData.generateUser();
      await request.post('http://localhost:5000/api/auth/register', { data: existingUser, headers: { 'x-e2e-test': 'true' } });
      
      await page.goto('/register');
      
      // Type an existing username
      await page.fill('input[name="username"], input[placeholder*="username" i]', existingUser.username);
      
      // Trigger blur or wait for debounce
      await page.locator('input[name="email"], input[placeholder*="email" i]').click();
      
      // Should show unavailable feedback
      // Note: This depends on implementation - may show inline or on submit
      await page.waitForTimeout(1000); // Wait for async check
      
      // Look for any unavailable indicator
      const unavailableIndicator = page.locator('text=/unavailable|taken|already.*use|exists/i');
      const isVisible = await unavailableIndicator.isVisible().catch(() => false);
      
      // If not inline, it will show on submit - that's also valid per SPEC
      if (!isVisible) {
        // Fill rest of form and submit to check
        await page.fill('input[name="email"], input[placeholder*="email" i]', 'new@example.com');
        await page.fill('input[name="password"], input[placeholder*="password" i]', 'Password123');
        const confirmPassword = page.locator('input[name="confirmPassword"], input[placeholder*="confirm" i]');
        if (await confirmPassword.isVisible()) {
          await confirmPassword.fill('Password123');
        }
        await page.click('button[type="submit"]');
        await expect(page.locator('text=/username.*taken|username.*exists|already.*registered/i')).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Navigation & Links', () => {
    
    test('should navigate between login and register pages', async ({ page }) => {
      await page.goto('/login');
      
      // Click register link
      await page.click('a[href*="register"], a:has-text("Register"), a:has-text("Sign up")');
      await expect(page).toHaveURL(/register/);
      
      // Click back to login
      await page.click('a[href*="login"], a:has-text("Login"), a:has-text("Sign in")');
      await expect(page).toHaveURL(/login/);
    });

    test('should show home/landing page for unauthenticated users', async ({ page }) => {
      await page.goto('/');
      
      // App redirects unauthenticated users to /login
      // Should end up on login page
      await page.waitForURL(/login/i, { timeout: 5000 });
      
      // Login page should be visible
      await expect(page.locator('input[name="email"], input[name="password"]').first()).toBeVisible();
    });
  });
});
