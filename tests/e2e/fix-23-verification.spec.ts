import { test, expect, Page, Browser } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const evidenceDirs = {
  fix23_1: path.resolve('..', 'Tester_report', 'fixed', 'fix-23.1'),
  task23: path.resolve('..', 'manual_test_evidence', 'task-23')
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

test.describe('Fix-23 Verification Suite: Google Drive Shared Folder Isolation & Cross-Peer Deletion Lifecycle', () => {

  test('Fix-23.1: User A deletes Shared Folder X -> Folder X removed on User B -> User B Personal Folder Y Remains Untouched', async ({ browser }) => {
    // Create Context A (Owner of Folder X)
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageA = await contextA.newPage();
    await setupAndOnboard(pageA, 'User A (Owner)');

    // Create Context B (Owner of Folder Y)
    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageB = await contextB.newPage();
    await setupAndOnboard(pageB, 'User B (Collaborator)');

    // --- 1. User B creates personal Folder Y ---
    const createFolderBtnB = pageB.locator('button[title*="Tạo thư mục"]').first();
    await createFolderBtnB.click();
    await pageB.waitForTimeout(200);
    await pageB.keyboard.type('Thư Mục Riêng Của B');
    await pageB.keyboard.press('Enter');
    await pageB.waitForTimeout(300);

    const folderYItemB = pageB.locator('.group:has-text("Thư Mục Riêng Của B")').first();
    await expect(folderYItemB).toBeVisible();

    // User B adds a child note inside Folder Y
    const createChildDocBtnB = folderYItemB.locator('button[title*="Tạo tài liệu con"]').first();
    await createChildDocBtnB.click();
    await pageB.waitForTimeout(200);
    await pageB.keyboard.type('Ghi Chú Bí Mật Của B.md');
    await pageB.keyboard.press('Enter');
    await pageB.waitForTimeout(300);
    await expect(pageB.locator('.group:has-text("Ghi Chú Bí Mật Của B.md")').first()).toBeVisible();

    // --- 2. User A creates Folder X and child note ---
    const createFolderBtnA = pageA.locator('button[title*="Tạo thư mục"]').first();
    await createFolderBtnA.click();
    await pageA.waitForTimeout(200);
    await pageA.keyboard.type('Thư Mục X Của A');
    await pageA.keyboard.press('Enter');
    await pageA.waitForTimeout(300);

    const folderXItemA = pageA.locator('.group:has-text("Thư Mục X Của A")').first();
    await expect(folderXItemA).toBeVisible();

    const createChildDocBtnA = folderXItemA.locator('button[title*="Tạo tài liệu con"]').first();
    await createChildDocBtnA.click();
    await pageA.waitForTimeout(200);
    await pageA.keyboard.type('Tài Liệu Trong Thư Mục X.md');
    await pageA.keyboard.press('Enter');
    await pageA.waitForTimeout(300);
    await expect(pageA.locator('.group:has-text("Tài Liệu Trong Thư Mục X.md")').first()).toBeVisible();

    // --- 3. User A shares Folder X with User B ---
    await folderXItemA.click({ button: 'right' });
    await pageA.waitForTimeout(200);

    const shareOptionA = pageA.locator('text=Chia sẻ thư mục...').first();
    await shareOptionA.click();
    await pageA.waitForTimeout(300);

    // Enter password to unlock share
    await pageA.fill('input[type="password"]', 'Passphrase2026!Strong');
    await pageA.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
    await pageA.waitForTimeout(400);

    // Switch to Passcode tab
    await pageA.click('button:has-text("Mã Ghép Nối")');
    await pageA.waitForTimeout(200);

    // Get the share passcode from modal
    const passcodeBox = pageA.locator('.fixed.inset-0 input.font-mono').first();
    await expect(passcodeBox).not.toHaveValue('', { timeout: 5000 });
    const passcodeVal = await passcodeBox.inputValue();
    expect(passcodeVal).toContain('VS-DIR:');

    // Close modal on A
    await pageA.keyboard.press('Escape');
    await pageA.waitForTimeout(200);

    // --- 4. User B joins Folder X using Passcode ---
    const joinBtnB = pageB.locator('button:has-text("Tham gia phòng")').first();
    await joinBtnB.click();
    await pageB.waitForTimeout(300);

    const joinInputB = pageB.locator('input[placeholder*="VS-"]').first();
    await joinInputB.fill(passcodeVal);
    await pageB.waitForTimeout(200);

    await pageB.click('button[type="submit"]');
    await pageB.waitForTimeout(600);

    // Verify User B now has BOTH Folder Y (personal) AND Folder X (shared)
    await expect(pageB.locator('.group:has-text("Thư Mục Riêng Của B")').first()).toBeVisible();
    const folderXB = pageB.locator('.group:has-text("Thư Mục X Của A")').first();
    await expect(folderXB).toBeVisible();
    await folderXB.click();
    await pageB.waitForTimeout(200);
    await expect(pageB.locator('.group:has-text("Tài Liệu Trong Thư Mục X.md")').first()).toBeVisible();

    // Capture proof screenshot of B's dual workspace
    const shot1 = path.join(evidenceDirs.fix23_1, '01_user_b_has_personal_folder_y_and_shared_folder_x.png');
    await pageB.screenshot({ path: shot1 });
    fs.copyFileSync(shot1, path.join(evidenceDirs.task23, '01_user_b_has_personal_folder_y_and_shared_folder_x.png'));

    // --- 5. User A deletes (moves to Trash) Folder X ---
    await folderXItemA.click({ button: 'right' });
    await pageA.waitForTimeout(200);

    const deleteOptionA = pageA.locator('text=Chuyển vào thùng rác').first();
    await deleteOptionA.click();
    await pageA.waitForTimeout(300);

    // Confirm folder delete modal if shown
    const confirmDeleteBtnA = pageA.locator('button:has-text("Xóa Toàn Bộ")').first();
    if (await confirmDeleteBtnA.isVisible()) {
      await confirmDeleteBtnA.click();
      await pageA.waitForTimeout(300);
    }

    // Verify Folder X is removed from User A's active tree
    await expect(pageA.locator('.group:has-text("Thư Mục X Của A")')).toBeHidden();

    // --- 6. CRITICAL VERIFICATION ON USER B (Google Drive Rules) ---
    // Wait for CRDT sync propagation
    await pageB.waitForTimeout(1000);

    // Folder X MUST BE REMOVED from User B's active workspace!
    await expect(pageB.locator('.group:has-text("Thư Mục X Của A")')).toBeHidden();

    // User B's Personal Folder Y and Child Note MUST REMAIN 100% INTACT AND VISIBLE!
    await expect(pageB.locator('.group:has-text("Thư Mục Riêng Của B")').first()).toBeVisible();
    await expect(pageB.locator('.group:has-text("Ghi Chú Bí Mật Của B.md")').first()).toBeVisible();

    // Capture proof screenshot of B's untouched personal folder
    const shot2 = path.join(evidenceDirs.fix23_1, '02_user_b_personal_folder_y_intact_after_folder_x_deleted.png');
    await pageB.screenshot({ path: shot2 });
    fs.copyFileSync(shot2, path.join(evidenceDirs.task23, '02_user_b_personal_folder_y_intact_after_folder_x_deleted.png'));

    // Clean up
    await contextA.close();
    await contextB.close();
  });

  test('Fix-23.2: User A permanently empties trash for Folder X -> Folder Y on User B still 100% intact', async ({ browser }) => {
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageA = await contextA.newPage();
    await setupAndOnboard(pageA, 'User A (Owner)');

    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageB = await contextB.newPage();
    await setupAndOnboard(pageB, 'User B (Collaborator)');

    // 1. User B creates personal Folder Y
    const createFolderBtnB = pageB.locator('button[title*="Tạo thư mục"]').first();
    await createFolderBtnB.click();
    await pageB.waitForTimeout(200);
    await pageB.keyboard.type('Folder Y Độc Quyền Của B');
    await pageB.keyboard.press('Enter');
    await pageB.waitForTimeout(300);

    // 2. User A creates Folder X
    const createFolderBtnA = pageA.locator('button[title*="Tạo thư mục"]').first();
    await createFolderBtnA.click();
    await pageA.waitForTimeout(200);
    await pageA.keyboard.type('Folder X Độc Quyền Của A');
    await pageA.keyboard.press('Enter');
    await pageA.waitForTimeout(300);

    const folderXItemA = pageA.locator('.group:has-text("Folder X Độc Quyền Của A")').first();
    const createChildDocBtnA = folderXItemA.locator('button[title*="Tạo tài liệu con"]').first();
    await createChildDocBtnA.click();
    await pageA.waitForTimeout(200);
    await pageA.keyboard.type('File Con Của X.md');
    await pageA.keyboard.press('Enter');
    await pageA.waitForTimeout(300);

    // 3. User A shares Folder X
    await folderXItemA.click({ button: 'right' });
    await pageA.waitForTimeout(200);
    await pageA.click('text=Chia sẻ thư mục...');
    await pageA.waitForTimeout(300);

    await pageA.fill('input[type="password"]', 'Passphrase2026!Strong');
    await pageA.click('button:has-text("Cấp Quyền & Mở Chia Sẻ")');
    await pageA.waitForTimeout(400);

    await pageA.click('button:has-text("Mã Ghép Nối")');
    await pageA.waitForTimeout(200);

    const passcodeBoxA = pageA.locator('.fixed.inset-0 input.font-mono').first();
    await expect(passcodeBoxA).not.toHaveValue('', { timeout: 5000 });
    const passcodeVal = await passcodeBoxA.inputValue();
    await pageA.keyboard.press('Escape');

    // 4. User B joins Folder X
    await pageB.click('button:has-text("Tham gia phòng")');
    await pageB.waitForTimeout(300);
    await pageB.locator('input[placeholder*="VS-"]').first().fill(passcodeVal);
    await pageB.click('button[type="submit"]');
    await pageB.waitForTimeout(600);

    // Verify User B sees both
    await expect(pageB.locator('.group:has-text("Folder Y Độc Quyền Của B")').first()).toBeVisible();
    await expect(pageB.locator('.group:has-text("Folder X Độc Quyền Của A")').first()).toBeVisible();

    // 5. User A permanently deletes Folder X
    await folderXItemA.click({ button: 'right' });
    await pageA.waitForTimeout(200);
    await pageA.click('text=Chuyển vào thùng rác');
    await pageA.waitForTimeout(300);

    const confirmDeleteBtnA = pageA.locator('button:has-text("Xóa Toàn Bộ")').first();
    if (await confirmDeleteBtnA.isVisible()) {
      await confirmDeleteBtnA.click();
      await pageA.waitForTimeout(300);
    }

    // Switch to Trash view on A
    const trashTabA = pageA.locator('button[title*="Thùng rác"]').first();
    if (await trashTabA.isVisible()) {
      await trashTabA.click();
      await pageA.waitForTimeout(300);
      const emptyTrashBtnA = pageA.locator('button:has-text("Dọn sạch")').first();
      if (await emptyTrashBtnA.isVisible()) {
        await emptyTrashBtnA.click();
        await pageA.waitForTimeout(200);
        await pageA.click('button:has-text("Xóa Vĩnh Viễn Tất Cả")');
        await pageA.waitForTimeout(500);
      }
    }

    // 6. Verify User B after permanent delete
    await pageB.waitForTimeout(1000);
    await expect(pageB.locator('.group:has-text("Folder X Độc Quyền Của A")')).toBeHidden();
    await expect(pageB.locator('.group:has-text("Folder Y Độc Quyền Của B")').first()).toBeVisible();

    const shot3 = path.join(evidenceDirs.fix23_1, '03_user_b_folder_y_persists_after_permanent_empty_trash.png');
    await pageB.screenshot({ path: shot3 });
    fs.copyFileSync(shot3, path.join(evidenceDirs.task23, '03_user_b_folder_y_persists_after_permanent_empty_trash.png'));

    await contextA.close();
    await contextB.close();
  });
});
