const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldLockToCalculator } = require('../src/utils/appLockPolicy');

test('locks when app moves from active to background', () => {
  assert.equal(shouldLockToCalculator('active', 'background'), true);
});

test('locks as soon as app becomes inactive', () => {
  assert.equal(shouldLockToCalculator('active', 'inactive'), true);
});

test('does not lock when returning to active', () => {
  assert.equal(shouldLockToCalculator('inactive', 'active'), false);
  assert.equal(shouldLockToCalculator('background', 'active'), false);
});
