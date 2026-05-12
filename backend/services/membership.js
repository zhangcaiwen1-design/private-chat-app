const { getMembershipSnapshot } = require('./db');

function getCurrentUserId(req) {
  try {
    return decodeURIComponent(req.get('x-user-id') || 'local-user').trim() || 'local-user';
  } catch {
    return (req.get('x-user-id') || 'local-user').trim() || 'local-user';
  }
}

function requirePaidMembership(req, res, next) {
  const snapshot = getMembershipSnapshot(getCurrentUserId(req));
  if (snapshot.tier !== 'paid' || snapshot.status !== 'active') {
    return res.status(403).json({ error: '付费会员才可使用云保存和下载功能' });
  }
  req.membership = snapshot;
  return next();
}

module.exports = {
  getCurrentUserId,
  requirePaidMembership,
};
