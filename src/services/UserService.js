import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_APP_UNLOCK_PIN } from '../utils/constants';

const USER_ID_KEY = 'user_id';
const USER_PHONE_KEY = 'user_phone';
const USER_NAME_KEY = 'user_name';
const USER_AVATAR_URL_KEY = 'user_avatar_url';
const USER_DEVICE_ID_KEY = 'user_device_id';
const USER_UNLOCK_PIN_KEY = 'user_unlock_pin';

let profilePromise = null;

// 生成随机用户ID
function generateUserId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function buildPhoneFromUserId(userId) {
  const digits = Array.from(userId).map((char) => (char.charCodeAt(0) % 10).toString()).join('');
  return `13${(digits + '000000000').slice(0, 9)}`;
}

async function ensureUserProfile() {
  if (!profilePromise) {
    profilePromise = (async () => {
      try {
        const stored = await AsyncStorage.multiGet([
          USER_ID_KEY,
          USER_PHONE_KEY,
          USER_NAME_KEY,
          USER_AVATAR_URL_KEY,
          USER_DEVICE_ID_KEY,
          USER_UNLOCK_PIN_KEY,
        ]);
        const values = Object.fromEntries(stored);
        const userId = values[USER_ID_KEY] || generateUserId();
        const phone = values[USER_PHONE_KEY] || buildPhoneFromUserId(userId);
        const name = values[USER_NAME_KEY] || `用户${userId.slice(-4)}`;
        const avatarUrl = values[USER_AVATAR_URL_KEY] || null;
        const deviceId = values[USER_DEVICE_ID_KEY] || `device-${generateUserId()}-${Date.now().toString(36)}`;
        const unlockPin = String(values[USER_UNLOCK_PIN_KEY] || DEFAULT_APP_UNLOCK_PIN);

        await AsyncStorage.multiSet([
          [USER_ID_KEY, userId],
          [USER_PHONE_KEY, phone],
          [USER_NAME_KEY, name],
          [USER_AVATAR_URL_KEY, avatarUrl || ''],
          [USER_DEVICE_ID_KEY, deviceId],
          [USER_UNLOCK_PIN_KEY, unlockPin],
        ]);

        return { userId, phone, name, avatarUrl, deviceId, unlockPin };
      } catch {
        const userId = generateUserId();
        return {
          userId,
          phone: buildPhoneFromUserId(userId),
          name: `用户${userId.slice(-4)}`,
          avatarUrl: null,
          deviceId: `device-${generateUserId()}-${Date.now().toString(36)}`,
          unlockPin: DEFAULT_APP_UNLOCK_PIN,
        };
      }
    })();
  }

  return profilePromise;
}

export async function getUserProfile() {
  return ensureUserProfile();
}

export async function getUserId() {
  const profile = await ensureUserProfile();
  return profile.userId;
}

export async function getUserPhone() {
  const profile = await ensureUserProfile();
  return profile.phone;
}

export async function getUserName() {
  const profile = await ensureUserProfile();
  return profile.name;
}

export async function getUserAvatarUrl() {
  const profile = await ensureUserProfile();
  return profile.avatarUrl;
}

export async function getDeviceId() {
  const profile = await ensureUserProfile();
  return profile.deviceId;
}

export async function getUserUnlockPin() {
  const profile = await ensureUserProfile();
  return profile.unlockPin;
}

export async function setUserProfile({ userId, name, phone, avatarUrl, deviceId, unlockPin }) {
  const current = await ensureUserProfile();
  const next = {
    userId: userId || current.userId,
    name: name || current.name,
    phone: phone || current.phone,
    avatarUrl: avatarUrl === undefined ? current.avatarUrl : (avatarUrl || null),
    deviceId: deviceId || current.deviceId || `device-${generateUserId()}-${Date.now().toString(36)}`,
    unlockPin: String(unlockPin || current.unlockPin || DEFAULT_APP_UNLOCK_PIN),
  };

  profilePromise = Promise.resolve(next);
  await AsyncStorage.multiSet([
    [USER_ID_KEY, next.userId],
    [USER_PHONE_KEY, next.phone],
    [USER_NAME_KEY, next.name],
    [USER_AVATAR_URL_KEY, next.avatarUrl || ''],
    [USER_DEVICE_ID_KEY, next.deviceId],
    [USER_UNLOCK_PIN_KEY, next.unlockPin],
  ]);
}

export async function setUserUnlockPin(unlockPin) {
  const sanitizedPin = String(unlockPin || '').trim();
  if (!sanitizedPin) {
    throw new Error('进入密码不能为空');
  }
  await setUserProfile({ unlockPin: sanitizedPin });
}

export async function clearUserProfile() {
  profilePromise = null;
  await AsyncStorage.multiRemove([USER_ID_KEY, USER_PHONE_KEY, USER_NAME_KEY, USER_AVATAR_URL_KEY]);
}

export async function generateInviteCode() {
  const userId = await getUserId();
  const timestamp = Date.now().toString(36);
  return `QR::${userId}::${timestamp}`;
}

export function parseQRCode(code) {
  if (code.startsWith('QR::')) {
    const parts = code.split('::');
    return parts[1] || null;
  }
  if (code.startsWith('QR-')) {
    const parts = code.split('-');
    return parts[1] || null;
  }
  return null;
}