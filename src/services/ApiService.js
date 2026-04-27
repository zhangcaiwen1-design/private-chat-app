const API_BASE_URL = 'http://localhost:3001/api/v1';

// For production, replace with your actual API URL
// const API_BASE_URL = 'https://your-api-domain.com/api/v1';

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }

    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// Auth APIs
export async function sendVerificationCode(phone) {
  return request('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function login(phone, code, password) {
  const body = { phone };
  if (code) body.code = code;
  if (password) body.password = password;

  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function logout() {
  return request('/auth/logout', {
    method: 'POST',
  });
}

// User APIs
export async function getCurrentUser() {
  return request('/user/me');
}

export async function updateUser(data) {
  return request('/user/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getQRCode() {
  return request('/user/qr');
}

export async function uploadAvatar(formData) {
  const url = `${API_BASE_URL}/user/avatar`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });
  return response.json();
}

export async function getAvatarSignedUrl(userId) {
  return request(`/user/avatar/${userId}`);
}

// Contacts APIs
export async function getContacts() {
  return request('/contacts');
}

export async function addContact(friendPhone, friendName) {
  return request('/contacts', {
    method: 'POST',
    body: JSON.stringify({ friend_phone: friendPhone, friend_name: friendName }),
  });
}

export async function addContactByQR(qrCode) {
  return request('/contacts/qr-add', {
    method: 'POST',
    body: JSON.stringify({ qr_code: qrCode }),
  });
}

export async function deleteContact(contactId) {
  return request(`/contacts/${contactId}`, {
    method: 'DELETE',
  });
}

// Messages APIs
export async function sendMessage(contactId, type, content, burnAfterRead = false, burnDuration = null) {
  return request('/messages', {
    method: 'POST',
    body: JSON.stringify({
      contact_id: contactId,
      type,
      content,
      burn_after_read: burnAfterRead,
      burn_duration: burnDuration,
    }),
  });
}

export async function getMessages(contactId, limit = 50, before = null) {
  let url = `/messages/${contactId}?limit=${limit}`;
  if (before) url += `&before=${before}`;
  return request(url);
}

export async function markMessageRead(messageId) {
  return request(`/messages/${messageId}/read`, {
    method: 'POST',
  });
}

export async function deleteMessage(messageId) {
  return request(`/messages/${messageId}`, {
    method: 'DELETE',
  });
}

// Cloud APIs
export async function uploadToCloud(contactId, type, content, fileUrl = null) {
  return request('/cloud/upload', {
    method: 'POST',
    body: JSON.stringify({
      contact_id: contactId,
      type,
      content,
      file_url: fileUrl,
    }),
  });
}

export async function getCloudMessages(type = 'all', limit = 50, offset = 0) {
  return request(`/cloud/messages?type=${type}&limit=${limit}&offset=${offset}`);
}

export async function getCloudFileUrl(fileId) {
  return request(`/cloud/file/${fileId}`);
}

export async function deleteCloudBackup(cloudId) {
  return request(`/cloud/${cloudId}`, {
    method: 'DELETE',
  });
}

// Upload APIs
export async function uploadImage(formData) {
  const url = `${API_BASE_URL}/upload/image`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });
  return response.json();
}

export async function uploadVoice(formData) {
  const url = `${API_BASE_URL}/upload/voice`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });
  return response.json();
}

export async function getUploadFileUrl(fileId) {
  return request(`/upload/url/${fileId}`);
}
