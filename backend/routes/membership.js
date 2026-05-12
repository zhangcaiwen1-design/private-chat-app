const express = require('express');
const {
  createMembershipManualOrder,
  getMembershipSnapshot,
} = require('../services/db');
const { getCurrentUserId } = require('../services/membership');

const router = express.Router();

router.get('/me', (req, res) => {
  const snapshot = getMembershipSnapshot(getCurrentUserId(req));
  res.json(snapshot);
});

router.post('/manual-order', (req, res) => {
  const userId = getCurrentUserId(req);
  const { amount, payer_phone, paid_at, payment_proof, note = '' } = req.body;

  if (Number(amount) !== 9.9) {
    return res.status(400).json({ error: '当前会员价格为 9.9 元/月' });
  }

  if (!payer_phone || !paid_at || !payment_proof) {
    return res.status(400).json({ error: '请完整填写付款手机号、付款时间和付款凭证' });
  }

  try {
    const order = createMembershipManualOrder({
      userId,
      amount: 9.9,
      payerPhone: payer_phone,
      paidAt: Number(paid_at),
      paymentProof: payment_proof,
      note,
    });
    res.json({ order });
  } catch (error) {
    res.status(409).json({ error: error.message || '无法创建会员申请' });
  }
});

module.exports = router;
