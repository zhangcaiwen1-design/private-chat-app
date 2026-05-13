const storage = require('./utils/storage');

App({
  globalData: {
    apiBaseUrl: 'https://privatechat.yifan1.com/api/v1',
  },

  onLaunch() {
    storage.ensureDeviceId();
  },

  onHide() {
    const session = storage.getSession();
    if (session && session.token) {
      storage.setLocked(true);
    }
  },

  onShow() {
    const session = storage.getSession();
    if (!session || !session.token) {
      return;
    }

    if (storage.isLocked()) {
      const pages = getCurrentPages();
      const currentRoute = pages.length ? pages[pages.length - 1].route : '';
      if (currentRoute !== 'pages/lock/index' && currentRoute !== 'pages/auth/index') {
        wx.reLaunch({
          url: '/pages/lock/index',
        });
      }
    }
  },

  lockCurrentSession() {
    storage.setLocked(true);
  },

  unlockCurrentSession() {
    storage.setLocked(false);
  },
});
