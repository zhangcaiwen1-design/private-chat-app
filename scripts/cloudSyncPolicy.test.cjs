const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCloudHeaders,
  canUseCloudBackup,
  shouldAutoUploadMessage,
} = require('../src/services/cloudSyncPolicy');

test('free tier cannot use cloud backup or auto upload messages', () => {
  assert.equal(canUseCloudBackup('free'), false);
  assert.equal(
    shouldAutoUploadMessage('free', { type: 'text', content: '免费消息' }),
    false,
  );
  assert.deepEqual(buildCloudHeaders('free'), {
    'x-membership-tier': 'free',
  });
});

test('paid tier can auto upload supported message types', () => {
  assert.equal(canUseCloudBackup('paid'), true);
  assert.equal(
    shouldAutoUploadMessage('paid', { type: 'text', content: '文本' }),
    true,
  );
  assert.equal(
    shouldAutoUploadMessage('paid', { type: 'image', uri: 'file://demo.png' }),
    true,
  );
  assert.equal(
    shouldAutoUploadMessage('paid', { type: 'voice', uri: 'file://demo.m4a' }),
    true,
  );
  assert.deepEqual(buildCloudHeaders('paid'), {
    'x-membership-tier': 'paid',
  });
});

test('unknown tier falls back to free', () => {
  assert.equal(canUseCloudBackup('vip'), false);
  assert.equal(
    shouldAutoUploadMessage('vip', { type: 'text', content: '未知会员' }),
    false,
  );
  assert.deepEqual(buildCloudHeaders('vip'), {
    'x-membership-tier': 'free',
  });
});
