const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'services', 'AuthService.js'),
  'utf8',
);

function loadAuthService() {
  const storage = new Map([
    ['auth_token', 'token-1'],
    ['auth_status', 'signed_in'],
    ['auth_kickout_reason', ''],
    ['currentChat', '{"id":"chat-1"}'],
    ['previewMessages', '["hello"]'],
  ]);
  const calls = {
    logout: 0,
    bindLocalData: 0,
    clearLocalData: 0,
    login: [],
    register: [],
    updatePassword: [],
    setAuthToken: [],
    clearUserProfile: 0,
    setMembershipTier: [],
    setUserProfile: [],
  };

  const asyncStorage = {
    getItem: async (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: async (key, value) => {
      storage.set(key, value);
    },
    multiSet: async (entries) => {
      for (const [key, value] of entries) {
        storage.set(key, value);
      }
    },
    multiRemove: async (keys) => {
      for (const key of keys) {
        storage.delete(key);
      }
    },
    getAllKeys: async () => Array.from(storage.keys()),
  };

  const sandbox = {
    module: { exports: {} },
    exports: {},
    console,
    setTimeout,
  };

  const transformed = source
    .replace("import AsyncStorage from '@react-native-async-storage/async-storage';", "const AsyncStorage = globalThis.__deps.AsyncStorage;")
    .replace("import * as ApiService from './ApiService';", "const ApiService = globalThis.__deps.ApiService;")
    .replace("import { clearUserProfile, getDeviceId, setUserProfile, setUserUnlockPin } from './UserService';", "const { clearUserProfile, getDeviceId, setUserProfile, setUserUnlockPin } = globalThis.__deps.UserService;")
    .replace("import { setMembershipTier } from './MembershipService';", "const { setMembershipTier } = globalThis.__deps.MembershipService;")
    .replace(/export async function /g, 'async function ')
    .concat('\nmodule.exports = { getStoredAuthToken, persistAuthSession, restoreAuthSession, getKickoutReason, clearKickoutReason, clearSession, signOut, registerWithPhone, loginWithPhone, updateUnlockPin, updatePassword, lockApp };');

  sandbox.globalThis = {
    __deps: {
      AsyncStorage: asyncStorage,
      ApiService: {
        setAuthToken: (token) => calls.setAuthToken.push(token),
        logout: async () => {
          calls.logout += 1;
        },
        register: async (payload) => {
          calls.register.push(payload);
          return { token: 'token-2', user: { id: 'user-1', nickname: '测试用户', phone: '13800000000', avatar_url: null }, membership: { tier: 'free' } };
        },
        login: async (phone, password, deviceId) => {
          calls.login.push({ phone, password, deviceId });
          return { token: 'token-2', user: { id: 'user-1', nickname: '测试用户', phone: '13800000000', avatar_url: null }, membership: { tier: 'free' } };
        },
        getCurrentUser: async () => ({ user: { id: 'user-1', nickname: '测试用户', phone: '13800000000', avatar_url: null }, membership: { tier: 'free' } }),
        bindLocalData: async () => {
          calls.bindLocalData += 1;
          return { success: true };
        },
        clearLocalData: async () => {
          calls.clearLocalData += 1;
          return { success: true };
        },
        updatePassword: async (password) => {
          calls.updatePassword.push(password);
          return { success: true };
        },
      },
      UserService: {
        clearUserProfile: async () => {
          calls.clearUserProfile += 1;
        },
        getDeviceId: async () => 'device-1',
        setUserProfile: async (payload) => {
          calls.setUserProfile.push(payload);
        },
        setUserUnlockPin: async (unlockPin) => {
          calls.setUserProfile.push({ unlockPin });
        },
      },
      MembershipService: {
        setMembershipTier: async (tier) => {
          calls.setMembershipTier.push(tier);
        },
      },
    },
  };

  vm.runInNewContext(transformed, sandbox, { filename: 'AuthService.js' });

  return {
    service: sandbox.module.exports,
    storage,
    calls,
  };
}

test('lockApp only clears sensitive chat state and preserves auth session', async () => {
  const { service, storage, calls } = loadAuthService();

  await service.lockApp();

  assert.equal(storage.get('auth_token'), 'token-1');
  assert.equal(storage.get('auth_status'), 'signed_in');
  assert.equal(storage.has('currentChat'), false);
  assert.equal(storage.has('previewMessages'), false);
  assert.equal(calls.logout, 0);
  assert.equal(calls.clearUserProfile, 0);
  assert.deepEqual(calls.setAuthToken, []);
});

test('signOut clears auth session and notifies backend logout', async () => {
  const { service, storage, calls } = loadAuthService();

  await service.signOut();

  assert.equal(storage.has('auth_token'), false);
  assert.equal(storage.has('auth_status'), false);
  assert.equal(storage.has('currentChat'), false);
  assert.equal(storage.has('previewMessages'), false);
  assert.equal(calls.logout, 1);
  assert.equal(calls.clearUserProfile, 1);
  assert.deepEqual(calls.setMembershipTier, ['free']);
});

test('registerWithPhone auto-binds local data and keeps unlock pin local', async () => {
  const { service, calls } = loadAuthService();

  await service.registerWithPhone({
    phone: '13800000000',
    unlockPin: '123456',
  });

  assert.equal(calls.register[0].phone, '13800000000');
  assert.equal(calls.register[0].avatar_url, null);
  assert.equal(calls.register[0].device_id, 'device-1');
  assert.equal(Object.hasOwn(calls.register[0], 'password'), false);
  assert.equal(calls.bindLocalData, 1);
  assert.equal(calls.clearLocalData, 0);
  assert.equal(calls.setUserProfile[0].userId, 'user-1');
  assert.equal(calls.setUserProfile[0].name, '测试用户');
  assert.equal(calls.setUserProfile[0].phone, '13800000000');
  assert.equal(calls.setUserProfile[0].avatarUrl, null);
  assert.equal(calls.setUserProfile[0].unlockPin, '123456');
});

test('loginWithPhone does not overwrite the local calculator unlock pin', async () => {
  const { service, calls } = loadAuthService();

  await service.loginWithPhone({
    phone: '13800000000',
  });

  assert.deepEqual(calls.login, [{ phone: '13800000000', password: undefined, deviceId: 'device-1' }]);
  assert.equal(calls.setUserProfile[0].userId, 'user-1');
  assert.equal(calls.setUserProfile[0].name, '测试用户');
  assert.equal(calls.setUserProfile[0].phone, '13800000000');
  assert.equal(calls.setUserProfile[0].avatarUrl, null);
  assert.equal(calls.setUserProfile[0].unlockPin, undefined);
});

test('updateUnlockPin only changes the local calculator unlock pin', async () => {
  const { service, calls } = loadAuthService();

  await service.updateUnlockPin('654321');

  assert.deepEqual(calls.updatePassword, []);
  assert.deepEqual(calls.setUserProfile, [{ unlockPin: '654321' }]);
});
