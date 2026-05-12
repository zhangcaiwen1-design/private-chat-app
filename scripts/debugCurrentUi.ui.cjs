require('dotenv').config();
const { chromium } = require('playwright');

const UNLOCK_PIN = process.env.EXPO_PUBLIC_APP_UNLOCK_PIN;
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://127.0.0.1:8082';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto(UI_BASE_URL, { waitUntil: 'networkidle' });

  for (const digit of String(UNLOCK_PIN || '').split('')) {
    await page.getByText(digit, { exact: true }).click();
  }
  await page.getByText('=', { exact: true }).click();
  await page.waitForTimeout(3000);

  console.log(JSON.stringify({
    title: await page.title(),
    bodyText: (await page.locator('body').innerText()).slice(0, 1200),
    url: page.url(),
  }, null, 2));

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
