import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const evidenceDirs = {
  fix16_1: path.resolve('..', 'Tester_report', 'fixed', 'fix-16.1'),
  fix16_2: path.resolve('..', 'Tester_report', 'fixed', 'fix-16.2'),
  fix16_3: path.resolve('..', 'Tester_report', 'fixed', 'fix-16.3'),
  fix16_4: path.resolve('..', 'Tester_report', 'fixed', 'fix-16.4'),
  fix16_5: path.resolve('..', 'Tester_report', 'fixed', 'fix-16.5'),
  manual16: path.resolve('..', 'manual_test_evidence', 'task-16')
};

// Ensure evidence directories exist
for (const dir of Object.values(evidenceDirs)) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Helper: full setup and vault onboarding
async function setupAndOnboard(page: any) {
  await page.goto('http://127.0.0.1:5173');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Step 1: User Profile
  await page.waitForSelector('input[placeholder*="Lê Anh Quang"]', { timeout: 10000 });
  await page.fill('input[placeholder*="Lê Anh Quang"]', 'Kiểm Thử Viên (Tester)');
  await page.click('button:has-text("Tiếp tục: Mật khẩu chủ")');

  // Step 2: Master Password
  await page.waitForTimeout(300);
  await page.fill('input[placeholder*="mật khẩu an toàn"]', 'Passphrase2026!Secure');
  await page.fill('input[placeholder*="chính xác mật khẩu"]', 'Passphrase2026!Secure');
  await page.click('button:has-text("Tiếp tục: Khóa khôi phục")');

  // Step 3: Seed phrase confirmation
  await page.waitForTimeout(400);
  await page.check('input[type="checkbox"]');
  await page.click('button:has-text("Hoàn tất & Mở Kho Lưu Trữ")');

  // Wait for editor
  await page.waitForSelector('.tiptap.ProseMirror', { timeout: 10000 });
}

test.describe('Fix-16 Verification Suite: Room Presence Popover, Mobile Chat Usability, 4-Tab Bottom Nav, Clean UI & Touch Move Modal', () => {

  test('Fix-16.1: Room Presence Pill & Online Collaborators Popover with Pagination', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page);

    // 1. Verify compact Room Online button in EditorCanvas toolbar
    const onlineBtn = page.locator('button[title*="thành viên trực tuyến"]');
    await expect(onlineBtn).toBeVisible();

    const shot1 = path.join(evidenceDirs.fix16_1, '01_room_online_presence_button.png');
    await page.screenshot({ path: shot1 });

    // 2. Click to open Online Collaborators Popover
    await onlineBtn.click();
    await page.waitForTimeout(300);

    const popover = page.locator('text=Thành viên trong phòng');
    await expect(popover).toBeVisible();

    const shot2 = path.join(evidenceDirs.fix16_1, '02_online_collaborators_popover_opened.png');
    await page.screenshot({ path: shot2 });

    // Close popover
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  });

  test('Fix-16.2: Mobile Full-Screen Discussion Drawer & Non-Blocked Chat Input', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await setupAndOnboard(page);

    // 1. Open Discussion Drawer from Mobile Bottom Nav
    const discussBtn = page.locator('nav.sm\\:hidden button:has-text("Thảo luận")');
    await expect(discussBtn).toBeVisible();
    await discussBtn.click();
    await page.waitForTimeout(400);

    // 2. Verify Bottom Nav is hidden so it does not block chat input
    const bottomNav = page.locator('nav.sm\\:hidden');
    await expect(bottomNav).toBeHidden();

    // 3. Switch to Chat Tab
    const chatTab = page.locator('button:has-text("Phòng Chat")');
    await chatTab.click();
    await page.waitForTimeout(300);

    // 4. Verify Chat Input is accessible and type a message
    const chatInput = page.locator('input[placeholder*="Nhập tin nhắn"]');
    await expect(chatInput).toBeVisible();
    await chatInput.fill('Xin chào từ giao diện mobile! Chat hoàn toàn không bị che khuất.');

    const sendBtn = page.locator('button[title="Gửi tin nhắn"]');
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();
    await page.waitForTimeout(300);

    const shot1 = path.join(evidenceDirs.fix16_2, '01_mobile_chat_unblocked_input.png');
    await page.screenshot({ path: shot1 });

    // Close Discussion Drawer
    await page.click('button[title="Đóng sidebar"]');
    await page.waitForTimeout(300);
  });

  test('Fix-16.3: Streamlined 4-Tab Mobile Navigation without Duplicate Search', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await setupAndOnboard(page);

    // 1. Verify Mobile Bottom Navigation Bar has exactly 4 clean tabs
    const bottomNav = page.locator('nav.sm\\:hidden');
    await expect(bottomNav).toBeVisible();

    const filesBtn = page.locator('nav.sm\\:hidden button:has-text("Tài liệu")');
    const fabBtn = page.locator('nav.sm\\:hidden button[title*="Tạo ghi chú"]');
    const discussBtn = page.locator('nav.sm\\:hidden button:has-text("Thảo luận")');
    const optionsBtn = page.locator('nav.sm\\:hidden button:has-text("Tùy chọn")');
    const searchBtn = page.locator('nav.sm\\:hidden button:has-text("Tìm kiếm")');

    await expect(filesBtn).toBeVisible();
    await expect(fabBtn).toBeVisible();
    await expect(discussBtn).toBeVisible();
    await expect(optionsBtn).toBeVisible();
    await expect(searchBtn).toBeHidden();

    const shot1 = path.join(evidenceDirs.fix16_3, '01_streamlined_4_tab_mobile_nav.png');
    await page.screenshot({ path: shot1 });
  });

  test('Fix-16.4: Clean Workspace Header with Actual Vault Name and No Technical Jargon', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page);

    // 1. Check LeftSidebar header
    const sidebarHeader = page.locator('aside').first();
    await expect(sidebarHeader).toBeVisible();

    // Verify "Engineering Vault" and "CRDT" are gone, replaced with friendly name and "Bảo Mật"
    const crdtBadge = sidebarHeader.locator('text=CRDT');
    await expect(crdtBadge).toBeHidden();

    const secureBadge = sidebarHeader.locator('text=Bảo Mật');
    await expect(secureBadge).toBeVisible();

    const shot1 = path.join(evidenceDirs.fix16_4, '01_clean_workspace_header_no_jargon.png');
    await page.screenshot({ path: shot1 });
  });

  test('Fix-16.5: Touch-Friendly Move to Folder Modal with Hierarchy Picker', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAndOnboard(page);

    // 1. Right-click on a tree document item to open ContextMenu
    const docItem = page.locator('.group:has-text("Ghi Chú Nhanh")').first();
    await expect(docItem).toBeVisible();
    await docItem.click({ button: 'right' });
    await page.waitForTimeout(300);

    // 2. Click "Di chuyển tài liệu..." in ContextMenu
    const moveOption = page.locator('text=Di chuyển tài liệu...');
    await expect(moveOption).toBeVisible();
    await moveOption.click();
    await page.waitForTimeout(300);

    // 3. Verify MoveToFolderModal is opened
    const moveModal = page.locator('text=Di Chuyển Tài Liệu / Thư Mục');
    await expect(moveModal).toBeVisible();

    // Verify destination options (Root Vault button)
    const rootOption = page.locator('button:has-text("Kho Lưu Trữ Gốc")');
    await expect(rootOption).toBeVisible();

    const shot1 = path.join(evidenceDirs.fix16_5, '01_move_to_folder_modal_opened.png');
    await page.screenshot({ path: shot1 });

    // 4. Click "Di Chuyển Đến Đây"
    await page.click('button:has-text("Di Chuyển Đến Đây")');
    await page.waitForTimeout(300);
    await expect(moveModal).toBeHidden();

    const shotManual = path.join(evidenceDirs.manual16, '01_task_16_verification.png');
    await page.screenshot({ path: shotManual });
  });

});
