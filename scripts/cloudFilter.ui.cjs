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
  await page.getByText('微信', { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
}

async function openCloudRecords(page) {
  await page.getByText('＋', { exact: true }).click();
  await page.getByText('云端记录', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('云端记录', { exact: true }).click();
  await page.getByText('云端同步状态', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
}

async function seedCloudBackups() {
  const contactsResponse = await fetch('http://127.0.0.1:3001/api/v1/contacts');
  const contactsData = await contactsResponse.json();
  const contact = contactsData.contacts[0];
  if (!contact) {
    throw new Error('没有可用联系人来创建云记录');
  }

  const records = {
    text: `筛选文字 ${Date.now()}`,
    image: `file:///filter-image-${Date.now()}.png`,
    voice: `file:///filter-voice-${Date.now()}.wav`,
  };

  for (const [type, content] of Object.entries(records)) {
    const response = await fetch('http://127.0.0.1:3001/api/v1/cloud-backups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-membership-tier': 'paid',
      },
      body: JSON.stringify({
        contact_id: contact.id,
        type,
        content,
        duration: type === 'voice' ? 1 : null,
      }),
    });

    if (!response.ok) {
      throw new Error(`创建 ${type} 云记录失败: ${response.status}`);
    }
  }

  return records;
}

async function expectVisible(page, text) {
  await page.getByText(text, { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
}

async function expectHidden(page, text) {
  await page.getByText(text, { exact: true }).first().waitFor({ state: 'hidden', timeout: 10000 });
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();
  const records = await seedCloudBackups();

  await page.goto('http://127.0.0.1:8082', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('membership_tier', 'paid'));
  await page.reload({ waitUntil: 'networkidle' });
  await unlock(page);
  await openCloudRecords(page);

  await page.getByText('图片', { exact: true }).first().click();
  await page.getByText('仅看图片', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await expectVisible(page, '已保存图片');
  await expectHidden(page, records.text);
  await expectHidden(page, '已保存语音');

  await page.getByText('语音', { exact: true }).first().click();
  await page.getByText('仅看语音', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await expectVisible(page, '已保存语音');
  await expectHidden(page, records.text);
  await expectHidden(page, '已保存图片');

  await page.getByText('文字', { exact: true }).first().click();
  await page.getByText('仅看文字', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await expectVisible(page, records.text);
  await expectHidden(page, '已保存图片');
  await expectHidden(page, '已保存语音');

  await page.getByText('全部', { exact: true }).first().click();
  await page.getByText('查看全部', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await expectVisible(page, records.text);
  await expectVisible(page, '已保存图片');
  await expectVisible(page, '已保存语音');

  console.log(JSON.stringify({ filterWorked: true, records }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
