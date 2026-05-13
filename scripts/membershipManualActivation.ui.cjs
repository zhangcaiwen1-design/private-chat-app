require('dotenv').config();
const { chromium } = require('playwright');

const UNLOCK_PIN = process.env.EXPO_PUBLIC_APP_UNLOCK_PIN;
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://127.0.0.1:8082';
const API_BASE_URL = process.env.TEST_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3001/api/v1';

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

async function captureUserHeaders(page) {
  return new Promise((resolve) => {
    page.on('request', (req) => {
      if (req.method() === 'GET' && /\/api\/v1\/contacts(?:\?|$)/.test(req.url())) {
        resolve(req.headers());
      }
    });
  });
}

async function ensurePendingOrder(headers) {
  const response = await fetch(`${API_BASE_URL}/membership/manual-order`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-user-id': headers['x-user-id'],
      'x-user-name': headers['x-user-name'],
      'x-user-phone': headers['x-user-phone'],
    },
    body: JSON.stringify({
      amount: 19.9,
      plan_code: 'first_month_19_9',
      payer_phone: headers['x-user-phone'],
      paid_at: Date.now(),
      payment_proof: 'data:image/png;base64,ZmFrZQ==',
      note: '自动化测试会员申请',
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok && data.error !== '你已有待审核的会员申请') {
    throw new Error(data.error || `会员申请创建失败: ${response.status}`);
  }
}

async function openMembershipCenter(page) {
  await page.getByText('通讯录', { exact: true }).click();
  await page.getByText('会员中心', { exact: true }).click();
  await page.getByText('首月体验', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();
  const headerPromise = captureUserHeaders(page);

  await page.goto(UI_BASE_URL, { waitUntil: 'networkidle' });
  await unlock(page);
  const headers = await headerPromise;

  await openMembershipCenter(page);
  await page.getByText('当前权益', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('• 云上传', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('• 云下载恢复', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  await ensurePendingOrder(headers);

  await page.reload({ waitUntil: 'networkidle' });
  await unlock(page);
  await openMembershipCenter(page);
  await page.getByText('待审核', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('我们会尽快为你开通，请先不要重复提交。', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  console.log(JSON.stringify({ membershipCenterVisible: true, pendingOrderVisible: true }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
