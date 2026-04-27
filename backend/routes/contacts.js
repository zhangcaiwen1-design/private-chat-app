const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../services/mysql');

// Get contact list
router.get('/', async (req, res) => {
  try {
    const contacts = await query(
      `SELECT id, friend_id, friend_name, friend_phone, friend_avatar, created_at
       FROM contacts
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ contacts });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: '获取联系人列表失败' });
  }
});

// Add contact by phone number
router.post('/', async (req, res) => {
  try {
    const { friend_phone, friend_name } = req.body;

    if (!friend_phone) {
      return res.status(400).json({ error: '请提供对方手机号' });
    }

    // Find the friend by phone
    const friends = await query('SELECT id, phone, name, avatar_url FROM users WHERE phone = ?', [friend_phone]);

    if (friends.length === 0) {
      return res.status(404).json({ error: '该用户不存在' });
    }

    const friend = friends[0];

    // Check if already a contact
    const existing = await query(
      'SELECT id FROM contacts WHERE user_id = ? AND friend_id = ?',
      [req.user.id, friend.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: '该联系人已存在' });
    }

    // Create contact
    const id = uuidv4();
    const now = Date.now();

    await query(
      'INSERT INTO contacts (id, user_id, friend_id, friend_name, friend_phone, friend_avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, req.user.id, friend.id, friend_name || friend.name, friend.phone, friend.avatar_url, now]
    );

    const contact = {
      id,
      friend_id: friend.id,
      friend_name: friend_name || friend.name,
      friend_phone: friend.phone,
      friend_avatar: friend.avatar_url,
      created_at: now
    };

    res.json({ contact });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ error: '添加联系人失败' });
  }
});

// Add contact via QR code
router.post('/qr-add', async (req, res) => {
  try {
    const { qr_code } = req.body;

    if (!qr_code) {
      return res.status(400).json({ error: '请提供二维码信息' });
    }

    // Parse QR code: PRIVATE-userId-timestamp
    if (!qr_code.startsWith('PRIVATE-')) {
      return res.status(400).json({ error: '无效的二维码' });
    }

    const parts = qr_code.split('-');
    if (parts.length < 2) {
      return res.status(400).json({ error: '无效的二维码格式' });
    }

    const friendId = parts[1];

    // Can't add yourself
    if (friendId === req.user.id) {
      return res.status(400).json({ error: '不能添加自己为联系人' });
    }

    // Find the friend
    const friends = await query('SELECT id, phone, name, avatar_url FROM users WHERE id = ?', [friendId]);

    if (friends.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const friend = friends[0];

    // Check if already a contact
    const existing = await query(
      'SELECT id FROM contacts WHERE user_id = ? AND friend_id = ?',
      [req.user.id, friend.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: '该联系人已存在' });
    }

    // Create contact
    const id = uuidv4();
    const now = Date.now();

    await query(
      'INSERT INTO contacts (id, user_id, friend_id, friend_name, friend_phone, friend_avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, req.user.id, friend.id, friend.name, friend.phone, friend.avatar_url, now]
    );

    const contact = {
      id,
      friend_id: friend.id,
      friend_name: friend.name,
      friend_phone: friend.phone,
      friend_avatar: friend.avatar_url,
      created_at: now
    };

    res.json({ contact });
  } catch (error) {
    console.error('QR add contact error:', error);
    res.status(500).json({ error: '添加联系人失败' });
  }
});

// Delete contact
router.delete('/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;

    const result = await query(
      'DELETE FROM contacts WHERE id = ? AND user_id = ?',
      [contactId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '联系人不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: '删除联系人失败' });
  }
});

module.exports = router;
