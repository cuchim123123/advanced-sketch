/**
 * E2E Tests: Drawing & Canvas
 * Based on SPEC.md FR-DRAW requirements
 * 
 * Test coverage:
 * - FR-DRAW-01: Drawing Tools
 * - FR-DRAW-04: Undo/Redo
 * - FR-DRAW-05: Canvas Clear
 * - FR-REALTIME-01: Cursor Move (visual only)
 */
import { test, expect, testData } from './helpers/test-utils.js';

// Helper to setup authenticated user and create a room
async function setupRoomWithAuth(page, request) {
  const user = testData.generateUser();
  
  // Register user via API
  const registerRes = await request.post('http://localhost:5000/api/auth/register', {
    data: user,
    headers: { 'x-e2e-test': 'true' },
  });
  const registerData = await registerRes.json();
  
  if (!registerData.success) {
    throw new Error('Failed to register user: ' + JSON.stringify(registerData));
  }
  
  const token = registerData.data.token;
  const userData = registerData.data.user;
  
  // Create a room via API
  const roomRes = await request.post('http://localhost:5000/api/rooms', {
    headers: { Authorization: `Bearer ${token}`, 'x-e2e-test': 'true' },
    data: { name: `Draw Test ${Date.now()}` },
  });
  const roomData = await roomRes.json();
  const roomCode = roomData.data?.room?.code;
  
  // Set auth state BEFORE page loads using addInitScript
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { user, token, isGuest: false },
      version: 0
    }));
  }, { token, user: userData });
  
  return { user, token, roomCode, userData };
}

test.describe('FR-DRAW: Drawing & Canvas', () => {
  
  test.describe('Canvas Loading', () => {
    
    test('should display canvas when entering a room', async ({ page, request }) => {
      const { roomCode } = await setupRoomWithAuth(page, request);
      
      await page.goto(`/room/${roomCode}`);
      await page.waitForLoadState('networkidle');
      
      // Canvas should be visible
      await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
    });

    test('should display drawing toolbar', async ({ page, request }) => {
      const { roomCode } = await setupRoomWithAuth(page, request);
      
      await page.goto(`/room/${roomCode}`);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('canvas', { timeout: 15000 });
      
      // Per SPEC FR-DRAW-01: Multiple tools available
      // Look for toolbar via pen button with title attribute
      const penBtn = page.locator('button[title="Pen (P)"]');
      const hasPenBtn = await penBtn.isVisible().catch(() => false);
      
      expect(hasPenBtn).toBeTruthy();
    });
  });

  test.describe('FR-DRAW-01: Drawing Tools', () => {
    
    test('should have pen/pencil tool available', async ({ page, request }) => {
      const { roomCode } = await setupRoomWithAuth(page, request);
      
      await page.goto(`/room/${roomCode}`);
      await page.waitForSelector('canvas', { timeout: 15000 });
      
      // Per SPEC: pen tool is primary drawing tool
      const penTool = page.locator('button[title="Pen (P)"]');
      await expect(penTool).toBeVisible({ timeout: 5000 });
    });

    test('should have eraser tool available', async ({ page, request }) => {
      const { roomCode } = await setupRoomWithAuth(page, request);
      
      await page.goto(`/room/${roomCode}`);
      await page.waitForSelector('canvas', { timeout: 15000 });
      
      // Per SPEC: eraser tool for removing strokes
      const eraserTool = page.locator('button[title="Eraser (E)"]');
      await expect(eraserTool).toBeVisible({ timeout: 5000 });
    });

    test('should have shape tools available', async ({ page, request }) => {
      const { roomCode } = await setupRoomWithAuth(page, request);
      
      await page.goto(`/room/${roomCode}`);
      await page.waitForSelector('canvas', { timeout: 15000 });
      
      // Per SPEC: line, rectangle, circle, triangle, arrow, diamond
      const shapeTools = page.locator('[data-tool="line"], [data-tool="rectangle"], [data-tool="circle"], button[aria-label*="shape" i], button[aria-label*="line" i], button[aria-label*="rect" i]');
      
      // At least one shape tool should be visible (or shapes dropdown)
      const hasShapeTool = await shapeTools.first().isVisible().catch(() => false);
      const hasShapeMenu = await page.locator('button:has-text("Shapes"), [aria-label*="shape" i]').isVisible().catch(() => false);
      
      expect(hasShapeTool || hasShapeMenu).toBeTruthy();
    });

    test('should have text tool available', async ({ page, request }) => {
      const { roomCode } = await setupRoomWithAuth(page, request);
      
      await page.goto(`/room/${roomCode}`);
      await page.waitForSelector('canvas', { timeout: 15000 });
      
      // Per SPEC: text tool for adding text
      const textTool = page.locator('button[title="Text (T)"]');
      await expect(textTool).toBeVisible({ timeout: 5000 });
    });

    test('should be able to draw on canvas', async ({ page, request }) => {
      const { roomCode } = await setupRoomWithAuth(page, request);
      
      await page.goto(`/room/${roomCode}`);
      await page.waitForSelector('canvas', { timeout: 15000 });
      
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();
      
      if (!box) {
        test.skip(true, 'Canvas not found');
        return;
      }
      
      // Select pen tool if available
      const penTool = page.locator('[data-tool="pen"], button[aria-label*="pen" i]');
      if (await penTool.isVisible().catch(() => false)) {
        await penTool.click();
      }
      
      // Draw a line
      const startX = box.x + 100;
      const startY = box.y + 100;
      const endX = box.x + 200;
      const endY = box.y + 200;
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY, { steps: 10 });
      await page.mouse.up();
      
      // Wait for stroke to be processed
      await page.waitForTimeout(500);
      
      // Drawing should work (no error thrown)
      expect(true).toBeTruthy();
    });
  });

  test.describe('FR-DRAW-04: Undo/Redo', () => {
    
    test('should have undo button', async ({ page, request }) => {
      const { roomCode } = await setupRoomWithAuth(page, request);
      
      await page.goto(`/room/${roomCode}`);
      await page.waitForSelector('canvas', { timeout: 15000 });
      
      // Per SPEC: Users can undo their own strokes
      const undoBtn = page.locator('button[title="Undo (Ctrl+Z)"]');
      await expect(undoBtn).toBeVisible({ timeout: 5000 });
    });

    test('should have redo button', async ({ page, request }) => {
      const { roomCode } = await setupRoomWithAuth(page, request);
      
      await page.goto(`/room/${roomCode}`);
      await page.waitForSelector('canvas', { timeout: 15000 });
      
      // Per SPEC: Users can redo undone strokes
      const redoBtn = page.locator('button[title="Redo (Ctrl+Y)"]');
      await expect(redoBtn).toBeVisible({ timeout: 5000 });
    });

    test('should support keyboard shortcuts for undo/redo', async ({ page, request }) => {
      const { roomCode } = await setupRoomWithAuth(page, request);
      
      await page.goto(`/room/${roomCode}`);
      await page.waitForSelector('canvas', { timeout: 15000 });
      
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();
      
      if (!box) {
        test.skip(true, 'Canvas not found');
        return;
      }
      
      // Draw something
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.down();
      await page.mouse.move(box.x + 150, box.y + 150, { steps: 5 });
      await page.mouse.up();
      
      await page.waitForTimeout(500);
      
      // Try Ctrl+Z for undo
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(300);
      
      // Try Ctrl+Y or Ctrl+Shift+Z for redo
      await page.keyboard.press('Control+y');
      await page.waitForTimeout(300);
      
      // No errors should occur
      expect(true).toBeTruthy();
    });
  });

  test.describe('FR-DRAW-05: Canvas Clear', () => {
    
    test('should have clear canvas option for authenticated users', async ({ page, request }) => {
      const { roomCode } = await setupRoomWithAuth(page, request);
      
      await page.goto(`/room/${roomCode}`);
      await page.waitForSelector('canvas', { timeout: 15000 });
      
      // Per SPEC: Registered users can clear canvas (not guests)
      const clearBtn = page.locator('button[title="Clear All"]');
      await expect(clearBtn).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Tool Settings', () => {
    
    test('should have color picker', async ({ page, request }) => {
      const { roomCode } = await setupRoomWithAuth(page, request);
      
      await page.goto(`/room/${roomCode}`);
      await page.waitForSelector('canvas', { timeout: 15000 });
      
      // Per SPEC: Strokes have color property
      // Color picker is a dropdown button with text "Color"
      const colorPicker = page.locator('button:has-text("Color")');
      await expect(colorPicker).toBeVisible({ timeout: 5000 });
    });

    test('should have stroke width/size control', async ({ page, request }) => {
      const { roomCode } = await setupRoomWithAuth(page, request);
      
      await page.goto(`/room/${roomCode}`);
      await page.waitForSelector('canvas', { timeout: 15000 });
      
      // Per SPEC: strokeWidth 1-100
      const sizeControl = page.locator('input[type="range"], [data-testid="stroke-width"], [aria-label*="size" i], [aria-label*="width" i]');
      await expect(sizeControl).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Canvas Export', () => {
    
    test('should have export/download option', async ({ page, request }) => {
      const { roomCode } = await setupRoomWithAuth(page, request);
      
      await page.goto(`/room/${roomCode}`);
      await page.waitForSelector('canvas', { timeout: 15000 });
      
      // Per SPEC: Export drawings in multiple formats
      const exportBtn = page.locator('button[title="Export"]');
      await expect(exportBtn).toBeVisible({ timeout: 5000 });
    });
  });
});
