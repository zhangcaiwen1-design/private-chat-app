const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'utils', 'constants.js'),
  'utf8',
);

function loadConstants(env = {}) {
  const sandbox = {
    module: { exports: {} },
    exports: {},
    process: { env },
  };

  const transformed = source
    .replace(/export const /g, 'const ')
    .concat('\nmodule.exports = { DEFAULT_APP_UNLOCK_PIN, SCREENS, STORAGE_KEYS };');

  vm.runInNewContext(transformed, sandbox, { filename: 'constants.js' });
  return sandbox.module.exports;
}

test('uses EXPO_PUBLIC_APP_UNLOCK_PIN as default unlock pin when provided', () => {
  const constants = loadConstants({ EXPO_PUBLIC_APP_UNLOCK_PIN: '246810' });
  assert.equal(constants.DEFAULT_APP_UNLOCK_PIN, '246810');
});

test('falls back to built-in default unlock pin when env is missing', () => {
  const constants = loadConstants({});
  assert.equal(constants.DEFAULT_APP_UNLOCK_PIN, '198703');
});
