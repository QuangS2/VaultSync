import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const docsImagesDir = path.resolve('docs', 'images');

if (!fs.existsSync(docsImagesDir)) {
  fs.mkdirSync(docsImagesDir, { recursive: true });
}

async function onboardUser(page: Page, name = 'Quang Le', theme: 'sun' | 'cloud' | 'night' = 'sun') {
  await page.goto('http://127.0.0.1:5173');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Step 1: User Profile
  await page.waitForSelector('input[placeholder*="Lê Anh Quang"]', { timeout: 10000 });
  await page.fill('input[placeholder*="Lê Anh Quang"]', name);
  await page.click('button:has-text("Tiếp tục: Mật khẩu bảo vệ")');
  await page.waitForTimeout(200);

  // Step 2: Passphrase
  await page.waitForSelector('input[placeholder*="mật khẩu an toàn"]', { timeout: 5000 });
  await page.fill('input[placeholder*="mật khẩu an toàn"]', 'VaultSync2026@EnterpriseSecurity');
  await page.fill('input[placeholder*="chính xác mật khẩu"]', 'VaultSync2026@EnterpriseSecurity');
  await page.click('button:has-text("Tiếp tục: Khóa khôi phục")');
  await page.waitForTimeout(300);

  // Step 3: Mnemonic confirmation & complete
  await page.waitForSelector('input[type="checkbox"]', { timeout: 5000 });
  await page.check('input[type="checkbox"]');
  await page.click('button:has-text("Hoàn tất & Mở Kho Lưu Trữ")');

  // Wait for main workspace
  await page.waitForSelector('.tiptap.ProseMirror', { timeout: 10000 });
  await page.waitForTimeout(500);

  // Switch theme if needed
  if (theme === 'night') {
    const nightBtn = page.locator('button[title*="Chế độ Đêm Huyền Bí"]').first();
    await nightBtn.click();
    await page.waitForTimeout(300);
  } else if (theme === 'cloud') {
    const cloudBtn = page.locator('button[title*="Chế độ Mây Trắng"]').first();
    await cloudBtn.click();
    await page.waitForTimeout(300);
  }
}

test.describe('Generate High-Resolution Enterprise Screenshots for README', () => {

  test('01. Capture Zero-Knowledge Onboarding Flow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://127.0.0.1:5173');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Step 1: User Profile
    await page.waitForSelector('input[placeholder*="Lê Anh Quang"]', { timeout: 10000 });
    await page.fill('input[placeholder*="Lê Anh Quang"]', 'Alex Mercer');
    await page.screenshot({ path: path.join(docsImagesDir, '01_onboarding_profile.png') });

    // Step 2: Passphrase
    await page.click('button:has-text("Tiếp tục: Mật khẩu bảo vệ")');
    await page.waitForSelector('input[placeholder*="mật khẩu an toàn"]', { timeout: 5000 });
    await page.fill('input[placeholder*="mật khẩu an toàn"]', 'VaultSync2026@EnterpriseSecurity');
    await page.fill('input[placeholder*="chính xác mật khẩu"]', 'VaultSync2026@EnterpriseSecurity');
    await page.screenshot({ path: path.join(docsImagesDir, '02_onboarding_passphrase.png') });

    // Step 3: Mnemonic
    await page.click('button:has-text("Tiếp tục: Khóa khôi phục")');
    await page.waitForSelector('input[type="checkbox"]', { timeout: 5000 });
    await page.screenshot({ path: path.join(docsImagesDir, '03_onboarding_mnemonic.png') });
  });

  test('02. Capture Main Workspaces (Sun, Night, Cloud)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await onboardUser(page, 'Alex Mercer (Lead Architect)', 'sun');

    // Create a folder & child note in file tree
    const createFolderBtn = page.locator('button[title*="Tạo thư mục"]').first();
    await createFolderBtn.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Q3 Technical Specs');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    await page.screenshot({ path: path.join(docsImagesDir, '04_workspace_sun.png') });

    // Switch to Night Theme
    const nightBtn = page.locator('button[title*="Chế độ Đêm Huyền Bí"]').first();
    await nightBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(docsImagesDir, '05_workspace_night.png') });

    // Switch to Cloud Theme
    const cloudBtn = page.locator('button[title*="Chế độ Mây Trắng"]').first();
    await cloudBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(docsImagesDir, '06_workspace_cloud.png') });
  });

  test('03. Capture Real-Time Collaboration & Direct Permissions Popover', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await onboardUser(page, 'Alex Mercer (Owner)', 'sun');

    // Open Collaborators Popover
    const collabBtn = page.locator('button[title*="danh sách thành viên"]').first();
    await collabBtn.click();
    await page.waitForTimeout(300);

    await page.screenshot({ path: path.join(docsImagesDir, '07_collaborators_permissions_popover.png') });

    // Close and open Share Modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    const shareBtn = page.locator('button:has-text("Chia Sẻ")').first();
    await shareBtn.click();
    await page.waitForTimeout(300);

    await page.fill('input[type="password"]', 'VaultSync2026@EnterpriseSecurity');
    await page.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
    await page.waitForTimeout(400);

    await page.screenshot({ path: path.join(docsImagesDir, '08_commercial_share_modal.png') });
  });

  test('04. Capture Contextual Discussions & Room Chat Sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await onboardUser(page, 'Alex Mercer', 'sun');

    // Open Right Discussion Sidebar via hotkey or button
    await page.keyboard.press('Control+Shift+D');
    await page.waitForTimeout(400);

    const addCommentBtn = page.locator('button:has-text("+ Thêm Bình Luận Mới")');
    if (!await addCommentBtn.isVisible()) {
      await page.click('button[title*="Thảo luận"]');
      await page.waitForTimeout(400);
    }

    // Add an inline comment
    await addCommentBtn.click();
    await page.waitForTimeout(200);
    const draftTextarea = page.locator('textarea[placeholder*="Nhập nội dung bình luận"]');
    await draftTextarea.fill('Đoạn ghi chú này cần được rà soát kỹ lưỡng về bảo mật mã hóa AES-256-GCM!');
    await page.click('button:has-text("Gửi Bình Luận")');
    await page.waitForTimeout(300);

    // Switch to Chat tab
    const chatTab = page.locator('button:has-text("Phòng Chat")');
    await chatTab.click();
    await page.waitForTimeout(300);

    // Send a message
    const chatInput = page.locator('input[placeholder*="Nhập tin nhắn"]');
    await chatInput.fill('Chào mọi người, kiến trúc E2EE và Yjs CRDT đã được kiểm thử toàn diện!');
    await chatInput.press('Enter');
    await page.waitForTimeout(300);

    await page.screenshot({ path: path.join(docsImagesDir, '09_discussion_chat_sidebar.png') });
  });

  test('05. Capture Command Palette & Export Modal', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await onboardUser(page, 'Alex Mercer', 'night');

    // Open Command Palette
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(docsImagesDir, '10_command_palette.png') });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Open Export Modal
    const exportBtn = page.locator('button:has-text("Xuất File")').first();
    await exportBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(docsImagesDir, '11_export_modal.png') });
  });

  test('06. Capture Mobile Native App Experience', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14 / modern smartphone
    await onboardUser(page, 'Alex Mobile', 'sun');

    await page.screenshot({ path: path.join(docsImagesDir, '12_mobile_workspace.png') });

    // Open Mobile Drawer
    const menuTab = page.locator('button[title*="Tùy chọn & Cài đặt"]').first();
    await menuTab.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(docsImagesDir, '13_mobile_drawer.png') });
  });

});
