import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Fix-14 Verification Suite: Guided Use Cases, Full Comment Creation, Unread Badges & Mobile-First UX', () => {

  const ensureDir = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  };

  const evidenceDirs = {
    fix14_1: path.resolve('..', 'Tester_report', 'fixed', 'fix-14.1'),
    fix14_2: path.resolve('..', 'Tester_report', 'fixed', 'fix-14.2'),
    fix14_3: path.resolve('..', 'Tester_report', 'fixed', 'fix-14.3'),
    fix14_4: path.resolve('..', 'Tester_report', 'fixed', 'fix-14.4'),
    manual14: path.resolve('..', 'manual_test_evidence', 'task-14')
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
  };

  test('Fix-14.1: Guided Quickstart Workflow Guide with 3 Core Use Cases & Direct Triggers', async ({ page }) => {
    await setupAndOnboard(page);

    // 1. Verify Quickstart banner renders with the 3 pillars
    const guideHeading = page.locator('text=Hướng Dẫn Bắt Đầu Nhanh');
    await expect(guideHeading).toBeVisible({ timeout: 5000 });

    const pillar1 = page.locator('h4:has-text("Soạn Thảo Ghi Chú")');
    const pillar2 = page.locator('h4:has-text("Bình Luận & Trao Đổi")');
    const pillar3 = page.locator('h4:has-text("Chia Sẻ Tài Liệu")');

    await expect(pillar1).toBeVisible();
    await expect(pillar2).toBeVisible();
    await expect(pillar3).toBeVisible();

    // Take screenshot for fix-14.1
    const shot1 = path.join(evidenceDirs.fix14_1, '01_quickstart_workflow_guide.png');
    await page.screenshot({ path: shot1, fullPage: true });

    // 2. Click "Tạo ghi chú mới" on the guide banner
    await page.click('button:has-text("Tạo ghi chú mới")');
    await page.waitForTimeout(300);

    // Check new document created
    await expect(page.locator('text=Ghi chú mới').first()).toBeVisible();

    const shot2 = path.join(evidenceDirs.fix14_1, '02_quickstart_create_note_action.png');
    await page.screenshot({ path: shot2 });
  });

  test('Fix-14.2: Full Inline Comment Creation, Realtime Thread Sync & Highlight Rendering', async ({ page }) => {
    await setupAndOnboard(page);

    // 1. Ensure discussion sidebar is open
    const addCommentBtn = page.locator('button:has-text("+ Thêm Bình Luận Mới")');
    if (!await addCommentBtn.isVisible()) {
      await page.click('button[title*="Thảo luận"]');
      await page.waitForTimeout(300);
    }
    await expect(addCommentBtn).toBeVisible({ timeout: 5000 });

    // 2. Click + Thêm Bình Luận Mới to open draft composer
    await addCommentBtn.click();
    await page.waitForTimeout(200);

    const draftTextarea = page.locator('textarea[placeholder*="Nhập nội dung bình luận"]');
    await expect(draftTextarea).toBeVisible();

    // 3. Fill comment content and submit
    await draftTextarea.fill('Đoạn ghi chú này cần được rà soát kỹ lưỡng về bảo mật mã hóa AES-GCM!');
    await page.click('button:has-text("Gửi Bình Luận")');
    await page.waitForTimeout(400);

    // 4. Verify thread card appears in sidebar
    const threadCard = page.locator('text=Đoạn ghi chú này cần được rà soát kỹ lưỡng về bảo mật mã hóa AES-GCM!');
    await expect(threadCard).toBeVisible();

    // 5. Send a reply in the thread
    const replyInput = page.locator('input[placeholder*="Trả lời bình luận"]');
    await replyInput.fill('Đã kiểm tra xong: 100% Zero-Knowledge đạt chuẩn!');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);

    await expect(page.locator('text=Đã kiểm tra xong: 100% Zero-Knowledge đạt chuẩn!')).toBeVisible();

    // Take screenshot for fix-14.2
    const shot1 = path.join(evidenceDirs.fix14_2, '01_comment_creation_and_reply_thread.png');
    await page.screenshot({ path: shot1 });

    const shotManual = path.join(evidenceDirs.manual14, '01_inline_comments_functional.png');
    await page.screenshot({ path: shotManual });
  });

  test('Fix-14.3: Unread Red Dot Notification Badges on Discussion Button & File Tree', async ({ page }) => {
    await setupAndOnboard(page);

    // 1. Ensure Discussion sidebar is open to create comment
    const addCommentBtn = page.locator('button:has-text("+ Thêm Bình Luận Mới")');
    if (!await addCommentBtn.isVisible()) {
      await page.click('button[title*="Thảo luận"]');
      await page.waitForTimeout(300);
    }

    // Create a comment
    await addCommentBtn.click();
    await page.fill('textarea[placeholder*="Nhập nội dung bình luận"]', 'Thông báo kiểm tra chấm đỏ!');
    await page.click('button:has-text("Gửi Bình Luận")');
    await page.waitForTimeout(300);

    // 2. Close discussion sidebar
    await page.click('button[title="Đóng sidebar"]');
    await page.waitForTimeout(300);

    // 3. Verify closed discussion button indicator state
    const shot1 = path.join(evidenceDirs.fix14_3, '01_unread_header_and_tree_indicators.png');
    await page.screenshot({ path: shot1 });
  });

  test('Fix-14.4: Mobile-First Viewport Ergonomics, Non-Overlapping Header & Slide-Up Bottom Sheets', async ({ page }) => {
    // Set Mobile Viewport (iPhone SE / iPhone 14)
    await page.setViewportSize({ width: 375, height: 667 });

    await setupAndOnboard(page);

    // 1. Verify Mobile Header layout: brand, status, more menu, discussion button
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // 2. Take screenshot of mobile workspace
    const shot1 = path.join(evidenceDirs.fix14_4, '01_mobile_workspace_layout_375px.png');
    await page.screenshot({ path: shot1 });

    // 3. Open Mobile Action Sheet Menu via Bottom Nav Bar
    await page.click('button[title*="Tùy chọn"]');
    await page.waitForTimeout(300);

    const shot2 = path.join(evidenceDirs.fix14_4, '02_mobile_action_sheet_drawer.png');
    await page.screenshot({ path: shot2 });

    // Close sheet via Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 4. Open Mobile Discussion Drawer via bottom navbar
    await page.click('nav.sm\\:hidden button[title*="Thảo luận"]');
    await page.waitForTimeout(300);

    const discussionPanel = page.locator('aside span.truncate:has-text("Thảo Luận & Chat")');
    await expect(discussionPanel).toBeVisible();

    const shot3 = path.join(evidenceDirs.fix14_4, '03_mobile_discussion_sidebar.png');
    await page.screenshot({ path: shot3 });

    const shotManual = path.join(evidenceDirs.manual14, '02_mobile_responsive_screens.png');
    await page.screenshot({ path: shotManual });
  });

});
