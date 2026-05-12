const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'components', 'Settings', 'PhoneSettings.js'),
  'utf8',
);

test('phone settings shows pending and success status around submit', () => {
  assert.match(source, /setStatusMessage\('提交中\.\.\.'\)/);
  assert.match(source, /setStatusMessage\(`已修改为 \$\{result\.user\.phone\}`\)/);
});

test('phone settings submits updated phone to profile api', () => {
  assert.match(source, /updateUser\(\{ phone: nextPhone \}\)/);
  assert.match(source, /setUserProfile\(\{ phone: result\.user\.phone \}\)/);
});

test('phone settings confirmation button reflects saving state', () => {
  assert.match(source, /saving \? '保存中\.\.\.' : '确认修改'/);
});
