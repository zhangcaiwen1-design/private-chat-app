function readString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function getIosSubscriptionProvider() {
  const configured = readString(process.env.IOS_SUBSCRIPTION_PROVIDER, 'disabled').toLowerCase();
  if (configured === 'revenuecat') return 'revenuecat';
  if (configured === 'storekit') return 'storekit';
  return 'disabled';
}

function getRevenueCatSecretKey() {
  return readString(process.env.REVENUECAT_SECRET_API_KEY);
}

function getRevenueCatProjectAppId() {
  return readString(process.env.REVENUECAT_PROJECT_APP_ID);
}

function getIosProductMap() {
  return {
    monthly_39_9: readString(process.env.IOS_SUBSCRIPTION_MONTHLY_PRODUCT_ID, 'vip.monthly'),
    quarterly_99: readString(process.env.IOS_SUBSCRIPTION_QUARTERLY_PRODUCT_ID, 'vip.quarterly'),
    annual_299: readString(process.env.IOS_SUBSCRIPTION_ANNUAL_PRODUCT_ID, 'vip.annual'),
  };
}

function isIosSubscriptionEnabled() {
  return getIosSubscriptionProvider() !== 'disabled';
}

module.exports = {
  getIosProductMap,
  getIosSubscriptionProvider,
  getRevenueCatProjectAppId,
  getRevenueCatSecretKey,
  isIosSubscriptionEnabled,
};
