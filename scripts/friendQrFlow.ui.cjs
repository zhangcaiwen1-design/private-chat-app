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
  await unlock(page);
  await page.waitForTimeout(1500);

  if (!contactHeaders) {
    throw new Error('Failed to capture current user headers from contacts request');
  }

  const receiverUserId = decodeURIComponent(contactHeaders['x-user-id'] || '');
  const stamp = Date.now().toString(36);
  const requesterId = `扫码用户-${stamp}`;
  const requesterPhone = `139${Date.now().toString().slice(-8)}`;

  await fetch('http://127.0.0.1:3001/api/v1/contacts/qr-add', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-user-id': encodeURIComponent(requesterId),
      'x-user-name': encodeURIComponent(requesterId),
      'x-user-phone': encodeURIComponent(requesterPhone),
    },
    body: JSON.stringify({ qr_code: `QR::${receiverUserId}::${stamp}` }),
  });

  await page.getByLabel('打开扫一扫', { exact: true }).click().catch(async () => {
    await page.getByLabel('打开添加朋友菜单', { exact: true }).click();
    await page.getByLabel('打开扫一扫', { exact: true }).click();
  });

  await page.getByPlaceholder('输入分享码，如 QR::local-user::abcd').fill(`QR::${requesterId}::${stamp}`);
  await page.getByText('发送好友申请', { exact: true }).click();
  await page.getByText(requesterId, { exact: true }).last().waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('等待对方通过好友申请', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  console.log(JSON.stringify({ qrFlowOpenedPendingConversation: true, requesterId }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
