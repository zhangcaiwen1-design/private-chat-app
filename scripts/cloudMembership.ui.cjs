require('dotenv').config();
const { chromium } = require('playwright');

const UNLOCK_PIN = process.env.EXPO_PUBLIC_APP_UNLOCK_PIN;
const ADMIN_MEMBERSHIP_KEY = process.env.ADMIN_MEMBERSHIP_KEY;
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://127.0.0.1:8082';
const API_BASE_URL = process.env.TEST_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3001/api/v1';

if (!UNLOCK_PIN) {
  throw new Error('缺少 EXPO_PUBLIC_APP_UNLOCK_PIN 环境变量');
}

if (!ADMIN_MEMBERSHIP_KEY) {
  throw new Error('缺少 ADMIN_MEMBERSHIP_KEY 环境变量');
}

async function unlock(page) {
  for (const digit of UNLOCK_PIN.split('')) {
    await page.getByText(digit, { exact: true }).click();
  }
  await page.getByText('=', { exact: true }).click();
  await page.getByLabel('打开添加朋友菜单', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
}

async function captureHeaders(page) {
  return new Promise((resolve) => {
    page.on('request', (req) => {
      if (req.method() === 'GET' && /\/api\/v1\/contacts(?:\?|$)/.test(req.url())) {
        resolve(req.headers());
      }
    });
  });
}

async function openCloudRecords(page) {
  await page.getByText('通讯录', { exact: true }).click();
  await page.getByText('云端记录', { exact: true }).click();
  await page.getByText('云端同步状态', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
}

async function createManualOrder(headers) {
  const response = await fetch(`${API_BASE_URL}/membership/manual-order`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-user-id': headers['x-user-id'],
      'x-user-name': headers['x-user-name'],
      'x-user-phone': headers['x-user-phone'],
    },
    body: JSON.stringify({
      amount: 9.9,
      payer_phone: headers['x-user-phone'],
      paid_at: Date.now(),
      payment_proof: 'data:image/png;base64,ZmFrZQ==',
      note: '云端会员自动化测试',
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok && data.error !== '你已有待审核的会员申请') {
    throw new Error(data.error || `会员申请创建失败: ${response.status}`);
  }

  if (data.order?.id) {
    return data.order.id;
  }

  const pendingResponse = await fetch(`${API_BASE_URL}/admin/membership-orders?status=pending_review`, {
    headers: {
      'x-admin-key': ADMIN_MEMBERSHIP_KEY,
    },
  });
  const pendingData = await pendingResponse.json();
  const order = (pendingData.orders || []).find((item) => item.user_id === headers['x-user-id']);
  if (!order) {
    throw new Error('未找到待审核会员申请');
  }
  return order.id;
}

async function approveOrder(orderId) {
  const response = await fetch(`${API_BASE_URL}/admin/membership-orders/${orderId}/approve`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-key': ADMIN_MEMBERSHIP_KEY,
    },
    body: JSON.stringify({ months: 1 }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 404) {
    throw new Error(data.error || `会员审核失败: ${response.status}`);
  }
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();
  const headerPromise = captureHeaders(page);

  await page.goto(UI_BASE_URL, { waitUntil: 'networkidle' });
  await unlock(page);
  const headers = await headerPromise;

  await openCloudRecords(page);
  await page.getByText('仅保留本地记录', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('开通会员', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  const orderId = await createManualOrder(headers);
  await approveOrder(orderId);

  await page.reload({ waitUntil: 'networkidle' });
  await unlock(page);
  await openCloudRecords(page);
  await page.getByText('云端同步已开启', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  console.log(JSON.stringify({ freeBlocked: true, approvedVisible: true }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
