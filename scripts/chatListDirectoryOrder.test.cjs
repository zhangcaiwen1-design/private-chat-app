const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'components', 'Chat', 'ChatList.js'),
  'utf8',
);

test('directory shows phone settings before unlock password settings', () => {
  const phoneIndex = source.indexOf("key: 'phone-settings'");
  const passwordIndex = source.indexOf("key: 'unlock-pin-settings'");

  assert.notEqual(phoneIndex, -1);
  assert.notEqual(passwordIndex, -1);
  assert.ok(phoneIndex < passwordIndex, 'phone settings should appear before password settings');
});

test('action sheet still opens add-friend flow and does not own phone settings entry', () => {
  assert.match(source, /accessibilityLabel="打开手机号添加"/);
});
