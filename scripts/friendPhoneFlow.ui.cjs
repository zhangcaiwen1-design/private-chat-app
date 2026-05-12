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

  let receiverHeaders = null;
  page.on('request', (request) => {
    if (!receiverHeaders && request.method() === 'GET' && /\/api\/v1\/contacts(?:\?|$)/.test(request.url())) {
      receiverHeaders = request.headers();
    }
  });

  await page.goto('http://127.0.0.1:8082', { waitUntil: 'networkidle' });
  await unlock(page);
  await page.waitForTimeout(1500);

  if (!receiverHeaders) {
    throw new Error('Failed to capture current user headers from contacts request');
  }

  const senderUserId = decodeURIComponent(receiverHeaders['x-user-id'] || '');
  const senderUserName = decodeURIComponent(receiverHeaders['x-user-name'] || '');
  const senderPhone = decodeURIComponent(receiverHeaders['x-user-phone'] || '');
  const requesterName = `手机号用户-${Date.now().toString(36)}`;
  const targetUserId = `phone-target-${Date.now().toString(36)}`;
  const targetUserName = `目标用户-${Date.now().toString(36).slice(-4)}`;
  const targetPhone = `139${Date.now().toString().slice(-8)}`;

  await fetch('http://127.0.0.1:3001/api/v1/contacts', {
    headers: {
      'x-user-id': encodeURIComponent(targetUserId),
      'x-user-name': encodeURIComponent(targetUserName),
      'x-user-phone': encodeURIComponent(targetPhone),
    },
  });

  await page.getByLabel('打开添加朋友菜单', { exact: true }).click();
  await page.getByLabel('打开手机号添加', { exact: true }).click();
  await page.getByPlaceholder('姓名').fill(requesterName);
  await page.getByPlaceholder('手机号').fill(targetPhone);
  await page.getByText('添加', { exact: true }).click();

  await page.getByText(requesterName, { exact: true }).last().waitFor({ state: 'visible', timeout: 10000 });

  const incoming = await fetch('http://127.0.0.1:3001/api/v1/contacts/requests/incoming', {
    headers: {
      'x-user-id': encodeURIComponent(targetUserId),
      'x-user-name': encodeURIComponent(targetUserName),
      'x-user-phone': encodeURIComponent(targetPhone),
    },
  }).then((res) => res.json());

  if (!incoming.requests.some((item) => item.requester_name === senderUserName && item.requester_user_id === senderUserId && item.channel === 'phone')) {
    throw new Error('Phone request not found in target inbox');
  }

  console.log(JSON.stringify({ phoneFlowOpenedPendingConversation: true, requesterName, senderUserId, senderPhone, targetUserId, targetPhone }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
