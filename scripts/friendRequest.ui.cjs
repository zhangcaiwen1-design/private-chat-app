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

  let contactHeaders = null;
  page.on('request', (request) => {
    if (!contactHeaders && request.method() === 'GET' && /\/api\/v1\/contacts(?:\?|$)/.test(request.url())) {
      contactHeaders = request.headers();
    }
  });

  await page.goto('http://127.0.0.1:8082', { waitUntil: 'networkidle' });
  await page.waitForLoadState('networkidle');
  await unlock(page);
  await page.waitForTimeout(1500);

  if (!contactHeaders) {
    await page.reload({ waitUntil: 'networkidle' });
    await unlock(page);
    await page.waitForTimeout(1000);
  }

  if (!contactHeaders) {
    throw new Error('Failed to capture current user headers from contacts request');
  }

  const receiverUserId = decodeURIComponent(contactHeaders['x-user-id'] || '');
  const receiverPhone = decodeURIComponent(contactHeaders['x-user-phone'] || '');
  const receiverName = decodeURIComponent(contactHeaders['x-user-name'] || '');

  const stamp = Date.now().toString(36);
  const requesterId = `ui-user-${stamp}`;
  const requesterPhone = `139${Date.now().toString().slice(-8)}`;

  const requestResponse = await fetch('http://127.0.0.1:3001/api/v1/contacts/qr-add', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-user-id': encodeURIComponent(requesterId),
      'x-user-name': encodeURIComponent(requesterId),
      'x-user-phone': encodeURIComponent(requesterPhone),
    },
    body: JSON.stringify({ qr_code: `QR::${receiverUserId}::${stamp}` }),
  });

  if (!requestResponse.ok) {
    throw new Error(`Failed to seed request: ${requestResponse.status}`);
  }

  await page.reload({ waitUntil: 'networkidle' });
  await unlock(page);
  await page.getByText('新朋友', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText(requesterId, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  const beforeAccept = await fetch('http://127.0.0.1:3001/api/v1/contacts/requests/incoming', {
    headers: {
      'x-user-id': encodeURIComponent(receiverUserId),
      'x-user-name': encodeURIComponent(receiverName),
      'x-user-phone': encodeURIComponent(receiverPhone),
    },
  }).then((res) => res.json());

  if (!beforeAccept.requests.some((item) => item.requester_user_id === requesterId)) {
    throw new Error('Request not found in inbox before accept');
  }

  const acceptButton = page.locator('div').filter({ has: page.getByText(requesterId, { exact: true }) }).getByText('接受', { exact: true }).first();
  await acceptButton.click();
  await page.getByText(requesterId, { exact: true }).last().waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('本地私密 · 仅此设备', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByLabel('返回会话列表', { exact: true }).click();
  await page.waitForTimeout(1500);

  const afterAccept = await fetch('http://127.0.0.1:3001/api/v1/contacts', {
    headers: {
      'x-user-id': encodeURIComponent(receiverUserId),
      'x-user-name': encodeURIComponent(receiverName),
      'x-user-phone': encodeURIComponent(receiverPhone),
    },
  }).then((res) => res.json());

  if (!afterAccept.contacts.some((item) => item.peer_user_id === requesterId)) {
    throw new Error('Accepted contact not created for receiver');
  }

  await page.reload({ waitUntil: 'networkidle' });
  await unlock(page);
  await page.getByText(requesterId, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('已通过你的好友申请', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  console.log(JSON.stringify({
    friendRequestAccepted: true,
    requesterId,
    receiverUserId,
    receiverPhone,
    receiverName,
  }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
