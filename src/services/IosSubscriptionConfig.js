import Constants from 'expo-constants';

function getExtra() {
  return Constants.expoConfig?.extra || {};
}

function readString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function readBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

export function getIosSubscriptionMode() {
  const configured = readString(
    process.env.EXPO_PUBLIC_IOS_SUBSCRIPTION_MODE || getExtra().iosSubscriptionMode,
    'disabled',
  ).toLowerCase();

  if (configured === 'revenuecat') return 'revenuecat';
  if (configured === 'storekit') return 'storekit';
  return 'disabled';
}

export function getIosSubscriptionProducts() {
  const extra = getExtra();
  return {
    monthly_39_9: readString(process.env.EXPO_PUBLIC_IOS_SUBSCRIPTION_MONTHLY || extra.iosSubscriptionMonthly, 'vip.monthly'),
    quarterly_99: readString(process.env.EXPO_PUBLIC_IOS_SUBSCRIPTION_QUARTERLY || extra.iosSubscriptionQuarterly, 'vip.quarterly'),
    annual_299: readString(process.env.EXPO_PUBLIC_IOS_SUBSCRIPTION_ANNUAL || extra.iosSubscriptionAnnual, 'vip.annual'),
  };
}

export function getRevenueCatPublicKey() {
  return readString(
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_PUBLIC_KEY || getExtra().revenuecatIosPublicKey,
  );
}

export function isIosSubscriptionEnabled() {
  const modeEnabled = getIosSubscriptionMode() !== 'disabled';
  return readBoolean(
    process.env.EXPO_PUBLIC_IOS_SUBSCRIPTION_ENABLED,
    readBoolean(getExtra().iosSubscriptionEnabled, modeEnabled),
  ) && modeEnabled;
}

export function getLegalDocumentUrls() {
  const extra = getExtra();
  return {
    privacyPolicy: readString(
      process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || extra.privacyPolicyUrl,
      'https://privatechat.yifan1.com/privacy.html',
    ),
    termsOfUse: readString(
      process.env.EXPO_PUBLIC_TERMS_OF_USE_URL || extra.termsOfUseUrl,
      'https://privatechat.yifan1.com/terms.html',
    ),
    accountDeletion: readString(
      process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL || extra.accountDeletionUrl,
      'https://privatechat.yifan1.com/account-deletion.html',
    ),
  };
}
