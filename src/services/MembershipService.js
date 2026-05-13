import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ApiService from './ApiService';

const { createMembershipTierStore } = require('./membershipTierStore');

const membershipTierStore = createMembershipTierStore(AsyncStorage);

export const MONTHLY_MEMBERSHIP_PLAN = {
  code: 'first_month_19_9',
  name: '首月体验',
  amount: 19.9,
  days: 30,
  bonusDays: 7,
  badge: '首购赠7天',
  summary: '限新用户首购，之后按标准月卡续费。',
  featured: true,
};

export const FALLBACK_MEMBERSHIP_PLANS = [
  MONTHLY_MEMBERSHIP_PLAN,
  { code: 'monthly_39_9', name: '尊享月卡', amount: 39.9, days: 30, bonusDays: 0, badge: '标准月卡', summary: '适合稳定使用，按月续费。' },
  { code: 'quarterly_99', name: '季卡', amount: 99, days: 90, bonusDays: 0, badge: '更省一点', summary: '一次开通三个月，适合中度使用。' },
  { code: 'annual_299', name: '年卡', amount: 299, days: 365, bonusDays: 0, badge: '长期最省', summary: '一年有效，平均月单价最低。' },
];

export function isActiveMembership(snapshot) {
  return snapshot?.tier === 'paid' && snapshot?.status === 'active';
}

export async function getMembershipTier() {
  return membershipTierStore.getTier();
}

export async function setMembershipTier(tier) {
  return membershipTierStore.setTier(tier);
}

export async function refreshMembershipStatus() {
  const snapshot = await ApiService.getMembershipStatus();
  await membershipTierStore.setTier(snapshot.tier);
  return snapshot;
}

export async function refreshMembershipPlans() {
  try {
    const result = await ApiService.getMembershipPlans();
    return result.plans && result.plans.length ? result.plans : FALLBACK_MEMBERSHIP_PLANS;
  } catch {
    return FALLBACK_MEMBERSHIP_PLANS;
  }
}

export async function isPaidMember() {
  return (await getMembershipTier()) === 'paid';
}
