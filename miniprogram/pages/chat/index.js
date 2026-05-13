const api = require('../../utils/api');
const { getScreenLayout } = require('../../utils/layout');
const storage = require('../../utils/storage');
const { STICKERS, getStickerById } = require('../../utils/stickers');

Page({
  data: {
    contact: null,
    messages: [],
    inputValue: '',
    showMore: false,
    showStickers: false,
    voiceMode: false,
    isRecording: false,
    recordingDuration: 0,
    loading: true,
    error: '',
    stickers: STICKERS,
    scrollTarget: '',
    navTop: 44,
    navHeight: 32,
    navRightPadding: 14,
    headerHeight: 86,
    safeTop: 88,
    safeBottom: 0,
    listBottomPadding: 52,
    inputBarBottomPadding: 8,
    overlayBottomOffset: 52,
    morePanelHeight: 132,
    stickerPanelHeight: 254,
  },

  onLoad: function (options) {
    const contactId = options.id || '';
    const name = decodeURIComponent(options.name || '');
    const layout = getScreenLayout();
    this.contactId = contactId;
    this.recordingManager = wx.getRecorderManager();
    this.innerAudio = wx.createInnerAudioContext();
    this.recordingTimer = null;
    this.recordingStartedAt = 0;
    this.cancelVoice = false;

    this.recordingManager.onStop(async (result) => {
      const duration = Math.max(1, Math.round((Date.now() - this.recordingStartedAt) / 1000));
      this.recordingStartedAt = 0;
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
      this.setData({
        isRecording: false,
        recordingDuration: 0,
      });

      if (this.cancelVoice || !result || !result.tempFilePath) {
        this.cancelVoice = false;
        return;
      }

      this.cancelVoice = false;
      await this.sendMediaMessage({
        type: 'voice',
        content: result.tempFilePath,
        duration: duration,
      });
    });

    this.innerAudio.onEnded(() => {
      this.innerAudio.stop();
    });

    const inputBarHeight = Math.max(layout.safeBottom, 8) + 44;
    this.setData({
      navTop: layout.navTop,
      navHeight: layout.navHeight,
      navRightPadding: layout.navRightPadding,
      headerHeight: layout.headerHeight,
      safeTop: layout.safeTop,
      safeBottom: layout.safeBottom,
      listBottomPadding: inputBarHeight,
      inputBarBottomPadding: Math.max(layout.safeBottom, 8),
      overlayBottomOffset: inputBarHeight,
      morePanelHeight: 132,
      stickerPanelHeight: 254,
      contact: {
        id: contactId,
        name: name || '联系人',
        avatarText: (name || '联').slice(0, 1),
      },
    });
  },

  onUnload: function () {
    clearInterval(this.recordingTimer);
    this.recordingTimer = null;
    if (this.innerAudio) {
      this.innerAudio.destroy();
    }
  },

  onShow: function () {
    const session = storage.getSession();
    if (!session || !session.token) {
      wx.reLaunch({
        url: '/pages/auth/index',
      });
      return;
    }
    this.loadMessages();
  },

  loadMessages: async function () {
    if (!this.contactId) {
      return;
    }
    this.setData({ loading: true, error: '' });
    try {
      const result = await api.getMessages(this.contactId, 50);
      const messages = (result.messages || []).map(function (message) {
        if (message.type !== 'sticker') {
          return Object.assign({}, message, {
            contactAvatarText: message.contactName ? message.contactName.slice(0, 1) : '友',
          });
        }
        return Object.assign({}, message, {
          sticker: getStickerById(message.stickerId || message.content),
          contactAvatarText: message.contactName ? message.contactName.slice(0, 1) : '友',
        });
      });
      this.setData({
        messages: messages,
        scrollTarget: messages.length ? `msg-${messages.length - 1}` : '',
      });
    } catch (error) {
      this.setData({
        error: error.message || '加载消息失败',
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  sendMediaMessage: async function (payload) {
    if (!payload || !payload.content) {
      return;
    }

    const message = {
      contact_id: this.contactId,
      conversation_id: this.contactId,
      client_id: `mini-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      type: payload.type,
      content: payload.content,
    };
    if (payload.duration) {
      message.duration = payload.duration;
    }

    const saved = await api.sendMessage(message);
    this.appendMessage(saved.message || saved);
  },

  appendMessage: function (message) {
    const enriched = Object.assign({}, message, {
      contactAvatarText: message.contactName ? message.contactName.slice(0, 1) : '友',
    });
    const nextMessages = this.data.messages.concat([enriched]);
    this.setData({
      messages: nextMessages,
      inputValue: '',
      showMore: false,
      showStickers: false,
      listBottomPadding: Math.max(this.data.safeBottom, 8) + 44,
      scrollTarget: `msg-${nextMessages.length - 1}`,
    });
  },

  onInput: function (event) {
    this.setData({
      inputValue: event.detail.value,
    });
  },

  sendText: async function () {
    const text = String(this.data.inputValue || '').trim();
    if (!text) {
      return;
    }

    try {
      const saved = await api.sendMessage({
        contact_id: this.contactId,
        conversation_id: this.contactId,
        client_id: `mini-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        type: 'text',
        content: text,
      });
      this.appendMessage(saved.message || saved);
    } catch (error) {
      this.setData({
        error: error.message || '发送失败',
      });
    }
  },

  toggleVoiceMode: function () {
    this.setData({
      voiceMode: !this.data.voiceMode,
      showMore: false,
      showStickers: false,
      inputValue: this.data.voiceMode ? this.data.inputValue : '',
      listBottomPadding: Math.max(this.data.safeBottom, 8) + 44,
    });
  },

  startRecording: async function () {
    if (this.data.isRecording) {
      return;
    }

    try {
      const auth = await new Promise((resolve) => {
        wx.getSetting({
          success: function (res) {
            resolve(Boolean(res.authSetting['scope.record']));
          },
          fail: function () {
            resolve(false);
          },
        });
      });

      if (!auth) {
        const permission = await new Promise((resolve) => {
          wx.authorize({
            scope: 'scope.record',
            success: function () {
              resolve(true);
            },
            fail: function () {
              resolve(false);
            },
          });
        });
        if (!permission) {
          wx.showToast({ title: '请允许麦克风权限', icon: 'none' });
          return;
        }
      }

      this.cancelVoice = false;
      this.recordingStartedAt = Date.now();
      this.setData({
        isRecording: true,
        recordingDuration: 0,
        showMore: false,
        showStickers: false,
        listBottomPadding: Math.max(this.data.safeBottom, 8) + 44,
      });
      clearInterval(this.recordingTimer);
      this.recordingTimer = setInterval(() => {
        this.setData({
          recordingDuration: Math.max(1, Math.round((Date.now() - this.recordingStartedAt) / 1000)),
        });
      }, 1000);

      this.recordingManager.start({
        duration: 60000,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 96000,
        format: 'mp3',
      });
    } catch (error) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
      this.recordingStartedAt = 0;
      this.setData({
        isRecording: false,
        recordingDuration: 0,
        error: error.message || '录音失败',
      });
    }
  },

  stopRecording: function () {
    if (!this.data.isRecording || !this.recordingManager) {
      return;
    }
    this.recordingManager.stop();
  },

  cancelRecording: function () {
    if (!this.data.isRecording || !this.recordingManager) {
      return;
    }
    this.cancelVoice = true;
    this.recordingManager.stop();
  },

  toggleMore: function () {
    const nextShowMore = !this.data.showMore;
    const inputBarHeight = Math.max(this.data.safeBottom, 8) + 44;
    this.setData({
      showMore: nextShowMore,
      showStickers: false,
      listBottomPadding: inputBarHeight + (nextShowMore ? this.data.morePanelHeight + 8 : 0),
    });
  },

  chooseAlbum: async function () {
    this.setData({
      showMore: false,
      showStickers: false,
      listBottomPadding: Math.max(this.data.safeBottom, 8) + 44,
    });
    try {
      const result = await new Promise((resolve, reject) => {
        wx.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album'],
          success: resolve,
          fail: reject,
        });
      });
      const filePath = result.tempFilePaths && result.tempFilePaths[0];
      if (filePath) {
        await this.sendMediaMessage({
          type: 'image',
          content: filePath,
        });
      }
    } catch (error) {
      if (error && error.errMsg && error.errMsg.indexOf('cancel') >= 0) {
        return;
      }
      this.setData({
        error: error.message || '无法选择图片',
      });
    }
  },

  takePhoto: async function () {
    this.setData({
      showMore: false,
      showStickers: false,
      listBottomPadding: Math.max(this.data.safeBottom, 8) + 44,
    });
    try {
      const result = await new Promise((resolve, reject) => {
        wx.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['camera'],
          success: resolve,
          fail: reject,
        });
      });
      const filePath = result.tempFilePaths && result.tempFilePaths[0];
      if (filePath) {
        await this.sendMediaMessage({
          type: 'image',
          content: filePath,
        });
      }
    } catch (error) {
      if (error && error.errMsg && error.errMsg.indexOf('cancel') >= 0) {
        return;
      }
      this.setData({
        error: error.message || '无法拍照发送',
      });
    }
  },

  openStickers: function () {
    this.setData({
      showMore: false,
      showStickers: true,
      listBottomPadding: Math.max(this.data.safeBottom, 8) + 44 + 254 + 8,
    });
  },

  sendSticker: async function (event) {
    const stickerId = event.currentTarget.dataset.id;
    try {
      const saved = await api.sendMessage({
        contact_id: this.contactId,
        conversation_id: this.contactId,
        client_id: `mini-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        type: 'sticker',
        content: stickerId,
      });
      this.setData({
        showStickers: false,
        showMore: false,
      });
      this.appendMessage(saved.message || saved);
    } catch (error) {
      this.setData({
        error: error.message || '发送失败',
      });
    }
  },

  playVoice: function (event) {
    const uri = event.currentTarget.dataset.uri;
    if (!uri || !this.innerAudio) {
      return;
    }
    this.innerAudio.stop();
    this.innerAudio.src = uri;
    this.innerAudio.play();
  },

  openContacts: function () {
    wx.reLaunch({
      url: '/pages/chats/index',
    });
  },

  openLock: function () {
    storage.setLocked(true);
    wx.reLaunch({
      url: '/pages/lock/index',
    });
  },
});
