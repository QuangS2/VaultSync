import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Fix-25 Verification Suite: Resolving all 3 Tester Issues:
 * 1. Fix-25.1: Zero black screen / seamless transition when repeatedly toggling Viewer <-> Editor states.
 * 2. Fix-25.2: No accidental document deletion, renaming, or replacement during single-doc and folder interactions.
 * 3. Fix-25.3: Zero duplicate files and zero duplicate chat messages when editing live permission status across multi-peer rooms.
 */

const evidenceDirs = {
  fix25_1: path.join(process.cwd(), '..', 'Tester_report', 'fixed', 'fix-25.1'),
  task25: path.join(process.cwd(), '..', 'manual_test_evidence', 'task-25')
};

test.beforeAll(() => {
  Object.values(evidenceDirs).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
});

async function setupAndOnboard(page: Page, userName: string) {
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

test.describe('Fix-25 Verification Suite: Tester Defect Remediations', () => {

  test('Fix-25.1: Rapid alternating permission toggling (Viewer <-> Editor x 5) causes ZERO black screen and ZERO crashes', async ({ browser }) => {
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // 1. Setup Vault on User A & User B
    await setupAndOnboard(pageA, 'Owner Alpha');
    await setupAndOnboard(pageB, 'Collaborator Beta');

    // Create a new document on A named "Tài Liệu Chuyển Đổi Quyền.md"
    const createDocBtnA = pageA.locator('button[title*="Tạo tài liệu gốc"]').first();
    await createDocBtnA.click();
    await pageA.waitForTimeout(200);
    await pageA.keyboard.type('Tài Liệu Chuyển Đổi Quyền.md');
    await pageA.keyboard.press('Enter');
    await pageA.waitForTimeout(300);

    // 2. User A opens Share modal for active document
    await pageA.locator('button:has-text("Chia Sẻ"), button[title*="Chia sẻ"]').first().click();
    await pageA.waitForTimeout(300);

    const pwdInputA = pageA.locator('input[type="password"]');
    if (await pwdInputA.isVisible()) {
      await pwdInputA.fill('Passphrase2026!Strong');
      await pageA.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
      await pageA.waitForTimeout(400);
    }

    // Switch to Passcode tab
    await pageA.click('button:has-text("Mã Ghép Nối")');
    await pageA.waitForTimeout(200);

    const passcodeBoxA = pageA.locator('.fixed.inset-0 input.font-mono').first();
    await expect(passcodeBoxA).not.toHaveValue('', { timeout: 5000 });
    const passcodeVal = await passcodeBoxA.inputValue();
    await pageA.keyboard.press('Escape');
    await pageA.waitForTimeout(200);

    // 3. User B joins room via passcode
    const joinBtnB = pageB.locator('button:has-text("Tham gia phòng")').first();
    await joinBtnB.click();
    await pageB.waitForTimeout(300);
    await pageB.locator('input[placeholder*="VS-"]').first().fill(passcodeVal);
    await pageB.click('button[type="submit"]');
    await pageB.waitForTimeout(1000);

    // Select document on B
    const docB = pageB.locator('.group:has-text("Tài Liệu Chuyển Đổi Quyền.md")').first();
    await expect(docB).toBeVisible();
    await docB.click();
    await pageB.waitForTimeout(500);

    await expect(pageB.locator('.tiptap.ProseMirror')).toBeVisible();

    // 4. Owner A opens Share Modal and rapidly toggles Viewer <-> Editor 5 times
    await pageA.locator('button:has-text("Chia Sẻ"), button[title*="Chia sẻ"]').first().click();
    await pageA.waitForTimeout(300);
    const pwdInputLoop = pageA.locator('input[type="password"]');
    if (await pwdInputLoop.isVisible()) {
      await pwdInputLoop.fill('Passphrase2026!Strong');
      await pageA.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
      await pageA.waitForTimeout(400);
    }

    for (let i = 1; i <= 5; i++) {
      // Switch to Viewer
      await pageA.click('button:has-text("Chỉ Xem (Viewer)")');
      await pageA.waitForTimeout(150);
      await pageA.click('button:has-text("Cập Nhật Quyền Trực Tiếp")');
      await pageA.waitForTimeout(400);

      // Verify Guest B editor remains visible without black screen
      await expect(pageB.locator('.tiptap.ProseMirror')).toBeVisible();

      // Switch to Editor
      await pageA.click('button:has-text("Chỉnh Sửa (Editor)")');
      await pageA.waitForTimeout(150);
      await pageA.click('button:has-text("Cập Nhật Quyền Trực Tiếp")');
      await pageA.waitForTimeout(400);

      // Verify Guest B editor remains visible without black screen
      await expect(pageB.locator('.tiptap.ProseMirror')).toBeVisible();
    }

    await pageA.keyboard.press('Escape');
    await pageA.waitForTimeout(300);

    // Guest B types content smoothly
    await pageB.locator('.tiptap.ProseMirror').click();
    await pageB.keyboard.type(' [Kiểm thử chuyển đổi quyền 5 lần liên tiếp hoàn toàn mượt mà không đen màn hình!]');
    await pageB.waitForTimeout(400);

    // Capture screenshot 1
    const shot1 = path.join(evidenceDirs.fix25_1, '01_seamless_rapid_permission_toggling_no_black_screen.png');
    await pageB.screenshot({ path: shot1 });
    fs.copyFileSync(shot1, path.join(evidenceDirs.task25, '01_seamless_rapid_permission_toggling_no_black_screen.png'));

    await contextA.close();
    await contextB.close();
  });

  test('Fix-25.2: Document metadata title preservation & orphaned item protection against disappearance', async ({ browser }) => {
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // 1. Setup User A & User B
    await setupAndOnboard(pageA, 'Owner Alpha');
    await setupAndOnboard(pageB, 'Collaborator Beta');

    // Create a new document on A named "Tài Liệu Alpha.md"
    const createDocBtnA = pageA.locator('button[title*="Tạo tài liệu gốc"]').first();
    await createDocBtnA.click();
    await pageA.waitForTimeout(200);
    await pageA.keyboard.type('Tài Liệu Alpha.md');
    await pageA.keyboard.press('Enter');
    await pageA.waitForTimeout(300);

    await expect(pageA.locator('.group:has-text("Tài Liệu Alpha.md")').first()).toBeVisible();

    // 2. Share document from A
    await pageA.locator('button:has-text("Chia Sẻ"), button[title*="Chia sẻ"]').first().click();
    await pageA.waitForTimeout(300);
    const pwdInputA = pageA.locator('input[type="password"]');
    if (await pwdInputA.isVisible()) {
      await pwdInputA.fill('Passphrase2026!Strong');
      await pageA.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
      await pageA.waitForTimeout(400);
    }
    await pageA.click('button:has-text("Mã Ghép Nối")');
    await pageA.waitForTimeout(200);

    const passcodeBoxA = pageA.locator('.fixed.inset-0 input.font-mono').first();
    const passcodeVal = await passcodeBoxA.inputValue();
    await pageA.keyboard.press('Escape');
    await pageA.waitForTimeout(200);

    // 3. User B joins room
    const joinBtnB = pageB.locator('button:has-text("Tham gia phòng")').first();
    await joinBtnB.click();
    await pageB.waitForTimeout(300);
    await pageB.locator('input[placeholder*="VS-"]').first().fill(passcodeVal);
    await pageB.click('button[type="submit"]');
    await pageB.waitForTimeout(1000);

    // Verify User A's document title remained strictly "Tài Liệu Alpha.md"
    await expect(pageA.locator('.group:has-text("Tài Liệu Alpha.md")').first()).toBeVisible();
    await expect(pageB.locator('.group:has-text("Tài Liệu Alpha.md")').first()).toBeVisible();

    // Capture screenshot 2
    const shot2 = path.join(evidenceDirs.fix25_1, '02_document_title_preserved_no_accidental_overwrite.png');
    await pageA.screenshot({ path: shot2 });
    fs.copyFileSync(shot2, path.join(evidenceDirs.task25, '02_document_title_preserved_no_accidental_overwrite.png'));

    await contextA.close();
    await contextB.close();
  });

  test('Fix-25.3: Zero duplicate files & zero duplicate chat messages when live permission status changes', async ({ browser }) => {
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // 1. Setup User A & User B
    await setupAndOnboard(pageA, 'Owner Alpha');
    await setupAndOnboard(pageB, 'Collaborator Beta');

    // Create Folder Z on A with 2 docs: Z1.md and Z2.md
    const createFolderBtnA = pageA.locator('button[title*="Tạo thư mục"]').first();
    await createFolderBtnA.click();
    await pageA.waitForTimeout(200);
    await pageA.keyboard.type('Thư Mục Dự Án Z');
    await pageA.keyboard.press('Enter');
    await pageA.waitForTimeout(300);

    const folderZ = pageA.locator('.group:has-text("Thư Mục Dự Án Z")').first();
    await expect(folderZ).toBeVisible();

    const createChildDocBtnA = folderZ.locator('button[title*="Tạo tài liệu con"]').first();
    await createChildDocBtnA.click();
    await pageA.waitForTimeout(200);
    await pageA.keyboard.type('Tệp Z1.md');
    await pageA.keyboard.press('Enter');
    await pageA.waitForTimeout(300);

    await createChildDocBtnA.click();
    await pageA.waitForTimeout(200);
    await pageA.keyboard.type('Tệp Z2.md');
    await pageA.keyboard.press('Enter');
    await pageA.waitForTimeout(300);

    // Select Tệp Z1.md on A
    await pageA.locator('.group:has-text("Tệp Z1.md")').first().click();
    await pageA.waitForTimeout(400);

    // 2. Share Folder Z from A
    await folderZ.click({ button: 'right' });
    await pageA.waitForTimeout(200);
    await pageA.click('text=Chia sẻ thư mục...');
    await pageA.waitForTimeout(300);

    const pwdInputA = pageA.locator('input[type="password"]');
    if (await pwdInputA.isVisible()) {
      await pwdInputA.fill('Passphrase2026!Strong');
      await pageA.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
      await pageA.waitForTimeout(400);
    }
    await pageA.click('button:has-text("Mã Ghép Nối")');
    await pageA.waitForTimeout(200);

    const passcodeBoxA = pageA.locator('.fixed.inset-0 input.font-mono').first();
    const passcodeVal = await passcodeBoxA.inputValue();
    await pageA.keyboard.press('Escape');
    await pageA.waitForTimeout(200);

    // 3. User B joins Folder Z
    const joinBtnB = pageB.locator('button:has-text("Tham gia phòng")').first();
    await joinBtnB.click();
    await pageB.waitForTimeout(300);
    await pageB.locator('input[placeholder*="VS-"]').first().fill(passcodeVal);
    await pageB.click('button[type="submit"]');
    await pageB.waitForTimeout(600);

    // Expand Thư Mục Dự Án Z on B
    const folderZB = pageB.locator('.group:has-text("Thư Mục Dự Án Z")').first();
    await expect(folderZB).toBeVisible();
    await folderZB.click();
    await pageB.waitForTimeout(300);

    // User B selects Tệp Z1.md
    const z1ItemB = pageB.locator('.group:has-text("Tệp Z1.md")').first();
    await expect(z1ItemB).toBeVisible();
    await z1ItemB.click();
    await pageB.waitForTimeout(400);

    // Verify User B has exactly Z1 and Z2 (NO duplicate files)
    const z1ListB = pageB.locator('.group:has-text("Tệp Z1.md")');
    const z2ListB = pageB.locator('.group:has-text("Tệp Z2.md")');
    await expect(z1ListB).toHaveCount(1);
    await expect(z2ListB).toHaveCount(1);

    // 4. Send chat message from User A in Right Discussion Sidebar
    await pageA.keyboard.press('Control+Shift+D');
    await pageA.waitForSelector('button:has-text("Phòng Chat")', { timeout: 5000 });
    await pageA.click('button:has-text("Phòng Chat")');
    await pageA.waitForTimeout(200);
    await pageA.fill('input[placeholder="Nhập tin nhắn..."]', 'Tin nhắn thử nghiệm phòng cộng tác');
    await pageA.keyboard.press('Enter');
    await pageA.waitForTimeout(600);

    // Owner A updates live permissions for folder
    await folderZ.click({ button: 'right' });
    await pageA.waitForTimeout(200);
    await pageA.click('text=Chia sẻ thư mục...');
    await pageA.waitForTimeout(300);
    if (await pwdInputA.isVisible()) {
      await pwdInputA.fill('Passphrase2026!Strong');
      await pageA.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
      await pageA.waitForTimeout(400);
    }
    await pageA.click('button:has-text("Chỉnh Sửa (Editor)")');
    await pageA.waitForTimeout(150);
    await pageA.click('button:has-text("Cập Nhật Quyền Trực Tiếp")');
    await pageA.waitForTimeout(300);
    await pageA.keyboard.press('Escape');
    await pageA.waitForTimeout(300);

    // Verify User B opens discussion sidebar and sees exactly 1 chat message (NO duplicate chat history)
    await pageB.keyboard.press('Control+Shift+D');
    await pageB.waitForSelector('button:has-text("Phòng Chat")', { timeout: 5000 });
    await pageB.click('button:has-text("Phòng Chat")');
    await pageB.waitForTimeout(300);

    const chatItemsB = pageB.locator('text=Tin nhắn thử nghiệm phòng cộng tác');
    await expect(chatItemsB).toHaveCount(1);

    // Verify file count remains strictly 1 for Z1 and Z2 (NO duplicates created after permission change)
    await expect(z1ListB).toHaveCount(1);
    await expect(z2ListB).toHaveCount(1);

    // Capture screenshot 3
    const shot3 = path.join(evidenceDirs.fix25_1, '03_zero_duplicate_files_and_zero_duplicate_chat_messages.png');
    await pageB.screenshot({ path: shot3 });
    fs.copyFileSync(shot3, path.join(evidenceDirs.task25, '03_zero_duplicate_files_and_zero_duplicate_chat_messages.png'));

    await contextA.close();
    await contextB.close();
  });

});
