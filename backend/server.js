const path = require('path');
const dotenv = require('dotenv');

for (const envPath of [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '.env'),
]) {
  dotenv.config({ path: envPath });
}

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const contactsRoutes = require('./routes/contacts');
const messagesRoutes = require('./routes/messages');
const cloudBackupsRoutes = require('./routes/cloudBackups');
const ritualsRoutes = require('./routes/rituals');
const membershipRoutes = require('./routes/membership');
const adminMembershipRoutes = require('./routes/adminMembership');
const { initDatabase } = require('./services/db');

const PORT = process.env.PORT || 3001;

async function createApp() {
  initDatabase();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    message: { error: '请求过于频繁，请稍后再试' },
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  app.get('/admin/membership-review', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'membership-review.html'));
  });

  app.use('/api/v1', limiter);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/contacts', contactsRoutes);
  app.use('/api/v1/messages', messagesRoutes);
  app.use('/api/v1/cloud-backups', cloudBackupsRoutes);
  app.use('/api/v1/rituals', ritualsRoutes);
  app.use('/api/v1/membership', membershipRoutes);
  app.use('/api/v1/admin', adminMembershipRoutes);

  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
  });

  app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' });
  });

  return app;
}

async function start() {
  try {
    const app = await createApp();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Local private chat server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { createApp };
