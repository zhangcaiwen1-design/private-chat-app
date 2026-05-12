import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ApiService from './ApiService';
import { getUserProfile } from './UserService';

const { createMembershipTierStore } = require('./membershipTierStore');

const membershipTierStore = createMembershipTierStore(AsyncStorage);

export const MONTHLY_MEMBERSHIP_PLAN = {
  code: 'monthly_9_9',
  amount: 9.9,
  days: 30,
};

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

export async function submitManualMembershipOrder(payload) {
  const result = await ApiService.submitMembershipManualOrder(payload);
  await membershipTierStore.setTier('free');
  return result.order;
}

export async function requestMonthlyMembership() {
  const profile = await getUserProfile();
  const order = await submitManualMembershipOrder({
    amount: MONTHLY_MEMBERSHIP_PLAN.amount,
    payer_phone: profile.phone,
    paid_at: Date.now(),
    payment_proof: 'membership_center_request',
    note: '会员中心发起 9.9 元 / 30 天月卡开通',
  });
  return order;
}

export async function isPaidMember() {
  return (await getMembershipTier()) === 'paid';
}
