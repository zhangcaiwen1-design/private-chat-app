const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { findAccountUserByPhone, findAccountUserById, createAccountSession, findSessionByToken, touchSession, revokeSessionByToken } = require('./db');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${digest}`;
}

function verifyPassword(password, storedHash) {
  const [salt, digest] = String(storedHash || '').split(':');
  if (!salt || !digest) {
    return false;
  }
  const candidate = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(digest));
}

function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function sanitizeAccountUser(user) {
  if (!user) return null;
  const phone = String(user.phone || '');
  return {
    id: user.id,
    phone: phone.startsWith('wx:') ? '' : phone,
    wechat_openid_bound: Boolean(user.wechat_openid),
    nickname: user.nickname,
    avatar_url: user.avatar_url || null,
    status: user.status,
  };
}

function issueSessionForUser(userId, deviceId) {
  const token = createSessionToken();
  createAccountSession({
    id: uuidv4(),
    userId,
    deviceId,
    sessionToken: token,
  });
  const user = findAccountUserById(userId);
  return { token, user: sanitizeAccountUser(user) };
}

function loginWithPhonePassword(phone, password, deviceId) {
  const user = findAccountUserByPhone(phone);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }
  return issueSessionForUser(user.id, deviceId);
}

function loginWithPhone(phone, deviceId) {
  const user = findAccountUserByPhone(phone);
  if (!user) {
    return null;
  }
  return issueSessionForUser(user.id, deviceId);
}

function getSessionUser(token, deviceId) {
  const session = findSessionByToken(token);
  if (!session || session.revoked_at) {
    return { error: 'SESSION_REVOKED' };
  }
  touchSession(session.id);
  return {
    session,
    user: sanitizeAccountUser(findAccountUserById(session.user_id)),
  };
}

function logoutSession(token) {
  revokeSessionByToken(token);
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSessionToken,
  sanitizeAccountUser,
  issueSessionForUser,
  loginWithPhonePassword,
  loginWithPhone,
  getSessionUser,
  logoutSession,
};
