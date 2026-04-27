const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../services/mysql');
const oss = require('../services/oss');

// Upload message/image/voice to cloud backup
router.post('/upload', async (req, res) => {
  try {
    const { contact_id, type, content, file_url } = req.body;

    if (!type || !content) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    if (!['text', 'image', 'voice'].includes(type)) {
      return res.status(400).json({ error: '无效的消息类型' });
    }

    // Verify contact belongs to user
    let friendId = null;
    if (contact_id) {
      const contacts = await query(
        'SELECT friend_id FROM contacts WHERE id = ? AND user_id = ?',
        [contact_id, req.user.id]
      );

      if (contacts.length === 0) {
        return res.status(404).json({ error: '联系人不存在' });
      }
      friendId = contacts[0].friend_id;
    }

    const id = uuidv4();
    const now = Date.now();

    // If there's a file_url (OSS key), use it directly
    // Otherwise content is the encrypted text
    const cloudUrl = file_url || null;

    // Create cloud backup record
    await query(
      `INSERT INTO messages (id, user_id, contact_id, friend_id, type, content, is_cloud, cloud_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, req.user.id, contact_id || null, friendId, type, content, cloudUrl, now]
    );

    res.json({
      cloud_id: id,
      cloud_url: cloudUrl
    });
  } catch (error) {
    console.error('Cloud upload error:', error);
    res.status(500).json({ error: '上传到云端失败' });
  }
});

// Get cloud backup list
router.get('/messages', async (req, res) => {
  try {
    const type = req.query.type;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    let sql = `SELECT * FROM messages WHERE user_id = ? AND is_cloud = 1`;
    const params = [req.user.id];

    if (type && type !== 'all') {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const messages = await query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM messages WHERE user_id = ? AND is_cloud = 1`;
    const countParams = [req.user.id];

    if (type && type !== 'all') {
      countSql += ' AND type = ?';
      countParams.push(type);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0].total;

    res.json({
      messages,
      total
    });
  } catch (error) {
    console.error('Get cloud messages error:', error);
    res.status(500).json({ error: '获取云端消息失败' });
  }
});

// Get signed URL for cloud file
router.get('/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    // Get file metadata
    const files = await query(
      'SELECT oss_key FROM files WHERE id = ? AND user_id = ?',
      [fileId, req.user.id]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: '文件不存在' });
    }

    const signedUrl = await oss.getSignedUrl(files[0].oss_key);

    res.json({
      signed_url: signedUrl,
      expires_in: 900
    });
  } catch (error) {
    console.error('Get file URL error:', error);
    res.status(500).json({ error: '获取文件地址失败' });
  }
});

// Delete cloud backup
router.delete('/:cloudId', async (req, res) => {
  try {
    const { cloudId } = req.params;

    // Get the message first
    const messages = await query(
      'SELECT * FROM messages WHERE id = ? AND user_id = ? AND is_cloud = 1',
      [cloudId, req.user.id]
    );

    if (messages.length === 0) {
      return res.status(404).json({ error: '云端备份不存在' });
    }

    const message = messages[0];

    // Delete file from OSS if exists
    if (message.cloud_url) {
      try {
        await oss.deleteFile(message.cloud_url);
      } catch (ossError) {
        console.error('OSS delete error:', ossError);
      }
    }

    // Delete from database
    await query('DELETE FROM messages WHERE id = ?', [cloudId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete cloud backup error:', error);
    res.status(500).json({ error: '删除云端备份失败' });
  }
});

module.exports = router;
