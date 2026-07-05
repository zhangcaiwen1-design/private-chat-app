const express = require('express');
const {
  approveMembershipOrder,
  findAccountUserById,
  findAccountUserByPhone,
  getMembershipSnapshot,
  grantMembershipToUser,
  listMembershipAdminGrantsByUser,
  listMembershipOrders,
  rejectMembershipOrder,
} = require('../services/db');

const router = express.Router();

function requireAdminKey(req, res, next) {
  const expected = String(process.env.ADMIN_MEMBERSHIP_KEY || '').trim();
  if (!expected) {
    return res.status(503).json({ error: '管理员审核密钥未配置' });
  }
  if (req.get('x-admin-key') !== expected) {
    return res.status(403).json({ error: '无权操作会员审核接口' });
  }
  return next();
}

router.use(requireAdminKey);

router.get('/membership-orders', (req, res) => {
  const status = req.query.status || 'pending_review';
  res.json({ orders: listMembershipOrders(status === 'all' ? null : status) });
});

router.get('/membership-users/lookup', (req, res) => {
  const phone = String(req.query.phone || '').trim();
  if (!phone) {
    return res.status(400).json({ error: '手机号不能为空' });
  }

  const user = findAccountUserByPhone(phone);
  if (!user) {
    return res.status(404).json({ error: '未找到该手机号对应账号' });
  }

  return res.json({
    user: {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatar_url: user.avatar_url || null,
    },
    snapshot: getMembershipSnapshot(user.id),
    grant_history: listMembershipAdminGrantsByUser(user.id),
  });
});

router.post('/membership-orders/:id/approve', (req, res) => {
  const days = req.body.days
    ? Math.max(1, Number(req.body.days) || 1)
    : req.body.months
      ? Math.max(1, Number(req.body.months) || 1) * 30
      : null;
  const result = approveMembershipOrder(req.params.id, 'manual-admin', days);
  if (!result.order) {
    return res.status(404).json({ error: '待审核订单不存在' });
  }
  res.json(result);
});

router.post('/membership-orders/:id/reject', (req, res) => {
  const order = rejectMembershipOrder(req.params.id, 'manual-admin', req.body.reason || '付款信息未通过审核');
  if (!order) {
    return res.status(404).json({ error: '待审核订单不存在' });
  }
  res.json({ order });
});

router.post('/membership-grants', (req, res) => {
  const userId = String(req.body.user_id || '').trim();
  const phone = String(req.body.phone || '').trim();
  const planCode = String(req.body.plan_code || 'monthly_39_9').trim();
  const note = String(req.body.note || '').trim();
  const days = req.body.days
    ? Math.max(1, Number(req.body.days) || 1)
    : req.body.months
      ? Math.max(1, Number(req.body.months) || 1) * 30
      : null;

  if (!userId && !phone) {
    return res.status(400).json({ error: '请至少提供 user_id 或 phone' });
  }

  const user = userId ? findAccountUserById(userId) : findAccountUserByPhone(phone);
  if (!user) {
    return res.status(404).json({ error: '未找到要赠送会员的账号' });
  }

  const membership = grantMembershipToUser({
    userId: user.id,
    planCode,
    overrideDays: days,
    reviewer: 'manual-admin',
    note,
  });

  if (!membership) {
    return res.status(404).json({ error: '未找到要赠送会员的账号' });
  }

  res.json({
    user: {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
    },
    membership,
    snapshot: getMembershipSnapshot(user.id),
    grant_history: listMembershipAdminGrantsByUser(user.id),
  });
});

module.exports = router;
