const test = require('node:test');
const assert = require('node:assert/strict');
const { createMembershipTierStore } = require('../src/services/membershipTierStore');

test('membership tier store defaults to free and can upgrade to paid', async () => {
  const memory = new Map();
  const store = createMembershipTierStore({
    getItem: async (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: async (key, value) => memory.set(key, value),
  });

  assert.equal(await store.getTier(), 'free');

  await store.setTier('paid');

  assert.equal(await store.getTier(), 'paid');
});

test('membership tier store falls back to free for unknown values', async () => {
  const store = createMembershipTierStore({
    getItem: async () => 'vip',
    setItem: async () => {},
  });

  assert.equal(await store.getTier(), 'free');
});
