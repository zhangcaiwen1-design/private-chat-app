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

  await page.goto('http://127.0.0.1:8082', { waitUntil: 'networkidle' });
  await unlock(page);
  await page.waitForTimeout(1200);
  await page.waitForLoadState('networkidle');
  await page.getByLabel('打开添加朋友菜单', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  await page.getByLabel('打开添加朋友菜单', { exact: true }).click();
  await page.getByText('添加朋友', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('我的二维码', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('扫一扫', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('手机号添加', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  await page.getByText('我的二维码', { exact: true }).click();
  await page.getByText('让对方输入这串分享码添加你', { exact: false }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('用户ID', { exact: false }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('对方扫码或输入分享码后，会先进入你的新朋友列表', { exact: false }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('✕', { exact: true }).click();

  await page.getByLabel('打开添加朋友菜单', { exact: true }).click();
  await page.getByText('扫一扫', { exact: true }).click();
  await page.getByText('扫一扫添加好友', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('发送好友申请', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('支持新版 QR::邀请码，也兼容旧格式', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('✕', { exact: true }).click();

  await page.getByLabel('打开添加朋友菜单', { exact: true }).click();
  await page.getByText('手机号添加', { exact: true }).click();
  await page.getByText('输入对方手机号后，会向匹配到的账号发送好友申请。', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });

  console.log(JSON.stringify({ friendEntryUiCheck: true }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
