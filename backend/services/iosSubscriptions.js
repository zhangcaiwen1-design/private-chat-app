const { v4: uuidv4 } = require('uuid');
const {
  completeMembershipPurchaseOrder,
  createMembershipPurchaseOrder,
  getMembershipSnapshot,
} = require('./db');
const {
  getIosProductMap,
  getIosSubscriptionProvider,
  isIosSubscriptionEnabled,
} = require('./iosSubscriptionConfig');

function getPlanCodeByProductId(productId) {
  const productMap = getIosProductMap();
  const matchedEntry = Object.entries(productMap).find(([, configuredProductId]) => configuredProductId === productId);
  return matchedEntry?.[0] || null;
}

function getLatestActiveEntitlement(customerInfo) {
  const entitlements = customerInfo?.entitlements?.active;
  if (!entitlements || typeof entitlements !== 'object') {
    return null;
  }

  return Object.values(entitlements)
    .filter((item) => item?.productIdentifier)
    .sort((a, b) => {
      const aTs = new Date(a?.latestPurchaseDate || a?.purchaseDate || 0).getTime();
      const bTs = new Date(b?.latestPurchaseDate || b?.purchaseDate || 0).getTime();
      return bTs - aTs;
    })[0] || null;
}

function buildProviderTransactionId(entitlement) {
  return String(
    entitlement?.originalTransactionIdentifier
    || entitlement?.transactionIdentifier
    || entitlement?.productIdentifier
    || `ios-subscription-${uuidv4()}`
  ).trim();
}

function buildSyncPayload(payload) {
  const customerInfo = payload?.customer_info || payload?.customerInfo || null;
  const entitlement = getLatestActiveEntitlement(customerInfo);
  return { customerInfo, entitlement };
}

function getIosSubscriptionStatus(userId) {
  return {
    enabled: isIosSubscriptionEnabled(),
    provider: getIosSubscriptionProvider(),
    products: getIosProductMap(),
    snapshot: getMembershipSnapshot(userId),
  };
}

async function syncIosSubscriptionPurchase({ userId, payload }) {
  if (!isIosSubscriptionEnabled()) {
    throw new Error('iOS 订阅同步未启用。');
  }

  const { customerInfo, entitlement } = buildSyncPayload(payload || {});
  if (!customerInfo || !entitlement) {
    return {
      provider: getIosSubscriptionProvider(),
      snapshot: getMembershipSnapshot(userId),
      synced: false,
    };
  }

  const planCode = getPlanCodeByProductId(entitlement.productIdentifier);
  if (!planCode) {
    throw new Error(`未识别的 iOS 订阅商品：${entitlement.productIdentifier}`);
  }

  const order = createMembershipPurchaseOrder({
    userId,
    amount: 0,
    planCode,
    provider: 'ios_subscription',
  });

  const completed = completeMembershipPurchaseOrder({
    orderId: order.id,
    userId,
    providerTransactionId: buildProviderTransactionId(entitlement),
    paymentPayload: {
      provider: getIosSubscriptionProvider(),
      customerInfo,
      entitlement,
    },
  });

  return {
    provider: getIosSubscriptionProvider(),
    synced: true,
    order: completed.order,
    membership: completed.membership,
    snapshot: getMembershipSnapshot(userId),
  };
}

module.exports = {
  getIosSubscriptionStatus,
  syncIosSubscriptionPurchase,
};
