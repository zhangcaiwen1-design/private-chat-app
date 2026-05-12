const test = require('node:test');
const assert = require('node:assert/strict');
const { pickConfiguredApiBaseUrl, resolveApiBaseUrl } = require('../src/services/resolveApiBaseUrl');

test('uses app config api url outside development builds', () => {
  const resolved = pickConfiguredApiBaseUrl({
    envBaseUrl: 'http://192.168.1.114:3001/api/v1',
    appConfigBaseUrl: 'https://privatechat.yifan1.com/api/v1',
    isDev: false,
  });

  assert.equal(resolved, 'https://privatechat.yifan1.com/api/v1');
});

test('keeps web builds on app config api url during development', () => {
  const resolved = pickConfiguredApiBaseUrl({
    envBaseUrl: 'http://192.168.1.114:3001/api/v1',
    appConfigBaseUrl: 'https://privatechat.yifan1.com/api/v1',
    isDev: true,
    platform: 'web',
  });

  assert.equal(resolved, 'https://privatechat.yifan1.com/api/v1');
});

test('allows env api url override on native development builds', () => {
  const resolved = pickConfiguredApiBaseUrl({
    envBaseUrl: 'http://192.168.1.114:3001/api/v1',
    appConfigBaseUrl: 'https://privatechat.yifan1.com/api/v1',
    isDev: true,
    platform: 'android',
  });

  assert.equal(resolved, 'http://192.168.1.114:3001/api/v1');
});

test('uses current web hostname for local backend URLs', () => {
  const resolved = resolveApiBaseUrl('http://10.0.0.8:3001/api/v1/', {
    platform: 'web',
    windowHostname: '127.0.0.1',
  });

  assert.equal(resolved, 'http://127.0.0.1:3001/api/v1');
});

test('keeps production https host on local web preview', () => {
  const resolved = resolveApiBaseUrl('https://privatechat.yifan1.com/api/v1', {
    platform: 'web',
    windowHostname: '127.0.0.1',
  });

  assert.equal(resolved, 'https://privatechat.yifan1.com/api/v1');
});

test('keeps configured URL on native platforms', () => {
  const resolved = resolveApiBaseUrl('http://10.0.0.8:3001/api/v1/', {
    platform: 'android',
    windowHostname: '127.0.0.1',
  });

  assert.equal(resolved, 'http://10.0.0.8:3001/api/v1');
});
