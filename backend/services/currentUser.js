const { getSessionUser } = require('./auth');

function requireCurrentUser(req, res, next) {
  const token = String(req.header('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const deviceId = String(req.header('x-device-id') || '').trim();

  if (!token || !deviceId) {
    return res.status(401).json({ error: '登录状态已失效', error_code: 'SESSION_REVOKED' });
  }

  const result = getSessionUser(token, deviceId);
  if (result?.error) {
    return res.status(401).json({ error: '登录状态已失效', error_code: 'SESSION_REVOKED' });
  }

  req.currentUser = result.user;
  req.currentSession = result.session;
  return next();
}

module.exports = { requireCurrentUser };
