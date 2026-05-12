require('dotenv').config();
const { chromium } = require('playwright');

const UNLOCK_PIN = process.env.EXPO_PUBLIC_APP_UNLOCK_PIN;
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://127.0.0.1:8082';
const TEST_PHONE = `138${Date.now().toString().slice(-8)}`;
const TEST_PASSWORD = '123456';
const TEST_NICKNAME = '新用户';

async function unlock(page) {
  for (const digit of String(UNLOCK_PIN || '').split('')) {
    await page.getByText(digit, { exact: true }).click();
  }
  await page.getByText('=', { exact: true }).click();
  await page.getByText('手机号登录 / 注册', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  const responses = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/auth/')) {
      let body = '';
      try { body = await response.text(); } catch {}
      responses.push({ url, status: response.status(), body: body.slice(0, 500) });
    }
  });
  page.on('pageerror', (error) => {
    console.error('PAGEERROR', error.message);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('CONSOLE', msg.text());
    }
  });

  await page.goto(UI_BASE_URL, { waitUntil: 'networkidle' });
  await unlock(page);
  await page.getByPlaceholder('输入手机号').fill(TEST_PHONE);
  await page.getByText('继续', { exact: true }).click();
  await page.getByPlaceholder('输入昵称').waitFor({ state: 'visible', timeout: 10000 });
  await page.getByPlaceholder('输入昵称').fill(TEST_NICKNAME);
  await page.getByPlaceholder('设置密码').fill(TEST_PASSWORD);
  await page.getByText('注册并继续', { exact: true }).click();
  await page.waitForTimeout(4000);

  console.log(JSON.stringify({
    phone: TEST_PHONE,
    url: page.url(),
    bodyText: (await page.locator('body').innerText()).slice(0, 2000),
    responses,
  }, null, 2));

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
