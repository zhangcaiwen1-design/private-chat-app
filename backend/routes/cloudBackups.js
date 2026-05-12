const express = require('express');
const {
  createCloudBackup,
  deleteCloudBackup,
  getContact,
  listCloudBackups,
  restoreCloudBackupToMessage,
} = require('../services/db');
const { requirePaidMembership } = require('../services/membership');

const router = express.Router();

function getCurrentUserId(req) {
  try {
    return decodeURIComponent(req.header('x-user-id') || 'local-user').trim() || 'local-user';
  } catch {
    return (req.header('x-user-id') || 'local-user').trim() || 'local-user';
  }
}

router.use(requirePaidMembership);

router.post('/', (req, res) => {
  const currentUserId = getCurrentUserId(req);
  const { contact_id, message_id, type = 'text', content, duration, cloud_url, source } = req.body;

  if (!contact_id || !content) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  if (!['text', 'image', 'voice', 'sticker'].includes(type)) {
    return res.status(400).json({ error: '无效的消息类型' });
  }

  if (!getContact(contact_id, currentUserId)) {
    return res.status(404).json({ error: '联系人不存在' });
  }

  const backup = createCloudBackup({
    ownerUserId: currentUserId,
    contactId: contact_id,
    messageId: message_id || null,
    type,
    content,
    duration: duration || null,
    cloudUrl: cloud_url || null,
    source: source || 'chat_message',
  });

  res.json({ backup });
});

router.get('/', (req, res) => {
  const currentUserId = getCurrentUserId(req);
  res.json({ messages: listCloudBackups(currentUserId), has_more: false });
});

router.post('/:backupId/restore', (req, res) => {
  const currentUserId = getCurrentUserId(req);
  const result = restoreCloudBackupToMessage(req.params.backupId, currentUserId);

  if (result.status === 'not_found') {
    return res.status(404).json({ error: '云备份不存在' });
  }

  if (result.status === 'already_restored') {
    return res.status(409).json({ error: '该云记录已恢复到本地' });
  }

  res.json({ message: result.message });
});

router.delete('/:backupId', (req, res) => {
  const currentUserId = getCurrentUserId(req);
  if (!deleteCloudBackup(req.params.backupId, currentUserId)) {
    return res.status(404).json({ error: '云备份不存在' });
  }

  res.json({ success: true });
});

module.exports = router;
