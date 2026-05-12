import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ApiService from './ApiService';

const { createMembershipTierStore } = require('./membershipTierStore');

const membershipTierStore = createMembershipTierStore(AsyncStorage);

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

export async function isPaidMember() {
  return (await getMembershipTier()) === 'paid';
}
