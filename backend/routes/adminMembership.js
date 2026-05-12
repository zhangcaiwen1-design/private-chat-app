const express = require('express');
const {
  approveMembershipOrder,
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

router.post('/membership-orders/:id/approve', (req, res) => {
  const months = Math.max(1, Number(req.body.months) || 1);
  const result = approveMembershipOrder(req.params.id, 'manual-admin', months);
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

module.exports = router;
