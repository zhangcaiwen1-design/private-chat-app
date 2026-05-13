const { API_BASE_URL } = require('./constants');
const storage = require('./storage');

function encodeHeaderValue(value) {
  return encodeURIComponent(value || '');
}

function request(endpoint, options) {
  const config = options || {};
  const method = config.method || 'GET';
  const data = config.data || null;
  const session = storage.getSession();
  const user = session && session.user ? session.user : {};
  const headers = Object.assign(
    {
      'content-type': 'application/json',
      'x-user-id': encodeHeaderValue(user.id || user.user_id || 'mini-user'),
      'x-user-name': encodeHeaderValue(user.nickname || user.display_name || '微信小程序用户'),
      'x-user-phone': encodeHeaderValue(user.phone || ''),
      'x-device-id': storage.getDeviceId(),
    },
    config.header || {},
  );

  if (session && session.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  return new Promise(function (resolve, reject) {
    wx.request({
      url: `${API_BASE_URL}${endpoint}`,
      method: method,
      data: data,
      header: headers,
      success: function (response) {
        const statusCode = response && response.statusCode ? response.statusCode : 0;
        const payload = response && response.data ? response.data : {};
        if (statusCode >= 200 && statusCode < 300) {
          resolve(payload);
          return;
        }
        reject(new Error(payload.error || '请求失败'));
      },
      fail: function () {
        reject(new Error('无法连接到服务器'));
      },
    });
  });
}

function lookupPhone(phone) {
  return request('/auth/phone/lookup', {
    method: 'POST',
    data: { phone: phone },
  });
}

function login(phone) {
  return request('/auth/login', {
    method: 'POST',
    data: {
      phone: phone,
      device_id: storage.getDeviceId(),
    },
  });
}

function register(payload) {
  const data = payload || {};
  return request('/auth/register', {
    method: 'POST',
    data: {
      phone: data.phone,
      password: data.password,
      nickname: data.nickname || '',
      avatar_url: data.avatar_url || '',
      device_id: storage.getDeviceId(),
    },
  });
}

function getMembershipStatus() {
  return request('/membership/me');
}

function getMembershipPlans() {
  return request('/membership/plans');
}

function createMembershipPurchaseOrder(payload) {
  return request('/membership/purchase-order', {
    method: 'POST',
    data: payload,
  });
}

function completeMembershipPurchaseOrder(orderId, payload) {
  return request(`/membership/purchase-orders/${orderId}/complete`, {
    method: 'POST',
    data: payload || {},
  });
}

function getContacts() {
  return request('/contacts');
}

function getIncomingFriendRequests() {
  return request('/contacts/requests/incoming');
}

function addContact(payload) {
  return request('/contacts', {
    method: 'POST',
    data: payload,
  });
}

function acceptIncomingFriendRequest(requestId) {
  return request(`/contacts/requests/${requestId}/accept`, {
    method: 'POST',
  });
}

function getMessages(contactId, limit, before) {
  let url = `/messages/${contactId}?limit=${limit || 50}`;
  if (before) {
    url += `&before=${before}`;
  }
  return request(url);
}

function sendMessage(payload) {
  return request('/messages', {
    method: 'POST',
    data: payload,
  });
}

function updateProfile(payload) {
  return request('/auth/profile', {
    method: 'POST',
    data: payload,
  });
}

function updatePassword(password) {
  return request('/auth/password', {
    method: 'POST',
    data: { password: password },
  });
}

function logout() {
  return request('/auth/logout', {
    method: 'POST',
  });
}

module.exports = {
  request,
  lookupPhone,
  login,
  register,
  getMembershipStatus,
  getMembershipPlans,
  createMembershipPurchaseOrder,
  completeMembershipPurchaseOrder,
  getContacts,
  getIncomingFriendRequests,
  addContact,
  acceptIncomingFriendRequest,
  getMessages,
  sendMessage,
  updateProfile,
  updatePassword,
  logout,
};
