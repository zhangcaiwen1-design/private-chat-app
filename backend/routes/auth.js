const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { hashPassword, issueSessionForUser, loginWithPhonePassword, logoutSession, sanitizeAccountUser } = require('../services/auth');
const { requireCurrentUser } = require('../services/currentUser');
const { createAccountUser, findAccountUserByPhone, updateAccountUserProfile, updateAccountUserPassword, bindLegacyLocalDataToUser, clearLegacyLocalDataForUser, getMembershipSnapshot } = require('../services/db');

const router = express.Router();

router.post('/phone/lookup', (req, res) => {
  const phone = String(req.body.phone || '').trim();
  if (!phone) {
    return res.status(400).json({ error: '手机号不能为空' });
  }
  const existing = findAccountUserByPhone(phone);
  if (!existing) {
    return res.json({ exists: false, user: null });
  }
  return res.json({
    exists: true,
    user: {
      id: existing.id,
      nickname: existing.nickname,
      avatar_url: existing.avatar_url || null,
    },
  });
});

router.post('/register', (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const password = String(req.body.password || '').trim();
  const nickname = String(req.body.nickname || '').trim();
  const avatarUrl = req.body.avatar_url ? String(req.body.avatar_url).trim() : null;
  const deviceId = String(req.body.device_id || '').trim();

  if (!phone || !password || !nickname || !deviceId) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  if (findAccountUserByPhone(phone)) {
    return res.status(409).json({ error: '该手机号已注册' });
  }

  const user = createAccountUser({
    id: uuidv4(),
    phone,
    passwordHash: hashPassword(password),
    nickname,
    avatarUrl,
  });
  const session = issueSessionForUser(user.id, deviceId);
  return res.json({ token: session.token, user: session.user, membership: getMembershipSnapshot(user.id) });
});

router.post('/login', (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const password = String(req.body.password || '').trim();
  const deviceId = String(req.body.device_id || '').trim();

  if (!phone || !password || !deviceId) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const result = loginWithPhonePassword(phone, password, deviceId);
  if (!result) {
    return res.status(401).json({ error: '手机号或密码错误' });
  }

  return res.json({ token: result.token, user: result.user, membership: getMembershipSnapshot(result.user.id) });
});

router.get('/me', requireCurrentUser, (req, res) => {
  return res.json({ user: req.currentUser, membership: getMembershipSnapshot(req.currentUser.id) });
});

router.post('/logout', requireCurrentUser, (req, res) => {
  const token = String(req.header('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  logoutSession(token);
  return res.json({ success: true });
});

router.post('/profile', requireCurrentUser, (req, res) => {
  const nickname = req.body.nickname === undefined ? undefined : String(req.body.nickname || '').trim();
  const phone = req.body.phone === undefined ? undefined : String(req.body.phone || '').trim();
  const avatarUrl = req.body.avatar_url === undefined ? undefined : (req.body.avatar_url ? String(req.body.avatar_url).trim() : null);

  if (nickname !== undefined && !nickname) {
    return res.status(400).json({ error: '昵称不能为空' });
  }
  if (phone !== undefined) {
    if (!phone) {
      return res.status(400).json({ error: '手机号不能为空' });
    }
    const existing = findAccountUserByPhone(phone);
    if (existing && existing.id !== req.currentUser.id) {
      return res.status(409).json({ error: '该手机号已被使用' });
    }
  }

  const user = updateAccountUserProfile(req.currentUser.id, { nickname, phone, avatarUrl });
  return res.json({ user: sanitizeAccountUser(user) });
});

router.post('/password', requireCurrentUser, (req, res) => {
  const password = String(req.body.password || '').trim();
  if (!password) {
    return res.status(400).json({ error: '密码不能为空' });
  }
  updateAccountUserPassword(req.currentUser.id, hashPassword(password));
  return res.json({ success: true });
});

router.post('/local-data/bind', requireCurrentUser, (req, res) => {
  bindLegacyLocalDataToUser(req.currentUser.id);
  return res.json({ success: true });
});

router.post('/local-data/clear', requireCurrentUser, (req, res) => {
  clearLegacyLocalDataForUser(req.currentUser.id);
  return res.json({ success: true });
});

module.exports = router;
