require('dotenv').config();
const { chromium } = require('playwright');

const UI_BASE_URL = process.env.UI_BASE_URL || 'http://127.0.0.1:8082';
const UNLOCK_PINS = Array.from(new Set(['198703', process.env.EXPO_PUBLIC_APP_UNLOCK_PIN].filter(Boolean)));

async function unlock(page) {
  for (const unlockPin of UNLOCK_PINS) {
    await page.goto(UI_BASE_URL, { waitUntil: 'domcontentloaded' });
    for (const digit of unlockPin.split('')) {
      await page.getByText(digit, { exact: true }).click();
    }
    await page.getByText('=', { exact: true }).click();

    try {
      await page.getByLabel('打开添加朋友菜单', { exact: true }).waitFor({ state: 'visible', timeout: 2000 });
      return;
    } catch {
      // try next pin
    }
  }

  throw new Error('未能解锁进入聊天页');
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  await unlock(page);
  await page.getByLabel('打开添加朋友菜单', { exact: true }).click();
  await page.getByLabel('打开用户ID添加', { exact: true }).click();
  const hint = page.getByText('输入对方用户ID后，会向该账号发送好友申请。', { exact: true });
  await hint.waitFor({ state: 'visible', timeout: 10000 });

  const modal = hint.locator('..').first();
  const box = await modal.boundingBox();
  if (!box) {
    throw new Error('未获取到用户ID添加弹窗位置');
  }

  if (box.y > 180) {
    throw new Error(`用户ID添加弹窗过低，当前顶部坐标为 ${box.y}`);
  }

  console.log(JSON.stringify({ modalTop: box.y }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
