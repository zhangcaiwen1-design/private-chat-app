const { DEFAULT_LOCK_PIN, STORAGE_KEYS } = require('./constants');

function readSync(key, fallback = null) {
  try {
    const value = wx.getStorageSync(key);
    return value === '' || value === undefined ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function writeSync(key, value) {
  wx.setStorageSync(key, value);
}

function removeSync(key) {
  try {
    wx.removeStorageSync(key);
  } catch (error) {
    void error;
  }
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function ensureDeviceId() {
  let deviceId = readSync(STORAGE_KEYS.deviceId, '');
  if (!deviceId) {
    deviceId = createId('mini');
    writeSync(STORAGE_KEYS.deviceId, deviceId);
  }
  return deviceId;
}

function getDeviceId() {
  return ensureDeviceId();
}

function getSession() {
  return readSync(STORAGE_KEYS.session, null);
}

function saveSession(session) {
  writeSync(STORAGE_KEYS.session, session);
}

function clearSession() {
  removeSync(STORAGE_KEYS.session);
}

function getLockPin() {
  return readSync(STORAGE_KEYS.lockPin, DEFAULT_LOCK_PIN);
}

function saveLockPin(pin) {
  writeSync(STORAGE_KEYS.lockPin, String(pin || DEFAULT_LOCK_PIN));
}

function clearLockPin() {
  removeSync(STORAGE_KEYS.lockPin);
}

function isLocked() {
  return Boolean(readSync(STORAGE_KEYS.locked, true));
}

function setLocked(value) {
  writeSync(STORAGE_KEYS.locked, Boolean(value));
}

function getReviewerProfile() {
  return readSync(STORAGE_KEYS.reviewer, {
    phone: '',
    note: '',
  });
}

function saveReviewerProfile(profile) {
  writeSync(STORAGE_KEYS.reviewer, profile);
}

module.exports = {
  createId,
  ensureDeviceId,
  getDeviceId,
  getSession,
  saveSession,
  clearSession,
  getLockPin,
  saveLockPin,
  clearLockPin,
  isLocked,
  setLocked,
  getReviewerProfile,
  saveReviewerProfile,
};
