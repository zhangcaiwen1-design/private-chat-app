const crypto = require('crypto');

function getPlanProductId(planCode) {
  const envName = `WECHAT_VIRTUAL_PAY_PRODUCT_${String(planCode || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')}`;
  return process.env[envName] || planCode;
}

function hasWechatVirtualPaymentConfig() {
  return Boolean(
    process.env.WECHAT_MINIPROGRAM_APP_ID &&
    process.env.WECHAT_MINIPROGRAM_APP_SECRET &&
    process.env.WECHAT_VIRTUAL_PAY_OFFER_ID &&
    process.env.WECHAT_VIRTUAL_PAY_APP_KEY
  );
}

function hmacSha256Hex(key, value) {
  return crypto.createHmac('sha256', String(key)).update(String(value)).digest('hex');
}

async function exchangeWxCode(wxCode) {
  if (!wxCode) {
    throw new Error('缺少微信登录凭证');
  }
  if (typeof fetch !== 'function') {
    throw new Error('当前 Node 运行环境不支持调用微信登录接口');
  }

  const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
  url.searchParams.set('appid', process.env.WECHAT_MINIPROGRAM_APP_ID);
  url.searchParams.set('secret', process.env.WECHAT_MINIPROGRAM_APP_SECRET);
  url.searchParams.set('js_code', wxCode);
  url.searchParams.set('grant_type', 'authorization_code');

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.errcode) {
    throw new Error(data.errmsg || '微信登录凭证校验失败');
  }
  if (!data.session_key || !data.openid) {
    throw new Error('微信登录返回缺少 session_key 或 openid');
  }
  return data;
}

async function buildWechatVirtualPaymentParams({ order, plan, wxCode }) {
  if (!hasWechatVirtualPaymentConfig()) {
    throw new Error('微信虚拟支付未配置，请先配置小程序 AppSecret、OfferId 和支付密钥');
  }

  const wxSession = await exchangeWxCode(wxCode);
  const signPayload = {
    offerId: process.env.WECHAT_VIRTUAL_PAY_OFFER_ID,
    buyQuantity: 1,
    env: Number(process.env.WECHAT_VIRTUAL_PAY_ENV || 0),
    currencyType: process.env.WECHAT_VIRTUAL_PAY_CURRENCY || 'CNY',
    productId: getPlanProductId(plan.code),
    goodsPrice: Math.round(Number(plan.amount || 0) * 100),
    outTradeNo: order.provider_order_id,
    attach: order.id,
  };
  const zoneId = String(process.env.WECHAT_VIRTUAL_PAY_ZONE_ID || '').trim();
  if (zoneId) {
    signPayload.zoneId = zoneId;
  }

  const signData = JSON.stringify(signPayload);
  return {
    provider: 'wechat_virtual',
    method: 'wx.requestVirtualPayment',
    mode: process.env.WECHAT_VIRTUAL_PAY_MODE || 'short_series_goods',
    order_id: order.id,
    out_trade_no: order.provider_order_id,
    openid: wxSession.openid,
    signData,
    paySig: hmacSha256Hex(process.env.WECHAT_VIRTUAL_PAY_APP_KEY, `requestVirtualPayment&${signData}`),
    signature: hmacSha256Hex(wxSession.session_key, signData),
  };
}

function buildTestPaymentParams({ order }) {
  return {
    provider: 'test',
    method: 'test_complete',
    order_id: order.id,
    out_trade_no: order.provider_order_id,
  };
}

module.exports = {
  buildTestPaymentParams,
  buildWechatVirtualPaymentParams,
  hasWechatVirtualPaymentConfig,
};
