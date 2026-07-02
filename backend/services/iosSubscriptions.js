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
const { resolveMembershipPlan } = require('./membershipPlans');

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

function buildRevenueCatTransactionId(entitlement) {
  return String(
    entitlement?.originalTransactionIdentifier
    || entitlement?.transactionIdentifier
    || entitlement?.productIdentifier
    || `ios-subscription-${uuidv4()}`
  ).trim();
}

function buildStoreKitTransactionId(purchase) {
  return String(
    purchase?.original_transaction_id
    || purchase?.originalTransactionIdentifierIOS
    || purchase?.transaction_id
    || purchase?.transactionId
    || purchase?.purchase_token
    || purchase?.purchaseToken
    || purchase?.product_id
    || purchase?.productId
    || `ios-storekit-${uuidv4()}`
  ).trim();
}

function buildRevenueCatSyncPayload(payload) {
  const customerInfo = payload?.customer_info || payload?.customerInfo || null;
  const entitlement = getLatestActiveEntitlement(customerInfo);
  if (!customerInfo || !entitlement) {
    return null;
  }

  return {
    provider: 'revenuecat',
    productId: entitlement.productIdentifier,
    providerTransactionId: buildRevenueCatTransactionId(entitlement),
    paymentPayload: {
      provider: 'revenuecat',
      customerInfo,
      entitlement,
    },
  };
}

function buildStoreKitSyncPayload(payload) {
  const rawPurchase = payload?.raw_purchase || payload?.rawPurchase || payload?.purchase || {};
  const productId = payload?.product_id || payload?.productId || rawPurchase?.productId || rawPurchase?.currentPlanId || null;
  if (!productId) {
    return null;
  }

  const purchaseState = payload?.purchase_state || payload?.purchaseState || rawPurchase?.purchaseState || 'purchased';
  if (purchaseState && purchaseState !== 'purchased' && purchaseState !== 'unknown') {
    return null;
  }

  return {
    provider: 'storekit',
    productId,
    providerTransactionId: buildStoreKitTransactionId({
      ...rawPurchase,
      ...payload,
    }),
    paymentPayload: {
      provider: 'storekit',
      productId,
      transactionId: payload?.transaction_id || payload?.transactionId || rawPurchase?.transactionId || null,
      originalTransactionId: payload?.original_transaction_id || rawPurchase?.originalTransactionIdentifierIOS || null,
      purchaseToken: payload?.purchase_token || rawPurchase?.purchaseToken || null,
      purchaseState,
      transactionDate: payload?.transaction_date || rawPurchase?.transactionDate || null,
      expirationDate: payload?.expiration_date || rawPurchase?.expirationDateIOS || null,
      environment: payload?.environment || rawPurchase?.environmentIOS || null,
      rawPurchase,
    },
  };
}

function buildSyncPayload(payload) {
  const provider = String(payload?.provider || '').toLowerCase();
  if (provider === 'storekit') {
    return buildStoreKitSyncPayload(payload);
  }

  if (provider === 'revenuecat' || payload?.customer_info || payload?.customerInfo) {
    return buildRevenueCatSyncPayload(payload);
  }

  return buildStoreKitSyncPayload(payload);
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

  const syncPayload = buildSyncPayload(payload || {});
  if (!syncPayload) {
    return {
      provider: getIosSubscriptionProvider(),
      snapshot: getMembershipSnapshot(userId),
      synced: false,
    };
  }

  const planCode = getPlanCodeByProductId(syncPayload.productId);
  if (!planCode) {
    throw new Error(`未识别的 iOS 订阅商品：${syncPayload.productId}`);
  }
  const plan = resolveMembershipPlan(planCode);
  if (!plan) {
    throw new Error(`未找到 iOS 订阅对应的会员套餐：${planCode}`);
  }

  const order = createMembershipPurchaseOrder({
    userId,
    amount: plan.amount,
    planCode,
    provider: 'ios_subscription',
  });

  const completed = completeMembershipPurchaseOrder({
    orderId: order.id,
    userId,
    providerTransactionId: syncPayload.providerTransactionId,
    paymentPayload: {
      ...syncPayload.paymentPayload,
      configuredProvider: getIosSubscriptionProvider(),
    },
  });

  return {
    provider: syncPayload.provider,
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
