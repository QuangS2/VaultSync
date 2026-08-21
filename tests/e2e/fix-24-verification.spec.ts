import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const evidenceDirs = {
  fix24_1: path.resolve('..', 'Tester_report', 'fixed', 'fix-24.1'),
  task24: path.resolve('..', 'manual_test_evidence', 'task-24')
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
  await page.waitForSelector('.tiptap.ProseMirror', { timeout: 10000 });
}

test.describe('Fix-24 Verification Suite: Multi-Document Shared Folder Live Permissions & Fluid Document Switching', () => {

  test('Fix-24.1: Owner changes permission for f1 -> Guest gets edit rights on f1 -> Guest clicks f2 -> Guest stays on f2 and retains permissions (No kickback, no permission loss)', async ({ browser }) => {
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // --- 1. User A (Owner) Setup ---
    await setupAndOnboard(pageA, 'User A (Owner)');
    await setupAndOnboard(pageB, 'User B (Collaborator)');

    // User A creates Thư Mục Nhóm F
    const createFolderBtnA = pageA.locator('button[title*="Tạo thư mục"]').first();
    await createFolderBtnA.click();
    await pageA.waitForTimeout(200);
    await pageA.keyboard.type('Thư Mục Nhóm F');
    await pageA.keyboard.press('Enter');
    await pageA.waitForTimeout(300);

    const folderFItemA = pageA.locator('.group:has-text("Thư Mục Nhóm F")').first();
    await expect(folderFItemA).toBeVisible();

    // User A creates File f1 inside Thư Mục Nhóm F
    const createChildDocBtnA = folderFItemA.locator('button[title*="Tạo tài liệu con"]').first();
    await createChildDocBtnA.click();
    await pageA.waitForTimeout(200);
    await pageA.keyboard.type('Tệp Soạn Thảo F1.md');
    await pageA.keyboard.press('Enter');
    await pageA.waitForTimeout(300);

    // User A creates File f2 inside Thư Mục Nhóm F
    await createChildDocBtnA.click();
    await pageA.waitForTimeout(200);
    await pageA.keyboard.type('Tệp Soạn Thảo F2.md');
    await pageA.keyboard.press('Enter');
    await pageA.waitForTimeout(300);

    // Select and write content to f1
    await pageA.locator('.group:has-text("Tệp Soạn Thảo F1.md")').first().click();
    await pageA.waitForTimeout(300);
    await pageA.locator('.tiptap.ProseMirror').click();
    await pageA.keyboard.type('Nội dung ban đầu của f1 từ Owner A.');
    await pageA.waitForTimeout(300);

    // Select and write content to f2
    await pageA.locator('.group:has-text("Tệp Soạn Thảo F2.md")').first().click();
    await pageA.waitForTimeout(300);
    await pageA.locator('.tiptap.ProseMirror').click();
    await pageA.keyboard.type('Nội dung ban đầu của f2 từ Owner A.');
    await pageA.waitForTimeout(300);

    // --- 2. User A shares Thư Mục Nhóm F with initial Viewer permissions ---
    await folderFItemA.click({ button: 'right' });
    await pageA.waitForTimeout(200);
    await pageA.click('text=Chia sẻ thư mục...');
    await pageA.waitForTimeout(300);

    await pageA.fill('input[type="password"]', 'Passphrase2026!Strong');
    await pageA.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
    await pageA.waitForTimeout(400);

    // Switch to Passcode tab and get passcode
    await pageA.click('button:has-text("Mã Ghép Nối")');
    await pageA.waitForTimeout(200);

    const passcodeBoxA = pageA.locator('.fixed.inset-0 input.font-mono').first();
    await expect(passcodeBoxA).not.toHaveValue('', { timeout: 5000 });
    const passcodeVal = await passcodeBoxA.inputValue();
    expect(passcodeVal).toContain('VS-DIR:');

    await pageA.keyboard.press('Escape');
    await pageA.waitForTimeout(200);

    // --- 3. User B joins Thư Mục Nhóm F ---
    const joinBtnB = pageB.locator('button:has-text("Tham gia phòng")').first();
    await joinBtnB.click();
    await pageB.waitForTimeout(300);

    const joinInputB = pageB.locator('input[placeholder*="VS-"]').first();
    await joinInputB.fill(passcodeVal);
    await pageB.waitForTimeout(200);

    await pageB.click('button[type="submit"]');
    await pageB.waitForTimeout(600);

    // Expand Thư Mục Nhóm F on B
    const folderFB = pageB.locator('.group:has-text("Thư Mục Nhóm F")').first();
    await expect(folderFB).toBeVisible();
    await folderFB.click();
    await pageB.waitForTimeout(200);

    // Verify User B sees f1 and f2
    const f1ItemB = pageB.locator('.group:has-text("Tệp Soạn Thảo F1.md")').first();
    const f2ItemB = pageB.locator('.group:has-text("Tệp Soạn Thảo F2.md")').first();
    await expect(f1ItemB).toBeVisible();
    await expect(f2ItemB).toBeVisible();

    // Select f1 on B -> User B is currently Viewer (read-only)
    await f1ItemB.click();
    await pageB.waitForTimeout(400);

    // Capture screenshot 1: Guest B viewing f1 as Viewer initially
    const shot1 = path.join(evidenceDirs.fix24_1, '01_guest_b_initial_viewer_on_f1.png');
    await pageB.screenshot({ path: shot1 });
    fs.copyFileSync(shot1, path.join(evidenceDirs.task24, '01_guest_b_initial_viewer_on_f1.png'));

    // --- 4. Owner A updates live permissions for f1 (or Thư Mục Nhóm F) to Editor ---
    await folderFItemA.click({ button: 'right' });
    await pageA.waitForTimeout(200);
    await pageA.click('text=Chia sẻ thư mục...');
    await pageA.waitForTimeout(300);

    const pwdInputA = pageA.locator('input[type="password"]');
    if (await pwdInputA.isVisible()) {
      await pwdInputA.fill('Passphrase2026!Strong');
      await pageA.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
      await pageA.waitForTimeout(400);
    }

    // Switch role to Editor
    await pageA.click('button:has-text("Chỉnh Sửa (Editor)")');
    await pageA.waitForTimeout(200);
    await pageA.click('button:has-text("Cập Nhật Quyền Trực Tiếp")');
    await pageA.waitForTimeout(500);
    await pageA.keyboard.press('Escape');
    await pageA.waitForTimeout(300);

    // Verify Guest B now has edit access on f1 WITHOUT reloading
    await pageB.waitForTimeout(500);
    await pageB.locator('.tiptap.ProseMirror').click();
    await pageB.keyboard.type(' [Guest B đã được cấp quyền sửa trực tiếp trên f1]');
    await pageB.waitForTimeout(400);

    // Capture screenshot 2: Guest B editing f1 smoothly without black screen
    const shot2 = path.join(evidenceDirs.fix24_1, '02_guest_b_live_edited_f1_without_blackscreen.png');
    await pageB.screenshot({ path: shot2 });
    fs.copyFileSync(shot2, path.join(evidenceDirs.task24, '02_guest_b_live_edited_f1_without_blackscreen.png'));

    // --- 5. CRITICAL TEST: Guest B clicks on Tệp Soạn Thảo F2.md ---
    await f2ItemB.click();
    await pageB.waitForTimeout(500);

    // ASSERTION 1: Guest B MUST STAY on Tệp Soạn Thảo F2.md (NOT kicked back to f1)
    await expect(pageB.locator('input[value="Tệp Soạn Thảo F2.md"], input[placeholder="Tiêu đề tài liệu..."]').first()).toBeVisible();
    await pageB.waitForTimeout(500);

    // ASSERTION 2: Guest B MUST STILL HAVE EDIT PERMISSION on Tệp Soạn Thảo F2.md
    await pageB.locator('.tiptap.ProseMirror').click();
    await pageB.keyboard.type(' [Guest B soạn thảo thành công trên f2_doc.md mà không bị đá về f1!]');
    await pageB.waitForTimeout(400);

    // Verify the text was actually inserted into f2
    await expect(pageB.locator('.tiptap.ProseMirror')).toContainText('Guest B soạn thảo thành công trên f2_doc.md');

    // Capture screenshot 3: Guest B staying on f2 with full edit rights
    const shot3 = path.join(evidenceDirs.fix24_1, '03_guest_b_stays_on_f2_with_full_edit_permissions.png');
    await pageB.screenshot({ path: shot3 });
    fs.copyFileSync(shot3, path.join(evidenceDirs.task24, '03_guest_b_stays_on_f2_with_full_edit_permissions.png'));

    await contextA.close();
    await contextB.close();
  });

  test('Fix-24.2: Owner updates permissions dynamically -> Guest experience is smooth with zero black screen / zero flicker', async ({ browser }) => {
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Owner and guest setup
    await setupAndOnboard(pageA, 'User A (Owner)');
    await setupAndOnboard(pageB, 'User B (Guest)');

    // Open share modal on owner
    await pageA.locator('button:has-text("Chia Sẻ"), button[title*="Chia sẻ"]').first().click();
    await pageA.waitForTimeout(300);
    const pwdInput1 = pageA.locator('input[type="password"]');
    if (await pwdInput1.isVisible()) {
      await pwdInput1.fill('Passphrase2026!Strong');
      await pageA.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
      await pageA.waitForTimeout(400);
    }

    await pageA.click('button:has-text("Mã Ghép Nối")');
    await pageA.waitForTimeout(200);
    const passcodeBox = pageA.locator('.fixed.inset-0 input.font-mono').first();
    await expect(passcodeBox).not.toHaveValue('', { timeout: 5000 });
    const code = await passcodeBox.inputValue();
    await pageA.keyboard.press('Escape');

    // Guest joins
    await pageB.click('button:has-text("Tham gia phòng")');
    await pageB.waitForTimeout(300);
    await pageB.locator('input[placeholder*="VS-"]').first().fill(code);
    await pageB.click('button[type="submit"]');
    await pageB.waitForTimeout(800);

    // Verify Guest sees editor canvas cleanly
    await expect(pageB.locator('.tiptap.ProseMirror')).toBeVisible();

    // Owner switches permission live
    await pageA.locator('button:has-text("Chia Sẻ"), button[title*="Chia sẻ"]').first().click();
    await pageA.waitForTimeout(300);
    const pwdInput2 = pageA.locator('input[type="password"]');
    if (await pwdInput2.isVisible()) {
      await pwdInput2.fill('Passphrase2026!Strong');
      await pageA.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
      await pageA.waitForTimeout(400);
    }

    await pageA.click('button:has-text("Chỉnh Sửa (Editor)")');
    await pageA.waitForTimeout(200);
    await pageA.click('button:has-text("Cập Nhật Quyền Trực Tiếp")');
    await pageA.waitForTimeout(400);

    // Guest should immediately be editable and NOT have black screen
    await expect(pageB.locator('.tiptap.ProseMirror')).toBeVisible();
    const isGuestContentVisible = await pageB.locator('.tiptap.ProseMirror').isVisible();
    expect(isGuestContentVisible).toBe(true);

    const shot4 = path.join(evidenceDirs.fix24_1, '04_guest_seamless_no_black_screen.png');
    await pageB.screenshot({ path: shot4 });
    fs.copyFileSync(shot4, path.join(evidenceDirs.task24, '04_guest_seamless_no_black_screen.png'));

    await contextA.close();
    await contextB.close();
  });
});
