import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ApiService from './ApiService';

const { createMembershipTierStore } = require('./membershipTierStore');

const membershipTierStore = createMembershipTierStore(AsyncStorage);

export const FALLBACK_MEMBERSHIP_PLANS = [
  {
    code: 'monthly_39_9',
    name: '尊享月卡',
    amount: 39.9,
    days: 30,
    bonusDays: 0,
    badge: '标准月卡',
    summary: '适合稳定使用，按月自动续订。',
    featured: true,
  },
  {
    code: 'quarterly_99',
    name: '季度会员',
    amount: 99,
    days: 90,
    bonusDays: 0,
    badge: '更省一点',
    summary: '一次开通三个月，适合持续使用。',
    featured: false,
  },
  {
    code: 'annual_299',
    name: '年度会员',
    amount: 299,
    days: 365,
    bonusDays: 0,
    badge: '长期最省',
    summary: '全年有效，适合长期稳定使用。',
    featured: false,
  },
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
