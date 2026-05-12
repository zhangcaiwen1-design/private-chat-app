import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ApiService from './ApiService';
import { clearUserProfile, getDeviceId, setUserProfile, setUserUnlockPin } from './UserService';
import { setMembershipTier } from './MembershipService';

const SENSITIVE_KEYS = ['currentChat', 'previewMessages'];
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_STATUS_KEY = 'auth_status';
const AUTH_KICKOUT_KEY = 'auth_kickout_reason';

export async function authenticateWithBiometric() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 500);
  });
}

export async function getStoredAuthToken() {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function persistAuthSession({ token, user, membership }, options = {}) {
  if (!token || !user?.id) {
    throw new Error('登录信息不完整');
  }

  ApiService.setAuthToken(token);
  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, token],
    [AUTH_STATUS_KEY, 'signed_in'],
    [AUTH_KICKOUT_KEY, ''],
  ]);
  await setUserProfile({
    userId: user.id,
    name: user.nickname,
    phone: user.phone,
    avatarUrl: user.avatar_url || null,
    unlockPin: options.unlockPin,
  });
  await setMembershipTier(membership?.tier || 'free');
  return { token, user, membership };
}

export async function restoreAuthSession() {
  const token = await getStoredAuthToken();
  if (!token) {
    ApiService.setAuthToken(null);
    await clearKickoutReason();
    return null;
  }

  ApiService.setAuthToken(token);
  try {
    const result = await ApiService.getCurrentUser();
    await setUserProfile({
      userId: result.user.id,
      name: result.user.nickname,
      phone: result.user.phone,
      avatarUrl: result.user.avatar_url || null,
    });
    await setMembershipTier(result.membership?.tier || 'free');
    await AsyncStorage.multiSet([
      [AUTH_STATUS_KEY, 'signed_in'],
      [AUTH_KICKOUT_KEY, ''],
    ]);
    return { token, user: result.user, membership: result.membership };
  } catch (error) {
    const isRevoked = error?.message?.includes('登录状态已失效');
    await clearSession();
    await clearAuthState({ preserveKickoutReason: !isRevoked });
    if (isRevoked) {
      await AsyncStorage.setItem(AUTH_KICKOUT_KEY, '');
    }
    return null;
  }
}

export async function getKickoutReason() {
  return AsyncStorage.getItem(AUTH_KICKOUT_KEY);
}

export async function clearKickoutReason() {
  await AsyncStorage.setItem(AUTH_KICKOUT_KEY, '');
}

async function clearAuthState(options = {}) {
  const { preserveKickoutReason = false } = options;

  ApiService.setAuthToken(null);
  const removals = [AUTH_TOKEN_KEY, AUTH_STATUS_KEY];
  if (!preserveKickoutReason) {
    removals.push(AUTH_KICKOUT_KEY);
  }
  await AsyncStorage.multiRemove(removals);
  await clearUserProfile();
  await setMembershipTier('free');
}

export async function clearSession() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const keysToRemove = keys.filter((key) => SENSITIVE_KEYS.includes(key));
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  } catch {}
}

export async function lockApp() {
  await clearSession();
}

export async function signOut() {
  try {
    await ApiService.logout();
  } catch {}
  await clearSession();
  await clearAuthState();
}

export async function registerWithPhone({ phone, unlockPin, nickname, avatarUrl = null }) {
  const nextUnlockPin = String(unlockPin || '').trim();
  if (!nextUnlockPin) {
    throw new Error('密码不能为空');
  }

  const deviceId = await getDeviceId();
  const payload = {
    phone,
    avatar_url: avatarUrl,
    device_id: deviceId,
  };
  if (nickname) {
    payload.nickname = nickname;
  }

  const result = await ApiService.register(payload);
  const session = await persistAuthSession(result, { unlockPin: nextUnlockPin });
  await ApiService.bindLocalData();
  return session;
}

export async function loginWithPhone({ phone, password }) {
  const deviceId = await getDeviceId();
  const result = await ApiService.login(phone, password, deviceId);
  return persistAuthSession(result);
}

export async function updateUnlockPin(unlockPin) {
  const nextUnlockPin = String(unlockPin || '').trim();
  if (!nextUnlockPin) {
    throw new Error('密码不能为空');
  }
  await setUserUnlockPin(nextUnlockPin);
}

export async function updatePassword(password) {
  return updateUnlockPin(password);
}
