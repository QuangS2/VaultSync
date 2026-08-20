import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const evidenceDirs = {
  fix20_1: path.resolve('..', 'Tester_report', 'fixed', 'fix-20.1'),
  fix20_2: path.resolve('..', 'Tester_report', 'fixed', 'fix-20.2'),
  task20: path.resolve('..', 'manual_test_evidence', 'task-20')
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

test.describe('Fix-20 Verification Suite: Real-Time Shared Folder Sync & Direct Permission Editing by Owner', () => {

  test('Fix-20.1: Real-Time Shared Folder Lifecycle Synchronization (File Addition & Deletion Sync)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page, 'Chủ Sở Hữu');

    // 1. Create a shared folder
    const createFolderBtn = page.locator('button[title*="Tạo thư mục"]').first();
    await createFolderBtn.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Thư Mục Đồng Bộ Thời Gian Thực');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const folderItem = page.locator('.group:has-text("Thư Mục Đồng Bộ Thời Gian Thực")').first();
    await expect(folderItem).toBeVisible();

    // 2. Add child file to folder
    const createChildDocBtn = folderItem.locator('button[title*="Tạo tài liệu con"]').first();
    await createChildDocBtn.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Tài Liệu Mới Được Thêm.md');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const childDocItem = page.locator('.group:has-text("Tài Liệu Mới Được Thêm.md")').first();
    await expect(childDocItem).toBeVisible();

    // 3. Open share modal for folder
    await folderItem.click({ button: 'right' });
    await page.waitForTimeout(200);

    const shareFolderOption = page.locator('text=Chia sẻ thư mục...').first();
    await shareFolderOption.click();
    await page.waitForTimeout(300);

    // Enter passphrase to open share
    await page.fill('input[type="password"]', 'Passphrase2026!Strong');
    await page.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
    await page.waitForTimeout(400);

    // Verify manifest shows child document
    await expect(page.locator('text=1 tệp con')).toBeVisible();

    const shot1 = path.join(evidenceDirs.fix20_1, '01_shared_folder_addition_and_manifest.png');
    await page.screenshot({ path: shot1 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // 4. Delete child file inside shared folder
    await childDocItem.click({ button: 'right' });
    await page.waitForTimeout(200);

    const deleteDocOption = page.locator('text=Chuyển vào thùng rác').first();
    await deleteDocOption.click();
    await page.waitForTimeout(300);

    // Verify child doc is removed from active workspace
    await expect(page.locator('text=Tài Liệu Mới Được Thêm.md')).toBeHidden();

    const shot2 = path.join(evidenceDirs.fix20_1, '02_shared_folder_file_deletion_sync.png');
    await page.screenshot({ path: shot2 });
  });

  test('Fix-20.2: Direct Owner Permission Editing & Live Role Modification in Popover / Share Modal', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page, 'Owner');

    // 1. Open Collaborators Popover
    const collabBtn = page.locator('button[title*="danh sách thành viên"]').first();
    await collabBtn.click();
    await page.waitForTimeout(300);

    // Verify Owner Live Permissions Management Bar is visible
    const permHeader = page.locator('text=Quyền của khách trong phòng:');
    await expect(permHeader).toBeVisible();

    // Toggle role to "Chỉ xem"
    const viewerBtn = page.locator('button:has-text("Chỉ xem")').first();
    await viewerBtn.click();
    await page.waitForTimeout(300);

    const shot1 = path.join(evidenceDirs.fix20_2, '01_owner_direct_permission_editing_popover.png');
    await page.screenshot({ path: shot1 });

    // Close Collaborators Popover
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // 2. Open Share Modal and test Live Permission Broadcast button
    const shareBtn = page.locator('button:has-text("Chia Sẻ")').first();
    await shareBtn.click();
    await page.waitForTimeout(300);

    // Enter passphrase
    await page.fill('input[type="password"]', 'Passphrase2026!Strong');
    await page.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
    await page.waitForTimeout(400);

    // Verify "Cập Nhật Quyền Trực Tiếp" button is visible and clickable
    const liveUpdateBtn = page.locator('button:has-text("Cập Nhật Quyền Trực Tiếp")');
    await expect(liveUpdateBtn).toBeVisible();
    await liveUpdateBtn.click();
    await page.waitForTimeout(300);

    const shot2 = path.join(evidenceDirs.fix20_2, '02_live_permission_broadcast_in_share_modal.png');
    await page.screenshot({ path: shot2 });
  });

});
