const express = require('express');
const {
  createMessage,
  deleteMessage,
  getContact,
  listMessages,
  markMessageRead,
} = require('../services/db');

const router = express.Router();

function getCurrentUserId(req) {
  try {
    return decodeURIComponent(req.header('x-user-id') || 'local-user').trim() || 'local-user';
  } catch {
    return (req.header('x-user-id') || 'local-user').trim() || 'local-user';
  }
}

router.post('/', (req, res) => {
  const currentUserId = getCurrentUserId(req);
  const {
    contact_id,
    conversation_id,
    client_id,
    type = 'text',
    content,
    duration,
    burn_after_read,
    burn_duration,
    created_at_override,
  } = req.body;

  if (!contact_id || !content) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  if (!['text', 'image', 'voice'].includes(type)) {
    return res.status(400).json({ error: '无效的消息类型' });
  }

  if (!getContact(contact_id, currentUserId)) {
    return res.status(404).json({ error: '联系人不存在' });
  }

  const message = createMessage({
    contactId: contact_id,
    conversationId: conversation_id || null,
    clientId: client_id || null,
    type,
    content,
    duration: duration || null,
    burnAfterRead: Boolean(burn_after_read),
    burnDuration: burn_duration || null,
    createdAtOverride: created_at_override || null,
  });

  res.json({ message });
});

router.get('/:contactId', (req, res) => {
  const currentUserId = getCurrentUserId(req);
  const { contactId } = req.params;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const before = req.query.before ? parseInt(req.query.before, 10) : Date.now() + 1;

  if (!getContact(contactId, currentUserId)) {
    return res.status(404).json({ error: '联系人不存在' });
  }

  const messages = listMessages(contactId, limit, before, currentUserId);
  res.json({ messages, has_more: messages.length === limit });
});

router.post('/:messageId/read', (req, res) => {
  const currentUserId = getCurrentUserId(req);
  if (!markMessageRead(req.params.messageId, currentUserId)) {
    return res.status(404).json({ error: '消息不存在' });
  }

  res.json({ success: true });
});

router.delete('/:messageId', (req, res) => {
  const currentUserId = getCurrentUserId(req);
  if (!deleteMessage(req.params.messageId, currentUserId)) {
    return res.status(404).json({ error: '消息不存在' });
  }

  res.json({ success: true });
});

module.exports = router;
