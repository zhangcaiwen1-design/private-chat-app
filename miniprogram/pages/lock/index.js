const api = require('../../utils/api');
const { DEFAULT_LOCK_PIN, TEMP_ALLOW_CHAT_WITHOUT_MEMBERSHIP } = require('../../utils/constants');
const { getScreenLayout } = require('../../utils/layout');
const storage = require('../../utils/storage');
const { safeCalculate } = require('../../utils/calculator');

Page({
  data: {
    expression: '0',
    result: '',
    error: '',
    verifying: false,
    safeTop: 28,
  },

  onLoad: function () {
    const layout = getScreenLayout();
    this.setData({
      safeTop: layout.safeTop,
    });
  },

  onShow: function () {
    const session = storage.getSession();
    if (!session || !session.token) {
      wx.reLaunch({
        url: '/pages/auth/index',
      });
      return;
    }
    if (!storage.getLockPin()) {
      wx.reLaunch({
        url: '/pages/auth/index',
      });
      return;
    }
    storage.setLocked(true);
    this.setData({
      expression: '0',
      result: '',
      error: '',
      verifying: false,
    });
  },

  append: function (event) {
    const value = event.currentTarget.dataset.value;
    const current = this.data.expression === '0' ? '' : this.data.expression;
    this.setData({
      expression: current + value,
      error: '',
    });
  },

  percent: function () {
    try {
      const result = safeCalculate(this.data.expression);
      const percentValue = Number(result) / 100;
      this.setData({
        expression: String(Number.isInteger(percentValue) ? percentValue : Number(percentValue.toFixed(10))),
        result: '',
        error: '',
      });
    } catch (error) {
      this.setData({
        error: error.message || '计算失败',
      });
    }
  },

  clear: function () {
    this.setData({
      expression: '0',
      result: '',
      error: '',
    });
  },

  backspace: function () {
    const current = this.data.expression === '0' ? '' : this.data.expression;
    const next = current.slice(0, -1) || '0';
    this.setData({
      expression: next,
      error: '',
    });
  },

  evaluate: function () {
    const pin = storage.getLockPin();
    const expression = String(this.data.expression || '').replace(/\s+/g, '');
    if (expression === pin || expression === DEFAULT_LOCK_PIN) {
      if (expression === DEFAULT_LOCK_PIN && pin !== DEFAULT_LOCK_PIN) {
        storage.saveLockPin(DEFAULT_LOCK_PIN);
      }
      this.unlockSession();
      return;
    }

    try {
      const result = safeCalculate(expression);
      this.setData({
        expression: result,
        result: '',
        error: '',
      });
    } catch (error) {
      this.setData({
        result: '',
        error: error.message || '计算失败',
      });
    }
  },

  unlockSession: async function () {
    if (this.data.verifying) {
      return;
    }

    this.setData({
      verifying: true,
      error: '',
    });

    try {
      const status = await api.getMembershipStatus();
      storage.setLocked(false);
      if (TEMP_ALLOW_CHAT_WITHOUT_MEMBERSHIP || (status && status.tier === 'paid' && status.status === 'active')) {
        wx.reLaunch({
          url: '/pages/chats/index',
        });
        return;
      }
      wx.reLaunch({
        url: '/pages/membership/index',
      });
    } catch (error) {
      storage.setLocked(false);
      wx.reLaunch({
        url: '/pages/membership/index',
      });
    } finally {
      this.setData({
        verifying: false,
      });
    }
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
