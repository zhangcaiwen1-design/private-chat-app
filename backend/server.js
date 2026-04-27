require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const contactsRoutes = require('./routes/contacts');
const messagesRoutes = require('./routes/messages');
const cloudRoutes = require('./routes/cloud');
const uploadRoutes = require('./routes/upload');

const { authMiddleware } = require('./middleware/auth');
const mysql = require('./services/mysql');
const storage = require('./services/storage');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists
storage.ensureDir(storage.UPLOAD_DIR);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(storage.UPLOAD_DIR)));

// Rate limiting - 60 requests per minute
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: '请求过于频繁，请稍后再试' }
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Public routes
app.use('/api/v1/auth', authRoutes);

// Protected routes - require JWT
app.use('/api/v1/user', authMiddleware, userRoutes);
app.use('/api/v1/contacts', authMiddleware, contactsRoutes);
app.use('/api/v1/messages', authMiddleware, messagesRoutes);
app.use('/api/v1/cloud', authMiddleware, cloudRoutes);
app.use('/api/v1/upload', authMiddleware, uploadRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// Initialize database and start server
async function start() {
  try {
    await mysql.initDatabase();
    console.log('Database initialized');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Upload directory: ${storage.UPLOAD_DIR}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
