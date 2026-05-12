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
  await page.getByLabel('打开添加朋友菜单', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  let contactHeaders = null;
  const uniqueSuffix = Date.now().toString().slice(-6);
  const uniqueText = `今天也会想你${uniqueSuffix}`;
  const remoteUserId = `ritual-ui-b-${uniqueSuffix}`;
  const remoteUserName = 'aning';
  const remotePhone = `13882${uniqueSuffix}`;

  page.on('request', (req) => {
    const url = req.url();
    if (!contactHeaders && req.method() === 'GET' && /\/api\/v1\/contacts(?:\?|$)/.test(url)) {
      contactHeaders = req.headers();
    }
  });

  await page.goto('http://127.0.0.1:8082', { waitUntil: 'networkidle' });
  await unlock(page);

  if (!contactHeaders) {
    throw new Error('Failed to capture current user headers from contacts request');
  }

  const currentHeaders = {
    'content-type': 'application/json',
    'x-user-id': contactHeaders['x-user-id'],
    'x-user-name': contactHeaders['x-user-name'],
    'x-user-phone': contactHeaders['x-user-phone'],
  };
  const remoteHeaders = {
    'content-type': 'application/json',
    'x-user-id': encodeURIComponent(remoteUserId),
    'x-user-name': encodeURIComponent(remoteUserName),
    'x-user-phone': encodeURIComponent(remotePhone),
  };

  await fetch('http://127.0.0.1:3001/api/v1/contacts', { headers: remoteHeaders });

  const qrAddResponse = await fetch('http://127.0.0.1:3001/api/v1/contacts/qr-add', {
    method: 'POST',
    headers: currentHeaders,
    body: JSON.stringify({ qr_code: `QR::${remoteUserId}::demo` }),
  });
  if (!qrAddResponse.ok) {
    throw new Error(`Failed to send ritual pair request: ${qrAddResponse.status}`);
  }

  const inbox = await fetch('http://127.0.0.1:3001/api/v1/contacts/requests/incoming', {
    headers: remoteHeaders,
  }).then((res) => res.json());
  const targetRequest = inbox.requests.find((item) => item.requester_user_id === decodeURIComponent(currentHeaders['x-user-id']));
  if (!targetRequest) {
    throw new Error('Matched ritual request not found in remote inbox');
  }

  const acceptResponse = await fetch(`http://127.0.0.1:3001/api/v1/contacts/requests/${targetRequest.id}/accept`, {
    method: 'POST',
    headers: remoteHeaders,
  });
  if (!acceptResponse.ok) {
    throw new Error(`Failed to accept ritual pair request: ${acceptResponse.status}`);
  }

  const contactsAfterAccept = await fetch('http://127.0.0.1:3001/api/v1/contacts', {
    headers: currentHeaders,
  }).then((res) => res.json());
  const contact = contactsAfterAccept.contacts.find((item) => item.peer_user_id === remoteUserId);
  if (!contact) {
    throw new Error('Matched ritual contact missing for current user');
  }

  const messageResponse = await fetch('http://127.0.0.1:3001/api/v1/messages', {
    method: 'POST',
    headers: currentHeaders,
    body: JSON.stringify({
      contact_id: contact.id,
      conversation_id: contact.conversation_id,
      client_id: `ritual-ui:${Date.now()}:1`,
      type: 'text',
      content: uniqueText,
    }),
  });
  if (!messageResponse.ok) {
    throw new Error(`Failed to create ritual message: ${messageResponse.status}`);
  }

  await page.reload({ waitUntil: 'networkidle' });
  await unlock(page);
  await page.getByText('通讯录', { exact: true }).click();
  await page.getByText('双人仪式', { exact: true }).click();
  await page.getByText('关系里程碑', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('爱心值', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('连续互动', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText(contact.name, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('第一次认真说话', { exact: false }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText(uniqueText.slice(0, 12), { exact: false }).waitFor({ state: 'visible', timeout: 10000 });

  console.log(JSON.stringify({ ritualCenterVisible: true }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
