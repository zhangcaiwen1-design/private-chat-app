const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../services/mysql');
const oss = require('../services/oss');

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

    res.json({ user: users[0] });
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
    res.json({ user: users[0] });
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

    // In production, sign the QR data:
    // const signature = crypto.createHmac('sha256', JWT_SECRET).update(qrData).digest('hex');
    // const qrCode = `PRIVATE-${base64(userId:timestamp:signature)}`;

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
    const ossKey = oss.generateOssKey(req.user.id, 'avatar', fileId);

    // Upload to OSS
    await oss.uploadFile(ossKey, req.file.buffer, {
      contentType: req.file.mimetype
    });

    // Generate signed URL for the avatar
    const avatarUrl = await oss.getSignedUrl(ossKey);

    // Update user avatar in database
    await query('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?', [ossKey, Date.now(), req.user.id]);

    res.json({ avatar_url: ossKey }); // Return OSS key, frontend will get signed URL when needed
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: '上传头像失败' });
  }
});

// Get avatar signed URL
router.get('/avatar/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const users = await query('SELECT avatar_url FROM users WHERE id = ?', [userId]);

    if (users.length === 0 || !users[0].avatar_url) {
      return res.status(404).json({ error: '头像不存在' });
    }

    const signedUrl = await oss.getSignedUrl(users[0].avatar_url);

    res.json({ signed_url: signedUrl, expires_in: 900 });
  } catch (error) {
    console.error('Get avatar error:', error);
    res.status(500).json({ error: '获取头像失败' });
  }
});

module.exports = router;
