require('dotenv').config();
const { chromium } = require('playwright');
const { createApp } = require('../backend/server');

const BASE_URL = 'http://127.0.0.1:3101';
const ADMIN_MEMBERSHIP_KEY = process.env.ADMIN_MEMBERSHIP_KEY;

if (!ADMIN_MEMBERSHIP_KEY) {
  throw new Error('缺少 ADMIN_MEMBERSHIP_KEY 环境变量');
}

async function startLocalServer() {
  const app = await createApp();
  return new Promise((resolve, reject) => {
    const server = app.listen(3101, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

async function createMembershipOrder() {
  const userId = `admin-review-${Date.now()}`;
  const response = await fetch(`${BASE_URL}/api/v1/membership/manual-order`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-user-id': userId,
      'x-user-name': 'adminreview',
      'x-user-phone': '13988889999',
    },
    body: JSON.stringify({
      amount: 9.9,
      payer_phone: '13988889999',
      paid_at: Date.now(),
      payment_proof: 'data:image/png;base64,ZmFrZQ==',
      note: '本地运营审核烟测',
    }),
  });

  if (!response.ok) {
    throw new Error(`创建会员申请失败: ${response.status}`);
  }

  const data = await response.json();
  return { order: data.order, userId };
}

async function verifyApproved(orderId) {
  const response = await fetch(`${BASE_URL}/api/v1/admin/membership-orders?status=approved`, {
    headers: {
      'x-admin-key': ADMIN_MEMBERSHIP_KEY,
    },
  });
  const data = await response.json();
  if (!response.ok || !(data.orders || []).some((item) => item.id === orderId)) {
    throw new Error('审核后未在已通过列表中找到订单');
  }
}

async function main() {
  const server = await startLocalServer();
  try {
    const { order } = await createMembershipOrder();
    const browser = await chromium.launch({ channel: 'msedge', headless: false });
    const page = await browser.newPage();

    await page.goto(`${BASE_URL}/admin/membership-review`, { waitUntil: 'networkidle' });
  await page.getByText('会员审核台', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('#adminKey').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('#adminKey').evaluate((node) => node.value === '');
  await page.locator('#adminKey').fill(ADMIN_MEMBERSHIP_KEY);
  await page.getByRole('button', { name: '刷新列表', exact: true }).click();
  await page.getByText(order.id, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.locator(`#months-${order.id}`).fill('1');
  await page.locator(`[data-order-id="${order.id}"]`).getByRole('button', { name: '通过', exact: true }).click();
    await page.getByText('会员已通过审核并开通。', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    await verifyApproved(order.id);

    console.log(JSON.stringify({ adminReviewVisible: true, approved: true, orderId: order.id }));
    await browser.close();
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
