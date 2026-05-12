const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveAppNavigationTarget } = require('../src/utils/resolveAppNavigation');

test('normalizes ChatWindow navigation params into a contact', () => {
  const contact = { id: 12, name: 'Alice' };

  const result = resolveAppNavigationTarget('ChatWindow', { contact });

  assert.deepEqual(result, {
    screen: 'ChatWindow',
    contact,
  });
});

test('keeps direct contact payload for app-local callers', () => {
  const contact = { id: 12, name: 'Alice' };

  const result = resolveAppNavigationTarget(contact);

  assert.deepEqual(result, {
    screen: 'ChatWindow',
    contact,
  });
});
