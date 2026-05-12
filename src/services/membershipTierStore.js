function normalizeTier(value) {
  return value === 'paid' ? 'paid' : 'free';
}

function createMembershipTierStore(storage, key = 'membership_tier') {
  return {
    async getTier() {
      const value = await storage.getItem(key);
      return normalizeTier(value);
    },
    async setTier(tier) {
      const normalized = normalizeTier(tier);
      await storage.setItem(key, normalized);
      return normalized;
    },
  };
}

module.exports = {
  createMembershipTierStore,
  normalizeTier,
};
