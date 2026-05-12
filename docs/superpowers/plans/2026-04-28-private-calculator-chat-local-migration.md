# Private Calculator Chat Local Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the existing Expo Go private calculator chat prototype into `D:/coding/private-calculator-chat` and make it use a local Express + SQLite backend reachable from a phone on the same Wi-Fi.

**Architecture:** Keep the current Expo UI under `src/` as the baseline and preserve the calculator disguise flow. Use a small local SQLite data layer and API routes. Configure the mobile API base URL from Expo public env so `localhost` is not hardcoded for phones.

**Tech Stack:** Expo 54, React Native 0.81, Expo Router, Node.js, Express, SQLite via `better-sqlite3`, Jest/Supertest for backend API tests.

---

## File Structure

- `D:/coding/private-calculator-chat/` — final project root copied from `C:/Users/Administrator/PrivateChatApp`, excluding generated folders.
- `D:/coding/private-calculator-chat/package.json` — mobile Expo scripts and dependencies.
- `D:/coding/private-calculator-chat/app/_layout.tsx` — Expo Router entry that mounts `src/App.js`.
- `D:/coding/private-calculator-chat/src/App.js` — existing screen state machine: calculator, chat list, chat window, cloud records.
- `D:/coding/private-calculator-chat/src/services/ApiService.js` — frontend API client; change to configurable LAN URL.
- `D:/coding/private-calculator-chat/src/services/StorageService.js` — frontend contact/message service; fix `saveContact` and `saveMessage` to call local API correctly.
- `D:/coding/private-calculator-chat/src/components/Chat/ChatList.js` — preserve UI; fix `saveContact` call shape and show server connection errors.
- `D:/coding/private-calculator-chat/src/components/Chat/ChatWindow.js` — preserve UI; make text messages persist through local backend.
- `D:/coding/private-calculator-chat/backend/package.json` — backend dependencies and scripts for the local SQLite/test setup.
- `D:/coding/private-calculator-chat/backend/server.js` — Express app entry; export `createApp` for tests and start server only when run directly.
- `D:/coding/private-calculator-chat/backend/services/db.js` — SQLite connection, schema initialization, seed data, query helpers.
- `D:/coding/private-calculator-chat/backend/routes/contacts.js` — local contacts API.
- `D:/coding/private-calculator-chat/backend/routes/messages.js` — local messages API.
- `D:/coding/private-calculator-chat/backend/tests/api.test.js` — backend integration tests.
- `D:/coding/private-calculator-chat/.env.example` — mobile API URL and backend port examples.
- `D:/coding/private-calculator-chat/backend/data/.gitignore` — ignore local SQLite files.

## Important Current-State Notes

- Current source project is `C:/Users/Administrator/PrivateChatApp`.
- Current `app/_layout.tsx` already mounts `src/App.js`, so the Expo template tab files are not the real UI path.
- The local MVP should not require auth middleware for contacts/messages.
- Current frontend uses `http://localhost:3001/api/v1`; this fails on a physical phone because `localhost` means the phone.
- Current `StorageService.saveContact(phone, name)` does not match `ChatList` calling `saveContact({ name, phone })`; fix this during migration.
- Current `StorageService.saveMessage()` returns the message without sending it to the backend; fix text-message persistence first.

---

### Task 1: Copy Existing Project to D Drive

**Files:**
- Create directory: `D:/coding/private-calculator-chat/`
- Copy from: `C:/Users/Administrator/PrivateChatApp/`
- Exclude: `node_modules/`, `backend/node_modules/`, `.expo/`, `.git/` if present

- [ ] **Step 1: Verify destination parent exists**

Run:

```bash
ls -1 "D:/coding"
```

Expected: output includes existing folders such as `autoErp` or `autojqr`.

- [ ] **Step 2: Verify source project exists**

Run:

```bash
ls -1 "C:/Users/Administrator/PrivateChatApp"
```

Expected: output includes `package.json`, `app.json`, `src`, and `backend`.

- [ ] **Step 3: Copy source files without generated dependencies**

Run:

```bash
rsync -a --exclude 'node_modules' --exclude '.expo' --exclude '.git' "C:/Users/Administrator/PrivateChatApp/" "D:/coding/private-calculator-chat/"
```

Expected: no error output.

- [ ] **Step 4: Verify copied project structure**

Run:

```bash
ls -1 "D:/coding/private-calculator-chat" && ls -1 "D:/coding/private-calculator-chat/src" && ls -1 "D:/coding/private-calculator-chat/backend"
```

Expected: root output includes `package.json`, `app`, `src`, `backend`; `src` output includes `App.js`; `backend` output includes `server.js`.

- [ ] **Step 5: Initialize a git repository in the migrated project**

Run:

```bash
git -C "D:/coding/private-calculator-chat" init
```

Expected: output says an empty Git repository was initialized or reinitialized.

- [ ] **Step 6: Create project root `.gitignore`**

Create `D:/coding/private-calculator-chat/.gitignore` with:

```gitignore
node_modules/
.expo/
dist/
build/
coverage/
.env
*.log
backend/node_modules/
backend/data/*.db
backend/data/*.db-*
```

- [ ] **Step 7: Commit migrated baseline**

Run:

```bash
git -C "D:/coding/private-calculator-chat" add . && git -C "D:/coding/private-calculator-chat" commit -m "chore: migrate private chat prototype"
```

Expected: commit succeeds and includes the copied source, docs, and config files.

---

### Task 2: Add Local SQLite Backend Foundation

**Files:**
- Modify: `D:/coding/private-calculator-chat/backend/package.json`
- Create: `D:/coding/private-calculator-chat/backend/services/db.js`
- Create: `D:/coding/private-calculator-chat/backend/data/.gitignore`
- Create: `D:/coding/private-calculator-chat/backend/tests/api.test.js`

- [ ] **Step 1: Replace backend package manifest**

Replace `D:/coding/private-calculator-chat/backend/package.json` with:

```json
{
  "name": "privatechat-local-backend",
  "version": "1.0.0",
  "description": "Local Private Chat App Backend API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "better-sqlite3": "^11.7.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.0.2",
    "supertest": "^7.0.0"
  }
}
```

- [ ] **Step 2: Install backend dependencies**

Run:

```bash
npm install --prefix "D:/coding/private-calculator-chat/backend"
```

Expected: install succeeds and creates `backend/package-lock.json` and `backend/node_modules`.

- [ ] **Step 3: Add backend data gitignore**

Create `D:/coding/private-calculator-chat/backend/data/.gitignore` with:

```gitignore
*.db
*.db-*
!.gitignore
```

- [ ] **Step 4: Write the failing backend API test**

Create `D:/coding/private-calculator-chat/backend/tests/api.test.js` with:

```js
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'private-chat-test-'));
process.env.DB_PATH = path.join(tempDir, 'test.db');
process.env.NODE_ENV = 'test';

const { createApp } = require('../server');
const { closeDb } = require('../services/db');

let app;

beforeAll(async () => {
  app = await createApp();
});

afterAll(() => {
  closeDb();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('health endpoint returns ok', async () => {
  const res = await request(app).get('/health').expect(200);
  expect(res.body.status).toBe('ok');
});

test('contacts endpoint returns seeded contacts', async () => {
  const res = await request(app).get('/api/v1/contacts').expect(200);
  expect(Array.isArray(res.body.contacts)).toBe(true);
  expect(res.body.contacts.length).toBeGreaterThan(0);
  expect(res.body.contacts[0]).toHaveProperty('id');
  expect(res.body.contacts[0]).toHaveProperty('name');
});

test('can create contact and send persistent text message', async () => {
  const contactRes = await request(app)
    .post('/api/v1/contacts')
    .send({ name: '测试好友', phone: '13800000000' })
    .expect(200);

  expect(contactRes.body.contact.name).toBe('测试好友');

  const contactId = contactRes.body.contact.id;
  const sendRes = await request(app)
    .post('/api/v1/messages')
    .send({ contact_id: contactId, type: 'text', content: '你好，本地服务器' })
    .expect(200);

  expect(sendRes.body.message.contact_id).toBe(contactId);
  expect(sendRes.body.message.text).toBe('你好，本地服务器');
  expect(sendRes.body.message.isMe).toBe(true);

  const messagesRes = await request(app).get(`/api/v1/messages/${contactId}`).expect(200);
  expect(messagesRes.body.messages).toHaveLength(1);
  expect(messagesRes.body.messages[0].text).toBe('你好，本地服务器');
});

test('delete message removes it from later reads', async () => {
  const contacts = await request(app).get('/api/v1/contacts').expect(200);
  const contactId = contacts.body.contacts[0].id;

  const sendRes = await request(app)
    .post('/api/v1/messages')
    .send({ contact_id: contactId, type: 'text', content: '待删除消息' })
    .expect(200);

  await request(app).delete(`/api/v1/messages/${sendRes.body.message.id}`).expect(200);

  const messagesRes = await request(app).get(`/api/v1/messages/${contactId}`).expect(200);
  expect(messagesRes.body.messages.find((msg) => msg.id === sendRes.body.message.id)).toBeUndefined();
});
```

- [ ] **Step 5: Run test to verify it fails**

Run:

```bash
npm test --prefix "D:/coding/private-calculator-chat/backend"
```

Expected: FAIL because `server.js` does not export `createApp` and `services/db.js` does not exist yet.

- [ ] **Step 6: Create SQLite database service**

Create `D:/coding/private-calculator-chat/backend/services/db.js` with:

```js
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

let db;

function getDbPath() {
  return process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');
}

function openDb() {
  if (db) return db;
  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  return db;
}

function normalizeContact(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    avatar: row.avatar,
    last_message: row.last_message,
    updated_at: row.updated_at,
  };
}

function normalizeMessage(row) {
  return {
    id: row.id,
    contact_id: row.contact_id,
    type: row.type,
    content: row.content,
    text: row.type === 'text' ? row.content : undefined,
    uri: row.type === 'image' || row.type === 'voice' ? row.content : undefined,
    duration: row.duration,
    isMe: row.direction === 'out',
    direction: row.direction,
    burn_after_read: Boolean(row.burn_after_read),
    burn_duration: row.burn_duration,
    read_at: row.read_at,
    timestamp: row.created_at,
    created_at: row.created_at,
  };
}

function initDatabase() {
  const database = openDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      avatar TEXT,
      last_message TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
      type TEXT NOT NULL CHECK (type IN ('text', 'image', 'voice')),
      content TEXT NOT NULL,
      duration INTEGER,
      burn_after_read INTEGER NOT NULL DEFAULT 0,
      burn_duration INTEGER,
      read_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_contact_created
      ON messages(contact_id, created_at);
  `);

  seedContacts(database);
}

function seedContacts(database = openDb()) {
  const count = database.prepare('SELECT COUNT(*) AS count FROM contacts').get().count;
  if (count > 0) return;

  const now = Date.now();
  const insert = database.prepare(`
    INSERT INTO contacts (id, name, phone, avatar, last_message, updated_at)
    VALUES (@id, @name, @phone, @avatar, @last_message, @updated_at)
  `);

  insert.run({
    id: uuidv4(),
    name: '测试好友',
    phone: '10086',
    avatar: null,
    last_message: '本地服务器已连接',
    updated_at: now,
  });
}

function listContacts() {
  return openDb()
    .prepare('SELECT * FROM contacts ORDER BY updated_at DESC')
    .all()
    .map(normalizeContact);
}

function createContact({ name, phone }) {
  const contact = {
    id: uuidv4(),
    name,
    phone: phone || '',
    avatar: null,
    last_message: '',
    updated_at: Date.now(),
  };

  openDb().prepare(`
    INSERT INTO contacts (id, name, phone, avatar, last_message, updated_at)
    VALUES (@id, @name, @phone, @avatar, @last_message, @updated_at)
  `).run(contact);

  return contact;
}

function getContact(contactId) {
  const row = openDb().prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
  return row ? normalizeContact(row) : null;
}

function listMessages(contactId, limit = 50, before = Date.now() + 1) {
  return openDb()
    .prepare(`
      SELECT * FROM messages
      WHERE contact_id = ? AND created_at < ?
      ORDER BY created_at ASC
      LIMIT ?
    `)
    .all(contactId, before, limit)
    .map(normalizeMessage);
}

function createMessage({ contactId, type, content, direction = 'out', duration = null, burnAfterRead = false, burnDuration = null }) {
  const now = Date.now();
  const message = {
    id: uuidv4(),
    contact_id: contactId,
    direction,
    type,
    content,
    duration,
    burn_after_read: burnAfterRead ? 1 : 0,
    burn_duration: burnDuration,
    read_at: null,
    created_at: now,
  };

  const database = openDb();
  const insert = database.transaction(() => {
    database.prepare(`
      INSERT INTO messages (id, contact_id, direction, type, content, duration, burn_after_read, burn_duration, read_at, created_at)
      VALUES (@id, @contact_id, @direction, @type, @content, @duration, @burn_after_read, @burn_duration, @read_at, @created_at)
    `).run(message);

    database.prepare('UPDATE contacts SET last_message = ?, updated_at = ? WHERE id = ?')
      .run(type === 'text' ? content : `[${type}]`, now, contactId);
  });
  insert();

  return normalizeMessage(message);
}

function markMessageRead(messageId) {
  const result = openDb()
    .prepare('UPDATE messages SET read_at = ? WHERE id = ?')
    .run(Date.now(), messageId);
  return result.changes > 0;
}

function deleteMessage(messageId) {
  const result = openDb().prepare('DELETE FROM messages WHERE id = ?').run(messageId);
  return result.changes > 0;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initDatabase,
  listContacts,
  createContact,
  getContact,
  listMessages,
  createMessage,
  markMessageRead,
  deleteMessage,
  closeDb,
};
```

- [ ] **Step 7: Commit backend foundation files**

Run:

```bash
git -C "D:/coding/private-calculator-chat" add backend/package.json backend/package-lock.json backend/services/db.js backend/data/.gitignore backend/tests/api.test.js && git -C "D:/coding/private-calculator-chat" commit -m "feat: add local sqlite backend foundation"
```

Expected: commit succeeds.

---

### Task 3: Replace Backend Server and Local Routes

**Files:**
- Modify: `D:/coding/private-calculator-chat/backend/server.js`
- Modify: `D:/coding/private-calculator-chat/backend/routes/contacts.js`
- Modify: `D:/coding/private-calculator-chat/backend/routes/messages.js`

- [ ] **Step 1: Replace backend server**

Replace `D:/coding/private-calculator-chat/backend/server.js` with:

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const contactsRoutes = require('./routes/contacts');
const messagesRoutes = require('./routes/messages');
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

  app.use('/api/v1', limiter);
  app.use('/api/v1/contacts', contactsRoutes);
  app.use('/api/v1/messages', messagesRoutes);

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
```

- [ ] **Step 2: Replace contacts route**

Replace `D:/coding/private-calculator-chat/backend/routes/contacts.js` with:

```js
const express = require('express');
const { createContact, listContacts } = require('../services/db');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ contacts: listContacts() });
});

router.post('/', (req, res) => {
  const { name, phone, friend_name, friend_phone } = req.body;
  const contactName = (name || friend_name || '').trim();
  const contactPhone = (phone || friend_phone || '').trim();

  if (!contactName) {
    return res.status(400).json({ error: '联系人姓名不能为空' });
  }

  const contact = createContact({ name: contactName, phone: contactPhone });
  res.json({ contact });
});

router.post('/qr-add', (req, res) => {
  const { qr_code } = req.body;
  const qrCode = (qr_code || '').trim();

  if (!qrCode) {
    return res.status(400).json({ error: '二维码不能为空' });
  }

  const contact = createContact({ name: qrCode.replace(/^QR-/, '') || '扫码联系人', phone: qrCode });
  res.json({ contact });
});

module.exports = router;
```

- [ ] **Step 3: Replace messages route**

Replace `D:/coding/private-calculator-chat/backend/routes/messages.js` with:

```js
const express = require('express');
const {
  createMessage,
  deleteMessage,
  getContact,
  listMessages,
  markMessageRead,
} = require('../services/db');

const router = express.Router();

router.post('/', (req, res) => {
  const { contact_id, type = 'text', content, duration, burn_after_read, burn_duration } = req.body;

  if (!contact_id || !content) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  if (!['text', 'image', 'voice'].includes(type)) {
    return res.status(400).json({ error: '无效的消息类型' });
  }

  if (!getContact(contact_id)) {
    return res.status(404).json({ error: '联系人不存在' });
  }

  const message = createMessage({
    contactId: contact_id,
    type,
    content,
    duration: duration || null,
    burnAfterRead: Boolean(burn_after_read),
    burnDuration: burn_duration || null,
  });

  res.json({ message });
});

router.get('/:contactId', (req, res) => {
  const { contactId } = req.params;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const before = req.query.before ? parseInt(req.query.before, 10) : Date.now() + 1;

  if (!getContact(contactId)) {
    return res.status(404).json({ error: '联系人不存在' });
  }

  const messages = listMessages(contactId, limit, before);
  res.json({ messages, has_more: messages.length === limit });
});

router.post('/:messageId/read', (req, res) => {
  if (!markMessageRead(req.params.messageId)) {
    return res.status(404).json({ error: '消息不存在' });
  }

  res.json({ success: true });
});

router.delete('/:messageId', (req, res) => {
  if (!deleteMessage(req.params.messageId)) {
    return res.status(404).json({ error: '消息不存在' });
  }

  res.json({ success: true });
});

module.exports = router;
```

- [ ] **Step 4: Run backend tests**

Run:

```bash
npm test --prefix "D:/coding/private-calculator-chat/backend"
```

Expected: PASS for all tests in `backend/tests/api.test.js`.

- [ ] **Step 5: Commit local backend API**

Run:

```bash
git -C "D:/coding/private-calculator-chat" add backend/server.js backend/routes/contacts.js backend/routes/messages.js && git -C "D:/coding/private-calculator-chat" commit -m "feat: replace backend with local sqlite api"
```

Expected: commit succeeds.

---

### Task 4: Configure Mobile API for Phone-to-PC Local Server

**Files:**
- Modify: `D:/coding/private-calculator-chat/src/services/ApiService.js`
- Create: `D:/coding/private-calculator-chat/.env.example`

- [ ] **Step 1: Replace frontend API service**

Replace `D:/coding/private-calculator-chat/src/services/ApiService.js` with:

```js
import Constants from 'expo-constants';

const configuredBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  'http://localhost:3001/api/v1';

export const API_BASE_URL = configuredBaseUrl.replace(/\/$/, '');

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });
  } catch (error) {
    throw new Error(`无法连接本地服务器：${API_BASE_URL}`);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }

  return data;
}

export async function healthCheck() {
  const base = API_BASE_URL.replace(/\/api\/v1$/, '');
  const response = await fetch(`${base}/health`);
  if (!response.ok) throw new Error('本地服务器健康检查失败');
  return response.json();
}

export async function getContacts() {
  return request('/contacts');
}

export async function addContact(friendPhone, friendName) {
  return request('/contacts', {
    method: 'POST',
    body: JSON.stringify({ phone: friendPhone, name: friendName }),
  });
}

export async function addContactByQR(qrCode) {
  return request('/contacts/qr-add', {
    method: 'POST',
    body: JSON.stringify({ qr_code: qrCode }),
  });
}

export async function deleteContact(contactId) {
  return request(`/contacts/${contactId}`, { method: 'DELETE' });
}

export async function sendMessage(contactId, type, content, burnAfterRead = false, burnDuration = null, duration = null) {
  return request('/messages', {
    method: 'POST',
    body: JSON.stringify({
      contact_id: contactId,
      type,
      content,
      duration,
      burn_after_read: burnAfterRead,
      burn_duration: burnDuration,
    }),
  });
}

export async function getMessages(contactId, limit = 50, before = null) {
  let url = `/messages/${contactId}?limit=${limit}`;
  if (before) url += `&before=${before}`;
  return request(url);
}

export async function markMessageRead(messageId) {
  return request(`/messages/${messageId}/read`, { method: 'POST' });
}

export async function deleteMessage(messageId) {
  return request(`/messages/${messageId}`, { method: 'DELETE' });
}

export async function uploadToCloud() {
  throw new Error('本地版本暂未启用云端备份');
}

export async function getCloudMessages() {
  return { messages: [], has_more: false };
}

export async function getCloudFileUrl() {
  throw new Error('本地版本暂未启用云端文件');
}

export async function deleteCloudBackup() {
  return { success: true };
}

export async function uploadImage() {
  throw new Error('本地版本暂未启用图片上传');
}

export async function uploadVoice() {
  throw new Error('本地版本暂未启用语音上传');
}

export async function getUploadFileUrl() {
  throw new Error('本地版本暂未启用文件访问');
}

export async function sendVerificationCode() {
  return { success: true };
}

export async function login() {
  return { token: 'local-dev-token' };
}

export async function logout() {
  return { success: true };
}

export async function getCurrentUser() {
  return { user: { id: 'local-user', name: '本地用户' } };
}

export async function updateUser(data) {
  return { user: data };
}

export async function getQRCode() {
  return { qr_code: 'QR-local-user' };
}

export async function uploadAvatar() {
  throw new Error('本地版本暂未启用头像上传');
}

export async function getAvatarSignedUrl() {
  return { url: null };
}
```

- [ ] **Step 2: Add env example**

Create `D:/coding/private-calculator-chat/.env.example` with:

```env
# Replace 192.168.1.100 with your computer LAN IPv4 address.
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3001/api/v1
PORT=3001
```

- [ ] **Step 3: Install mobile dependencies from migrated root**

Run:

```bash
npm install --prefix "D:/coding/private-calculator-chat"
```

Expected: install succeeds and recreates `node_modules`.

- [ ] **Step 4: Run mobile lint**

Run:

```bash
npm run lint --prefix "D:/coding/private-calculator-chat"
```

Expected: lint passes or reports only pre-existing warnings unrelated to `ApiService.js`.

- [ ] **Step 5: Commit mobile API configuration**

Run:

```bash
git -C "D:/coding/private-calculator-chat" add src/services/ApiService.js .env.example package-lock.json && git -C "D:/coding/private-calculator-chat" commit -m "feat: configure mobile app for local server"
```

Expected: commit succeeds.

---

### Task 5: Wire Text Contact and Message Persistence

**Files:**
- Modify: `D:/coding/private-calculator-chat/src/services/StorageService.js`
- Modify: `D:/coding/private-calculator-chat/src/components/Chat/ChatList.js`
- Modify: `D:/coding/private-calculator-chat/src/components/Chat/ChatWindow.js`

- [ ] **Step 1: Replace storage service**

Replace `D:/coding/private-calculator-chat/src/services/StorageService.js` with:

```js
import * as ApiService from './ApiService';

export async function getContacts() {
  try {
    const result = await ApiService.getContacts();
    return result.contacts || [];
  } catch (error) {
    console.error('Error getting contacts:', error);
    throw error;
  }
}

export async function saveContact(contactOrPhone, maybeName) {
  const phone = typeof contactOrPhone === 'object' ? contactOrPhone.phone : contactOrPhone;
  const name = typeof contactOrPhone === 'object' ? contactOrPhone.name : maybeName;

  const result = await ApiService.addContact(phone, name);
  return result.contact;
}

export async function addContactByQR(qrCode) {
  const result = await ApiService.addContactByQR(qrCode);
  return result.contact;
}

export async function deleteContact(contactId) {
  try {
    await ApiService.deleteContact(contactId);
    return true;
  } catch (error) {
    console.error('Error deleting contact:', error);
    return false;
  }
}

export async function getMessages(contactId, limit = 50) {
  try {
    const result = await ApiService.getMessages(contactId, limit);
    return result.messages || [];
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
}

export async function saveMessage(contactId, message) {
  const type = message.type || 'text';
  const content = type === 'text' ? message.text : message.uri;
  const result = await ApiService.sendMessage(
    contactId,
    type,
    content,
    Boolean(message.burnAfterRead),
    message.burnDuration || null,
    message.duration || null,
  );
  return result.message;
}
```

- [ ] **Step 2: Patch ChatList error handling and preview text**

In `D:/coding/private-calculator-chat/src/components/Chat/ChatList.js`, replace lines equivalent to the current `loadContacts` function with:

```js
  const loadContacts = useCallback(async () => {
    try {
      const loadedContacts = await getContacts();
      setContacts(loadedContacts);
    } catch (error) {
      Alert.alert('连接失败', error.message || '无法连接本地服务器，请确认电脑服务器已启动且手机在同一 Wi-Fi。');
    }
  }, []);
```

Replace the current `handleAddContact` function with:

```js
  const handleAddContact = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    try {
      await saveContact({ name: newName.trim(), phone: newPhone.trim() });
      setNewName('');
      setNewPhone('');
      setModalVisible(false);
      loadContacts();
    } catch (error) {
      Alert.alert('添加失败', error.message || '无法保存联系人');
    }
  };
```

Replace the preview line:

```js
        <Text style={styles.preview} numberOfLines={1}>你好啊，最近怎么样？</Text>
```

with:

```js
        <Text style={styles.preview} numberOfLines={1}>{item.last_message || '暂无消息'}</Text>
```

- [ ] **Step 3: Patch ChatWindow message loading and sending**

In `D:/coding/private-calculator-chat/src/components/Chat/ChatWindow.js`, replace the current `loadMessages` function with:

```js
  const loadMessages = useCallback(async () => {
    try {
      const loaded = await getMessages(contact.id);
      setMessages(loaded);
    } catch (error) {
      Alert.alert('连接失败', error.message || '无法加载聊天记录');
    }
  }, [contact.id]);
```

Replace the current `handleSend` function with:

```js
  const handleSend = async () => {
    if (!inputText.trim()) return;
    const msg = { text: inputText.trim(), type: 'text', isMe: true };
    if (burnOption) {
      msg.burnAfterRead = true;
      msg.burnDuration = BURN_OPTIONS[burnOption];
      msg.readAt = null;
    }
    try {
      const saved = await saveMessage(contact.id, msg);
      setMessages(prev => [...prev, saved]);
      setInputText('');
    } catch (error) {
      Alert.alert('发送失败', error.message || '无法保存消息到本地服务器');
    }
  };
```

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint --prefix "D:/coding/private-calculator-chat"
```

Expected: lint passes or only reports pre-existing warnings.

- [ ] **Step 5: Run backend tests**

Run:

```bash
npm test --prefix "D:/coding/private-calculator-chat/backend"
```

Expected: backend tests pass.

- [ ] **Step 6: Commit frontend persistence wiring**

Run:

```bash
git -C "D:/coding/private-calculator-chat" add src/services/StorageService.js src/components/Chat/ChatList.js src/components/Chat/ChatWindow.js && git -C "D:/coding/private-calculator-chat" commit -m "feat: persist chats through local backend"
```

Expected: commit succeeds.

---

### Task 6: Local Network Runbook and Manual Expo Go Verification

**Files:**
- Modify: `D:/coding/private-calculator-chat/README.md`

- [ ] **Step 1: Replace README with local development instructions**

Replace `D:/coding/private-calculator-chat/README.md` with:

```md
# Private Calculator Chat

Calculator-disguised private chat prototype for Expo Go. The mobile app connects to a local Node/Express server on your computer, and chat data is stored in a local SQLite database.

## Project layout

```text
app/          Expo Router entry
src/          Calculator and chat UI
backend/      Local Express + SQLite API
```

## Install

```bash
npm install
npm install --prefix backend
```

## Start backend

```bash
npm run dev --prefix backend
```

Backend health check:

```text
http://localhost:3001/health
```

## Configure phone access

Your phone cannot use `localhost` to reach the computer. Find the computer's LAN IPv4 address, then create `.env` in the project root:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_COMPUTER_LAN_IP:3001/api/v1
```

Example:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3001/api/v1
```

Keep the phone and computer on the same Wi-Fi.

## Start Expo

```bash
npm start
```

Scan the QR code with Expo Go.

## Manual test

1. Open the app in Expo Go.
2. Confirm the first screen looks like a calculator.
3. Enter `EXPO_PUBLIC_APP_UNLOCK_PIN` and press `=`.
4. Confirm the chat list appears.
5. Open the seeded test contact.
6. Send a text message.
7. Close and reopen the app.
8. Unlock again and confirm the message is still present.

## Data location

SQLite database:

```text
backend/data/app.db
```

This file is intentionally ignored by git.
```

- [ ] **Step 2: Start backend for manual testing**

Run:

```bash
npm run dev --prefix "D:/coding/private-calculator-chat/backend"
```

Expected: console prints `Local private chat server running on port 3001`. Keep this running for manual testing.

- [ ] **Step 3: Verify health endpoint from computer**

In a second terminal, run:

```bash
curl http://localhost:3001/health
```

Expected: JSON containing `"status":"ok"`.

- [ ] **Step 4: Create local env with LAN IP**

Run this command after replacing `192.168.1.100` with the computer LAN IPv4 address:

```bash
cat > "D:/coding/private-calculator-chat/.env" <<'EOF'
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3001/api/v1
EOF
```

Expected: `.env` exists and points to the computer LAN IP, not `localhost`.

- [ ] **Step 5: Start Expo**

Run:

```bash
npm start --prefix "D:/coding/private-calculator-chat"
```

Expected: Expo QR code appears.

- [ ] **Step 6: Verify in Expo Go on phone**

Manual expected result:

```text
- Phone opens calculator screen.
- Entering EXPO_PUBLIC_APP_UNLOCK_PIN then pressing = opens the chat list.
- Chat list loads at least one seeded contact.
- Sending a text message succeeds.
- Restarting the app keeps the message in the same chat.
```

- [ ] **Step 7: Commit README runbook**

Run:

```bash
git -C "D:/coding/private-calculator-chat" add README.md && git -C "D:/coding/private-calculator-chat" commit -m "docs: add local expo go runbook"
```

Expected: commit succeeds.

---

## Self-Review

- Spec coverage: migration to `D:/coding/private-calculator-chat` is Task 1; SQLite backend is Tasks 2-3; configurable LAN API URL is Task 4; preserving initial UI while wiring persistence is Task 5; Expo Go phone verification is Task 6.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: backend returns `contacts`, `messages`, `message.text`, `message.isMe`, `last_message`, and timestamps matching current UI expectations.
- Scope check: image, voice, QR, cloud backup, production login, and encryption remain intentionally outside this local MVP except for stubbed API functions that keep existing UI imports from crashing.
