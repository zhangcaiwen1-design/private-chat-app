const express = require('express');
const {
  completeMembershipPurchaseOrder,
  createMembershipManualOrder,
  createMembershipPurchaseOrder,
  getMembershipSnapshot,
} = require('../services/db');
const { getCurrentUserId } = require('../services/membership');
const {
  DEFAULT_MEMBERSHIP_PLAN_CODE,
  getMembershipPlans,
  resolveMembershipPlan,
} = require('../services/membershipPlans');
const {
  buildTestPaymentParams,
  buildWechatVirtualPaymentParams,
  hasWechatVirtualPaymentConfig,
} = require('../services/wechatVirtualPayment');

const router = express.Router();

router.get('/me', (req, res) => {
  const snapshot = getMembershipSnapshot(getCurrentUserId(req));
  res.json(snapshot);
});

router.get('/plans', (req, res) => {
  res.json({ plans: getMembershipPlans() });
});

router.post('/purchase-order', async (req, res) => {
  const userId = getCurrentUserId(req);
  const { plan_code = DEFAULT_MEMBERSHIP_PLAN_CODE, wx_code } = req.body;
  const plan = resolveMembershipPlan(plan_code);
  const useTestProvider = process.env.NODE_ENV === 'test'
    || (process.env.NODE_ENV !== 'production' && process.env.MEMBERSHIP_PURCHASE_PROVIDER === 'test');

  if (!plan || !plan.visible) {
    return res.status(400).json({ error: '请选择有效会员套餐' });
  }

  if (!useTestProvider) {
    if (!wx_code) {
      return res.status(400).json({ error: '请在微信小程序内发起支付' });
    }
    if (!hasWechatVirtualPaymentConfig()) {
      return res.status(503).json({ error: '微信虚拟支付未配置，无法发起真实购买' });
    }
  }

  try {
    const order = createMembershipPurchaseOrder({
      userId,
      amount: plan.amount,
      planCode: plan.code,
      provider: useTestProvider ? 'test' : 'wechat_virtual',
    });
    const payment = useTestProvider
      ? buildTestPaymentParams({ order })
      : await buildWechatVirtualPaymentParams({ order, plan, wxCode: wx_code });
    res.json({ order, payment });
  } catch (error) {
    res.status(400).json({ error: error.message || '无法创建支付订单' });
  }
});

router.post('/purchase-orders/:id/complete', (req, res) => {
  const userId = getCurrentUserId(req);
  const providerTransactionId = String(
    req.body.provider_transaction_id
    || req.body.transaction_id
    || req.body.transactionId
    || req.body.out_trade_no
    || ''
  ).trim();
  const result = completeMembershipPurchaseOrder({
    orderId: req.params.id,
    userId,
    providerTransactionId,
    paymentPayload: req.body.payment_result || req.body,
  });
  if (!result.order) {
    return res.status(404).json({ error: '待支付订单不存在或已处理' });
  }
  res.json({
    order: result.order,
    membership: result.membership,
    snapshot: getMembershipSnapshot(userId),
  });
});

router.post('/manual-order', (req, res) => {
  const userId = getCurrentUserId(req);
  const { amount, plan_code = DEFAULT_MEMBERSHIP_PLAN_CODE, payer_phone, paid_at, payment_proof, note = '' } = req.body;
  const plan = resolveMembershipPlan(plan_code);

  if (!plan || !plan.visible) {
    return res.status(400).json({ error: '请选择有效会员套餐' });
  }

  if (Number(amount) !== Number(plan.amount)) {
    return res.status(400).json({ error: `当前${plan.name}价格为 ${plan.amount} 元` });
  }

  if (!payer_phone || !paid_at || !payment_proof) {
    return res.status(400).json({ error: '请完整填写付款手机号、付款时间和付款凭证' });
  }

  try {
    const order = createMembershipManualOrder({
      userId,
      amount: Number(plan.amount),
      planCode: plan.code,
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
