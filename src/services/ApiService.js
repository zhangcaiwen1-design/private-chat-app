import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getDeviceId, getUserId, getUserProfile } from './UserService';

const { pickConfiguredApiBaseUrl, resolveApiBaseUrl } = require('./resolveApiBaseUrl');

const configuredBaseUrl = pickConfiguredApiBaseUrl({
  envBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  appConfigBaseUrl: Constants.expoConfig?.extra?.apiBaseUrl,
  isDev: typeof __DEV__ !== 'undefined' ? __DEV__ : false,
  platform: Platform.OS,
});

export const API_BASE_URL = resolveApiBaseUrl(configuredBaseUrl, {
  platform: Platform.OS,
  windowHostname: typeof window !== 'undefined' ? window?.location?.hostname ?? null : null,
});

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

function encodeHeaderValue(value) {
  return encodeURIComponent(value || '');
}

async function getHeaders() {
  const [profile, deviceId] = await Promise.all([getUserProfile(), getDeviceId()]);

  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': encodeHeaderValue(profile.userId),
    'x-user-name': encodeHeaderValue(profile.name),
    'x-user-phone': encodeHeaderValue(profile.phone),
    'x-device-id': deviceId,
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  let response;
  try {
    const baseHeaders = await getHeaders();
    response = await fetch(url, {
      ...options,
      headers: {
        ...baseHeaders,
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`无法连接本地服务器：${API_BASE_URL}`);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }

  return data;
}

export async function healthCheck() {
  const base = API_BASE_URL.replace(/\/api\/v1$/, '');
  const response = await fetch(`${base}/health`);
  if (!response.ok) throw new Error('本地服务器健康检查失败');
  return response.json();
}

export async function getContacts() {
  return request('/contacts');
}

export async function addContact(friendPhone, friendName, peerUserId = null) {
  return request('/contacts', {
    method: 'POST',
    body: JSON.stringify({
      phone: friendPhone,
      name: friendName,
      peer_user_id: peerUserId,
    }),
  });
}

export async function addContactByQR(qrCode) {
  return request('/contacts/qr-add', {
    method: 'POST',
    body: JSON.stringify({ qr_code: qrCode }),
  });
}

export async function getIncomingFriendRequests() {
  return request('/contacts/requests/incoming');
}

export async function acceptIncomingFriendRequest(requestId) {
  return request(`/contacts/requests/${requestId}/accept`, {
    method: 'POST',
  });
}

export async function deleteContact(contactId) {
  return request(`/contacts/${contactId}`, { method: 'DELETE' });
}

export async function sendMessage(
  contactId,
  conversationId,
  clientId,
  type,
  content,
  burnAfterRead = false,
  burnDuration = null,
  duration = null,
) {
  return request('/messages', {
    method: 'POST',
    body: JSON.stringify({
      contact_id: contactId,
      conversation_id: conversationId,
      client_id: clientId,
      type,
      content,
      duration,
      burn_after_read: burnAfterRead,
      burn_duration: burnDuration,
    }),
  });
}

export async function getMessages(contactId, limit = 50, before = null) {
  let url = `/messages/${contactId}?limit=${limit}`;
  if (before) url += `&before=${before}`;
  return request(url);
}

export async function getRitualSummary(contactId) {
  return request(`/rituals/${contactId}/summary`);
}

export async function markMessageRead(messageId) {
  return request(`/messages/${messageId}/read`, { method: 'POST' });
}

export async function deleteMessage(messageId) {
  return request(`/messages/${messageId}`, { method: 'DELETE' });
}

export async function uploadToCloud(
  contactId,
  messageId,
  type,
  content,
  cloudUrl = null,
  duration = null,
  source = 'chat_message',
) {
  return request('/cloud-backups', {
    method: 'POST',
    body: JSON.stringify({
      contact_id: contactId,
      message_id: messageId,
      type,
      content,
      cloud_url: cloudUrl,
      duration,
      source,
    }),
  });
}

export async function getCloudMessages() {
  return request('/cloud-backups');
}

export async function getCloudFileUrl(cloudId) {
  const result = await request('/cloud-backups');
  const backup = (result.messages || []).find((item) => item.id === cloudId);
  if (!backup) {
    throw new Error('云端记录不存在');
  }
  return { url: backup.cloud_url || backup.uri || null, backup };
}

export async function deleteCloudBackup(cloudId) {
  return request(`/cloud-backups/${cloudId}`, { method: 'DELETE' });
}

export async function restoreCloudBackup(cloudId) {
  return request(`/cloud-backups/${cloudId}/restore`, { method: 'POST' });
}

export async function getMembershipStatus() {
  return request('/membership/me');
}

export async function submitMembershipManualOrder(payload) {
  return request('/membership/manual-order', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function uploadImage() {
  throw new Error('本地版本暂未启用图片上传');
}

export async function uploadVoice() {
  throw new Error('本地版本暂未启用语音上传');
}

export async function getUploadFileUrl() {
  throw new Error('本地版本暂未启用文件访问');
}

export async function lookupPhone(phone) {
  return request('/auth/phone/lookup', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function register(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(phone, password, deviceId) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, ...(password ? { password } : {}), device_id: deviceId }),
  });
}

export async function logout() {
  return request('/auth/logout', {
    method: 'POST',
  });
}

export async function getCurrentUser() {
  return request('/auth/me');
}

export async function updateUser(data) {
  return request('/auth/profile', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePassword(password) {
  return request('/auth/password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function bindLocalData() {
  return request('/auth/local-data/bind', {
    method: 'POST',
  });
}

export async function clearLocalData() {
  return request('/auth/local-data/clear', {
    method: 'POST',
  });
}

export async function getQRCode() {
  const userId = await getUserId();
  return { qr_code: `QR::${userId}::local` };
}

export async function uploadAvatar() {
  throw new Error('本地版本暂未启用头像上传');
}

export async function getAvatarSignedUrl() {
  return { url: null };
}
