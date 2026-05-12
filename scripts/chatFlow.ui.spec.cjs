const { test, expect } = require('@playwright/test');

test('web chat flow opens a contact without requesting undefined messages', async ({ page }) => {
  const badRequests = [];
  const messageRequests = [];

  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/v1/messages/')) {
      messageRequests.push(url);
    }
    if (url.includes('/api/v1/messages/undefined')) {
      badRequests.push(url);
    }
  });

  await page.goto('http://127.0.0.1:8082', { waitUntil: 'networkidle' });

  for (const digit of UNLOCK_PIN.split('')) {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }
  await page.getByRole('button', { name: '=', exact: true }).click();

  await page.getByText('微信', { exact: true }).waitFor({ state: 'visible' });
  await page.getByText('LOCAL').first().click();

  await expect(page.getByPlaceholder('输入消息')).toBeVisible();
  await expect.poll(() => badRequests.length).toBe(0);
  await expect.poll(() => messageRequests.some((url) => /\/api\/v1\/messages\/[^/?]+\?limit=50/.test(url))).toBe(true);
});
