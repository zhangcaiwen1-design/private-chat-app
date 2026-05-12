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
  await page.getByText('微信', { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
}

async function openCloudRecords(page) {
  await page.getByText('＋', { exact: true }).click();
  await page.getByText('云端记录', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('云端记录', { exact: true }).click();
  await page.getByText('云端同步状态', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
}

async function seedTextCloudBackup() {
  const contactsResponse = await fetch('http://127.0.0.1:3001/api/v1/contacts');
  const contactsData = await contactsResponse.json();
  const contact = contactsData.contacts[0];
  if (!contact) {
    throw new Error('没有可用联系人来创建云记录');
  }

  const uniqueText = `待删云记录 ${Date.now()}`;
  const response = await fetch('http://127.0.0.1:3001/api/v1/cloud-backups', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-membership-tier': 'paid',
    },
    body: JSON.stringify({
      contact_id: contact.id,
      type: 'text',
      content: uniqueText,
    }),
  });

  if (!response.ok) {
    throw new Error(`云记录创建失败: ${response.status}`);
  }

  return uniqueText;
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();
  const uniqueText = await seedTextCloudBackup();

  await page.goto('http://127.0.0.1:8082', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('membership_tier', 'paid'));
  await page.reload({ waitUntil: 'networkidle' });
  await unlock(page);
  await openCloudRecords(page);
  await page.getByText(uniqueText, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('删除', { exact: true }).first().click();
  await page.getByText(uniqueText, { exact: true }).waitFor({ state: 'hidden', timeout: 10000 });

  console.log(JSON.stringify({ uniqueText, deleted: true }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
