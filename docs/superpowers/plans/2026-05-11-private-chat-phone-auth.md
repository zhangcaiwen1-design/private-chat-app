# Private Chat 手机号账号体系 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a phone-number-based account system with persistent device login, single-session enforcement, phone-based friend search, account-owned cloud chat data, and the associated UI cleanup.

**Architecture:** Add a backend account/session layer on top of the existing Express + SQLite API, then refit the Expo client so the calculator PIN gates access to either a valid local session or the new auth flow. Keep internal `userId` relations for storage integrity, but remove user-facing user-ID/QR entry points and move chat ownership to authenticated accounts.

**Tech Stack:** Expo / React Native, AsyncStorage, Express, better-sqlite3, Jest, Supertest

---

## File Structure

### Backend files

- Modify: `backend/services/db.js` — extend SQLite schema with users, sessions, friend requests, friendships, account-owned contacts/messages, and migration helpers.
- Create: `backend/services/auth.js` — password hashing, session token issuing, session validation, single-session invalidation.
- Create: `backend/services/device.js` — device ID extraction and validation from request headers.
- Create: `backend/services/currentUser.js` — authenticated user/session lookup shared by routes.
- Modify: `backend/routes/contacts.js` — replace user-ID/QR entry with phone search, friend request, accept flow bound to authenticated users.
- Modify: `backend/routes/messages.js` — scope message reads/writes to authenticated account ownership and session validity.
- Modify: `backend/routes/cloudBackups.js` — remove membership gate and bind cloud backups to authenticated account.
- Create: `backend/routes/auth.js` — phone lookup, register, login, logout, current user, profile update, local-data bind, local-data clear.
- Modify: `backend/server.js` — mount auth routes and targeted rate limiters for auth/search.
- Modify: `backend/tests/*.test.js` — update route coverage and add auth/session/friend tests.

### Frontend files

- Create: `src/services/SessionService.js` — persist device ID, auth token, current session metadata, session clearing.
- Modify: `src/services/ApiService.js` — replace fake login/current-user helpers with real auth/session APIs and authenticated headers.
- Modify: `src/services/UserService.js` — stop generating fake phone identities, separate local PIN/profile draft from server-backed account profile.
- Modify: `src/services/AuthService.js` — clear account session state as well as sensitive local chat cache.
- Modify: `src/services/ChatRepository.js` — replace user-ID/QR helpers with phone-search/add-friend helpers and account-scoped messaging.
- Modify: `src/services/CloudService.js` — remove paid-membership upload gate and use authenticated account cloud APIs.
- Create: `src/components/Auth/PhoneEntryScreen.js` — phone input and account existence branching.
- Create: `src/components/Auth/LoginPasswordScreen.js` — password login and “联系开发者找回密码”.
- Create: `src/components/Auth/RegisterPasswordScreen.js` — password registration.
- Create: `src/components/Auth/ProfileSetupScreen.js` — required nickname + optional avatar capture/pick.
- Create: `src/components/Auth/LocalDataChoiceScreen.js` — bind local data vs clear-and-start choice.
- Modify: `src/App.js` — session bootstrap, auth flow routing after calculator PIN, single-session kickout handling.
- Modify: `src/components/Chat/ChatList.js` — remove connection status row, QR/user-ID actions, add phone friend search flow.
- Modify: `src/components/Settings/UnlockPinSettings.js` — auto-return after save.
- Modify: `src/components/Membership/MembershipCenter.js` — convert to developer-contact-only membership UI.
- Modify: `src/components/Chat/CloudRecords.js` — remove membership gate copy that conflicts with default cloud sync.
- Remove usage from UI: `src/components/QRCode/MyQRCode.js`, `src/components/QRCode/QRScanner.js` — no longer reachable from ChatList.

### Asset / configuration files

- Modify: `assets/images/icon.png` — replace desktop icon with Apple/Xiaomi-style calculator icon.
- Modify: `assets/images/android-icon-foreground.png` — align adaptive icon foreground with new calculator art.
- Modify: `app.json` only if icon references or membership copy config need simplification.

### Likely tests

- Create: `backend/tests/auth.test.js`
- Create: `backend/tests/friend-search.test.js`
- Create: `backend/tests/session-kickout.test.js`
- Create: `backend/tests/cloud-account-ownership.test.js`
- Create: `src/services/__tests__/SessionService.test.js` if current Jest setup supports frontend unit tests; otherwise cover via backend tests plus manual validation.

## Task 1: Add backend account and session schema

**Files:**
- Modify: `backend/services/db.js`
- Test: `backend/tests/auth.test.js`

- [ ] **Step 1: Write the failing backend schema test**

```js
const { initDatabase, getDatabase } = require('../services/db');

describe('auth schema', () => {
  test('creates users and user_sessions tables', () => {
    initDatabase();
    const db = getDatabase();

    const users = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    const sessions = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_sessions'").get();

    expect(users).toEqual({ name: 'users' });
    expect(sessions).toEqual({ name: 'user_sessions' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- auth.test.js`
Expected: FAIL because `getDatabase` is missing or the `users` / `user_sessions` tables do not exist.

- [ ] **Step 3: Write minimal schema implementation**

```js
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nickname TEXT NOT NULL,
      avatar_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      session_token TEXT NOT NULL UNIQUE,
      revoked_at INTEGER,
      last_active_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

function getDatabase() {
  return db;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- auth.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/db.js backend/tests/auth.test.js
git commit -m "feat: add account session schema"
```

## Task 2: Add backend auth service helpers

**Files:**
- Create: `backend/services/auth.js`
- Test: `backend/tests/auth.test.js`

- [ ] **Step 1: Write the failing auth helper test**

```js
const { hashPassword, verifyPassword, createSessionToken } = require('../services/auth');

describe('auth helpers', () => {
  test('hashes passwords and verifies them', async () => {
    const hash = await hashPassword('123456');

    expect(hash).not.toBe('123456');
    expect(await verifyPassword('123456', hash)).toBe(true);
    expect(await verifyPassword('bad-pass', hash)).toBe(false);
  });

  test('creates non-empty session tokens', () => {
    expect(createSessionToken()).toMatch(/^[a-f0-9]{32,}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- auth.test.js`
Expected: FAIL because `../services/auth` does not exist.

- [ ] **Step 3: Write minimal auth helper implementation**

```js
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return Promise.resolve(`${salt}:${digest}`);
}

function verifyPassword(password, storedHash) {
  const [salt, digest] = String(storedHash || '').split(':');
  if (!salt || !digest) return Promise.resolve(false);
  const candidate = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return Promise.resolve(crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(digest)));
}

function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSessionToken,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- auth.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/auth.js backend/tests/auth.test.js
git commit -m "feat: add auth helpers"
```

## Task 3: Add auth routes for phone lookup, register, login, logout, and me

**Files:**
- Create: `backend/routes/auth.js`
- Modify: `backend/server.js`
- Test: `backend/tests/auth.test.js`

- [ ] **Step 1: Write the failing auth route test**

```js
const request = require('supertest');
const { createApp } = require('../server');

describe('auth routes', () => {
  test('registers, logs in, returns current user, and logs out', async () => {
    const app = await createApp();

    const lookup = await request(app).post('/api/v1/auth/phone/lookup').send({ phone: '13800138000' });
    expect(lookup.body).toEqual({ exists: false });

    const register = await request(app).post('/api/v1/auth/register').send({
      phone: '13800138000',
      password: '123456',
      nickname: '小雨',
      avatar_url: null,
      device_id: 'device-a',
    });
    expect(register.status).toBe(200);
    expect(register.body.token).toBeTruthy();

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${register.body.token}`)
      .set('x-device-id', 'device-a');
    expect(me.body.user.phone).toBe('13800138000');

    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${register.body.token}`)
      .set('x-device-id', 'device-a');
    expect(logout.body.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- auth.test.js`
Expected: FAIL with 404 on `/api/v1/auth/*` routes.

- [ ] **Step 3: Write minimal auth route implementation**

```js
router.post('/phone/lookup', (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const user = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  res.json({ exists: Boolean(user) });
});

router.post('/register', async (req, res) => {
  const now = Date.now();
  const userId = uuidv4();
  const sessionId = uuidv4();
  const sessionToken = createSessionToken();
  const passwordHash = await hashPassword(req.body.password);
  db.prepare('INSERT INTO users (id, phone, password_hash, nickname, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(userId, req.body.phone, passwordHash, req.body.nickname, req.body.avatar_url || null, now, now);
  db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId);
  db.prepare('INSERT INTO user_sessions (id, user_id, device_id, session_token, last_active_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(sessionId, userId, req.body.device_id, sessionToken, now, now);
  res.json({ token: sessionToken, user: { id: userId, phone: req.body.phone, nickname: req.body.nickname, avatar_url: req.body.avatar_url || null } });
});
```

Add matching `POST /login`, `GET /me`, and `POST /logout` handlers, and mount with:

```js
const authRoutes = require('./routes/auth');
app.use('/api/v1/auth', authRoutes);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- auth.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/routes/auth.js backend/server.js backend/tests/auth.test.js
git commit -m "feat: add phone auth routes"
```

## Task 4: Enforce single-session login and kicked-out session rejection

**Files:**
- Modify: `backend/services/auth.js`
- Create: `backend/services/currentUser.js`
- Test: `backend/tests/session-kickout.test.js`

- [ ] **Step 1: Write the failing single-session test**

```js
const request = require('supertest');
const { createApp } = require('../server');

describe('single session login', () => {
  test('invalidates the older device session on new login', async () => {
    const app = await createApp();

    await request(app).post('/api/v1/auth/register').send({
      phone: '13800138001',
      password: '123456',
      nickname: '小麦',
      device_id: 'device-a',
    });

    const secondLogin = await request(app).post('/api/v1/auth/login').send({
      phone: '13800138001',
      password: '123456',
      device_id: 'device-b',
    });

    const oldSession = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer old-device-token-placeholder')
      .set('x-device-id', 'device-a');

    expect(secondLogin.status).toBe(200);
    expect(oldSession.status).toBe(401);
    expect(oldSession.body.error_code).toBe('SESSION_REVOKED');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- session-kickout.test.js`
Expected: FAIL because previous sessions are still valid or `SESSION_REVOKED` is never returned.

- [ ] **Step 3: Write minimal single-session implementation**

```js
function revokeUserSessions(userId) {
  db.prepare('UPDATE user_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(Date.now(), userId);
}

function requireCurrentUser(req, res, next) {
  const token = String(req.header('Authorization') || '').replace(/^Bearer\s+/, '');
  const deviceId = String(req.header('x-device-id') || '').trim();
  const session = db.prepare(`
    SELECT s.*, u.phone, u.nickname, u.avatar_url
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.session_token = ?
  `).get(token);

  if (!session || session.revoked_at || session.device_id !== deviceId) {
    return res.status(401).json({ error: '登录状态已失效', error_code: 'SESSION_REVOKED' });
  }

  req.currentUser = session;
  next();
}
```

Call `revokeUserSessions(user.id)` before inserting a new login session.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- session-kickout.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/auth.js backend/services/currentUser.js backend/tests/session-kickout.test.js backend/routes/auth.js
git commit -m "feat: enforce single device sessions"
```

## Task 5: Replace friend add flow with phone search and request creation

**Files:**
- Modify: `backend/routes/contacts.js`
- Test: `backend/tests/friend-search.test.js`

- [ ] **Step 1: Write the failing friend search test**

```js
const request = require('supertest');
const { createApp } = require('../server');

describe('phone friend search', () => {
  test('returns nickname and avatar only for searchable user', async () => {
    const app = await createApp();

    const owner = await request(app).post('/api/v1/auth/register').send({
      phone: '13800138002', password: '123456', nickname: '阿青', device_id: 'device-a'
    });
    await request(app).post('/api/v1/auth/register').send({
      phone: '13800138003', password: '123456', nickname: '星野', avatar_url: '/avatars/1.png', device_id: 'device-b'
    });

    const search = await request(app)
      .post('/api/v1/contacts/search-by-phone')
      .set('Authorization', `Bearer ${owner.body.token}`)
      .set('x-device-id', 'device-a')
      .send({ phone: '13800138003' });

    expect(search.status).toBe(200);
    expect(search.body.user.nickname).toBe('星野');
    expect(search.body.user.avatar_url).toBe('/avatars/1.png');
    expect(search.body.user.phone).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- friend-search.test.js`
Expected: FAIL with 404 or old contacts route behavior.

- [ ] **Step 3: Write minimal phone search implementation**

```js
router.post('/search-by-phone', requireCurrentUser, (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const user = db.prepare('SELECT id, nickname, avatar_url FROM users WHERE phone = ? AND id != ?').get(phone, req.currentUser.user_id);
  if (!user) {
    return res.json({ found: false });
  }
  res.json({ found: true, user });
});

router.post('/friend-requests', requireCurrentUser, (req, res) => {
  const targetUserId = String(req.body.target_user_id || '').trim();
  const requestId = uuidv4();
  db.prepare('INSERT INTO friend_requests (id, from_user_id, to_user_id, status, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(requestId, req.currentUser.user_id, targetUserId, 'pending', Date.now());
  res.json({ success: true, request_id: requestId });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- friend-search.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/routes/contacts.js backend/tests/friend-search.test.js
git commit -m "feat: add phone based friend search"
```

## Task 6: Bind messages and cloud backups to authenticated accounts

**Files:**
- Modify: `backend/routes/messages.js`
- Modify: `backend/routes/cloudBackups.js`
- Test: `backend/tests/cloud-account-ownership.test.js`

- [ ] **Step 1: Write the failing ownership test**

```js
const request = require('supertest');
const { createApp } = require('../server');

describe('account owned cloud data', () => {
  test('returns only the current account cloud backups', async () => {
    const app = await createApp();

    const first = await request(app).post('/api/v1/auth/register').send({
      phone: '13800138004', password: '123456', nickname: '甲', device_id: 'device-a'
    });
    const second = await request(app).post('/api/v1/auth/register').send({
      phone: '13800138005', password: '123456', nickname: '乙', device_id: 'device-b'
    });

    await request(app)
      .post('/api/v1/cloud-backups')
      .set('Authorization', `Bearer ${first.body.token}`)
      .set('x-device-id', 'device-a')
      .send({ contact_id: 'c1', type: 'text', content: 'hello' });

    const secondList = await request(app)
      .get('/api/v1/cloud-backups')
      .set('Authorization', `Bearer ${second.body.token}`)
      .set('x-device-id', 'device-b');

    expect(secondList.body.messages).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- cloud-account-ownership.test.js`
Expected: FAIL because current cloud routes still use `x-user-id` headers or membership gating.

- [ ] **Step 3: Write minimal ownership implementation**

```js
router.get('/', requireCurrentUser, (req, res) => {
  res.json({ messages: listCloudBackups(req.currentUser.user_id), has_more: false });
});

router.post('/', requireCurrentUser, (req, res) => {
  const backup = createCloudBackup({
    owner_user_id: req.currentUser.user_id,
    contact_id: req.body.contact_id,
    type: req.body.type,
    content: req.body.content,
  });
  res.json({ backup });
});
```

Also remove `requirePaidMembership` from cloud backup routes and authenticate message routes with `requireCurrentUser`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- cloud-account-ownership.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/routes/messages.js backend/routes/cloudBackups.js backend/tests/cloud-account-ownership.test.js
git commit -m "feat: scope chat cloud data to accounts"
```

## Task 7: Add frontend session persistence service

**Files:**
- Create: `src/services/SessionService.js`
- Test: `src/services/__tests__/SessionService.test.js`

- [ ] **Step 1: Write the failing session persistence test**

```js
import { saveSession, loadSession, clearSessionState } from '../SessionService';

test('persists auth token and device id', async () => {
  await saveSession({ token: 'token-1', deviceId: 'device-a', user: { id: 'u1' } });
  await expect(loadSession()).resolves.toEqual({
    token: 'token-1',
    deviceId: 'device-a',
    user: { id: 'u1' },
  });
  await clearSessionState();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SessionService.test.js`
Expected: FAIL because `SessionService.js` does not exist or no frontend test harness is configured.

- [ ] **Step 3: Write minimal session persistence implementation**

```js
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'auth_session';
const DEVICE_KEY = 'device_id';

export async function ensureDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const next = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await AsyncStorage.setItem(DEVICE_KEY, next);
  return next;
}

export async function saveSession(session) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession() {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearSessionState() {
  await AsyncStorage.removeItem(SESSION_KEY);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- SessionService.test.js`
Expected: PASS if frontend Jest is configured; otherwise note the missing frontend runner in the implementation PR and manually verify with the app after finishing the auth flow.

- [ ] **Step 5: Commit**

```bash
git add src/services/SessionService.js src/services/__tests__/SessionService.test.js
git commit -m "feat: persist local auth sessions"
```

## Task 8: Replace fake auth APIs with real authenticated client service calls

**Files:**
- Modify: `src/services/ApiService.js`
- Modify: `src/services/UserService.js`
- Modify: `src/services/AuthService.js`

- [ ] **Step 1: Write the failing API contract check**

```js
// Manual check target after code change:
// ApiService.login({ phone, password, deviceId }) must POST /api/v1/auth/login
// ApiService.lookupPhone(phone) must POST /api/v1/auth/phone/lookup
// ApiService.getCurrentUser() must GET /api/v1/auth/me with Bearer token and x-device-id
```

- [ ] **Step 2: Run current app flow to verify it fails functionally**

Run: `npm run web`
Expected: existing login helpers return fake data, no real phone auth flow exists.

- [ ] **Step 3: Write minimal authenticated API implementation**

```js
export async function lookupPhone(phone) {
  return request('/auth/phone/lookup', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function register(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser(deviceId) {
  return request('/auth/me', {
    headers: {
      'x-device-id': deviceId,
    },
  });
}
```

Update `UserService.js` so local profile no longer synthesizes fake phone/user names when a server account exists, and update `AuthService.clearSession()` to also clear `SessionService` state and any cached auth token.

- [ ] **Step 4: Run app + backend to verify the new APIs work**

Run: `npm run web` and `cd backend && npm run dev`
Expected: phone lookup, register, login, and me endpoints are called instead of fake local responses.

- [ ] **Step 5: Commit**

```bash
git add src/services/ApiService.js src/services/UserService.js src/services/AuthService.js src/services/SessionService.js
git commit -m "feat: connect client auth to backend"
```

## Task 9: Add frontend auth flow screens

**Files:**
- Create: `src/components/Auth/PhoneEntryScreen.js`
- Create: `src/components/Auth/LoginPasswordScreen.js`
- Create: `src/components/Auth/RegisterPasswordScreen.js`
- Create: `src/components/Auth/ProfileSetupScreen.js`
- Create: `src/components/Auth/LocalDataChoiceScreen.js`

- [ ] **Step 1: Write the failing UI checklist**

```txt
Expected screens:
1. PhoneEntryScreen asks for phone and routes by lookup result.
2. LoginPasswordScreen accepts password and offers "联系开发者找回密码".
3. RegisterPasswordScreen creates account password.
4. ProfileSetupScreen requires nickname and allows avatar pick/camera.
5. LocalDataChoiceScreen offers bind local data vs clear and start.
```

- [ ] **Step 2: Run the app to verify the auth screens do not exist**

Run: `npm run web`
Expected: there is no route from calculator PIN into a phone auth flow.

- [ ] **Step 3: Write minimal screen implementations**

```js
export default function PhoneEntryScreen({ onNext }) {
  const [phone, setPhone] = useState('');
  return (
    <View>
      <Text>输入手机号</Text>
      <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TouchableOpacity onPress={() => onNext(phone)}>
        <Text>下一步</Text>
      </TouchableOpacity>
    </View>
  );
}
```

Repeat with focused files for password login, password registration, profile setup, and local-data choice. Keep each screen single-purpose and avoid bundling the entire flow into one file.

- [ ] **Step 4: Run the app to verify the screens render**

Run: `npm run web`
Expected: all auth flow screens can render from `App.js` state routing without crashes.

- [ ] **Step 5: Commit**

```bash
git add src/components/Auth/*.js
git commit -m "feat: add phone auth flow screens"
```

## Task 10: Route calculator PIN to session-or-auth flow in App.js

**Files:**
- Modify: `src/App.js`
- Modify: `src/components/Calculator/Calculator.js` only if unlock callback args need changes

- [ ] **Step 1: Write the failing flow checklist**

```txt
Given a valid saved session, PIN unlock should open the main chat screen.
Given no saved session, PIN unlock should open PhoneEntryScreen.
Given a revoked session, PIN unlock should clear session and open PhoneEntryScreen.
```

- [ ] **Step 2: Run the app to verify the existing flow fails the checklist**

Run: `npm run web`
Expected: PIN unlock always goes straight to chat list regardless of account session state.

- [ ] **Step 3: Write minimal App.js flow implementation**

```js
const [authStage, setAuthStage] = useState('idle');

const handleUnlock = async () => {
  const session = await loadSession();
  if (!session?.token) {
    setAuthStage('phone-entry');
    setCurrentScreen(SCREENS.AUTH);
    return;
  }

  try {
    setAuthToken(session.token);
    await getCurrentUser(session.deviceId);
    setCurrentScreen(SCREENS.CHAT_LIST);
  } catch (error) {
    await clearSessionState();
    setAuthStage('phone-entry');
    setCurrentScreen(SCREENS.AUTH);
  }
};
```

Also add the auth-stage render tree for phone entry, login password, register password, profile setup, and local-data choice.

- [ ] **Step 4: Run the app to verify the flow passes**

Run: `npm run web`
Expected: unlock routes to auth when needed and directly to chat when a valid session exists.

- [ ] **Step 5: Commit**

```bash
git add src/App.js src/components/Calculator/Calculator.js src/components/Auth/*.js
git commit -m "feat: route unlock through account session flow"
```

## Task 11: Replace ChatList add-friend UI and remove connection status bar

**Files:**
- Modify: `src/components/Chat/ChatList.js`
- Modify: `src/services/ChatRepository.js`

- [ ] **Step 1: Write the failing UI checklist**

```txt
ChatList must:
- not show the connection status card
- not show 我的二维码 / 扫一扫 / 用户ID添加
- show 手机号添加好友
- search by phone, display nickname + avatar only, then send request after confirmation
```

- [ ] **Step 2: Run the app to verify the old UI still appears**

Run: `npm run web`
Expected: status card and QR/user-ID entries are still visible.

- [ ] **Step 3: Write minimal ChatList implementation changes**

```js
const [phoneModalVisible, setPhoneModalVisible] = useState(false);
const [friendPhoneInput, setFriendPhoneInput] = useState('');
const [foundUser, setFoundUser] = useState(null);

<TouchableOpacity onPress={() => { setActionSheetVisible(false); setPhoneModalVisible(true); }}>
  <Text>手机号添加好友</Text>
</TouchableOpacity>
```

In `ChatRepository.js`, replace `createConversation` / `createConversationFromQr` usage with:

```js
export async function searchFriendByPhone(phone) {
  return ApiService.searchFriendByPhone(phone);
}

export async function sendFriendRequest(targetUserId) {
  return ApiService.sendFriendRequest(targetUserId);
}
```

Delete the status card render block and the QR modal render block from `ChatList.js`.

- [ ] **Step 4: Run the app to verify the new flow passes**

Run: `npm run web`
Expected: status card is gone, only phone add-friend remains, search result shows nickname/avatar without phone.

- [ ] **Step 5: Commit**

```bash
git add src/components/Chat/ChatList.js src/services/ChatRepository.js src/services/ApiService.js
git commit -m "feat: switch chat list to phone friend flow"
```

## Task 12: Make chat cloud sync default for all users

**Files:**
- Modify: `src/services/CloudService.js`
- Modify: `src/components/Chat/CloudRecords.js`
- Modify: `src/services/cloudSyncPolicy.js`
- Modify: `src/services/MembershipService.js` only if old status assumptions leak into sync decisions

- [ ] **Step 1: Write the failing behavior checklist**

```txt
All users should be allowed to upload, list, restore, and delete cloud chat data without membership gating.
CloudRecords copy should no longer claim that only members get cloud sync.
```

- [ ] **Step 2: Run the app to verify current behavior fails**

Run: `npm run web`
Expected: free-tier users are blocked from cloud actions or shown membership gate copy.

- [ ] **Step 3: Write minimal cloud-default implementation**

```js
export async function getCloudBackups() {
  const result = await ApiService.getCloudMessages();
  return result.messages || [];
}

export async function syncMessageToCloud(message) {
  return uploadToCloud(message);
}
```

Remove `ensureCloudMembership()` checks and update UI copy in `CloudRecords.js` to describe default cloud sync instead of member-only sync.

- [ ] **Step 4: Run the app to verify the cloud behavior passes**

Run: `npm run web`
Expected: cloud screens and sync copy work for a non-member account.

- [ ] **Step 5: Commit**

```bash
git add src/services/CloudService.js src/components/Chat/CloudRecords.js src/services/cloudSyncPolicy.js src/services/MembershipService.js
git commit -m "feat: make chat cloud sync account default"
```

## Task 13: Simplify membership center to developer-contact opening

**Files:**
- Modify: `src/components/Membership/MembershipCenter.js`

- [ ] **Step 1: Write the failing UI checklist**

```txt
MembershipCenter must:
- show developer WeChat: Nanny_1688
- remove upload screenshot flow
- remove QR code config/open action
- remove payment note / payment time / payment proof fields
```

- [ ] **Step 2: Run the app to verify old membership UI remains**

Run: `npm run web`
Expected: screenshot upload and QR payment instructions still appear.

- [ ] **Step 3: Write minimal membership UI implementation**

```js
<View style={styles.sectionCard}>
  <Text style={styles.sectionTitle}>联系开发者开通会员</Text>
  <Text style={styles.paymentStepText}>添加微信：Nanny_1688</Text>
  <Text style={styles.paymentTip}>联系开发者获取开通码或确认开通方式。</Text>
</View>
```

Delete the image-picker import, manual order submission state, QR opening logic, proof upload button, and related modal text that no longer serves this flow.

- [ ] **Step 4: Run the app to verify the new membership UI passes**

Run: `npm run web`
Expected: only developer-contact-based opening remains.

- [ ] **Step 5: Commit**

```bash
git add src/components/Membership/MembershipCenter.js
git commit -m "feat: simplify membership opening flow"
```

## Task 14: Return automatically after saving the local PIN

**Files:**
- Modify: `src/components/Settings/UnlockPinSettings.js`

- [ ] **Step 1: Write the failing behavior checklist**

```txt
After tapping 保存新密码 and receiving success, the screen should immediately return to the previous screen.
```

- [ ] **Step 2: Run the app to verify current behavior fails**

Run: `npm run web`
Expected: success alert shows but the settings screen stays open.

- [ ] **Step 3: Write minimal save-and-return implementation**

```js
await setUserUnlockPin(nextPin);
Alert.alert('保存成功', '新的进入密码已生效');
onBack();
```

If the success alert blocks the return timing, replace it with a non-blocking success state or call `onBack()` in the alert confirmation callback.

- [ ] **Step 4: Run the app to verify the behavior passes**

Run: `npm run web`
Expected: after successful save, the screen returns automatically to the previous page.

- [ ] **Step 5: Commit**

```bash
git add src/components/Settings/UnlockPinSettings.js
git commit -m "fix: return after saving unlock pin"
```

## Task 15: Center the add-friend and QR-related modals consistently

**Files:**
- Modify: `src/components/Chat/ChatList.js`

- [ ] **Step 1: Write the failing UI checklist**

```txt
The add-friend modal, QR modal container, and any remaining related overlay content must render centered in the screen rather than pinned near the top.
```

- [ ] **Step 2: Run the app to verify current behavior fails**

Run: `npm run web`
Expected: the current add-friend modal uses `justifyContent: 'flex-start'` and appears too high.

- [ ] **Step 3: Write minimal centering implementation**

```js
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.28)',
  paddingHorizontal: 20,
  justifyContent: 'center',
  alignItems: 'center',
},
modalContent: {
  width: '100%',
  maxWidth: 360,
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 20,
}
```

Remove `topModalContainer` and any top padding that forces the modal upward.

- [ ] **Step 4: Run the app to verify the modals are centered**

Run: `npm run web`
Expected: modal body renders vertically centered on the screen.

- [ ] **Step 5: Commit**

```bash
git add src/components/Chat/ChatList.js
git commit -m "fix: center add friend modal"
```

## Task 16: Remove test account artifacts and old user-ID / QR entrypoints

**Files:**
- Modify: `src/components/Chat/ChatList.js`
- Modify: `src/services/UserService.js`
- Search and modify any file that seeds or references `阿宁`

- [ ] **Step 1: Write the failing cleanup checklist**

```txt
There must be no user-facing "阿宁" test account, no user-ID add flow, and no QR add flow reachable from the app.
```

- [ ] **Step 2: Search to verify current repo state fails or is ambiguous**

Run: `grep equivalent via Grep tool for 阿宁, 用户ID添加, 打开我的二维码, 打开扫一扫`
Expected: either direct matches or reachable UI references still exist.

- [ ] **Step 3: Write minimal cleanup implementation**

```js
// Delete old UI entries and any seeded test-contact creation that references 阿宁.
// Keep internal userId fields only where storage relations still require them.
```

This task is complete only when search results show no user-facing `阿宁` artifact and no reachable QR / user-ID friend entry remains.

- [ ] **Step 4: Re-run search and app verification**

Run: `npm run web`
Expected: no visible 阿宁 account or old friend entrypoints remain.

- [ ] **Step 5: Commit**

```bash
git add src/components/Chat/ChatList.js src/services/UserService.js
git commit -m "refactor: remove legacy friend entry artifacts"
```

## Task 17: Replace app icon assets with the new calculator icon

**Files:**
- Modify: `assets/images/icon.png`
- Modify: `assets/images/android-icon-foreground.png`
- Modify: `assets/images/android-icon-background.png` only if the new foreground composition requires it
- Modify: `assets/images/android-icon-monochrome.png` if adaptive monochrome must match

- [ ] **Step 1: Write the failing asset checklist**

```txt
The desktop icon should use the new Apple/Xiaomi-style calculator art rather than the previous incorrect asset.
Android adaptive icon foreground should visually match the same calculator design.
```

- [ ] **Step 2: Verify current assets fail visually**

Run: inspect `assets/images/icon.png` and `assets/images/android-icon-foreground.png`
Expected: they do not match the desired final calculator icon.

- [ ] **Step 3: Write minimal asset replacement implementation**

```txt
Use the provided calculator icon artwork as the source of truth.
Export a square primary icon for `icon.png`.
Export a transparent foreground-only version for `android-icon-foreground.png`.
Keep the existing dark background if it already fits the new art.
```

- [ ] **Step 4: Rebuild and verify the icon assets**

Run: `npx expo export --platform web`
Expected: build succeeds and the exported assets reference the new icon files without errors.

- [ ] **Step 5: Commit**

```bash
git add assets/images/icon.png assets/images/android-icon-foreground.png assets/images/android-icon-background.png assets/images/android-icon-monochrome.png app.json
git commit -m "chore: refresh calculator app icons"
```

## Task 18: End-to-end verification

**Files:**
- Modify if needed: any files touched by fixes discovered during verification

- [ ] **Step 1: Run backend tests**

Run: `cd backend && npm test`
Expected: PASS

- [ ] **Step 2: Run frontend build smoke check**

Run: `npx expo export --platform web`
Expected: PASS

- [ ] **Step 3: Manually verify the golden path**

Run: `npm run web` with `cd backend && npm run dev`
Expected manual checks:

```txt
1. Calculator PIN unlock + no session -> phone entry.
2. Register with phone + password.
3. Fill nickname, optionally set avatar.
4. Choose bind local data or clear and start.
5. Reopen app -> after PIN, no phone login required.
6. Add friend by phone -> see nickname/avatar only.
7. Cloud records usable without membership gate.
8. Membership page shows developer WeChat only.
9. Save PIN returns automatically.
10. No connection status bar, no QR, no user-ID add UI.
```

- [ ] **Step 4: Fix any verification regressions and rerun affected checks**

```txt
Only fix issues found during Step 3.
Re-run the exact failing backend test, build command, or manual flow after each fix.
```

- [ ] **Step 5: Commit**

```bash
git add <files-fixed-during-verification>
git commit -m "test: verify phone auth migration flow"
```

## Self-Review

### Spec coverage

- Calculator PIN -> session-or-auth split: covered in Task 10.
- Phone + password auth with persistent login: covered in Tasks 1-4, 7-10.
- Nickname required, avatar optional: covered in Task 9.
- Bind local data vs clear choice: covered in Tasks 3 and 9.
- Remove user-ID / QR friend flows and replace with phone search: covered in Tasks 5, 11, and 16.
- Hide phone number in search results: covered in Task 5 and verified in Task 11.
- All chat data defaults to cloud/account ownership: covered in Tasks 6 and 12.
- Membership flow simplified to developer contact: covered in Task 13.
- Remove connection status bar: covered in Task 11.
- Save PIN returns automatically: covered in Task 14.
- Center drifting modals: covered in Task 15.
- Replace icon assets: covered in Task 17.
- Delete 阿宁 artifacts: covered in Task 16.

### Placeholder scan

- No `TODO` / `TBD` placeholders remain.
- Manual UI tasks include exact screens, expected behavior, and commands.
- Code steps include concrete route/function signatures rather than “implement later”.

### Type consistency

- Backend session invalidation uses `SESSION_REVOKED` consistently in Tasks 4, 10, and 18.
- Frontend session helper names are consistent: `ensureDeviceId`, `saveSession`, `loadSession`, `clearSessionState`.
- Phone friend flow names are consistent: `searchFriendByPhone`, `sendFriendRequest`, `/search-by-phone`, `/friend-requests`.
