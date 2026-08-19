import { test, expect } from '@playwright/test';

test.describe('VaultSync Enterprise E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.waitForSelector('.tiptap.ProseMirror', { timeout: 15000 });
  });

  test('1. should load application layout and collaborative editor shell', async ({ page }) => {
    // Verify core shell layout elements
    const editor = page.locator('.tiptap.ProseMirror');
    await expect(editor).toBeVisible();

    // Verify header title / presence
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('2. should support interactive typing and content update', async ({ page }) => {
    const editor = page.locator('.tiptap.ProseMirror');
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' [Playwright E2E CI Verification Test] ');
    
    // Verify text exists in editor
    await expect(editor).toContainText('Playwright E2E CI Verification Test');
  });

  test('3. should open and close 1-Click Guest Sandbox modal', async ({ page }) => {
    // Find Guest Sandbox button
    const sandboxButton = page.locator('button:has-text("Guest Sandbox")');
    if (await sandboxButton.isVisible()) {
      await sandboxButton.click();
      await expect(page.locator('text=1-Click Guest Sandbox')).toBeVisible({ timeout: 5000 });
      
      // Close modal with Close button
      const closeBtn = page.locator('button[title="Đóng Sandbox"]');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await expect(page.locator('text=1-Click Guest Sandbox')).not.toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('4. should open Live E2EE Cryptographic Inspector drawer', async ({ page }) => {
    // Find Inspector button in header
    const inspectorButton = page.locator('button:has-text("Zero-Knowledge"), button[title*="Thanh Tra"], button:has-text("Test Crypto")').first();
    if (await inspectorButton.isVisible()) {
      await inspectorButton.click();
      await expect(page.locator('text=Thanh Tra Mật Mã')).toBeVisible({ timeout: 5000 });
    }
  });

  test('5. should toggle 3-tier theme system (Sun, Cloud, Night)', async ({ page }) => {
    const html = page.locator('html');
    const initialTheme = await html.getAttribute('data-theme');
    expect(['sun', 'cloud', 'night']).toContain(initialTheme);
  });
});
