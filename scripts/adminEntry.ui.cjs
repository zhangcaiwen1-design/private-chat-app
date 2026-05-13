require('dotenv').config();
const { chromium } = require('playwright');

const UNLOCK_PIN = process.env.EXPO_PUBLIC_APP_UNLOCK_PIN;
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://127.0.0.1:8082';

if (!UNLOCK_PIN) {
  throw new Error('缺少 EXPO_PUBLIC_APP_UNLOCK_PIN 环境变量');
}

async function unlock(page) {
  for (const digit of UNLOCK_PIN.split('')) {
    await page.getByText(digit, { exact: true }).click();
  }
  await page.getByText('=', { exact: true }).click();
  await page.getByLabel('打开添加朋友菜单', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
}

async function openMembershipCenter(page) {
  await page.getByText('通讯录', { exact: true }).click();
  await page.getByText('会员中心', { exact: true }).click();
  await page.getByText('首月体验', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();

  await page.addInitScript(() => {
    window.__openedUrl = null;
    const originalOpen = window.open.bind(window);
    window.open = (...args) => {
      window.__openedUrl = args[0] || null;
      return originalOpen(...args);
    };
  });

  await page.goto(UI_BASE_URL, { waitUntil: 'networkidle' });
  await unlock(page);
  await openMembershipCenter(page);
  const adminCode = process.env.EXPO_PUBLIC_ADMIN_ENTRY_CODE;
  if (!adminCode) {
    throw new Error('缺少 EXPO_PUBLIC_ADMIN_ENTRY_CODE 环境变量');
  }

  await page.getByText('长按这里进入本地审核台', { exact: true }).click();
  await page.getByText('输入运营口令', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByPlaceholder('例如 review-ab12').fill(adminCode);
  await page.getByText('进入审核台', { exact: true }).click();
  await page.getByText('输入运营口令', { exact: true }).waitFor({ state: 'detached', timeout: 10000 });
  await page.waitForFunction(() => Boolean(window.__openedUrl), undefined, { timeout: 10000 });
  const openedUrl = await page.evaluate(() => window.__openedUrl);
  if (!openedUrl || !openedUrl.includes('/admin/membership-review')) {
    throw new Error(`隐藏入口未打开审核台: ${openedUrl || 'empty'}`);
  }

  console.log(JSON.stringify({ hiddenAdminEntryWorked: true, openedUrl }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
