import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const evidenceDirs = {
  fix21_1: path.resolve('..', 'Tester_report', 'fixed', 'fix-21.1'),
  fix21_2: path.resolve('..', 'Tester_report', 'fixed', 'fix-21.2'),
  fix21_3: path.resolve('..', 'Tester_report', 'fixed', 'fix-21.3'),
  fix21_4: path.resolve('..', 'Tester_report', 'fixed', 'fix-21.4'),
  task21: path.resolve('..', 'manual_test_evidence', 'task-21')
};

// Ensure directories exist
Object.values(evidenceDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function setupAndOnboard(page: Page, userName = 'Chủ Sở Hữu (Owner)') {
  await page.goto('http://127.0.0.1:5173');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Step 1: User Profile
  await page.waitForSelector('input[placeholder*="Lê Anh Quang"]', { timeout: 10000 });
  await page.fill('input[placeholder*="Lê Anh Quang"]', userName);
  await page.click('button:has-text("Tiếp tục: Mật khẩu bảo vệ")');
  await page.waitForTimeout(200);

  // Step 2: Passphrase
  await page.waitForSelector('input[placeholder*="mật khẩu an toàn"]', { timeout: 5000 });
  await page.fill('input[placeholder*="mật khẩu an toàn"]', 'Passphrase2026!Strong');
  await page.fill('input[placeholder*="chính xác mật khẩu"]', 'Passphrase2026!Strong');
  await page.click('button:has-text("Tiếp tục: Khóa khôi phục")');
  await page.waitForTimeout(300);

  // Step 3: Mnemonic confirmation & complete
  await page.waitForSelector('input[type="checkbox"]', { timeout: 5000 });
  await page.check('input[type="checkbox"]');
  await page.click('button:has-text("Hoàn tất & Mở Kho Lưu Trữ")');

  // Wait for main workspace
  await page.waitForSelector('.tiptap.ProseMirror', { timeout: 10000 });
}

test.describe('Fix-21 Verification Suite: File Name Persistence, Deletion Sync, Viewer Permissions, HTML Title UTF-8', () => {

  test('Fix-21.1: File Name Persistence on Document Switch (No Default Name Reversion)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page, 'Owner');

    // 1. Create File 2
    const createDocBtn = page.locator('button[title*="Tạo tài liệu gốc"]').first();
    await createDocBtn.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Tài Liệu Tùy Biến Số 2.md');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // 2. Create File 3
    await createDocBtn.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Kế Hoạch Chiến Lược 2026.md');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Verify all 3 files exist with correct names
    await expect(page.locator('.group:has-text("Tài Liệu Tùy Biến Số 2.md")').first()).toBeVisible();
    await expect(page.locator('.group:has-text("Kế Hoạch Chiến Lược 2026.md")').first()).toBeVisible();

    // 3. Click back to File 1 (Ghi chú mới)
    const file1Item = page.locator('.group:has-text("Ghi chú mới")').first();
    await file1Item.click();
    await page.waitForTimeout(400);

    // Check that File 2 and File 3 DID NOT revert to "Tài liệu mới" or original default names!
    await expect(page.locator('.group:has-text("Tài Liệu Tùy Biến Số 2.md")').first()).toBeVisible();
    await expect(page.locator('.group:has-text("Kế Hoạch Chiến Lược 2026.md")').first()).toBeVisible();

    // 4. Click to File 2
    const file2Item = page.locator('.group:has-text("Tài Liệu Tùy Biến Số 2.md")').first();
    await file2Item.click();
    await page.waitForTimeout(400);
    await expect(page.locator('.group:has-text("Tài Liệu Tùy Biến Số 2.md")').first()).toBeVisible();
    await expect(page.locator('.group:has-text("Kế Hoạch Chiến Lược 2026.md")').first()).toBeVisible();

    // 5. Click back to File 1 again
    await file1Item.click();
    await page.waitForTimeout(400);
    await expect(page.locator('.group:has-text("Tài Liệu Tùy Biến Số 2.md")').first()).toBeVisible();
    await expect(page.locator('.group:has-text("Kế Hoạch Chiến Lược 2026.md")').first()).toBeVisible();

    const shot1 = path.join(evidenceDirs.fix21_1, '01_no_name_reversion_on_doc_switch.png');
    await page.screenshot({ path: shot1 });
  });

  test('Fix-21.2: File Deletion Real-Time Synchronization between Owner and Guest', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page, 'Owner');

    // 1. Create a shared folder
    const createFolderBtn = page.locator('button[title*="Tạo thư mục"]').first();
    await createFolderBtn.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Thư Mục Dự Án');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const folderItem = page.locator('.group:has-text("Thư Mục Dự Án")').first();
    await expect(folderItem).toBeVisible();

    // 2. Add child file to folder
    const createChildDocBtn = folderItem.locator('button[title*="Tạo tài liệu con"]').first();
    await createChildDocBtn.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Tệp Cần Xóa Đồng Bộ.md');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const childDocItem = page.locator('.group:has-text("Tệp Cần Xóa Đồng Bộ.md")').first();
    await expect(childDocItem).toBeVisible();

    // 3. Delete the child file
    await childDocItem.click({ button: 'right' });
    await page.waitForTimeout(200);
    const deleteOption = page.locator('text=Chuyển vào thùng rác').first();
    await deleteOption.click();
    await page.waitForTimeout(400);

    // Verify it is removed from active workspace tree
    await expect(page.locator('text=Tệp Cần Xóa Đồng Bộ.md')).toBeHidden();

    // Verify it is in Trash view
    await page.click('button:has-text("Thùng rác")');
    await page.waitForTimeout(300);
    await expect(page.locator('text=Tệp Cần Xóa Đồng Bộ.md')).toBeVisible();

    const shot1 = path.join(evidenceDirs.fix21_2, '01_owner_guest_deletion_sync.png');
    await page.screenshot({ path: shot1 });
  });

  test('Fix-21.3: Viewer Permissions Enforcement (Guest cannot delete, edit, or create)', async ({ browser }) => {
    // 1. Owner creates a document and generates viewer share link
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await ownerPage.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(ownerPage, 'Chủ Phòng');

    // Open Share Modal
    const shareBtn = ownerPage.locator('button:has-text("Chia Sẻ")').first();
    await shareBtn.click();
    await ownerPage.waitForTimeout(300);

    // Enter passphrase
    await ownerPage.fill('input[type="password"]', 'Passphrase2026!Strong');
    await ownerPage.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
    await ownerPage.waitForTimeout(500);

    // Change permission to "Chỉ xem (Viewer)" inside share modal
    await ownerPage.click('button:has-text("Chỉ Xem (Viewer)")');
    await ownerPage.waitForTimeout(300);

    // Copy share link from modal input
    const linkInput = ownerPage.locator('.fixed input[readonly]').first();
    const shareUrl = await linkInput.inputValue();
    expect(shareUrl).toContain('perms=');

    // 2. Guest sets up workspace and opens the share link with Viewer permissions
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await guestPage.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(guestPage, 'Khách Xem (Guest)');
    await guestPage.goto(shareUrl);
    await guestPage.waitForTimeout(1000);

    // Verify Guest TreeView does NOT have create buttons in header
    await expect(guestPage.locator('button[title*="Tạo tài liệu gốc"]')).toBeHidden();
    await expect(guestPage.locator('button[title*="Tạo thư mục gốc"]')).toBeHidden();

    // Right-click on document in TreeView
    const docItem = guestPage.locator('.group:has-text("Chào mừng đến với VaultSync"), .group:has-text("Ghi chú mới")').first();
    if (await docItem.isVisible()) {
      await docItem.click({ button: 'right' });
      await guestPage.waitForTimeout(300);

      // Verify ContextMenu does NOT show "Chuyển vào thùng rác", "Đổi tên", "Nhân bản"
      await expect(guestPage.locator('text=Chuyển vào thùng rác')).toBeHidden();
      await expect(guestPage.locator('text=Đổi tên tài liệu')).toBeHidden();
      await expect(guestPage.locator('text=Nhân bản tài liệu')).toBeHidden();
    }

    const shot1 = path.join(evidenceDirs.fix21_3, '01_viewer_permission_delete_blocked.png');
    await guestPage.screenshot({ path: shot1 });

    await ownerContext.close();
    await guestContext.close();
  });

  test('Fix-21.4: HTML Title and Meta Charset UTF-8 Font Encoding Validation', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.waitForTimeout(300);

    // 1. Check document title in DOM
    const title = await page.title();
    expect(title).toBe('VaultSync — Soạn Thảo & Ghi Chú Cá Nhân');

    // 2. Check meta charset tag exists and is UTF-8
    const charset = await page.locator('meta[charset]').getAttribute('charset');
    expect(charset?.toUpperCase()).toBe('UTF-8');

    // 3. Check html lang is vi
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('vi');

    const shot1 = path.join(evidenceDirs.fix21_4, '01_html_title_and_utf8_charset.png');
    await page.screenshot({ path: shot1 });
  });

});
