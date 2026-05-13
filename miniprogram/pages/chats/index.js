const api = require('../../utils/api');
const { TEMP_ALLOW_CHAT_WITHOUT_MEMBERSHIP } = require('../../utils/constants');
const { getScreenLayout } = require('../../utils/layout');
const storage = require('../../utils/storage');

function formatTime(value) {
  if (!value) {
    return '';
  }
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

function resolveAvatarClass(name) {
  const source = String(name || '友');
  const code = source.charCodeAt(0) || 0;
  return `avatar-color-${code % 5}`;
}

function buildRequestsSubtitle(count) {
  return count ? `${count} 条待处理申请` : '查看新的好友申请';
}

Page({
  data: {
    loading: true,
    error: '',
    contacts: [],
    displayContacts: [],
    requests: [],
    displayRequests: [],
    requestsExpanded: false,
    showAdd: false,
    newPhone: '',
    newName: '',
    searchText: '',
    lookupLoading: false,
    phoneLookupResult: null,
    phoneLookupAvatar: '',
    submitting: false,
    activeTab: 'messages',
    activePanel: 'root',
    navTop: 44,
    navHeight: 32,
    navRightPadding: 14,
    headerHeight: 86,
    safeTop: 88,
    safeBottom: 0,
    listBottomPadding: 70,
    directoryRequestsSubtitle: buildRequestsSubtitle(0),
  },

  onLoad: function () {
    const layout = getScreenLayout();
    this.setData({
      navTop: layout.navTop,
      navHeight: layout.navHeight,
      navRightPadding: layout.navRightPadding,
      headerHeight: layout.headerHeight,
      safeTop: layout.safeTop,
      safeBottom: layout.safeBottom,
      listBottomPadding: layout.safeBottom + 64,
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
    this.load();
  },

  load: async function () {
    this.setData({ loading: true, error: '' });
    try {
      const status = await api.getMembershipStatus();
      if (!TEMP_ALLOW_CHAT_WITHOUT_MEMBERSHIP && (!status || status.tier !== 'paid' || status.status !== 'active')) {
        wx.reLaunch({
          url: '/pages/membership/index',
        });
        return;
      }

      const results = await Promise.all([
        api.getContacts(),
        api.getIncomingFriendRequests(),
      ]);

      this.setData({
        contacts: results[0].contacts || [],
        displayContacts: this.filterContacts(results[0].contacts || [], this.data.searchText),
        requests: results[1].requests || [],
        displayRequests: this.filterRequests(results[1].requests || [], this.data.searchText),
        directoryRequestsSubtitle: buildRequestsSubtitle((results[1].requests || []).length),
      });
    } catch (error) {
      this.setData({
        error: error.message || '加载失败',
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  openAdd: function () {
    this.setData({
      showAdd: true,
      error: '',
      requestsExpanded: false,
    });
  },

  closeAdd: function () {
    this.setData({
      showAdd: false,
      newPhone: '',
      newName: '',
      lookupLoading: false,
      phoneLookupResult: null,
      phoneLookupAvatar: '',
    });
  },

  onPhoneInput: function (event) {
    this.setData({
      newPhone: event.detail.value,
      phoneLookupResult: null,
      phoneLookupAvatar: '',
    });
  },

  onNameInput: function (event) {
    this.setData({
      newName: event.detail.value,
    });
  },

  lookupPhone: async function () {
    const phone = String(this.data.newPhone || '').trim();
    if (!phone) {
      this.setData({ error: '请输入手机号' });
      return;
    }

    this.setData({ lookupLoading: true, error: '', phoneLookupResult: null });
    try {
      const result = await api.lookupPhone(phone);
      if (!result || !result.exists || !result.user) {
        this.setData({ error: '未找到这个手机号' });
        return;
      }
      this.setData({
        phoneLookupResult: result.user,
        phoneLookupAvatar: (result.user.nickname || '用').slice(0, 1),
        newName: this.data.newName || result.user.nickname || '',
      });
    } catch (error) {
      this.setData({
        error: error.message || '搜索失败',
      });
    } finally {
      this.setData({ lookupLoading: false });
    }
  },

  submitContact: async function () {
    const phone = String(this.data.newPhone || '').trim();
    const lookupUser = this.data.phoneLookupResult;
    const name = String(this.data.newName || (lookupUser && lookupUser.nickname) || '').trim();
    if (!phone) {
      this.setData({ error: '请输入手机号' });
      return;
    }
    if (!lookupUser || !lookupUser.id) {
      this.setData({ error: '请先搜索手机号，确认找到对方后再添加' });
      return;
    }

    this.setData({ submitting: true, error: '' });
    try {
      await api.addContact({
        phone: phone,
        name: name || `用户${phone.slice(-4)}`,
        peer_user_id: lookupUser.id,
      });
      this.closeAdd();
      await this.load();
    } catch (error) {
      this.setData({
        error: error.message || '添加失败',
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  acceptRequest: async function (event) {
    const requestId = event.currentTarget.dataset.id;
    try {
      await api.acceptIncomingFriendRequest(requestId);
      await this.load();
    } catch (error) {
      this.setData({
        error: error.message || '处理失败',
      });
    }
  },

  openChat: function (event) {
    const contactId = event.currentTarget.dataset.id;
    const contactName = event.currentTarget.dataset.name || '';
    wx.navigateTo({
      url: `/pages/chat/index?id=${contactId}&name=${encodeURIComponent(contactName)}`,
    });
  },

  openSettings: function () {
    wx.navigateTo({
      url: '/pages/settings/index',
    });
  },

  openMembership: function () {
    wx.navigateTo({
      url: '/pages/membership/index',
    });
  },

  onSearchInput: function (event) {
    const searchText = event.detail.value || '';
    this.setData({
      searchText: searchText,
      displayContacts: this.filterContacts(this.data.contacts, searchText),
      displayRequests: this.filterRequests(this.data.requests, searchText),
    });
  },

  toggleRequests: function () {
    this.setData({
      requestsExpanded: !this.data.requestsExpanded,
      showAdd: false,
    });
  },

  openRequestsPanel: function () {
    this.setData({
      activeTab: 'contacts',
      activePanel: 'requests',
      requestsExpanded: false,
      showAdd: false,
    });
  },

  backToContacts: function () {
    this.setData({
      activePanel: 'root',
    });
  },

  switchTab: function (event) {
    const tab = event.currentTarget.dataset.tab || 'messages';
    this.setData({
      activeTab: tab,
      activePanel: 'root',
      showAdd: false,
      requestsExpanded: false,
    });
  },

  openDirectoryAction: function (event) {
    const action = event.currentTarget.dataset.action;
    if (action === 'requests') {
      this.openRequestsPanel();
      return;
    }
    if (action === 'membership') {
      this.openMembership();
      return;
    }
    if (action === 'settings') {
      this.openSettings();
      return;
    }
    if (action === 'lock') {
      this.openLock();
      return;
    }
    if (action === 'add') {
      this.openAdd();
    }
  },

  openLock: function () {
    storage.setLocked(true);
    wx.reLaunch({
      url: '/pages/lock/index',
    });
  },

  onPullDownRefresh: async function () {
    await this.load();
    wx.stopPullDownRefresh();
  },

  formatContacts: function (contacts) {
    return contacts.map(function (contact) {
      const name = contact.name || '联系人';
      const preview = contact.sync_state === 'request_sent'
        ? '等待对方通过好友申请'
        : contact.last_message === '[voice]'
          ? '[语音]'
          : contact.last_message === '[image]'
            ? '[图片]'
            : contact.last_message === '[sticker]'
              ? '[表情包]'
              : contact.last_message || '暂无消息';
      return Object.assign({}, contact, {
        avatarText: name.slice(0, 1),
        avatarClass: resolveAvatarClass(name),
        preview: preview,
        updatedAtText: formatTime(contact.updated_at || contact.updatedAt),
        pending: contact.sync_state === 'request_sent',
      });
    });
  },

  filterContacts: function (contacts, keyword) {
    const text = String(keyword || '').trim().toLowerCase();
    const formatted = this.formatContacts(contacts || []);
    if (!text) {
      return formatted;
    }
    return formatted.filter(function (contact) {
      return `${contact.name || ''} ${contact.phone || ''} ${contact.preview || ''}`.toLowerCase().indexOf(text) >= 0;
    });
  },

  filterRequests: function (requests, keyword) {
    const text = String(keyword || '').trim().toLowerCase();
    const formatted = this.formatRequests(requests || []);
    if (!text) {
      return formatted;
    }
    return formatted.filter(function (request) {
      return `${request.requesterName || ''} ${request.requester_name || ''} ${request.requester_user_id || ''}`.toLowerCase().indexOf(text) >= 0;
    });
  },

  formatRequests: function (requests) {
    return requests.map(function (request) {
      const name = request.requester_name || '新朋友';
      return Object.assign({}, request, {
        requesterName: name,
        avatarText: name.slice(0, 1),
        avatarClass: resolveAvatarClass(name),
      });
    });
  },
});
