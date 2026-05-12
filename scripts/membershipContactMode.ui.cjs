require('dotenv').config();
const { chromium } = require('playwright');

const UNLOCK_PIN = process.env.EXPO_PUBLIC_APP_UNLOCK_PIN;
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://127.0.0.1:8082';

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

async function openMembershipCenter(page) {
  await page.getByText('通讯录', { exact: true }).click();
  await page.getByText('会员中心', { exact: true }).click();
  await page.getByText('会员中心', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();

  await page.goto(UI_BASE_URL, { waitUntil: 'networkidle' });
  await unlock(page);
  await openMembershipCenter(page);

  await page.getByText('联系开发者微信', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('Nanny_1688', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('无需上传截图，也不需要看收款码说明。', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  if (await page.getByText('上传付款凭证', { exact: true }).count()) {
    throw new Error('会员页仍然显示上传付款凭证');
  }
  if (await page.getByText('打开收款码', { exact: true }).count()) {
    throw new Error('会员页仍然显示打开收款码');
  }
  if (await page.getByText('长按这里进入本地审核台', { exact: true }).count()) {
    throw new Error('会员页仍然显示本地审核台入口');
  }

  console.log(JSON.stringify({ membershipContactModeVisible: true }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
