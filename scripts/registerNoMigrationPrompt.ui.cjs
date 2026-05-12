require('dotenv').config();
const { chromium } = require('playwright');

const UNLOCK_PIN = process.env.EXPO_PUBLIC_APP_UNLOCK_PIN;
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://127.0.0.1:8082';
const TEST_PHONE = `138${Date.now().toString().slice(-8)}`;
const TEST_PASSWORD = '123456';

if (!UNLOCK_PIN) {
  throw new Error('缺少 EXPO_PUBLIC_APP_UNLOCK_PIN 环境变量');
}

async function unlock(page) {
  for (const digit of UNLOCK_PIN.split('')) {
    await page.getByText(digit, { exact: true }).click();
  }
  await page.getByText('=', { exact: true }).click();
  await page.getByText('手机号绑定', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  await page.goto(UI_BASE_URL, { waitUntil: 'networkidle' });
  await unlock(page);

  await page.getByPlaceholder('输入手机号').fill(TEST_PHONE);
  await page.getByPlaceholder('设置计算器进入密码').fill(TEST_PASSWORD);
  await page.getByText('保存并进入', { exact: true }).click();

  const migrationPrompt = page.getByText('是否保留这台手机原有聊天记录？', { exact: true });
  if (await migrationPrompt.count()) {
    throw new Error('注册后仍然出现迁移数据提示');
  }

  await page.getByLabel('打开添加朋友菜单', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  console.log(JSON.stringify({ noMigrationPrompt: true, phone: TEST_PHONE }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
