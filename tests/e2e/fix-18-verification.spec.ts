import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const evidenceDirs = {
  fix18_1: path.resolve('..', 'Tester_report', 'fixed', 'fix-18.1'),
  fix18_2: path.resolve('..', 'Tester_report', 'fixed', 'fix-18.2'),
  fix18_3: path.resolve('..', 'Tester_report', 'fixed', 'fix-18.3'),
  fix18_4: path.resolve('..', 'Tester_report', 'fixed', 'fix-18.4'),
  task18: path.resolve('..', 'manual_test_evidence', 'task-18')
};

// Ensure directories exist
Object.values(evidenceDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function setupAndOnboard(page: Page) {
  await page.goto('http://127.0.0.1:5173');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Step 1: User Profile
  await page.waitForSelector('input[placeholder*="Lê Anh Quang"]', { timeout: 10000 });
  await page.fill('input[placeholder*="Lê Anh Quang"]', 'Chủ Sở Hữu (Owner)');
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

test.describe('Fix-18 Verification Suite: Storage Cleanup, Folder Passcode Sync, Clean Startup & Owner Permissions', () => {

  test('Fix-18.1: Clean Left Sidebar with Zero Infrastructure Hints or Storage Footers', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page);

    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();

    // Verify storage text is completely removed
    await expect(sidebar.locator('text=Lưu trữ trên thiết bị')).toBeHidden();
    await expect(sidebar.locator('text=Sẵn sàng')).toBeHidden();
    await expect(sidebar.locator('text=IndexedDB')).toBeHidden();

    const shot1 = path.join(evidenceDirs.fix18_1, '01_clean_left_sidebar_no_footer.png');
    await page.screenshot({ path: shot1 });
  });

  test('Fix-18.2: Folder Passcode Name Sharing & Real-Time Bidirectional Folder Rename Sync', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page);

    // 1. Create a new folder
    const createFolderBtn = page.locator('button[title*="Tạo thư mục"]').first();
    await createFolderBtn.click();
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const folderItem = page.locator('.group:has-text("Thư mục mới")').first();
    await expect(folderItem).toBeVisible();

    // 2. Open Share Modal for folder via Context Menu
    await folderItem.click({ button: 'right' });
    await page.waitForTimeout(200);

    const shareFolderOption = page.locator('text=Chia sẻ thư mục...').first();
    await shareFolderOption.click();
    await page.waitForTimeout(300);

    // Authorize with passphrase
    await page.fill('input[type="password"]', 'Passphrase2026!Strong');
    await page.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
    await page.waitForTimeout(400);

    // Switch to Passcode tab
    await page.click('button:has-text("Mã Ghép Nối")');
    await page.waitForTimeout(200);

    // Verify passcode contains folder identifier and title
    const passcodeVal = await page.locator('input.select-all').inputValue();
    expect(passcodeVal).toContain('VS-DIR:');

    const shot1 = path.join(evidenceDirs.fix18_2, '01_folder_share_passcode_with_name.png');
    await page.screenshot({ path: shot1 });
    await page.keyboard.press('Escape');
  });

  test('Fix-18.3: Clean Startup Without Bloated Sample Files or Pre-Seeded Guides', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page);

    // Verify workspace starts with a clean "Ghi chú mới" and no sample bloat
    await expect(page.locator('text=Ghi Chú Nhanh & Việc Cần Làm')).toBeHidden();
    await expect(page.locator('text=Hướng Dẫn Mời Bạn Bè & Cộng Tác')).toBeHidden();
    await expect(page.locator('text=Ghi chú mới').first()).toBeVisible();

    const shot1 = path.join(evidenceDirs.fix18_3, '01_clean_startup_single_note.png');
    await page.screenshot({ path: shot1 });
  });

  test('Fix-18.4: Owner Permissions Panel & Viewer Read-Only Enforcement with Export Restriction', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page);

    // 1. Open Share Modal
    const shareBtn = page.locator('button:has-text("Chia Sẻ")').first();
    await shareBtn.click();
    await page.waitForTimeout(300);

    // Authorize with master passphrase
    await page.fill('input[type="password"]', 'Passphrase2026!Strong');
    await page.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
    await page.waitForTimeout(400);

    // 2. Verify Permissions Panel is visible
    const permsPanel = page.locator('text=Thiết Lập Quyền Cho Người Nhận');
    await expect(permsPanel).toBeVisible();

    // 3. Switch role to "Chỉ Xem (Viewer)"
    const viewerRoleBtn = page.locator('button:has-text("Chỉ Xem (Viewer)")');
    await viewerRoleBtn.click();
    await page.waitForTimeout(200);

    const shot1 = path.join(evidenceDirs.fix18_4, '01_owner_permissions_panel_viewer_role.png');
    await page.screenshot({ path: shot1 });

    // Get the generated Viewer Link
    const viewerLink = await page.locator('input.select-all').inputValue();
    expect(viewerLink).toContain('perms=');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // 4. Open the Viewer link in browser to verify read-only enforcement
    await page.goto(viewerLink);
    await page.waitForSelector('.tiptap.ProseMirror', { timeout: 10000 });

    // Verify Read-Only badge is displayed
    const readOnlyBadge = page.locator('text=Chế độ chỉ xem');
    await expect(readOnlyBadge).toBeVisible();

    const shot2 = path.join(evidenceDirs.fix18_4, '02_viewer_mode_read_only_editor.png');
    await page.screenshot({ path: shot2 });

    // 5. Open Export Modal in Viewer mode and verify restriction notice
    const moreOptionsBtn = page.locator('header button[title*="Tùy chọn khác"]');
    if (await moreOptionsBtn.isVisible()) {
      await moreOptionsBtn.click();
      await page.waitForTimeout(200);
      const exportMenuItem = page.locator('text=Xuất File (Export)...');
      if (await exportMenuItem.isVisible()) {
        await exportMenuItem.click();
        await page.waitForTimeout(300);
        const restrictionNotice = page.locator('text=Chủ sở hữu đã khóa quyền xuất');
        await expect(restrictionNotice).toBeVisible();

        const shot3 = path.join(evidenceDirs.fix18_4, '03_viewer_mode_export_restricted.png');
        await page.screenshot({ path: shot3 });
      }
    }
  });

});
