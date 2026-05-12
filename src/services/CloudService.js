import * as ApiService from './ApiService';
import { getMembershipTier, refreshMembershipStatus } from './MembershipService';

const {
  canUseCloudBackup,
  shouldAutoUploadMessage,
} = require('./cloudSyncPolicy');

async function ensureCloudMembership() {
  const snapshot = await refreshMembershipStatus();
  if (!canUseCloudBackup(snapshot.tier)) {
    throw new Error('付费会员才可使用云保存和下载功能');
  }
  return snapshot;
}

export async function uploadToCloud(message) {
  const result = await ApiService.uploadToCloud(
    message.contact_id,
    message.id || null,
    message.type,
    message.content,
    message.cloud_url || null,
    message.duration || null,
    message.source || 'chat_message',
  );
  return result.backup;
}

export async function syncMessageToCloud(message) {
  const localTier = await getMembershipTier();
  const localAllowsUpload = shouldAutoUploadMessage(localTier, message);
  const snapshot = await refreshMembershipStatus();

  if (!localAllowsUpload && !shouldAutoUploadMessage(snapshot.tier, message)) {
    return null;
  }

  if (!canUseCloudBackup(snapshot.tier)) {
    throw new Error('付费会员才可使用云保存和下载功能');
  }

  return uploadToCloud(message);
}

export async function getCloudBackups() {
  await ensureCloudMembership();
  const result = await ApiService.getCloudMessages();
  return result.messages || [];
}

export async function downloadFromCloud(cloudId) {
  await ensureCloudMembership();
  return ApiService.getCloudFileUrl(cloudId);
}

export async function restoreFromCloud(cloudId) {
  await ensureCloudMembership();
  const result = await ApiService.restoreCloudBackup(cloudId);
  return result.message;
}

export async function deleteFromCloud(cloudId) {
  await ensureCloudMembership();
  await ApiService.deleteCloudBackup(cloudId);
  return true;
}
