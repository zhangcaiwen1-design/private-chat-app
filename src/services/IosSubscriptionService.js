import { Platform } from 'react-native';
import * as ApiService from './ApiService';
import { getUserId } from './UserService';
import { getIosSubscriptionMode, getIosSubscriptionProducts, getRevenueCatPublicKey, isIosSubscriptionEnabled } from './IosSubscriptionConfig';

let purchasesModulePromise = null;
let configuredAppUserId = null;

function buildUnavailableError() {
  return new Error('iOS 应用内订阅尚未完成配置。');
}

function ensureIosSubscriptionReady() {
  const setup = getIosSubscriptionSetup();
  if (Platform.OS !== 'ios') {
    throw new Error('当前不是 iOS 环境。');
  }
  if (!setup.enabled) {
    throw buildUnavailableError();
  }
  if (setup.mode === 'revenuecat' && !setup.revenueCatPublicKey) {
    throw new Error('缺少 RevenueCat iOS Public SDK Key。');
  }
  return setup;
}

async function getPurchasesModule() {
  if (!purchasesModulePromise) {
    purchasesModulePromise = import('react-native-purchases').then((mod) => mod.default || mod);
  }
  return purchasesModulePromise;
}

async function ensureRevenueCatConfigured() {
  const setup = ensureIosSubscriptionReady();
  if (setup.mode !== 'revenuecat') {
    throw new Error(`暂不支持 ${setup.mode} 订阅模式。`);
  }

  const Purchases = await getPurchasesModule();
  const appUserId = await getUserId();
  if (configuredAppUserId !== appUserId) {
    await Purchases.configure({
      apiKey: setup.revenueCatPublicKey,
      appUserID: appUserId,
    });
    configuredAppUserId = appUserId;
  }
  return { Purchases, setup, appUserId };
}

function mapPlanToProduct(plan, productMap) {
  const productId = productMap[plan.code] || plan.productId;
  return {
    ...plan,
    productId,
  };
}

function normalizeStoreProduct(planCode, product) {
  return {
    code: planCode,
    productId: product.identifier,
    name: product.title || product.defaultOption?.product?.title || planCode,
    amount: typeof product.price === 'number' ? product.price : Number(product.priceString?.replace(/[^\d.]/g, '') || 0),
    priceText: product.priceString || '',
    days: planCode === 'annual_299' ? 365 : planCode === 'quarterly_99' ? 90 : 30,
    badge: planCode === 'monthly_39_9' ? '标准月卡' : planCode === 'quarterly_99' ? '更省一点' : '长期最省',
    summary: planCode === 'annual_299' ? '全年自动续订，可在 Apple 账户中管理。' : planCode === 'quarterly_99' ? '三个月自动续订，可在 Apple 账户中管理。' : '每月自动续订，可在 Apple 账户中管理。',
    featured: planCode === 'monthly_39_9',
  };
}

async function syncCustomerInfo(customerInfo, appUserId) {
  return ApiService.syncIosSubscriptionPurchase({
    app_user_id: appUserId,
    customer_info: customerInfo,
  });
}

export function getIosSubscriptionSetup() {
  return {
    mode: getIosSubscriptionMode(),
    revenueCatPublicKey: getRevenueCatPublicKey(),
    products: getIosSubscriptionProducts(),
    enabled: isIosSubscriptionEnabled(),
  };
}

export async function getAvailableIosSubscriptionProducts() {
  const setup = getIosSubscriptionSetup();
  const fallbackPlans = await ApiService.getMembershipPlans().then((result) => result.plans || []);

  if (!setup.enabled || setup.mode !== 'revenuecat' || Platform.OS !== 'ios') {
    return fallbackPlans.map((plan) => mapPlanToProduct(plan, setup.products));
  }

  const { Purchases } = await ensureRevenueCatConfigured();
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current?.availablePackages?.length) {
    return fallbackPlans.map((plan) => mapPlanToProduct(plan, setup.products));
  }

  const productsById = new Map();
  current.availablePackages.forEach((pkg) => {
    const product = pkg.product || pkg.storeProduct || pkg;
    if (product?.identifier) {
      productsById.set(product.identifier, product);
    }
  });

  return fallbackPlans.map((plan) => {
    const productId = setup.products[plan.code];
    const storeProduct = productsById.get(productId);
    return storeProduct ? normalizeStoreProduct(plan.code, storeProduct) : mapPlanToProduct(plan, setup.products);
  });
}

export async function purchaseIosSubscription(planCode) {
  const { Purchases, setup, appUserId } = await ensureRevenueCatConfigured();
  const productId = setup.products[planCode];
  if (!productId) {
    throw new Error('未找到对应的 iOS 订阅商品。');
  }

  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  const targetPackage = current?.availablePackages?.find((pkg) => {
    const product = pkg.product || pkg.storeProduct || pkg;
    return product?.identifier === productId;
  });

  if (!targetPackage) {
    throw new Error('App Store 中的订阅商品暂不可用，请检查订阅状态和本地化。');
  }

  const purchaseResult = await Purchases.purchasePackage(targetPackage);
  return syncCustomerInfo(purchaseResult.customerInfo, appUserId);
}

export async function restoreIosSubscriptions() {
  const { Purchases, appUserId } = await ensureRevenueCatConfigured();
  const customerInfo = await Purchases.restorePurchases();
  return syncCustomerInfo(customerInfo, appUserId);
}
