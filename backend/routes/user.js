const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../services/mysql');
const storage = require('../services/storage');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB for avatars
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只能上传图片文件'));
    }
  }
});

// Get current user info
router.get('/me', async (req, res) => {
  try {
    const users = await query('SELECT id, phone, name, avatar_url, created_at FROM users WHERE id = ?', [req.user.id]);

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = users[0];
    // Add avatar URL if exists
    if (user.avatar_url) {
      user.avatar_url = `/uploads${user.avatar_url}`;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// Update user info
router.put('/me', async (req, res) => {
  try {
    const { name } = req.body;
    const now = Date.now();

    if (name !== undefined) {
      await query('UPDATE users SET name = ?, updated_at = ? WHERE id = ?', [name, now, req.user.id]);
    }

    // Fetch updated user
    const users = await query('SELECT id, phone, name, avatar_url FROM users WHERE id = ?', [req.user.id]);
    const user = users[0];
    if (user.avatar_url) {
      user.avatar_url = `/uploads${user.avatar_url}`;
    }
    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

// Get QR code info for adding contacts
router.get('/qr', async (req, res) => {
  try {
    const users = await query('SELECT id FROM users WHERE id = ?', [req.user.id]);

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const timestamp = Date.now().toString(36);
    const qrData = `PRIVATE-${req.user.id}-${timestamp}`;

    res.json({
      user_id: req.user.id,
      qr_code: qrData
    });
  } catch (error) {
    console.error('Get QR error:', error);
    res.status(500).json({ error: '获取二维码信息失败' });
  }
});

// Upload avatar
router.post('/avatar', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择图片文件' });
    }

    const fileId = uuidv4();
    const filePath = storage.generateFilePath(req.user.id, 'avatar', fileId, '.jpg');

    // Save to local storage
    await storage.saveFile(filePath, req.file.buffer);

    const relativePath = storage.getFileUrl(filePath);

    // Update user avatar in database
    await query('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?', [relativePath, Date.now(), req.user.id]);

    res.json({ avatar_url: `/uploads${relativePath}` });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: '上传头像失败' });
  }
});

// Get avatar
router.get('/avatar/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const users = await query('SELECT avatar_url FROM users WHERE id = ?', [userId]);

    if (users.length === 0 || !users[0].avatar_url) {
      return res.status(404).json({ error: '头像不存在' });
    }

    const avatarPath = storage.getAbsolutePath(users[0].avatar_url);
    res.sendFile(avatarPath);
  } catch (error) {
    console.error('Get avatar error:', error);
    res.status(500).json({ error: '获取头像失败' });
  }
});

module.exports = router;
