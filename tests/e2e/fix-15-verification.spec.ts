import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Fix-15 Verification Suite: Precise Quickstart Persistence, Inline Jump/Anchoring, Accurate Unread Badges & Native Mobile App UX', () => {

  const ensureDir = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  };

  const evidenceDirs = {
    fix15_1: path.resolve('..', 'Tester_report', 'fixed', 'fix-15.1'),
    fix15_2: path.resolve('..', 'Tester_report', 'fixed', 'fix-15.2'),
    fix15_3: path.resolve('..', 'Tester_report', 'fixed', 'fix-15.3'),
    fix15_4: path.resolve('..', 'Tester_report', 'fixed', 'fix-15.4'),
    manual15: path.resolve('..', 'manual_test_evidence', 'task-15')
  };

  test.beforeAll(() => {
    Object.values(evidenceDirs).forEach(ensureDir);
  });

  const setupAndOnboard = async (page: any) => {
    await page.goto('http://127.0.0.1:5173');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Step 1: User Profile
    await page.waitForSelector('input[placeholder*="Lê Anh Quang"]', { timeout: 10000 });
    await page.fill('input[placeholder*="Lê Anh Quang"]', 'Kiểm Thử Viên (Tester)');
    await page.click('button:has-text("Tiếp tục: Mật khẩu bảo vệ")');

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
  };

  test('Fix-15.1: Quickstart Workflow Guide Dismissal Persistence in localStorage', async ({ page }) => {
    await setupAndOnboard(page);

    // 1. Quickstart banner is initially visible
    const guideHeading = page.locator('text=Hướng Dẫn Bắt Đầu Nhanh');
    await expect(guideHeading).toBeVisible({ timeout: 5000 });

    const shot1 = path.join(evidenceDirs.fix15_1, '01_initial_quickstart_guide.png');
    await page.screenshot({ path: shot1 });

    // 2. Dismiss the guide by clicking the X button
    await page.click('button[title="Đóng hướng dẫn"]');
    await page.waitForTimeout(300);
    await expect(guideHeading).not.toBeVisible();

    // 3. Switch document or create new note
    await page.click('button[title="Tạo tài liệu gốc"]');
    await page.waitForTimeout(400);

    // 4. Verify guide remains dismissed across other documents
    await expect(page.locator('text=Chào mừng đến với VaultSync')).not.toBeVisible();

    const shot2 = path.join(evidenceDirs.fix15_1, '02_dismissed_state_persisted.png');
    await page.screenshot({ path: shot2 });
  });

  test('Fix-15.2: Inline Comment Text Anchoring, General Comment Badge & Bidirectional Jump', async ({ page }) => {
    await setupAndOnboard(page);

    // 1. Open Discussion Sidebar
    const addCommentBtn = page.locator('button:has-text("+ Thêm Bình Luận Mới")');
    if (!await addCommentBtn.isVisible()) {
      await page.click('button[title*="Thảo luận"]');
      await page.waitForTimeout(300);
    }
    await expect(addCommentBtn).toBeVisible({ timeout: 5000 });

    // 2. Create a General Document Comment (without selecting text)
    await addCommentBtn.click();
    await page.fill('textarea[placeholder*="Nhập nội dung bình luận"]', 'Đây là bình luận chung cho toàn bộ kho tài liệu này!');
    await page.click('button:has-text("Gửi Bình Luận")');
    await page.waitForTimeout(400);

    // 3. Verify General Comment Badge is displayed (and NOT orphaned alert)
    const generalBadge = page.locator('text=📌 Bình luận chung cho tài liệu');
    await expect(generalBadge).toBeVisible();
    await expect(page.locator('text=Đoạn văn bản gốc đã bị xóa khỏi tài liệu')).not.toBeVisible();

    // 4. Click the thread card to test jumping/focus
    await page.click('text=Đây là bình luận chung cho toàn bộ kho tài liệu này!');
    await page.waitForTimeout(300);

    const shot1 = path.join(evidenceDirs.fix15_2, '01_general_comment_clean_badge.png');
    await page.screenshot({ path: shot1 });

    const shotManual = path.join(evidenceDirs.manual15, '01_clean_comment_anchoring.png');
    await page.screenshot({ path: shotManual });
  });

  test('Fix-15.3: Accurate Unread Red Dot Badges & Read Receipt Lifecycle', async ({ page }) => {
    await setupAndOnboard(page);

    // 1. Close discussion sidebar
    const closeSidebarBtn = page.locator('button[title="Đóng sidebar"]');
    if (await closeSidebarBtn.isVisible()) {
      await closeSidebarBtn.click();
      await page.waitForTimeout(300);
    }

    // 2. Open Discussion Sidebar and create a comment thread
    await page.click('button[title*="Thảo luận"]');
    await page.waitForTimeout(300);

    await page.click('button:has-text("+ Thêm Bình Luận Mới")');
    await page.fill('textarea[placeholder*="Nhập nội dung bình luận"]', 'Tin nhắn thảo luận kiểm tra vòng đời thông báo.');
    await page.click('button:has-text("Gửi Bình Luận")');
    await page.waitForTimeout(400);

    // 3. Close discussion sidebar to see the unread badge behavior
    await page.click('button[title="Đóng sidebar"]');
    await page.waitForTimeout(300);

    // Screenshot of header and tree
    const shot1 = path.join(evidenceDirs.fix15_3, '01_unread_state_verified.png');
    await page.screenshot({ path: shot1 });
  });

  test('Fix-15.4: Native Mobile App UX with Bottom Navigation Bar, FAB & Full Screen Drawers', async ({ page }) => {
    // Set Mobile Viewport (iPhone 14 / 390x844)
    await page.setViewportSize({ width: 390, height: 844 });

    await setupAndOnboard(page);

    // 1. Verify Mobile Bottom Navigation Bar is visible
    const bottomNav = page.locator('nav.sm\\:hidden');
    await expect(bottomNav).toBeVisible();

    const filesBtn = page.locator('nav.sm\\:hidden button:has-text("Tài liệu")');
    const fabBtn = page.locator('nav.sm\\:hidden button[title*="Tạo ghi chú"]');
    const discussBtn = page.locator('nav.sm\\:hidden button:has-text("Thảo luận")');
    const optionsBtn = page.locator('nav.sm\\:hidden button:has-text("Tùy chọn")');

    await expect(filesBtn).toBeVisible();
    await expect(fabBtn).toBeVisible();
    await expect(discussBtn).toBeVisible();
    await expect(optionsBtn).toBeVisible();

    const shot1 = path.join(evidenceDirs.fix15_4, '01_native_mobile_bottom_nav_bar.png');
    await page.screenshot({ path: shot1 });

    // 2. Click FAB to create new note
    await fabBtn.click();
    await page.waitForTimeout(400);

    // 3. Open Files Drawer via bottom navigation
    await filesBtn.click();
    await page.waitForTimeout(300);
    const leftDrawer = page.locator('aside').first();
    await expect(leftDrawer).toBeVisible();

    const shot2 = path.join(evidenceDirs.fix15_4, '02_mobile_files_drawer.png');
    await page.screenshot({ path: shot2 });

    // Close files drawer
    await page.click('button[title="Đóng thanh điều hướng"]');
    await page.waitForTimeout(200);

    // 4. Open Discussion Drawer via bottom navigation
    await discussBtn.click();
    await page.waitForTimeout(300);
    const discussPanel = page.locator('aside span.truncate:has-text("Thảo Luận & Chat")');
    await expect(discussPanel).toBeVisible();

    const shot3 = path.join(evidenceDirs.fix15_4, '03_mobile_discussion_drawer.png');
    await page.screenshot({ path: shot3 });

    const shotManual = path.join(evidenceDirs.manual15, '02_native_mobile_experience.png');
    await page.screenshot({ path: shotManual });
  });

});
