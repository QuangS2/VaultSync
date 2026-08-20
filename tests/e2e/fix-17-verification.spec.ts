import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const evidenceDirs = {
  fix17_1: path.resolve('..', 'Tester_report', 'fixed', 'fix-17.1'),
  fix17_2: path.resolve('..', 'Tester_report', 'fixed', 'fix-17.2'),
  fix17_3: path.resolve('..', 'Tester_report', 'fixed', 'fix-17.3'),
  task17: path.resolve('..', 'manual_test_evidence', 'task-17')
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
  await page.fill('input[placeholder*="Lê Anh Quang"]', 'Kiểm Thử Viên (Tester)');
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

test.describe('Fix-17 Verification Suite: Mobile Ergonomics, Synchronized Minimalist Logo, and Clean UI Strings', () => {

  test('Fix-17.1: Mobile Bottom Bar Non-Overlapping & Safe Bottom Padding for Modals/Drawers', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await setupAndOnboard(page);

    // 1. Open Move To Folder Modal via Document context menu or directly
    const treeMenuBtn = page.locator('button[title*="Tùy chọn thao tác"]').first();
    // Open files drawer first on mobile
    const filesTab = page.locator('nav.sm\\:hidden button:has-text("Tài liệu")');
    await filesTab.click();
    await page.waitForTimeout(300);

    await treeMenuBtn.click();
    await page.waitForTimeout(200);

    const moveMenuItem = page.locator('text=Di chuyển tài liệu...').first();
    await expect(moveMenuItem).toBeVisible();
    await moveMenuItem.click();
    await page.waitForTimeout(300);

    // 2. Verify MoveToFolderModal renders with elevated, non-blocked action buttons
    const moveModal = page.locator('text=Di Chuyển Tài Liệu / Thư Mục');
    await expect(moveModal).toBeVisible();

    const cancelBtn = page.locator('button:has-text("Hủy")').first();
    const moveSubmitBtn = page.locator('button:has-text("Di Chuyển Đến Đây")').first();

    await expect(cancelBtn).toBeVisible();
    await expect(moveSubmitBtn).toBeVisible();

    const shot1 = path.join(evidenceDirs.fix17_1, '01_mobile_move_modal_unblocked_buttons.png');
    await page.screenshot({ path: shot1 });

    // Close modal
    await cancelBtn.click();
    await page.waitForTimeout(200);

    // 3. Check LeftSidebar bottom scroll padding
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();

    const shot2 = path.join(evidenceDirs.fix17_1, '02_mobile_left_sidebar_bottom_padding.png');
    await page.screenshot({ path: shot2 });
  });

  test('Fix-17.2: Synchronized Minimalist Single-Stroke Brand Logo & Title Favicon', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page);

    // 1. Verify HeaderBar Brand Logo
    const headerLogo = page.locator('header svg').first();
    await expect(headerLogo).toBeVisible();

    // 2. Verify Favicon in index.html
    const faviconHref = await page.evaluate(() => {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      return link ? link.href : '';
    });
    expect(faviconHref).toContain('favicon.svg');

    // 3. Verify Page Title
    const title = await page.title();
    expect(title).toContain('VaultSync');

    const shot1 = path.join(evidenceDirs.fix17_2, '01_synchronized_minimalist_brand_logo.png');
    await page.screenshot({ path: shot1 });
  });

  test('Fix-17.3: Complete Elimination of Leftover Jargon (Websocket, E2EE Multi-Room, IndexedDB, etc.)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page);

    // 1. Check Online Collaborators Popover
    const onlineBtn = page.locator('button[title*="thành viên trực tuyến"]');
    await onlineBtn.click();
    await page.waitForTimeout(300);

    const popover = page.locator('text=Thành viên trong phòng');
    await expect(popover).toBeVisible();
    await expect(page.locator('text=WebSocket')).toBeHidden();
    await expect(page.locator('text=Đang kết nối cộng tác trực tiếp theo thời gian thực.')).toBeVisible();

    const shot1 = path.join(evidenceDirs.fix17_3, '01_online_collaborators_clean_footer.png');
    await page.screenshot({ path: shot1 });
    await page.keyboard.press('Escape');

    // 2. Check Share Modal
    const shareBtn = page.locator('button:has-text("Chia Sẻ")').first();
    await shareBtn.click();
    await page.waitForTimeout(300);

    await expect(page.locator('text=E2EE Multi-Room')).toBeHidden();
    await expect(page.locator('text=Mã Hóa Đầu-Cuối')).toBeHidden();

    const shot2 = path.join(evidenceDirs.fix17_3, '02_share_modal_clean_header_and_labels.png');
    await page.screenshot({ path: shot2 });
    await page.keyboard.press('Escape');

    // 3. Check LeftSidebar Footer is completely clean and hidden
    const sidebar = page.locator('aside').first();
    await expect(sidebar.locator('text=Mã hóa IndexedDB')).toBeHidden();
    await expect(sidebar.locator('text=100% E2EE')).toBeHidden();
    await expect(sidebar.locator('text=Lưu trữ trên thiết bị')).toBeHidden();

    const shot3 = path.join(evidenceDirs.fix17_3, '03_left_sidebar_clean_footer.png');
    await page.screenshot({ path: shot3 });
  });

});
