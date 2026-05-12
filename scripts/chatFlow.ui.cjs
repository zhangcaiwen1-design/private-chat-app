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
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const bad = [];
  const requests = [];
  let contactHeaders = null;

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/v1/messages/undefined')) bad.push(url);
    if (url.includes('/api/v1/messages')) requests.push({ method: req.method(), url });
    if (!contactHeaders && req.method() === 'GET' && /\/api\/v1\/contacts(?:\?|$)/.test(url)) {
      contactHeaders = req.headers();
    }
  });

  const uniqueText = `UI烟测 ${Date.now()}`;
  const seedName = `烟测联系人${Date.now().toString().slice(-4)}`;
  const seedPhone = `138${Date.now().toString().slice(-8)}`;

  await page.goto('http://127.0.0.1:8082', { waitUntil: 'networkidle' });
  await unlock(page);
  await page.waitForLoadState('networkidle');
  await page.getByLabel('打开添加朋友菜单', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  if (!contactHeaders) {
    throw new Error('Failed to capture current user headers from contacts request');
  }

  const contactsBefore = await fetch('http://127.0.0.1:3001/api/v1/contacts', {
    headers: {
      'x-user-id': contactHeaders['x-user-id'],
      'x-user-name': contactHeaders['x-user-name'],
      'x-user-phone': contactHeaders['x-user-phone'],
    },
  }).then((res) => res.json());

  let contact = contactsBefore.contacts[0] || null;

  if (!contact) {
    const createResponse = await fetch('http://127.0.0.1:3001/api/v1/contacts', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-user-id': contactHeaders['x-user-id'],
        'x-user-name': contactHeaders['x-user-name'],
        'x-user-phone': contactHeaders['x-user-phone'],
      },
      body: JSON.stringify({ name: seedName, phone: seedPhone }),
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create seed contact: ${createResponse.status}`);
    }

    contact = (await createResponse.json()).contact;
    await page.reload({ waitUntil: 'networkidle' });
    await unlock(page);
    await page.waitForLoadState('networkidle');
    await page.getByLabel('打开添加朋友菜单', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  }

  const contactName = contact.name;

  await page.getByText(contactName, { exact: true }).first().click();
  await page.getByPlaceholder('输入消息').waitFor({ state: 'visible', timeout: 10000 });

  await page.getByPlaceholder('输入消息').fill(uniqueText);
  await page.getByText('发送', { exact: true }).click();
  await page.getByText(uniqueText, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  await page.getByLabel('返回会话列表', { exact: true }).click();
  await page.getByLabel('打开添加朋友菜单', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText(uniqueText, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  await page.getByText(contactName, { exact: true }).first().click();
  await page.getByText(uniqueText, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  const locator = page.getByText(uniqueText, { exact: true }).first();
  const box = await locator.boundingBox();
  if (!box) throw new Error('Message bounding box missing');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();

  await page.getByText('删除消息', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('删除消息', { exact: true }).click();
  await page.getByText(uniqueText, { exact: true }).waitFor({ state: 'detached', timeout: 10000 });

  await page.getByLabel('返回会话列表', { exact: true }).click();
  await page.getByLabel('打开添加朋友菜单', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  const contactsAfter = await fetch('http://127.0.0.1:3001/api/v1/contacts', {
    headers: {
      'x-user-id': contactHeaders['x-user-id'],
      'x-user-name': contactHeaders['x-user-name'],
      'x-user-phone': contactHeaders['x-user-phone'],
    },
  }).then((res) => res.json());

  const updatedContact = contactsAfter.contacts.find((item) => item.id === contact.id);
  if (!updatedContact) throw new Error('Updated contact missing after delete');
  if (updatedContact.last_message) {
    await page.getByText(updatedContact.last_message, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  }

  const previewRestored = (await page.getByText(uniqueText, { exact: true }).count()) === 0;
  console.log(JSON.stringify({ uniqueText, bad, requests, previewRestored, restoredPreview: updatedContact.last_message || '' }));

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
