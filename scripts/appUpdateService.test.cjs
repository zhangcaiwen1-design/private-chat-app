const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'services', 'AppUpdateService.js'),
  'utf8',
);

function loadAppUpdateService({ expoConfig = {}, fetchImpl } = {}) {
  const sandbox = {
    module: { exports: {} },
    exports: {},
    require: (specifier) => {
      throw new Error(`Unexpected require: ${specifier}`);
    },
    fetch: fetchImpl,
    console,
  };

  const transformed = source
    .replace("import Constants from 'expo-constants';", 'const Constants = globalThis.__deps.Constants;')
    .replace(/export const /g, 'const ')
    .replace(/export function /g, 'function ')
    .replace(/export async function /g, 'async function ')
    .concat('\nmodule.exports = { CURRENT_APP_VERSION, APP_DOWNLOAD_URL, APP_VERSION_CONFIG_URL, compareVersions, fetchAppVersionConfig, shouldForceUpdate };');

  sandbox.globalThis = {
    __deps: {
      Constants: {
        expoConfig,
      },
    },
  };

  vm.runInNewContext(transformed, sandbox, { filename: 'AppUpdateService.js' });

  return sandbox.module.exports;
}

test('compareVersions compares dotted versions numerically', () => {
  const service = loadAppUpdateService({ expoConfig: { version: '1.0.4' }, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) });

  assert.equal(service.compareVersions('1.0.4', '1.0.3'), 1);
  assert.equal(service.compareVersions('1.0.4', '1.0.4'), 0);
  assert.equal(service.compareVersions('1.0.4', '1.2.0'), -1);
  assert.equal(service.compareVersions('1.10.0', '1.2.0'), 1);
});

test('fetchAppVersionConfig normalizes remote config with defaults', async () => {
  const service = loadAppUpdateService({
    expoConfig: {
      version: '1.0.4',
      extra: {
        appDownloadUrl: 'https://example.com/latest.apk',
        appVersionConfigUrl: 'https://example.com/app-version.json',
      },
    },
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://example.com/app-version.json');
      assert.equal(options?.headers?.Accept, 'application/json');
      assert.equal(options?.headers?.['Cache-Control'], 'no-cache');

      return {
        ok: true,
        json: async () => ({
          latestVersion: '1.0.5',
          minimumSupportedVersion: '1.0.3',
        }),
      };
    },
  });

  const config = await service.fetchAppVersionConfig();

  assert.equal(config.enabled, true);
  assert.equal(config.latestVersion, '1.0.5');
  assert.equal(config.minimumSupportedVersion, '1.0.3');
  assert.equal(config.downloadUrl, 'https://example.com/latest.apk');
  assert.equal(config.title, '发现新版本');
  assert.equal(config.message, '当前版本已停止服务，请先更新到最新版后再继续使用。');
});

test('shouldForceUpdate returns true only when current version is below minimum supported version', () => {
  const service = loadAppUpdateService({ expoConfig: { version: '1.0.4' }, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) });

  assert.equal(service.shouldForceUpdate({ enabled: true, minimumSupportedVersion: '1.0.5' }), true);
  assert.equal(service.shouldForceUpdate({ enabled: true, minimumSupportedVersion: '1.0.4' }), false);
  assert.equal(service.shouldForceUpdate({ enabled: false, minimumSupportedVersion: '9.9.9' }), false);
});
