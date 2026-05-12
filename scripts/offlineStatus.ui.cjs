require('dotenv').config();
const { chromium } = require('playwright');

const UNLOCK_PIN = process.env.EXPO_PUBLIC_APP_UNLOCK_PIN;

if (!UNLOCK_PIN) {
  throw new Error('缺少 EXPO_PUBLIC_APP_UNLOCK_PIN 环境变量');
}


async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();

  await page.route('**/health', async (route) => {
    await route.abort();
  });
  await page.route('**/api/v1/contacts', async (route) => {
    await route.abort();
  });

  await page.goto('http://127.0.0.1:8082', { waitUntil: 'networkidle' });
  for (const digit of UNLOCK_PIN.split('')) {
    await page.getByText(digit, { exact: true }).click();
  }
  await page.getByText('=', { exact: true }).click();

  await page.getByText('本地服务未连接', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('请检查电脑服务与当前网络连接', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('重试', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  console.log(JSON.stringify({ offlineStatusVisible: true, retryVisible: true }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
