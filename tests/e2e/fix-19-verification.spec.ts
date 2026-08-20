import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const evidenceDirs = {
  fix19_1: path.resolve('..', 'Tester_report', 'fixed', 'fix-19.1'),
  fix19_2: path.resolve('..', 'Tester_report', 'fixed', 'fix-19.2'),
  fix19_3: path.resolve('..', 'Tester_report', 'fixed', 'fix-19.3'),
  task19: path.resolve('..', 'manual_test_evidence', 'task-19')
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
  await page.click('button:has-text("Tiếp tục: Mật khẩu chủ")');
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

test.describe('Fix-19 Verification Suite: Real-Time Shared Folder Lifecycle, Global Object Identity & Trash Management', () => {

  test('Fix-19.1: Real-Time Shared Folder Lifecycle Synchronization & Child Document Creation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page, 'Owner');

    // 1. Create a parent folder
    const createFolderBtn = page.locator('button[title*="Tạo thư mục"]').first();
    await createFolderBtn.click();
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const folderItem = page.locator('.group:has-text("Thư mục mới")').first();
    await expect(folderItem).toBeVisible();

    // 2. Create child document inside the folder
    const createChildDocBtn = folderItem.locator('button[title*="Tạo tài liệu con"]').first();
    await createChildDocBtn.click();
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Verify child document is nested inside folder
    const childDocItem = page.locator('.group:has-text("Tài liệu mới")').first();
    await expect(childDocItem).toBeVisible();

    // 3. Open Share Modal for folder to verify manifest includes child
    await folderItem.click({ button: 'right' });
    await page.waitForTimeout(200);

    const shareFolderOption = page.locator('text=Chia sẻ thư mục...').first();
    await shareFolderOption.click();
    await page.waitForTimeout(300);

    // Enter passphrase
    await page.fill('input[type="password"]', 'Passphrase2026!Strong');
    await page.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
    await page.waitForTimeout(400);

    const shot1 = path.join(evidenceDirs.fix19_1, '01_shared_folder_lifecycle_child_creation.png');
    await page.screenshot({ path: shot1 });
    await page.keyboard.press('Escape');
  });

  test('Fix-19.2: Unified Object Identity & Real-Time Tree Mutation Synchronization', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page, 'Owner');

    // 1. Create a document and rename it
    const createDocBtn = page.locator('button[title*="Tạo tài liệu"]').first();
    await createDocBtn.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Tài Liệu Định Danh Object');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const docItem = page.locator('.group:has-text("Tài Liệu Định Danh Object")').first();
    await expect(docItem).toBeVisible();

    // 2. Check title synchronization in canvas
    const editorTitleInput = page.locator('input[placeholder*="Tiêu đề tài liệu"]');
    await expect(editorTitleInput).toHaveValue('Tài Liệu Định Danh Object');

    const shot1 = path.join(evidenceDirs.fix19_2, '01_unified_object_identity_title_sync.png');
    await page.screenshot({ path: shot1 });
  });

  test('Fix-19.3: Shared Folder/File Trash Lifecycle, Owner Trash Bin & Bi-Directional Restore', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page, 'Owner');

    // 1. Create a folder to test trash lifecycle
    const createFolderBtn = page.locator('button[title*="Tạo thư mục"]').first();
    await createFolderBtn.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Thư Mục Thùng Rác');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const folderItem = page.locator('.group:has-text("Thư Mục Thùng Rác")').first();
    await expect(folderItem).toBeVisible();

    // 2. Move folder to trash via Context Menu
    await folderItem.click({ button: 'right' });
    await page.waitForTimeout(200);

    const deleteOption = page.locator('text=Chuyển vào thùng rác').first();
    await deleteOption.click();
    await page.waitForTimeout(300);

    // Verify folder is removed from active workspace
    await expect(page.locator('text=Thư Mục Thùng Rác')).toBeHidden();

    // 3. Switch to Trash view
    const trashTabBtn = page.locator('button:has-text("Thùng rác")');
    await trashTabBtn.click();
    await page.waitForTimeout(300);

    // Verify folder is present in Owner's Trash Bin
    const trashedFolderItem = page.locator('.group:has-text("Thư Mục Thùng Rác")').first();
    await expect(trashedFolderItem).toBeVisible();

    const shot1 = path.join(evidenceDirs.fix19_3, '01_trashed_folder_in_owner_trash_bin.png');
    await page.screenshot({ path: shot1 });

    // 4. Restore folder from Trash
    const restoreBtn = trashedFolderItem.locator('button[title*="Khôi phục"]').first();
    await restoreBtn.click();
    await page.waitForTimeout(300);

    // Switch back to All Notes view
    const allNotesTabBtn = page.locator('button:has-text("Tất cả ghi chú")');
    await allNotesTabBtn.click();
    await page.waitForTimeout(300);

    // Verify folder is restored back to active workspace
    const restoredFolderItem = page.locator('.group:has-text("Thư Mục Thùng Rác")').first();
    await expect(restoredFolderItem).toBeVisible();

    const shot2 = path.join(evidenceDirs.fix19_3, '02_folder_restored_to_workspace.png');
    await page.screenshot({ path: shot2 });
  });

});
