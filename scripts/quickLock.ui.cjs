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

async function ensureContact() {
  const seedName = `快捷锁定 ${Date.now().toString().slice(-6)}`;
  const seedPhone = `138${Date.now().toString().slice(-8)}`;
  const createResponse = await fetch('http://127.0.0.1:3001/api/v1/contacts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: seedName, phone: seedPhone }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to seed contact: ${createResponse.status}`);
  }

  const created = await createResponse.json();
  return created.contact;
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();
  const contact = await ensureContact();

  await page.goto('http://127.0.0.1:8082', { waitUntil: 'networkidle' });
  await unlock(page);
  await page.getByText(contact.name, { exact: true }).first().click();
  await page.getByText('本地私密 · 仅此设备', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByLabel('锁定应用', { exact: true }).first().click();
  await page.getByText('=', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  await unlock(page);
  await page.getByLabel('打开添加朋友菜单', { exact: true }).click();
  await page.getByText('云端记录', { exact: true }).click();
  await page.getByText('云端同步状态', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByLabel('锁定应用', { exact: true }).first().click();
  await page.getByText('=', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  console.log(JSON.stringify({ chatQuickLockWorked: true, cloudQuickLockWorked: true }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
