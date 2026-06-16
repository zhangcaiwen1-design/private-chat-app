const api = require('../../utils/api');
const { DEFAULT_LOCK_PIN, TEMP_ALLOW_CHAT_WITHOUT_MEMBERSHIP } = require('../../utils/constants');
const { getScreenLayout } = require('../../utils/layout');
const storage = require('../../utils/storage');

Page({
  data: {
    password: DEFAULT_LOCK_PIN,
    agreed: true,
    loading: false,
    error: '',
    safeTop: 56,
  },

  onLoad: function () {
    const layout = getScreenLayout();
    this.setData({
      safeTop: layout.safeTop,
    });
  },

  onShow: function () {
    const session = storage.getSession();
    if (session && session.token) {
      wx.reLaunch({
        url: '/pages/lock/index',
      });
      return;
    }

    if (!String(this.data.password || '').trim()) {
      this.setData({
        password: DEFAULT_LOCK_PIN,
      });
    }
  },

  onPasswordInput: function (event) {
    this.setData({
      password: event.detail.value,
    });
  },

  onAgreementChange: function (event) {
    this.setData({
      agreed: Boolean(event.detail.value.length),
    });
  },

  submit: async function () {
    const password = String(this.data.password || '').trim() || DEFAULT_LOCK_PIN;

    if (!this.data.agreed) {
      this.setData({ error: '请先同意协议', loading: false });
      return;
    }
    if (!password) {
      this.setData({ error: '请输入本地解锁密码', loading: false });
      return;
    }

    this.setData({ loading: true, error: '' });
    try {
      const wxLogin = await new Promise(function (resolve, reject) {
        wx.login({
          success: function (res) {
            if (res && res.code) {
              resolve(res);
              return;
            }
            reject(new Error('微信登录凭证获取失败'));
          },
          fail: function () {
            reject(new Error('无法调用微信登录'));
          },
        });
      });
      const result = await api.wechatLogin({
        code: wxLogin.code,
      });

      storage.saveSession(result);
      storage.saveLockPin(password);
      storage.setLocked(false);

      const status = await api.getMembershipStatus().catch(function () {
        return null;
      });
      wx.reLaunch({
        url: TEMP_ALLOW_CHAT_WITHOUT_MEMBERSHIP || (status && status.tier === 'paid' && status.status === 'active')
          ? '/pages/chats/index'
          : '/pages/membership/index',
      });
    } catch (error) {
      this.setData({
        error: error.message || '登录失败',
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  openAgreement: function (event) {
    const type = event.currentTarget.dataset.type || 'privacy';
    wx.navigateTo({
      url: `/pages/agreement/index?type=${type}`,
    });
  },
});
