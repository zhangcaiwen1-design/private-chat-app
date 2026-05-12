require('dotenv').config();
const { chromium } = require('playwright');

const UNLOCK_PIN = process.env.EXPO_PUBLIC_APP_UNLOCK_PIN;

if (!UNLOCK_PIN) {
  throw new Error('缺少 EXPO_PUBLIC_APP_UNLOCK_PIN 环境变量');
}


async function unlock(page) {
  for (const digit of UNLOCK_PIN.split('')) {
    await page.getByText(digit, { exact: true }).click();
  }
  await page.getByText('=', { exact: true }).click();
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();

  page.on('console', (message) => {
    console.log('CONSOLE', message.type(), message.text());
  });

  page.on('pageerror', (error) => {
    console.log('PAGEERROR', error.stack || error.message);
  });

  page.on('requestfailed', (request) => {
    console.log('REQFAIL', request.url(), request.failure()?.errorText || 'unknown');
  });

  page.on('request', (request) => {
    if (request.url().includes('/api/v1/contacts')) {
      console.log('REQ', request.method(), request.url(), JSON.stringify(request.headers()));
    }
  });

  page.on('response', async (response) => {
    if (response.url().includes('/api/v1/contacts')) {
      let body = '';
      try {
        body = await response.text();
      } catch {
        body = '<unreadable>';
      }
      console.log('RES', response.status(), response.url(), body);
    }
  });

  await page.goto('http://127.0.0.1:8082', { waitUntil: 'networkidle' });
  await unlock(page);
  await page.waitForTimeout(3000);
  const text = await page.locator('body').innerText();
  console.log('BODY');
  console.log(text);
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
