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
  await page.getByLabel('打开添加朋友菜单', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
}

async function openPhoneAddModal(page) {
  await page.getByLabel('打开添加朋友菜单', { exact: true }).click();
  await page.getByLabel('打开手机号添加', { exact: true }).click();
  await page.getByText('手机号添加', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  await page.goto(UI_BASE_URL, { waitUntil: 'networkidle' });
  await unlock(page);
  await openPhoneAddModal(page);

  const overlay = page.locator('text=手机号添加').locator('..').locator('..');
  const modal = page.locator('text=手机号添加').locator('..');
  const overlayBox = await overlay.boundingBox();
  const modalBox = await modal.boundingBox();
  const viewport = page.viewportSize();

  if (!overlayBox || !modalBox || !viewport) {
    throw new Error('无法获取弹窗位置数据');
  }

  const modalCenterX = modalBox.x + modalBox.width / 2;
  const modalCenterY = modalBox.y + modalBox.height / 2;
  const viewportCenterX = viewport.width / 2;
  const viewportCenterY = viewport.height / 2;
  const deltaX = Math.abs(modalCenterX - viewportCenterX);
  const deltaY = Math.abs(modalCenterY - viewportCenterY);

  if (deltaX > 24 || deltaY > 40) {
    throw new Error(`手机号添加弹窗未居中: dx=${deltaX}, dy=${deltaY}`);
  }

  console.log(JSON.stringify({ centered: true, deltaX, deltaY }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
