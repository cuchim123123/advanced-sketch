/**
 * E2E Test Utilities
 * Shared helpers and fixtures for all E2E tests
 */
import { test as base, expect } from '@playwright/test';

// Extend base test with custom fixtures
const test = base.extend({
  // Auto-cleanup before each test
  page: async ({ page }, use) => {
    // Clear local storage before each test
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await use(page);
  },
});

/**
 * Test data generators
 */
const testData = {
  generateUser: () => {
    const timestamp = Date.now();
    return {
      username: `testuser_${timestamp}`,
      email: `testuser_${timestamp}@example.com`,
      password: 'Test123!',
    };
  },
  
  generateRoom: () => ({
    name: `Test Room ${Date.now()}`,
    maxParticipants: 10,
    isPublic: false,
  }),
};

/**
 * Page Object helpers
 */
const authHelpers = {
  /**
   * Register a new user
   */
  register: async (page, user) => {
    await page.goto('/register');
    await page.fill('input[name="username"]', user.username);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirmPassword"]', user.password);
    await page.click('button[type="submit"]');
  },

  /**
   * Login with existing user
   */
  login: async (page, credentials) => {
    await page.goto('/login');
    await page.fill('input[name="emailOrPhoneOrUsername"]', credentials.email || credentials.username);
    await page.fill('input[name="password"]', credentials.password);
    await page.click('button[type="submit"]');
  },

  /**
   * Logout current user
   */
  logout: async (page) => {
    // Click user menu or logout button
    const logoutBtn = page.locator('[data-testid="logout-btn"], button:has-text("Logout")');
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    }
  },

  /**
   * Check if user is logged in
   */
  isLoggedIn: async (page) => {
    // Check for dashboard or profile elements
    const authIndicator = page.locator('[data-testid="user-menu"], [data-testid="dashboard"]');
    return authIndicator.isVisible();
  },
};

/**
 * Room helpers
 */
const roomHelpers = {
  /**
   * Create a new room
   */
  createRoom: async (page, roomData) => {
    await page.goto('/dashboard');
    await page.click('button:has-text("Create Room"), [data-testid="create-room-btn"]');
    
    // Fill room form if modal appears
    const nameInput = page.locator('input[name="name"], input[placeholder*="room name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill(roomData.name);
    }
    
    await page.click('button:has-text("Create"), button[type="submit"]');
  },

  /**
   * Join a room by code
   */
  joinRoomByCode: async (page, code) => {
    await page.goto('/');
    const codeInput = page.locator('input[placeholder*="code"], input[name="roomCode"]');
    if (await codeInput.isVisible()) {
      await codeInput.fill(code);
      await page.click('button:has-text("Join")');
    } else {
      await page.goto(`/room/${code}`);
    }
  },
};

/**
 * Canvas helpers
 */
const canvasHelpers = {
  /**
   * Wait for canvas to load
   */
  waitForCanvas: async (page) => {
    await page.waitForSelector('canvas', { timeout: 10000 });
  },

  /**
   * Draw a simple line on canvas
   */
  drawLine: async (page, startX, startY, endX, endY) => {
    const canvas = page.locator('canvas').first();
    await canvas.hover({ position: { x: startX, y: startY } });
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();
  },

  /**
   * Select a tool
   */
  selectTool: async (page, toolName) => {
    const toolButton = page.locator(`[data-tool="${toolName}"], button:has-text("${toolName}")`);
    if (await toolButton.isVisible()) {
      await toolButton.click();
    }
  },
};

/**
 * API helpers for test setup/teardown
 */
const apiHelpers = {
  // Default headers for E2E tests to bypass rate limiting
  testHeaders: { 'x-e2e-test': 'true' },
  
  /**
   * Register user via API (for test setup)
   */
  registerUserViaAPI: async (request, user) => {
    const response = await request.post('http://localhost:5000/api/auth/register', {
      data: user,
      headers: { 'x-e2e-test': 'true' },
    });
    return response.json();
  },

  /**
   * Login via API and get token
   */
  loginViaAPI: async (request, credentials) => {
    const response = await request.post('http://localhost:5000/api/auth/login', {
      data: {
        emailOrPhoneOrUsername: credentials.email,
        password: credentials.password,
      },
      headers: { 'x-e2e-test': 'true' },
    });
    return response.json();
  },

  /**
   * Set auth token in localStorage
   */
  setAuthToken: async (page, token) => {
    await page.evaluate((t) => {
      localStorage.setItem('token', t);
    }, token);
  },
};

export {
  test,
  expect,
  testData,
  authHelpers,
  roomHelpers,
  canvasHelpers,
  apiHelpers,
};
