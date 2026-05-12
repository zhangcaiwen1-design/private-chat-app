const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'services', 'CloudService.js'),
  'utf8',
);

function loadCloudService({ tier = 'free', refreshedTier = tier } = {}) {
  const apiCalls = [];
  const sandbox = {
    module: { exports: {} },
    exports: {},
    require: (specifier) => {
      if (specifier === './cloudSyncPolicy') {
        return require('../src/services/cloudSyncPolicy');
      }
      throw new Error(`Unexpected require: ${specifier}`);
    },
    console,
  };

  const transformed = source
    .replace("import * as ApiService from './ApiService';", "const ApiService = globalThis.__deps.ApiService;")
    .replace("import { getMembershipTier, refreshMembershipStatus } from './MembershipService';", "const { getMembershipTier, refreshMembershipStatus } = globalThis.__deps.MembershipService;")
    .replace(/export async function /g, 'async function ')
    .concat('\nmodule.exports = { uploadToCloud, syncMessageToCloud, getCloudBackups, downloadFromCloud, deleteFromCloud };');

  sandbox.globalThis = {
    __deps: {
      ApiService: {
        uploadToCloud: async (...args) => {
          apiCalls.push({ type: 'uploadToCloud', args });
          return { backup: { id: 'backup-1' } };
        },
        getCloudMessages: async (...args) => {
          apiCalls.push({ type: 'getCloudMessages', args });
          return { messages: [{ id: 'backup-1' }] };
        },
        getCloudFileUrl: async (...args) => {
          apiCalls.push({ type: 'getCloudFileUrl', args });
          return { url: 'file://cloud.txt', backup: { id: 'backup-1' } };
        },
        deleteCloudBackup: async (...args) => {
          apiCalls.push({ type: 'deleteCloudBackup', args });
          return { success: true };
        },
      },
      MembershipService: {
        getMembershipTier: async () => tier,
        refreshMembershipStatus: async () => ({ tier: refreshedTier }),
      },
    },
  };

  vm.runInNewContext(transformed, sandbox, { filename: 'CloudService.js' });

  return {
    apiCalls,
    service: sandbox.module.exports,
  };
}

test('free tier blocks cloud backup access before hitting api', async () => {
  const { service, apiCalls } = loadCloudService({ tier: 'free' });

  await assert.rejects(
    service.getCloudBackups(),
    /付费会员才可使用云保存和下载功能/,
  );

  await assert.rejects(
    service.downloadFromCloud('backup-1'),
    /付费会员才可使用云保存和下载功能/,
  );

  assert.equal(apiCalls.length, 0);
});

test('paid tier can access cloud apis and upload payloads', async () => {
  const { service, apiCalls } = loadCloudService({ tier: 'paid' });

  await service.getCloudBackups();
  await service.downloadFromCloud('backup-1');
  await service.deleteFromCloud('backup-1');
  await service.uploadToCloud({
    contact_id: 'contact-1',
    type: 'text',
    content: 'hello',
    duration: null,
  });

  assert.deepEqual(apiCalls[0], {
    type: 'getCloudMessages',
    args: [],
  });
  assert.deepEqual(apiCalls[1], {
    type: 'getCloudFileUrl',
    args: ['backup-1'],
  });
  assert.deepEqual(apiCalls[2], {
    type: 'deleteCloudBackup',
    args: ['backup-1'],
  });
  assert.deepEqual(apiCalls[3], {
    type: 'uploadToCloud',
    args: ['contact-1', null, 'text', 'hello', null, null, 'chat_message'],
  });
});

test('auto sync only uploads for paid tier', async () => {
  const freeRun = loadCloudService({ tier: 'free' });
  const paidRun = loadCloudService({ tier: 'paid' });

  const freeResult = await freeRun.service.syncMessageToCloud({
    contact_id: 'contact-1',
    type: 'text',
    content: 'free message',
  });
  const paidResult = await paidRun.service.syncMessageToCloud({
    contact_id: 'contact-1',
    type: 'text',
    content: 'paid message',
  });

  assert.equal(freeResult, null);
  assert.deepEqual(paidResult, { id: 'backup-1' });
  assert.equal(freeRun.apiCalls.length, 0);
  assert.equal(paidRun.apiCalls.filter((call) => call.type === 'uploadToCloud').length, 1);
});

test('auto sync still uploads after backend membership becomes paid even if local cache is stale', async () => {
  const run = loadCloudService({ tier: 'free', refreshedTier: 'paid' });

  const result = await run.service.syncMessageToCloud({
    contact_id: 'contact-1',
    type: 'text',
    content: 'freshly approved member message',
  });

  assert.deepEqual(result, { id: 'backup-1' });
  assert.equal(run.apiCalls.filter((call) => call.type === 'uploadToCloud').length, 1);
});
