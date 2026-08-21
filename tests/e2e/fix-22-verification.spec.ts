import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const evidenceDirs = {
  fix22_1: path.resolve('..', 'Tester_report', 'fixed', 'fix-22.1'),
  task22: path.resolve('..', 'manual_test_evidence', 'task-22')
};

// Ensure directories exist
Object.values(evidenceDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function setupAndOnboard(page: Page, userName = 'Chủ Sở Hữu (Owner)') {
  page.on('console', msg => console.log('BROWSER_LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER_ERROR:', err.message));

  await page.goto('http://127.0.0.1:5173');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Step 1: User Profile
  await page.waitForSelector('input[placeholder*="Lê Anh Quang"]', { timeout: 15000 });
  await page.fill('input[placeholder*="Lê Anh Quang"]', userName);
  await page.click('button:has-text("Tiếp tục: Mật khẩu bảo vệ")');
  await page.waitForTimeout(200);

  // Step 2: Passphrase
  await page.waitForSelector('input[placeholder*="mật khẩu an toàn"]', { timeout: 10000 });
  await page.fill('input[placeholder*="mật khẩu an toàn"]', 'Passphrase2026!Strong');
  await page.fill('input[placeholder*="chính xác mật khẩu"]', 'Passphrase2026!Strong');
  await page.click('button:has-text("Tiếp tục: Khóa khôi phục")');
  await page.waitForTimeout(300);

  // Step 3: Mnemonic confirmation & complete
  await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });
  await page.check('input[type="checkbox"]');
  await page.click('button:has-text("Hoàn tất & Mở Kho Lưu Trữ")');

  // Wait for main workspace
  try {
    await page.waitForSelector('.tiptap.ProseMirror', { timeout: 10000 });
  } catch (e) {
    const shot = path.resolve('..', 'manual_test_evidence', 'task-22', 'debug_onboard_hang.png');
    await page.screenshot({ path: shot });
    console.error('Captured debug_onboard_hang.png screenshot');
    throw e;
  }
}

test.describe('Fix-22 Verification Suite: Join Room No Black Screen & Persistence on Reload', () => {

  test('Fix-22.1: Join Single Document via Passcode -> No Black Screen -> Persisted After Reload', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page, 'Cộng tác viên 1');

    // 1. Click "Tham gia phòng" button in sidebar
    const joinBtn = page.locator('button:has-text("Tham gia phòng")').first();
    await expect(joinBtn).toBeVisible();
    await joinBtn.click();
    await page.waitForTimeout(300);

    // 2. Ensure Join Room Modal is open
    const modal = page.locator('h3:has-text("Tham Gia Phòng Cộng Tác")').first();
    await expect(modal).toBeVisible();

    // Generate a valid AES-GCM 256 key base64 for passcode
    const rawKey = 'dGVzdGtleTI1NmJpdHNhZXNnY21zZWN1cmVwYXNz'; // 32 bytes base64
    const docId = `doc-joined-test-${Date.now()}`;
    const docTitle = 'Tài Liệu Dự Án Kỹ Thuật 2026';
    const passcode = `VS-KEY:${docId}#${rawKey}#${encodeURIComponent(docTitle)}#viewer`;

    // 3. Paste passcode into input
    const input = page.locator('input[placeholder*="VS-"]').first();
    await input.fill(passcode);
    await page.waitForTimeout(200);

    // 4. Click submit button
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(600);

    // 5. Verify Editor Canvas is smoothly rendered (NOT black screen, NOT stuck in loading)
    await expect(page.locator('.tiptap.ProseMirror')).toBeVisible({ timeout: 5000 });
    // Check that breadcrumb displays new document title
    await expect(page.locator(`span:has-text("${docTitle}")`).first()).toBeVisible();

    // Capture proof screenshot for join success
    const shot1 = path.join(evidenceDirs.fix22_1, '01_join_room_via_passcode_success.png');
    await page.screenshot({ path: shot1 });
    fs.copyFileSync(shot1, path.join(evidenceDirs.task22, '01_join_room_via_passcode_success.png'));

    // 6. Reload page (F5) to test persistence
    await page.reload();
    await page.waitForSelector('.tiptap.ProseMirror', { timeout: 20000 });
    await page.waitForTimeout(500);

    // 7. Verify document is still in tree and selected
    await expect(page.locator(`span:has-text("${docTitle}")`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.tiptap.ProseMirror')).toBeVisible();

    // Capture proof screenshot for persistence after reload
    const shot2 = path.join(evidenceDirs.fix22_1, '02_join_room_persisted_after_reload.png');
    await page.screenshot({ path: shot2 });
    fs.copyFileSync(shot2, path.join(evidenceDirs.task22, '02_join_room_persisted_after_reload.png'));
  });

  test('Fix-22.2: Join Folder via Passcode -> First Document Auto-Selected -> Persisted After Reload', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page, 'Cộng tác viên 2');

    // 1. Open Join Room Modal
    const joinBtn = page.locator('button:has-text("Tham gia phòng")').first();
    await joinBtn.click();
    await page.waitForTimeout(300);

    const folderId = `folder-test-${Date.now()}`;
    const folderTitle = 'Thư Mục Dự Án Toàn Cầu';
    const rawKey = 'dGVzdGtleTI1NmJpdHNhZXNnY21zZWN1cmVwYXNz';
    const folderPasscode = `VS-DIR:${folderId}#${rawKey}#${encodeURIComponent(folderTitle)}##editor`;

    // 2. Fill folder passcode
    const input = page.locator('input[placeholder*="VS-"]').first();
    await input.fill(folderPasscode);
    await page.waitForTimeout(200);

    // 3. Submit
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(600);

    // 4. Verify folder and child doc exist and editor is active
    await expect(page.locator(`span:has-text("${folderTitle}")`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.tiptap.ProseMirror')).toBeVisible();

    // 5. Reload (F5)
    await page.reload();
    await page.waitForSelector('.tiptap.ProseMirror', { timeout: 20000 });
    await page.waitForTimeout(500);

    // 6. Verify folder is still present after reload
    await expect(page.locator(`span:has-text("${folderTitle}")`).first()).toBeVisible({ timeout: 10000 });

    const shot3 = path.join(evidenceDirs.fix22_1, '03_join_folder_persisted_after_reload.png');
    await page.screenshot({ path: shot3 });
    fs.copyFileSync(shot3, path.join(evidenceDirs.task22, '03_join_folder_persisted_after_reload.png'));
  });

  test('Fix-22.3: Join Room via Short Code (VS-XXXXXX) -> Immediate Interactive Editor', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page, 'Cộng tác viên 3');

    // 1. Open Join Room Modal
    const joinBtn = page.locator('button:has-text("Tham gia phòng")').first();
    await joinBtn.click();
    await page.waitForTimeout(300);

    // 2. Fill Short Code
    const input = page.locator('input[placeholder*="VS-"]').first();
    await input.fill('VS-789214');
    await page.waitForTimeout(200);

    // 3. Submit
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(600);

    // 4. Verify editor is smoothly interactive without black screen
    await expect(page.locator('.tiptap.ProseMirror')).toBeVisible({ timeout: 5000 });

    const shot4 = path.join(evidenceDirs.fix22_1, '04_join_short_code_success.png');
    await page.screenshot({ path: shot4 });
    fs.copyFileSync(shot4, path.join(evidenceDirs.task22, '04_join_short_code_success.png'));
  });

});
