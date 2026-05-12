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
  let offline = true;

  await page.route('**/health', async (route) => {
    if (offline) {
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.route('**/api/v1/contacts', async (route) => {
    if (offline) {
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.goto('http://127.0.0.1:8082', { waitUntil: 'networkidle' });
  await unlock(page);

  await page.getByText('本地服务未连接', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('重试', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  const seedName = `重连联系人 ${Date.now().toString().slice(-6)}`;
  const seedPhone = `135${Date.now().toString().slice(-8)}`;
  const createResponse = await fetch('http://127.0.0.1:3001/api/v1/contacts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: seedName, phone: seedPhone }),
  });
  if (!createResponse.ok) throw new Error(`Failed to seed contact after reconnect: ${createResponse.status}`);
  const created = await createResponse.json();
  const contact = created.contact;

  offline = false;
  await page.getByText('重试', { exact: true }).click();
  await page.getByText('微信', { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText(contact.name, { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });

  console.log(JSON.stringify({ reconnected: true, contactVisible: true, contactName: contact.name }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
