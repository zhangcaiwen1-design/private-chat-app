const api = require('../../utils/api');
const { TEMP_ALLOW_CHAT_WITHOUT_MEMBERSHIP } = require('../../utils/constants');
const storage = require('../../utils/storage');

const FALLBACK_PLANS = [
  { code: 'first_month_19_9', name: '首月体验', amount: 19.9, days: 30, bonusDays: 7, badge: '首购赠7天', summary: '限新用户首购，之后按标准月卡续费。', featured: true, visible: true },
  { code: 'monthly_39_9', name: '尊享月卡', amount: 39.9, days: 30, bonusDays: 0, badge: '标准月卡', summary: '适合稳定使用，按月续费。', featured: false, visible: true },
  { code: 'quarterly_99', name: '季卡', amount: 99, days: 90, bonusDays: 0, badge: '更省一点', summary: '一次开通三个月，适合中度使用。', featured: false, visible: true },
  { code: 'annual_299', name: '年卡', amount: 299, days: 365, bonusDays: 0, badge: '长期最省', summary: '一年有效，平均月单价最低。', featured: false, visible: true },
];

function getPlanExtraText(plan) {
  if (Number(plan.bonusDays || 0) > 0) {
    return `首购赠送 ${plan.bonusDays} 天`;
  }
  if (plan.code === 'quarterly_99') {
    return '平均约 33 元/月';
  }
  if (plan.code === 'annual_299') {
    return '平均约 24.9 元/月';
  }
  return '可按月续费';
}

function formatDateTime(value) {
  if (!value) {
    return '';
  }
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getBuyButtonText(plan, submitting) {
  if (submitting) {
    return '正在准备支付…';
  }
  return `立即购买 ${plan ? plan.name : '会员'}`;
}

function showModal(options) {
  return new Promise(function (resolve) {
    wx.showModal(Object.assign({}, options, {
      success: function (result) {
        resolve(Boolean(result && result.confirm));
      },
      fail: function () {
        resolve(false);
      },
    }));
  });
}

Page({
  data: {
    loading: true,
    status: null,
    plans: FALLBACK_PLANS,
    selectedPlanCode: 'first_month_19_9',
    isPaidActive: false,
    isInactive: false,
    isPaymentPending: false,
    error: '',
    submitting: false,
    buyButtonText: getBuyButtonText(FALLBACK_PLANS[0], false),
    allowChatBypass: TEMP_ALLOW_CHAT_WITHOUT_MEMBERSHIP,
  },

  onShow: function () {
    const session = storage.getSession();
    if (!session || !session.token) {
      wx.reLaunch({
        url: '/pages/auth/index',
      });
      return;
    }
    this.loadStatus();
  },

  loadStatus: async function () {
    this.setData({ loading: true, error: '' });
    try {
      const [statusResult, plansResult] = await Promise.all([
        api.getMembershipStatus(),
        api.getMembershipPlans().catch(() => null),
      ]);
      const status = statusResult || {};
      const plans = (plansResult && plansResult.plans && plansResult.plans.length ? plansResult.plans : (status.available_plans || FALLBACK_PLANS))
        .map((plan) => Object.assign({}, plan, {
          totalDays: Number(plan.totalDays || (Number(plan.days || 30) + Number(plan.bonusDays || 0))),
          priceText: `¥${plan.amount}`,
          cycleText: `/${plan.days}天`,
          extraText: getPlanExtraText(plan),
        }));
      const selectedPlan = plans.find((item) => item.code === this.data.selectedPlanCode) || plans[0] || FALLBACK_PLANS[0];
      this.setData({
        status: status,
        plans: plans,
        selectedPlanCode: selectedPlan.code,
        selectedPlan: selectedPlan,
        buyButtonText: getBuyButtonText(selectedPlan, false),
        statusPlan: status.plan_name || status.plan_code || selectedPlan.name,
        expireText: formatDateTime(status.expire_at),
        isPaidActive: Boolean(status && status.tier === 'paid' && status.status === 'active'),
        isPaymentPending: Boolean(status && status.status === 'pending_payment'),
        isInactive: Boolean(status && status.status !== 'active'),
      });
      if (status && status.tier === 'paid' && status.status === 'active') {
        storage.setLocked(false);
      }
    } catch (error) {
      this.setData({
        error: error.message || '无法获取会员状态',
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goChat: function () {
    const status = this.data.status;
    if (!TEMP_ALLOW_CHAT_WITHOUT_MEMBERSHIP && (!status || status.tier !== 'paid' || status.status !== 'active')) {
      this.setData({
        error: '当前账号还未开通会员',
      });
      return;
    }
    storage.setLocked(false);
    wx.reLaunch({
      url: '/pages/chats/index',
    });
  },

  openLock: function () {
    wx.reLaunch({
      url: '/pages/lock/index',
    });
  },

  refresh: function () {
    this.loadStatus();
  },

  confirmPurchase: function (plan) {
    return showModal({
      title: '确认开通会员',
      content: `${plan.name}\n支付金额：¥${plan.amount}\n开通时长：${plan.totalDays || plan.days}天`,
      confirmText: '去支付',
      cancelText: '再看看',
    });
  },

  selectPlan: function (event) {
    const planCode = event.currentTarget.dataset.code;
    const selectedPlan = this.data.plans.find((item) => item.code === planCode) || this.data.selectedPlan;
    if (!selectedPlan) {
      return;
    }
    this.setData({
      selectedPlanCode: selectedPlan.code,
      selectedPlan: selectedPlan,
      buyButtonText: getBuyButtonText(selectedPlan, this.data.submitting),
    });
  },

  requestWxLoginCode: function () {
    return new Promise(function (resolve, reject) {
      wx.login({
        success: function (result) {
          if (result && result.code) {
            resolve(result.code);
            return;
          }
          reject(new Error('无法获取微信登录凭证'));
        },
        fail: function () {
          reject(new Error('微信登录失败，无法发起支付'));
        },
      });
    });
  },

  requestVirtualPayment: function (payment) {
    return new Promise(function (resolve, reject) {
      if (!wx.requestVirtualPayment) {
        reject(new Error('当前微信版本不支持虚拟支付，请升级微信后再试'));
        return;
      }
      wx.requestVirtualPayment({
        signData: payment.signData,
        paySig: payment.paySig,
        signature: payment.signature,
        mode: payment.mode,
        success: function (result) {
          resolve(result || {});
        },
        fail: function (error) {
          reject(new Error((error && error.errMsg) || '支付未完成'));
        },
      });
    });
  },

  completePurchase: async function (order, paymentResult) {
    const result = await api.completeMembershipPurchaseOrder(order.id, {
      provider_transaction_id: paymentResult.transactionId || paymentResult.outTradeNo || order.provider_order_id,
      payment_result: paymentResult,
    });
    const snapshot = result.snapshot || result.membership || null;
    await this.loadStatus();
    if (snapshot && snapshot.tier === 'paid' && snapshot.status === 'active') {
      storage.setLocked(false);
      wx.reLaunch({
        url: '/pages/chats/index',
      });
    }
  },

  buySelectedPlan: function () {
    if (this.data.submitting) {
      return;
    }
    const selectedPlan = this.data.selectedPlan || FALLBACK_PLANS[0];
    this.confirmPurchase(selectedPlan).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.startPurchase(selectedPlan);
    });
  },

  startPurchase: async function (selectedPlan) {
    this.setData({
      submitting: true,
      buyButtonText: getBuyButtonText(selectedPlan, true),
      error: '',
    });
    wx.showLoading({
      title: '准备支付',
      mask: true,
    });
    try {
      const wxCode = await this.requestWxLoginCode();
      const result = await api.createMembershipPurchaseOrder({
        plan_code: selectedPlan.code,
        wx_code: wxCode,
      });
      if (result.payment && result.payment.method === 'test_complete') {
        wx.hideLoading();
        await this.completePurchase(result.order, { transactionId: result.payment.out_trade_no, test: true });
        return;
      }
      wx.hideLoading();
      const paymentResult = await this.requestVirtualPayment(result.payment);
      wx.showLoading({
        title: '开通中',
        mask: true,
      });
      await this.completePurchase(result.order, paymentResult);
    } catch (error) {
      wx.hideLoading();
      wx.showModal({
        title: '暂时无法支付',
        content: error.message || '支付功能还没有配置完成，请稍后再试。',
        showCancel: false,
        confirmText: '知道了',
      });
      this.setData({
        error: error.message || '购买失败',
      });
    } finally {
      wx.hideLoading();
      this.setData({
        submitting: false,
        buyButtonText: getBuyButtonText(this.data.selectedPlan || selectedPlan, false),
      });
    }
  },

  openAgreement: function (event) {
    const type = event.currentTarget.dataset.type || 'membership';
    wx.navigateTo({
      url: `/pages/agreement/index?type=${type}`,
    });
  },

  logout: function () {
    storage.clearSession();
    storage.clearLockPin();
    storage.setLocked(false);
    wx.reLaunch({
      url: '/pages/auth/index',
    });
  },
});
