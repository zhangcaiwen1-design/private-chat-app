const api = require('../../utils/api');
const storage = require('../../utils/storage');

Page({
  data: {
    phone: '',
    nickname: '',
    password: '',
    loading: false,
    message: '',
  },

  onShow: function () {
    const session = storage.getSession();
    if (!session || !session.token) {
      wx.reLaunch({
        url: '/pages/auth/index',
      });
      return;
    }

    const user = session.user || {};
    this.setData({
      phone: user.phone || '',
      nickname: user.nickname || '',
    });
  },

  onPhoneInput: function (event) {
    this.setData({
      phone: event.detail.value,
    });
  },

  onNicknameInput: function (event) {
    this.setData({
      nickname: event.detail.value,
    });
  },

  onPasswordInput: function (event) {
    this.setData({
      password: event.detail.value,
    });
  },

  saveProfile: async function () {
    this.setData({ loading: true, message: '' });
    try {
      const user = await api.updateProfile({
        phone: String(this.data.phone || '').trim(),
        nickname: String(this.data.nickname || '').trim(),
      });
      const session = storage.getSession() || {};
      session.user = user.user || session.user;
      storage.saveSession(session);
      this.setData({
        message: '资料已保存',
      });
    } catch (error) {
      this.setData({
        message: error.message || '保存失败',
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  savePassword: async function () {
    const password = String(this.data.password || '').trim();
    if (!password) {
      this.setData({
        message: '请输入新密码',
      });
      return;
    }
    this.setData({ loading: true, message: '' });
    try {
      await api.updatePassword(password);
      storage.saveLockPin(password);
      this.setData({
        message: '密码已更新',
        password: '',
      });
    } catch (error) {
      this.setData({
        message: error.message || '更新失败',
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  logout: async function () {
    try {
      await api.logout();
    } catch (error) {
      void error;
    }
    storage.clearSession();
    storage.clearLockPin();
    storage.setLocked(false);
    wx.reLaunch({
      url: '/pages/auth/index',
    });
  },

  openAgreement: function (event) {
    const type = event.currentTarget.dataset.type || 'privacy';
    wx.navigateTo({
      url: `/pages/agreement/index?type=${type}`,
    });
  },
});
