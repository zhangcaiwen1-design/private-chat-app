const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../services/mysql');

// Send message
router.post('/', async (req, res) => {
  try {
    const { contact_id, type, content, burn_after_read, burn_duration } = req.body;

    if (!contact_id || !type || !content) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    if (!['text', 'image', 'voice'].includes(type)) {
      return res.status(400).json({ error: '无效的消息类型' });
    }

    // Verify contact belongs to user
    const contacts = await query(
      'SELECT friend_id FROM contacts WHERE id = ? AND user_id = ?',
      [contact_id, req.user.id]
    );

    if (contacts.length === 0) {
      return res.status(404).json({ error: '联系人不存在' });
    }

    const friendId = contacts[0].friend_id;
    const id = uuidv4();
    const now = Date.now();

    // Calculate burn time if burn_after_read is set
    let burnAt = null;
    if (burn_after_read && burn_duration) {
      burnAt = now + burn_duration;
    }

    await query(
      `INSERT INTO messages (id, user_id, contact_id, friend_id, type, content, burn_after_read, burn_duration, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, contact_id, friendId, type, content, burn_after_read ? 1 : 0, burn_duration, now]
    );

    const message = {
      id,
      user_id: req.user.id,
      contact_id,
      friend_id: friendId,
      type,
      content,
      is_cloud: 0,
      cloud_url: null,
      burn_after_read: burn_after_read ? 1 : 0,
      burn_duration,
      read_at: null,
      created_at: now
    };

    res.json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: '发送消息失败' });
  }
});

// Get chat history
router.get('/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before ? parseInt(req.query.before) : Date.now();

    // Verify contact belongs to user
    const contacts = await query(
      'SELECT friend_id FROM contacts WHERE id = ? AND user_id = ?',
      [contactId, req.user.id]
    );

    if (contacts.length === 0) {
      return res.status(404).json({ error: '联系人不存在' });
    }

    // Get messages
    const messages = await query(
      `SELECT * FROM messages
       WHERE user_id = ? AND contact_id = ? AND created_at < ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [req.user.id, contactId, before, limit]
    );

    // Check and destroy expired burn-after-read messages
    const now = Date.now();
    for (const msg of messages) {
      if (msg.burn_after_read && msg.read_at) {
        const burnTime = msg.read_at + (msg.burn_duration || 0);
        if (now > burnTime) {
          // Mark as expired (in production, actually delete)
          await query('DELETE FROM messages WHERE id = ?', [msg.id]);
        }
      }
    }

    // Reverse to chronological order
    messages.reverse();

    res.json({
      messages,
      has_more: messages.length === limit
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: '获取消息失败' });
  }
});

// Mark message as read
router.post('/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;

    const now = Date.now();

    const result = await query(
      'UPDATE messages SET read_at = ? WHERE id = ? AND user_id = ?',
      [now, messageId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '消息不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: '标记已读失败' });
  }
});

// Delete message (local only)
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const result = await query(
      'DELETE FROM messages WHERE id = ? AND user_id = ?',
      [messageId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '消息不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: '删除消息失败' });
  }
});

module.exports = router;
