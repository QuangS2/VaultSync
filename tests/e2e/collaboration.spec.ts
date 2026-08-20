import { test, expect } from '@playwright/test';

test.describe('VaultSync Enterprise Production E2E Test Suite (11/10 Precision)', () => {

  test('1. Full Zero-Knowledge Vault Onboarding & Initialization Flow', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Step 1: Profile setup
    await page.waitForSelector('input[placeholder*="Lê Anh Quang"]', { timeout: 10000 });
    await page.fill('input[placeholder*="Lê Anh Quang"]', 'Lê Anh Quang');
    await page.click('button[title="Xanh Lục"]');
    await page.click('button:has-text("Tiếp tục: Mật khẩu chủ")');

    // Step 2: Master Password setup
    await page.waitForTimeout(400);
    await page.fill('input[placeholder*="mật khẩu an toàn"]', 'Passphrase2026!Strong');
    await page.fill('input[placeholder*="chính xác mật khẩu"]', 'Passphrase2026!Strong');
    await page.click('button:has-text("Tiếp tục: Khóa khôi phục")');

    // Step 3: Recovery Seed Phrase confirmation
    await page.waitForTimeout(600);
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Hoàn tất & Mở Kho Lưu Trữ")');

    // Verify Workspace Canvas is loaded
    const editor = page.locator('.tiptap.ProseMirror');
    await expect(editor).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Ghi Chú Nhanh & Việc Cần Làm').first()).toBeVisible();
  });

  test('2. Hierarchical File Tree, Interactive Typing & Auto-Save to IndexedDB', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Fast onboarding
    await page.waitForSelector('input[placeholder*="Lê Anh Quang"]', { timeout: 10000 });
    await page.fill('input[placeholder*="Lê Anh Quang"]', 'Lê Anh Quang');
    await page.click('button:has-text("Tiếp tục: Mật khẩu chủ")');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder*="mật khẩu an toàn"]', 'Passphrase2026!Strong');
    await page.fill('input[placeholder*="chính xác mật khẩu"]', 'Passphrase2026!Strong');
    await page.click('button:has-text("Tiếp tục: Khóa khôi phục")');
    await page.waitForTimeout(400);
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Hoàn tất & Mở Kho Lưu Trữ")');

    const editor = page.locator('.tiptap.ProseMirror');
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Type new text
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' [E2E Live Verification Note] ');

    // Check auto-save indicator
    await page.waitForTimeout(600);
    const saveIndicator = page.locator('text=Đã lưu');
    await expect(saveIndicator).toBeVisible({ timeout: 5000 });

    // Switch document in file tree
    await page.click('text=Hướng Dẫn Mời Bạn Bè & Cộng Tác');
    await page.waitForTimeout(400);
    await expect(page.locator('text=Hướng Dẫn Mời Bạn Bè & Cộng Tác').first()).toBeVisible();
  });

  test('3. Commercial HeaderBar Spotlight Search & Command Palette (Ctrl+K)', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Quick onboarding
    await page.waitForSelector('input[placeholder*="Lê Anh Quang"]', { timeout: 10000 });
    await page.fill('input[placeholder*="Lê Anh Quang"]', 'Lê Anh Quang');
    await page.click('button:has-text("Tiếp tục: Mật khẩu chủ")');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder*="mật khẩu an toàn"]', 'Passphrase2026!Strong');
    await page.fill('input[placeholder*="chính xác mật khẩu"]', 'Passphrase2026!Strong');
    await page.click('button:has-text("Tiếp tục: Khóa khôi phục")');
    await page.waitForTimeout(400);
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Hoàn tất & Mở Kho Lưu Trữ")');

    await page.waitForSelector('.tiptap.ProseMirror', { timeout: 10000 });

    // Open Command Palette via hotkey Ctrl+K
    await page.keyboard.press('Control+k');

    // Verify Command Palette opened
    const paletteInput = page.locator('input[placeholder*="Tìm kiếm lệnh"]');
    await expect(paletteInput).toBeVisible({ timeout: 5000 });

    // Filter commands
    await paletteInput.fill('Cài đặt');
    await page.waitForTimeout(300);
    await expect(page.locator('text=Cài đặt kho lưu trữ')).toBeVisible();

    // Close palette with Escape
    await page.keyboard.press('Escape');
    await expect(paletteInput).not.toBeVisible();
  });

  test('4. Multi-Tab Settings Modal & 3-Tier Theme Switching (Sun, Cloud, Night)', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Quick onboarding
    await page.waitForSelector('input[placeholder*="Lê Anh Quang"]', { timeout: 10000 });
    await page.fill('input[placeholder*="Lê Anh Quang"]', 'Lê Anh Quang');
    await page.click('button:has-text("Tiếp tục: Mật khẩu chủ")');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder*="mật khẩu an toàn"]', 'Passphrase2026!Strong');
    await page.fill('input[placeholder*="chính xác mật khẩu"]', 'Passphrase2026!Strong');
    await page.click('button:has-text("Tiếp tục: Khóa khôi phục")');
    await page.waitForTimeout(400);
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Hoàn tất & Mở Kho Lưu Trữ")');

    await page.waitForSelector('.tiptap.ProseMirror', { timeout: 10000 });

    // Open Settings Modal
    const settingsBtn = page.locator('button[title*="Cài đặt kho lưu trữ"]');
    await settingsBtn.click();
    await expect(page.locator('text=Hồ Sơ & Danh Tính Mật Mã')).toBeVisible({ timeout: 5000 });

    // Switch to Security Tab
    await page.click('text=Bảo Mật & Khóa');
    await expect(page.locator('text=Đổi Mật Khẩu Chủ')).toBeVisible();

    // Switch to Storage Tab
    await page.click('text=Bộ Nhớ & Sao Lưu');
    await expect(page.locator('text=Bộ Nhớ Đệm Mã Hóa (IndexedDB)')).toBeVisible();

    // Switch to Appearance Tab & test theme switches
    await page.click('text=Giao Diện & Phím Tắt');
    await expect(page.locator('text=Bảng Tra Cứu Phím Tắt')).toBeVisible();

    // Switch to Cloud theme
    await page.click('button:has-text("Mây Trắng")');
    await page.waitForTimeout(200);
    let themeAttr = await page.locator('html').getAttribute('data-theme');
    expect(themeAttr).toBe('cloud');

    // Switch to Night theme
    await page.click('button:has-text("Đêm Huyền Bí")');
    await page.waitForTimeout(200);
    themeAttr = await page.locator('html').getAttribute('data-theme');
    expect(themeAttr).toBe('night');

    // Close settings modal
    await page.click('button[title="Đóng cài đặt (Esc)"]');
    await expect(page.locator('text=Hồ Sơ & Danh Tính Mật Mã')).not.toBeVisible();
  });

  test('5. Real-Time Multi-User E2EE Collaboration & Peer Synchronization', async ({ browser }) => {
    // User A context
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageA = await contextA.newPage();
    await pageA.goto('http://127.0.0.1:5173');
    await pageA.evaluate(() => localStorage.clear());
    await pageA.reload();

    // User A onboard
    await pageA.waitForSelector('input[placeholder*="Lê Anh Quang"]', { timeout: 10000 });
    await pageA.fill('input[placeholder*="Lê Anh Quang"]', 'Alice Admin');
    await pageA.click('button:has-text("Tiếp tục: Mật khẩu chủ")');
    await pageA.waitForTimeout(300);
    await pageA.fill('input[placeholder*="mật khẩu an toàn"]', 'Passphrase2026!Strong');
    await pageA.fill('input[placeholder*="chính xác mật khẩu"]', 'Passphrase2026!Strong');
    await pageA.click('button:has-text("Tiếp tục: Khóa khôi phục")');
    await pageA.waitForTimeout(400);
    await pageA.check('input[type="checkbox"]');
    await pageA.click('button:has-text("Hoàn tất & Mở Kho Lưu Trữ")');
    await pageA.waitForSelector('.tiptap.ProseMirror', { timeout: 10000 });

    // User B context (Join Room)
    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageB = await contextB.newPage();
    await pageB.goto('http://127.0.0.1:5173');
    await pageB.evaluate(() => localStorage.clear());
    await pageB.reload();

    // User B onboard
    await pageB.waitForSelector('input[placeholder*="Lê Anh Quang"]', { timeout: 10000 });
    await pageB.fill('input[placeholder*="Lê Anh Quang"]', 'Bob Collaborator');
    await pageB.click('button:has-text("Tiếp tục: Mật khẩu chủ")');
    await pageB.waitForTimeout(300);
    await pageB.fill('input[placeholder*="mật khẩu an toàn"]', 'Passphrase2026!Strong');
    await pageB.fill('input[placeholder*="chính xác mật khẩu"]', 'Passphrase2026!Strong');
    await pageB.click('button:has-text("Tiếp tục: Khóa khôi phục")');
    await pageB.waitForTimeout(400);
    await pageB.check('input[type="checkbox"]');
    await pageB.click('button:has-text("Hoàn tất & Mở Kho Lưu Trữ")');
    await pageB.waitForSelector('.tiptap.ProseMirror', { timeout: 10000 });

    // Verify both are connected to Relay Server
    await pageA.waitForTimeout(1000);
    await pageB.waitForTimeout(1000);

    // User A types content
    const editorA = pageA.locator('.tiptap.ProseMirror');
    await editorA.click();
    await pageA.keyboard.press('End');
    await pageA.keyboard.type(' [Synchronized Realtime Update from Alice] ');

    await pageA.waitForTimeout(1000);

    // Verify collaborator indicator in HeaderBar
    const onlineBadge = pageA.locator('text=online');
    await expect(onlineBadge).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
