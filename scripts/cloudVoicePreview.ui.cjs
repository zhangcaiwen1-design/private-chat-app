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
  await page.getByLabel('打开添加朋友菜单', { exact: true }).click();
  await page.getByText('云端记录', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('云端记录', { exact: true }).click();
  await page.getByText('云端同步状态', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
}

async function ensureContact() {
  const seedName = `语音恢复联系人 ${Date.now().toString().slice(-6)}`;
  const seedPhone = `135${Date.now().toString().slice(-8)}`;
  const createResponse = await fetch('http://127.0.0.1:3001/api/v1/contacts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: seedName, phone: seedPhone }),
  });

  if (!createResponse.ok) {
    throw new Error(`创建联系人失败: ${createResponse.status}`);
  }

  const created = await createResponse.json();
  return created.contact;
}

async function seedVoiceCloudBackup() {
  const contact = await ensureContact();

  const uniqueUri = `file:///voice-preview-${Date.now()}.wav`;
  const duration = 7;
  const response = await fetch('http://127.0.0.1:3001/api/v1/cloud-backups', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-membership-tier': 'paid',
    },
    body: JSON.stringify({
      contact_id: contact.id,
      type: 'voice',
      content: uniqueUri,
      duration,
      source: 'manual_backup',
    }),
  });

  if (!response.ok) {
    throw new Error(`语音云记录创建失败: ${response.status}`);
  }

  return { uniqueUri, duration, contactName: contact.name };
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();
  const { uniqueUri, duration, contactName } = await seedVoiceCloudBackup();
  const durationLabel = `${duration}″`;
  const typeLabel = `语音 ${durationLabel}`;

  await page.goto('http://127.0.0.1:8082', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('membership_tier', 'paid'));
  await page.reload({ waitUntil: 'networkidle' });
  await unlock(page);
  await openCloudRecords(page);
  await page.getByText(typeLabel, { exact: true }).first().click();
  await page.getByText(contactName, { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('手动备份').first().waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('云端语音预览', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText(durationLabel, { exact: true }).last().waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText(uniqueUri, { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('关闭', { exact: true }).click();
  await page.getByText('恢复到本地', { exact: true }).first().click();
  await page.getByText(contactName, { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('本地私密 · 仅此设备', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText(durationLabel, { exact: true }).last().waitFor({ state: 'visible', timeout: 10000 });
  await page.getByLabel('返回会话列表', { exact: true }).click();
  await page.getByText('微信', { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
  await openCloudRecords(page);
  await page.getByText(typeLabel, { exact: true }).first().click();
  await page.getByText('已恢复', { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });

  console.log(JSON.stringify({ uniqueUri, duration, contactName, voicePreviewOpened: true, restoredToLocal: true, openedConversationDirectly: true, restoreDisabledAfterSuccess: true }));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
