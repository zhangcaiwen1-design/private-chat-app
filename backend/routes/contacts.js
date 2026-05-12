const express = require('express');
const {
  acceptFriendRequest,
  createContact,
  createFriendRequest,
  createOrUpdateContactForPeer,
  findContactByOwnerAndPeerUserId,
  findUserByPhone,
  getUser,
  listContacts,
  listIncomingFriendRequests,
  upsertUser,
} = require('../services/db');

const router = express.Router();

function decodeHeaderValue(value) {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getCurrentUserContext(req) {
  return {
    userId: decodeHeaderValue(req.header('x-user-id') || 'local-user').trim() || 'local-user',
    displayName: decodeHeaderValue(req.header('x-user-name') || '本机用户').trim() || '本机用户',
    phone: decodeHeaderValue(req.header('x-user-phone') || '').trim(),
  };
}

function parseQrUserId(qrCode) {
  if (qrCode.startsWith('QR::')) {
    const parts = qrCode.split('::');
    return parts[1] || null;
  }
  if (qrCode.startsWith('QR-')) {
    const parts = qrCode.split('-');
    return parts[1] || null;
  }
  return null;
}

router.get('/', (req, res) => {
  const currentUser = getCurrentUserContext(req);
  upsertUser({ ...currentUser, adoptLegacyData: false });
  res.json({ contacts: listContacts(currentUser.userId) });
});

router.get('/requests/incoming', (req, res) => {
  const currentUser = getCurrentUserContext(req);
  upsertUser({ ...currentUser, adoptLegacyData: false });
  res.json({ requests: listIncomingFriendRequests(currentUser.userId) });
});

router.post('/requests/:requestId/accept', (req, res) => {
  const currentUser = getCurrentUserContext(req);
  upsertUser({ ...currentUser, adoptLegacyData: false });
  const result = acceptFriendRequest(req.params.requestId, currentUser.userId);

  if (result.status === 'not_found') {
    return res.status(404).json({ error: '好友申请不存在' });
  }
  if (result.status === 'forbidden') {
    return res.status(403).json({ error: '不能处理别人的好友申请' });
  }
  if (result.status === 'already_accepted') {
    return res.status(409).json({ error: '该好友申请已通过' });
  }
  if (result.status === 'user_missing') {
    return res.status(404).json({ error: '好友资料不存在' });
  }

  res.json({
    success: true,
    contact: result.targetContact,
    peer_contact: result.requesterContact,
  });
});

router.post('/', (req, res) => {
  const currentUser = getCurrentUserContext(req);
  upsertUser({ ...currentUser, adoptLegacyData: false });

  const { name, phone, friend_name, friend_phone, peer_user_id } = req.body;
  const contactName = (name || friend_name || '').trim();
  const contactPhone = (phone || friend_phone || '').trim();
  const peerUserId = (peer_user_id || '').trim() || null;

  if (!contactName) {
    return res.status(400).json({ error: '联系人姓名不能为空' });
  }

  if (peerUserId) {
    if (peerUserId === currentUser.userId) {
      return res.status(400).json({ error: '不能添加自己' });
    }

    const existing = findContactByOwnerAndPeerUserId(currentUser.userId, peerUserId);
    if (existing) {
      return res.json({
        contact: existing,
        request_status: existing.sync_state === 'matched' ? 'already_friends' : 'pending',
      });
    }

    const contact = createContact({
      ownerUserId: currentUser.userId,
      name: contactName,
      phone: contactPhone,
      peerUserId,
      syncState: 'request_sent',
      lastMessage: '等待对方通过好友申请',
    });

    const request = createFriendRequest({
      requesterUserId: currentUser.userId,
      requesterName: currentUser.displayName,
      requesterPhone: currentUser.phone,
      requesterContactId: contact.id,
      targetUserId: peerUserId,
      targetPhone: contactPhone,
      channel: 'qr',
    });

    return res.json({ contact, request_status: request.status, friend_request: request });
  }

  if (contactPhone) {
    const matchedUser = findUserByPhone(contactPhone);
    if (matchedUser && matchedUser.user_id !== currentUser.userId) {
      const existing = findContactByOwnerAndPeerUserId(currentUser.userId, matchedUser.user_id);
      if (existing) {
        return res.json({
          contact: existing,
          request_status: existing.sync_state === 'matched' ? 'already_friends' : 'pending',
        });
      }

      const contact = createContact({
        ownerUserId: currentUser.userId,
        name: contactName,
        phone: contactPhone,
        peerUserId: matchedUser.user_id,
        syncState: 'request_sent',
        lastMessage: '等待对方通过好友申请',
      });

      const request = createFriendRequest({
        requesterUserId: currentUser.userId,
        requesterName: currentUser.displayName,
        requesterPhone: currentUser.phone,
        requesterContactId: contact.id,
        targetUserId: matchedUser.user_id,
        targetPhone: contactPhone,
        channel: 'phone',
      });

      return res.json({ contact, request_status: request.status, friend_request: request });
    }
  }

  const contact = createContact({
    ownerUserId: currentUser.userId,
    name: contactName,
    phone: contactPhone,
    peerUserId: null,
    syncState: 'local_only',
    lastMessage: '',
  });

  res.json({ contact, request_status: 'local_only' });
});

router.post('/qr-add', (req, res) => {
  const currentUser = getCurrentUserContext(req);
  upsertUser({ ...currentUser, adoptLegacyData: false });

  const { qr_code } = req.body;
  const qrCode = (qr_code || '').trim();

  if (!qrCode) {
    return res.status(400).json({ error: '二维码不能为空' });
  }

  const targetUserId = parseQrUserId(qrCode);
  if (!targetUserId) {
    return res.status(400).json({ error: '二维码格式无效' });
  }
  if (targetUserId === currentUser.userId) {
    return res.status(400).json({ error: '不能添加自己' });
  }

  const existing = findContactByOwnerAndPeerUserId(currentUser.userId, targetUserId);
  if (existing) {
    return res.json({
      contact: existing,
      request_status: existing.sync_state === 'matched' ? 'already_friends' : 'pending',
    });
  }

  const targetUser = getUser(targetUserId);
  const contact = createOrUpdateContactForPeer({
    ownerUserId: currentUser.userId,
    peerUserId: targetUserId,
    name: targetUser?.display_name || targetUserId,
    phone: targetUser?.phone || '',
    syncState: 'request_sent',
    lastMessage: '等待对方通过好友申请',
  });

  const request = createFriendRequest({
    requesterUserId: currentUser.userId,
    requesterName: currentUser.displayName,
    requesterPhone: currentUser.phone,
    requesterContactId: contact.id,
    targetUserId,
    targetPhone: targetUser?.phone || '',
    channel: 'qr',
  });

  res.json({ contact, request_status: request.status, friend_request: request });
});

module.exports = router;
