const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../services/mysql');
const storage = require('../services/storage');

// Configure multer for memory storage
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB for images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只能上传图片文件'));
    }
  }
});

const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB for voice
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'audio/m4a') {
      cb(null, true);
    } else {
      cb(new Error('只能上传音频文件'));
    }
  }
});

// Upload chat image
router.post('/image', imageUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择图片文件' });
    }

    const { contact_id } = req.body;
    const fileId = uuidv4();
    const ext = path.extname(req.file.originalname) || '.jpg';
    const filePath = storage.generateFilePath(req.user.id, 'image', fileId, ext);

    // Save to local storage
    await storage.saveFile(filePath, req.file.buffer);

    const relativePath = storage.getFileUrl(filePath);

    // Save file metadata
    await query(
      `INSERT INTO files (id, user_id, contact_id, type, original_name, oss_key, oss_bucket, file_size, created_at)
       VALUES (?, ?, ?, 'image', ?, ?, ?, ?, ?)`,
      [fileId, req.user.id, contact_id || null, req.file.originalname, relativePath, 'local', req.file.size, Date.now()]
    );

    res.json({
      file_id: fileId,
      file_path: relativePath,
      file_url: `/uploads${relativePath}`
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: '上传图片失败' });
  }
});

// Upload voice message
router.post('/voice', voiceUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择音频文件' });
    }

    const { contact_id } = req.body;
    const fileId = uuidv4();
    const ext = '.m4a';
    const filePath = storage.generateFilePath(req.user.id, 'voice', fileId, ext);

    // Save to local storage
    await storage.saveFile(filePath, req.file.buffer);

    const relativePath = storage.getFileUrl(filePath);

    // Save file metadata
    await query(
      `INSERT INTO files (id, user_id, contact_id, type, original_name, oss_key, oss_bucket, file_size, created_at)
       VALUES (?, ?, ?, 'voice', ?, ?, ?, ?, ?)`,
      [fileId, req.user.id, contact_id || null, 'voice.m4a', relativePath, 'local', req.file.size, Date.now()]
    );

    res.json({
      file_id: fileId,
      file_path: relativePath,
      file_url: `/uploads${relativePath}`
    });
  } catch (error) {
    console.error('Upload voice error:', error);
    res.status(500).json({ error: '上传语音失败' });
  }
});

// Get file URL
router.get('/url/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    const files = await query(
      'SELECT oss_key FROM files WHERE id = ? AND user_id = ?',
      [fileId, req.user.id]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: '文件不存在' });
    }

    res.json({
      file_url: `/uploads${files[0].oss_key}`
    });
  } catch (error) {
    console.error('Get file URL error:', error);
    res.status(500).json({ error: '获取文件地址失败' });
  }
});

module.exports = router;
