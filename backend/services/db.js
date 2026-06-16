const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const {
  DEFAULT_MEMBERSHIP_PLAN_CODE,
  getMembershipPlanByCode,
  getMembershipPlans,
  getPlanBonusDays,
  normalizePlanCode,
  resolveMembershipPlan,
} = require('./membershipPlans');

let db;

function getDatabase() {
  return openDb();
}

function getDbPath() {
  return process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');
}

function openDb() {
  if (db) return db;
  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function ensureColumn(database, table, column, definition) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function ensureSyncReadySchema(database) {
  ensureColumn(database, 'contacts', 'owner_user_id', "TEXT NOT NULL DEFAULT 'local-user'");
  ensureColumn(database, 'contacts', 'conversation_id', 'TEXT');
  ensureColumn(database, 'contacts', 'peer_user_id', 'TEXT');
  ensureColumn(database, 'contacts', 'sync_state', "TEXT NOT NULL DEFAULT 'local_only'");
  ensureColumn(database, 'contacts', 'created_at', 'INTEGER');

  ensureColumn(database, 'messages', 'conversation_id', 'TEXT');
  ensureColumn(database, 'messages', 'client_id', 'TEXT');
  ensureColumn(database, 'messages', 'sync_state', "TEXT NOT NULL DEFAULT 'local_only'");
  ensureColumn(database, 'messages', 'updated_at', 'INTEGER');
  ensureColumn(database, 'messages', 'deleted_at', 'INTEGER');

  database.exec(`
    UPDATE contacts
    SET owner_user_id = COALESCE(owner_user_id, 'local-user'),
        conversation_id = COALESCE(conversation_id, id),
        sync_state = COALESCE(sync_state, 'local_only'),
        created_at = COALESCE(created_at, updated_at)
  `);

  database.exec(`
    UPDATE messages
    SET conversation_id = COALESCE(conversation_id, contact_id),
        client_id = COALESCE(client_id, id),
        sync_state = COALESCE(sync_state, 'local_only'),
        updated_at = COALESCE(updated_at, created_at)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_contacts_conversation_id
      ON contacts(conversation_id);

    CREATE INDEX IF NOT EXISTS idx_messages_client_id
      ON messages(client_id);
  `);
}

function ensureCloudBackupSchema(database) {
  ensureColumn(database, 'cloud_backups', 'owner_user_id', "TEXT NOT NULL DEFAULT 'local-user'");
  ensureColumn(database, 'cloud_backups', 'conversation_id', 'TEXT');
  ensureColumn(database, 'cloud_backups', 'message_id', 'TEXT');
  ensureColumn(database, 'cloud_backups', 'contact_name', "TEXT NOT NULL DEFAULT ''");
  ensureColumn(database, 'cloud_backups', 'contact_phone', 'TEXT');
  ensureColumn(database, 'cloud_backups', 'peer_user_id', 'TEXT');
  ensureColumn(database, 'cloud_backups', 'source', "TEXT NOT NULL DEFAULT 'chat_message'");
  ensureColumn(database, 'cloud_backups', 'restored_at', 'INTEGER');

  database.exec(`
    UPDATE cloud_backups
    SET owner_user_id = COALESCE(owner_user_id, 'local-user'),
        conversation_id = COALESCE(conversation_id, contact_id),
        message_id = COALESCE(message_id, id),
        contact_name = COALESCE(NULLIF(contact_name, ''), '未知联系人'),
        source = COALESCE(source, 'chat_message')
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_cloud_backups_contact_created
      ON cloud_backups(contact_id, created_at DESC);
  `);
}

function ensureAccountUserWechatSchema(database) {
  ensureColumn(database, 'account_users', 'wechat_openid', 'TEXT');
  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_account_users_wechat_openid
      ON account_users(wechat_openid)
      WHERE wechat_openid IS NOT NULL;
  `);
}

function tableSupportsStickerType(database, tableName) {
  const row = database.prepare(`
    SELECT sql FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(tableName);
  return !row?.sql || row.sql.includes("'sticker'");
}

function rebuildMessagesForStickerType(database) {
  const legacyTable = `messages_before_sticker_${Date.now()}`;
  database.exec('PRAGMA foreign_keys = OFF');
  try {
    database.exec(`
      ALTER TABLE messages RENAME TO ${legacyTable};

      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
        type TEXT NOT NULL CHECK (type IN ('text', 'image', 'voice', 'sticker')),
        content TEXT NOT NULL,
        duration INTEGER,
        burn_after_read INTEGER NOT NULL DEFAULT 0,
        burn_duration INTEGER,
        read_at INTEGER,
        sync_state TEXT NOT NULL DEFAULT 'local_only',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      );

      INSERT INTO messages (
        id, contact_id, conversation_id, client_id, direction, type, content, duration,
        burn_after_read, burn_duration, read_at, sync_state, created_at, updated_at, deleted_at
      )
      SELECT
        id, contact_id, conversation_id, client_id, direction, type, content, duration,
        burn_after_read, burn_duration, read_at, sync_state, created_at, updated_at, deleted_at
      FROM ${legacyTable};

      DROP TABLE ${legacyTable};

      CREATE INDEX IF NOT EXISTS idx_messages_contact_created
        ON messages(contact_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_messages_client_id
        ON messages(client_id);
    `);
  } finally {
    database.exec('PRAGMA foreign_keys = ON');
  }
}

function rebuildCloudBackupsForStickerType(database) {
  const legacyTable = `cloud_backups_before_sticker_${Date.now()}`;
  database.exec('PRAGMA foreign_keys = OFF');
  try {
    database.exec(`
      ALTER TABLE cloud_backups RENAME TO ${legacyTable};

      CREATE TABLE cloud_backups (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT NOT NULL DEFAULT 'local-user',
        contact_id TEXT NOT NULL,
        conversation_id TEXT,
        message_id TEXT,
        contact_name TEXT NOT NULL,
        contact_phone TEXT,
        peer_user_id TEXT,
        type TEXT NOT NULL CHECK (type IN ('text', 'image', 'voice', 'sticker')),
        content TEXT NOT NULL,
        duration INTEGER,
        source TEXT NOT NULL DEFAULT 'chat_message',
        cloud_url TEXT,
        sync_state TEXT NOT NULL DEFAULT 'local_only',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        restored_at INTEGER,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      );

      INSERT INTO cloud_backups (
        id, owner_user_id, contact_id, conversation_id, message_id, contact_name, contact_phone, peer_user_id,
        type, content, duration, source, cloud_url, sync_state, created_at, updated_at, restored_at
      )
      SELECT
        id, owner_user_id, contact_id, conversation_id, message_id, contact_name, contact_phone, peer_user_id,
        type, content, duration, source, cloud_url, sync_state, created_at, updated_at, restored_at
      FROM ${legacyTable};

      DROP TABLE ${legacyTable};

      CREATE INDEX IF NOT EXISTS idx_cloud_backups_owner_created
        ON cloud_backups(owner_user_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_cloud_backups_contact_created
        ON cloud_backups(contact_id, created_at DESC);
    `);
  } finally {
    database.exec('PRAGMA foreign_keys = ON');
  }
}

function ensureStickerTypeSchema(database) {
  if (!tableSupportsStickerType(database, 'messages')) {
    rebuildMessagesForStickerType(database);
  }
  if (!tableSupportsStickerType(database, 'cloud_backups')) {
    rebuildCloudBackupsForStickerType(database);
  }
}

function normalizeContact(row) {
  return {
    id: row.id,
    owner_user_id: row.owner_user_id,
    conversation_id: row.conversation_id,
    name: row.name,
    phone: row.phone,
    peer_user_id: row.peer_user_id,
    avatar: row.avatar,
    last_message: row.last_message,
    sync_state: row.sync_state,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeMessage(row) {
  return {
    id: row.id,
    contact_id: row.contact_id,
    conversation_id: row.conversation_id,
    client_id: row.client_id,
    type: row.type,
    content: row.content,
    text: row.type === 'text' ? row.content : undefined,
    uri: row.type === 'image' || row.type === 'voice' ? row.content : undefined,
    stickerId: row.type === 'sticker' ? row.content : undefined,
    duration: row.duration,
    isMe: row.direction === 'out',
    direction: row.direction,
    burn_after_read: Boolean(row.burn_after_read),
    burn_duration: row.burn_duration,
    read_at: row.read_at,
    sync_state: row.sync_state,
    timestamp: row.created_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

function normalizeCloudBackup(row) {
  return {
    id: row.id,
    owner_user_id: row.owner_user_id,
    contact_id: row.contact_id,
    conversation_id: row.conversation_id,
    message_id: row.message_id,
    contact_name: row.contact_name,
    contact_phone: row.contact_phone,
    peer_user_id: row.peer_user_id,
    type: row.type,
    content: row.content,
    text: row.type === 'text' ? row.content : undefined,
    uri: row.type === 'image' || row.type === 'voice' ? row.content : undefined,
    stickerId: row.type === 'sticker' ? row.content : undefined,
    duration: row.duration,
    source: row.source,
    cloud_url: row.cloud_url,
    sync_state: row.sync_state,
    created_at: row.created_at,
    updated_at: row.updated_at,
    restored_at: row.restored_at,
  };
}

function renameSeedContact(database) {
  database.prepare(`
    UPDATE contacts
    SET name = '阿宁'
    WHERE name = '测试好友'
  `).run();
}

function sanitizeDemoContacts(database) {
  database.prepare(`
    UPDATE contacts
    SET name = CASE
          WHEN name = '呵呵' THEN '小北'
          WHEN name = '哈哈' THEN '小满'
          WHEN name = '������ϵ��' THEN '新朋友'
          WHEN name = '阿宁' THEN '示例联系人'
          ELSE name
        END,
        phone = CASE
          WHEN phone = '10086' THEN '13800138086'
          WHEN phone = '11111111111' THEN '13900139000'
          ELSE phone
        END,
        last_message = CASE
          WHEN last_message = '[voice]' THEN '\u521a\u7ed9\u4f60\u7559\u4e86\u6761\u8bed\u97f3'
          WHEN last_message = '[image]' THEN '\u521a\u53d1\u4f60\u4e00\u5f20\u56fe\u7247'
          WHEN last_message = '[sticker]' THEN '\u521a\u7ed9\u4f60\u53d1\u4e86\u4e2a\u8868\u60c5\u5305'
          WHEN last_message LIKE '\u81ea\u52a8\u4e0a\u4e91 %' THEN '\u5230\u4e86\u7ed9\u6211\u53d1\u4e2a\u6d88\u606f'
          WHEN last_message LIKE '\u7ee7\u7eed private-calculator-chat%' THEN '\u665a\u70b9\u7ec6\u804a\uff0c\u5148\u522b\u56de\u8fd9\u91cc'
          ELSE last_message
        END
    WHERE name IN ('呵呵', '哈哈', '������ϵ��', '阿宁')
       OR phone IN ('10086', '11111111111')
       OR last_message IN ('[voice]', '[image]', '[sticker]')
       OR last_message LIKE '自动上云 %'
       OR last_message LIKE '继续 private-calculator-chat%'
  `).run();

  database.prepare(`
    UPDATE cloud_backups
    SET contact_name = COALESCE((SELECT name FROM contacts WHERE contacts.id = cloud_backups.contact_id), contact_name),
        contact_phone = COALESCE((SELECT phone FROM contacts WHERE contacts.id = cloud_backups.contact_id), contact_phone)
  `).run();
}

function initDatabase() {
  const database = openDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL DEFAULT 'local-user',
      conversation_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      peer_user_id TEXT,
      avatar TEXT,
      last_message TEXT,
      sync_state TEXT NOT NULL DEFAULT 'local_only',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
      type TEXT NOT NULL CHECK (type IN ('text', 'image', 'voice', 'sticker')),
      content TEXT NOT NULL,
      duration INTEGER,
      burn_after_read INTEGER NOT NULL DEFAULT 0,
      burn_duration INTEGER,
      read_at INTEGER,
      sync_state TEXT NOT NULL DEFAULT 'local_only',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cloud_backups (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL DEFAULT 'local-user',
      contact_id TEXT NOT NULL,
      conversation_id TEXT,
      message_id TEXT,
      contact_name TEXT NOT NULL,
      contact_phone TEXT,
      peer_user_id TEXT,
      type TEXT NOT NULL CHECK (type IN ('text', 'image', 'voice', 'sticker')),
      content TEXT NOT NULL,
      duration INTEGER,
      source TEXT NOT NULL DEFAULT 'chat_message',
      cloud_url TEXT,
      sync_state TEXT NOT NULL DEFAULT 'local_only',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      restored_at INTEGER,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_contact_created
      ON messages(contact_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_contacts_owner_updated
      ON contacts(owner_user_id, updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_cloud_backups_owner_created
      ON cloud_backups(owner_user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      phone TEXT UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS account_users (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE,
      wechat_openid TEXT,
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
      FOREIGN KEY (user_id) REFERENCES account_users(id)
    );

    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      requester_user_id TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      requester_phone TEXT,
      requester_contact_id TEXT,
      target_user_id TEXT NOT NULL,
      target_phone TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
      channel TEXT NOT NULL CHECK (channel IN ('qr', 'phone')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_friend_requests_target_status_created
      ON friend_requests(target_user_id, status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_friend_requests_requester_target
      ON friend_requests(requester_user_id, target_user_id);

    CREATE INDEX IF NOT EXISTS idx_account_users_phone
      ON account_users(phone);

    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
      ON user_sessions(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS ritual_events (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      conversation_id TEXT,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      event_day TEXT NOT NULL,
      event_at INTEGER NOT NULL,
      value_delta INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ritual_streaks (
      owner_user_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      streak_type TEXT NOT NULL,
      current_days INTEGER NOT NULL,
      best_days INTEGER NOT NULL,
      last_event_day TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (owner_user_id, contact_id, streak_type),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ritual_events_contact_day
      ON ritual_events(owner_user_id, contact_id, event_day DESC, event_at DESC);

    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_code TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'canceled')),
      start_at INTEGER NOT NULL,
      expire_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS membership_orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      plan_code TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending_review', 'approved', 'rejected')),
      payer_phone TEXT NOT NULL,
      paid_at INTEGER NOT NULL,
      payment_proof TEXT NOT NULL,
      note TEXT,
      review_note TEXT,
      reviewed_at INTEGER,
      reviewer TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS membership_purchase_orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      plan_code TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending_payment', 'paid', 'failed', 'closed')),
      provider TEXT NOT NULL,
      provider_order_id TEXT NOT NULL UNIQUE,
      provider_transaction_id TEXT,
      payment_payload TEXT,
      paid_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_memberships_user_expire
      ON memberships(user_id, expire_at DESC);

    CREATE INDEX IF NOT EXISTS idx_membership_orders_user_created
      ON membership_orders(user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_membership_purchase_orders_user_created
      ON membership_purchase_orders(user_id, created_at DESC);
  `);

  ensureSyncReadySchema(database);
  ensureCloudBackupSchema(database);
  ensureAccountUserWechatSchema(database);
  ensureStickerTypeSchema(database);
  renameSeedContact(database);
  sanitizeDemoContacts(database);
  seedContacts(database);
}

function seedContacts(database = openDb()) {
  const count = database.prepare("SELECT COUNT(*) AS count FROM contacts WHERE owner_user_id = 'local-user'").get().count;
  if (count > 0) return;

  const now = Date.now();
  upsertUser({ userId: 'local-user', displayName: '本机用户', phone: '13800138000' }, database);

  const insert = database.prepare(`
    INSERT INTO contacts (id, owner_user_id, conversation_id, name, phone, peer_user_id, avatar, last_message, sync_state, created_at, updated_at)
    VALUES (@id, @owner_user_id, @conversation_id, @name, @phone, @peer_user_id, @avatar, @last_message, @sync_state, @created_at, @updated_at)
  `);

  insert.run({
    id: uuidv4(),
    owner_user_id: 'local-user',
    conversation_id: uuidv4(),
    name: '示例联系人',
    phone: '13800138086',
    peer_user_id: null,
    avatar: null,
    last_message: '晚上聊，注意隐身',
    sync_state: 'local_only',
    created_at: now,
    updated_at: now,
  });
}

function adoptLegacyLocalUser(database, userId) {
  if (!userId || userId === 'local-user') return;

  const hasOwnedContacts = database.prepare('SELECT COUNT(*) AS count FROM contacts WHERE owner_user_id = ?').get(userId).count;
  const legacyContacts = database.prepare("SELECT COUNT(*) AS count FROM contacts WHERE owner_user_id = 'local-user'").get().count;
  if (hasOwnedContacts > 0 || legacyContacts === 0) return;

  const migrate = database.transaction(() => {
    database.prepare("UPDATE contacts SET owner_user_id = ? WHERE owner_user_id = 'local-user'").run(userId);
    database.prepare("UPDATE cloud_backups SET owner_user_id = ? WHERE owner_user_id = 'local-user'").run(userId);
    database.prepare("UPDATE friend_requests SET requester_user_id = ? WHERE requester_user_id = 'local-user'").run(userId);
    database.prepare("UPDATE friend_requests SET target_user_id = ? WHERE target_user_id = 'local-user'").run(userId);
  });

  migrate();
}

function upsertUser({ userId, displayName, phone = '', adoptLegacyData = true }, database = openDb()) {
  if (adoptLegacyData) {
    adoptLegacyLocalUser(database, userId);
  }

  const now = Date.now();
  const existing = database.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);

  if (!existing) {
    database.prepare(`
      INSERT INTO users (user_id, display_name, phone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, displayName, phone || null, now, now);
    return getUser(userId, database);
  }

  const nextName = displayName || existing.display_name;
  const nextPhone = phone === undefined ? existing.phone : (phone || existing.phone || null);
  database.prepare(`
    UPDATE users
    SET display_name = ?, phone = ?, updated_at = ?
    WHERE user_id = ?
  `).run(nextName, nextPhone, now, userId);
  return getUser(userId, database);
}

function getUser(userId, database = openDb()) {
  return database.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) || null;
}

function findUserByPhone(phone, database = openDb()) {
  if (!phone) return null;
  return database.prepare('SELECT * FROM users WHERE phone = ?').get(phone) || null;
}

function findAccountUserByPhone(phone, database = openDb()) {
  if (!phone) return null;
  return database.prepare('SELECT * FROM account_users WHERE phone = ?').get(phone) || null;
}

function findAccountUserById(userId, database = openDb()) {
  if (!userId) return null;
  return database.prepare('SELECT * FROM account_users WHERE id = ?').get(userId) || null;
}

function findAccountUserByWechatOpenid(openid, database = openDb()) {
  if (!openid) return null;
  return database.prepare('SELECT * FROM account_users WHERE wechat_openid = ?').get(openid) || null;
}

function createAccountUser({ id, phone, wechatOpenid = null, passwordHash, nickname, avatarUrl = null }, database = openDb()) {
  const now = Date.now();
  database.prepare(`
    INSERT INTO account_users (id, phone, wechat_openid, password_hash, nickname, avatar_url, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(id, phone, wechatOpenid, passwordHash, nickname, avatarUrl, now, now);

  upsertUser({ userId: id, displayName: nickname, phone, adoptLegacyData: false }, database);
  return findAccountUserById(id, database);
}

function bindWechatOpenidToAccountUser(userId, wechatOpenid, database = openDb()) {
  const existing = findAccountUserById(userId, database);
  if (!existing || !wechatOpenid) return existing;

  const now = Date.now();
  database.prepare(`
    UPDATE account_users
    SET wechat_openid = ?, updated_at = ?
    WHERE id = ?
  `).run(wechatOpenid, now, userId);

  return findAccountUserById(userId, database);
}

function updateAccountUserProfile(userId, { nickname, avatarUrl, phone }, database = openDb()) {
  const existing = findAccountUserById(userId, database);
  if (!existing) return null;

  const nextNickname = nickname === undefined ? existing.nickname : (nickname || existing.nickname);
  const nextAvatarUrl = avatarUrl === undefined ? existing.avatar_url : avatarUrl;
  const normalizedPhone = phone === undefined ? undefined : String(phone).trim();
  const nextPhone = normalizedPhone === undefined
    ? existing.phone
    : (normalizedPhone || (existing.wechat_openid ? `wx:${existing.wechat_openid}` : existing.phone));
  const now = Date.now();

  database.prepare(`
    UPDATE account_users
    SET nickname = ?, avatar_url = ?, phone = ?, updated_at = ?
    WHERE id = ?
  `).run(nextNickname, nextAvatarUrl, nextPhone, now, userId);

  upsertUser({ userId, displayName: nextNickname, phone: nextPhone }, database);
  return findAccountUserById(userId, database);
}

function updateAccountUserPassword(userId, passwordHash, database = openDb()) {
  const existing = findAccountUserById(userId, database);
  if (!existing) return null;

  const now = Date.now();
  database.prepare(`
    UPDATE account_users
    SET password_hash = ?, updated_at = ?
    WHERE id = ?
  `).run(passwordHash, now, userId);

  return findAccountUserById(userId, database);
}

function createAccountSession({ id, userId, deviceId, sessionToken }, database = openDb()) {
  const now = Date.now();
  database.prepare(`
    INSERT INTO user_sessions (id, user_id, device_id, session_token, revoked_at, last_active_at, created_at)
    VALUES (?, ?, ?, ?, NULL, ?, ?)
  `).run(id, userId, deviceId, sessionToken, now, now);

  return database.prepare('SELECT * FROM user_sessions WHERE id = ?').get(id) || null;
}

function revokeActiveSessionsForUser(userId, database = openDb()) {
  const now = Date.now();
  database.prepare(`
    UPDATE user_sessions
    SET revoked_at = ?
    WHERE user_id = ? AND revoked_at IS NULL
  `).run(now, userId);
}

function findSessionByToken(token, database = openDb()) {
  if (!token) return null;
  return database.prepare('SELECT * FROM user_sessions WHERE session_token = ?').get(token) || null;
}

function touchSession(sessionId, database = openDb()) {
  const now = Date.now();
  database.prepare('UPDATE user_sessions SET last_active_at = ? WHERE id = ?').run(now, sessionId);
}

function revokeSessionByToken(token, database = openDb()) {
  const now = Date.now();
  database.prepare(`
    UPDATE user_sessions
    SET revoked_at = ?
    WHERE session_token = ? AND revoked_at IS NULL
  `).run(now, token);
}

function bindLegacyLocalDataToUser(userId, database = openDb()) {
  adoptLegacyLocalUser(database, userId);
  return { success: true };
}

function clearLegacyLocalDataForUser(userId, database = openDb()) {
  const clear = database.transaction(() => {
    database.prepare("DELETE FROM messages WHERE contact_id IN (SELECT id FROM contacts WHERE owner_user_id = 'local-user')").run();
    database.prepare("DELETE FROM ritual_events WHERE owner_user_id = 'local-user'").run();
    database.prepare("DELETE FROM ritual_streaks WHERE owner_user_id = 'local-user'").run();
    database.prepare("DELETE FROM cloud_backups WHERE owner_user_id = 'local-user'").run();
    database.prepare("DELETE FROM friend_requests WHERE requester_user_id = 'local-user' OR target_user_id = 'local-user'").run();
    database.prepare("DELETE FROM contacts WHERE owner_user_id = 'local-user'").run();
  });

  clear();
  return { success: true, user_id: userId };
}

function listContacts(ownerUserId = 'local-user') {
  return openDb()
    .prepare('SELECT * FROM contacts WHERE owner_user_id = ? ORDER BY updated_at DESC')
    .all(ownerUserId)
    .map(normalizeContact);
}

function findContactByOwnerAndPeerUserId(ownerUserId, peerUserId, database = openDb()) {
  if (!peerUserId) return null;
  const row = database.prepare(`
    SELECT * FROM contacts
    WHERE owner_user_id = ? AND peer_user_id = ?
    ORDER BY updated_at DESC
    LIMIT 1
  `).get(ownerUserId, peerUserId);
  return row ? normalizeContact(row) : null;
}

function findContactByOwnerAndPhone(ownerUserId, phone, database = openDb()) {
  if (!phone) return null;
  const row = database.prepare(`
    SELECT * FROM contacts
    WHERE owner_user_id = ? AND phone = ?
    ORDER BY updated_at DESC
    LIMIT 1
  `).get(ownerUserId, phone);
  return row ? normalizeContact(row) : null;
}

function createContact({ ownerUserId = 'local-user', name, phone, peerUserId = null, syncState = 'local_only', lastMessage = '' }, database = openDb()) {
  const now = Date.now();
  const contact = {
    id: uuidv4(),
    owner_user_id: ownerUserId,
    conversation_id: uuidv4(),
    name,
    phone: phone || '',
    peer_user_id: peerUserId,
    avatar: null,
    last_message: lastMessage,
    sync_state: syncState,
    created_at: now,
    updated_at: now,
  };

  database.prepare(`
    INSERT INTO contacts (id, owner_user_id, conversation_id, name, phone, peer_user_id, avatar, last_message, sync_state, created_at, updated_at)
    VALUES (@id, @owner_user_id, @conversation_id, @name, @phone, @peer_user_id, @avatar, @last_message, @sync_state, @created_at, @updated_at)
  `).run(contact);

  return normalizeContact(contact);
}

function createOrUpdateContactForPeer({ ownerUserId, peerUserId, name, phone = '', syncState = 'matched', lastMessage = '' }, database = openDb()) {
  const existing = findContactByOwnerAndPeerUserId(ownerUserId, peerUserId, database);
  const now = Date.now();

  if (existing) {
    database.prepare(`
      UPDATE contacts
      SET name = ?, phone = ?, last_message = ?, sync_state = ?, updated_at = ?
      WHERE id = ?
    `).run(name, phone || existing.phone || '', lastMessage, syncState, now, existing.id);
    return getContact(existing.id);
  }

  return createContact({
    ownerUserId,
    name,
    phone,
    peerUserId,
    syncState,
    lastMessage,
  }, database);
}

function createFriendRequest({ requesterUserId, requesterName, requesterPhone = '', requesterContactId = null, targetUserId, targetPhone = '', channel }, database = openDb()) {
  const existing = database.prepare(`
    SELECT * FROM friend_requests
    WHERE requester_user_id = ? AND target_user_id = ? AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `).get(requesterUserId, targetUserId);

  if (existing) {
    return existing;
  }

  const now = Date.now();
  const request = {
    id: uuidv4(),
    requester_user_id: requesterUserId,
    requester_name: requesterName,
    requester_phone: requesterPhone || null,
    requester_contact_id: requesterContactId,
    target_user_id: targetUserId,
    target_phone: targetPhone || null,
    status: 'pending',
    channel,
    created_at: now,
    updated_at: now,
  };

  database.prepare(`
    INSERT INTO friend_requests (
      id, requester_user_id, requester_name, requester_phone, requester_contact_id,
      target_user_id, target_phone, status, channel, created_at, updated_at
    )
    VALUES (
      @id, @requester_user_id, @requester_name, @requester_phone, @requester_contact_id,
      @target_user_id, @target_phone, @status, @channel, @created_at, @updated_at
    )
  `).run(request);

  return request;
}

function listIncomingFriendRequests(targetUserId, database = openDb()) {
  return database.prepare(`
    SELECT * FROM friend_requests
    WHERE target_user_id = ? AND status = 'pending'
    ORDER BY created_at DESC
  `).all(targetUserId);
}

function acceptFriendRequest(requestId, targetUserId, database = openDb()) {
  const request = database.prepare('SELECT * FROM friend_requests WHERE id = ?').get(requestId);
  if (!request) return { status: 'not_found' };
  if (request.target_user_id !== targetUserId) return { status: 'forbidden' };
  if (request.status === 'accepted') return { status: 'already_accepted' };

  const requester = getUser(request.requester_user_id, database);
  const target = getUser(targetUserId, database);
  if (!requester || !target) return { status: 'user_missing' };

  const now = Date.now();
  let requesterContact = null;
  let targetContact = null;

  const accept = database.transaction(() => {
    requesterContact = createOrUpdateContactForPeer({
      ownerUserId: request.requester_user_id,
      peerUserId: targetUserId,
      name: target.display_name,
      phone: target.phone || request.target_phone || '',
      syncState: 'matched',
      lastMessage: '你们已成为好友',
    }, database);

    targetContact = createOrUpdateContactForPeer({
      ownerUserId: targetUserId,
      peerUserId: request.requester_user_id,
      name: request.requester_name,
      phone: request.requester_phone || requester.phone || '',
      syncState: 'matched',
      lastMessage: '已通过你的好友申请',
    }, database);

    recordRelationshipStarted({
      ownerUserId: request.requester_user_id,
      contactId: requesterContact.id,
      conversationId: requesterContact.conversation_id,
      peerName: target.display_name,
    }, database);

    recordRelationshipStarted({
      ownerUserId: targetUserId,
      contactId: targetContact.id,
      conversationId: targetContact.conversation_id,
      peerName: requester.display_name,
    }, database);

    database.prepare(`
      UPDATE friend_requests
      SET status = 'accepted', updated_at = ?
      WHERE id = ?
    `).run(now, requestId);
  });

  accept();
  return { status: 'accepted', requesterContact, targetContact };
}

function getContact(contactId, ownerUserId = null) {
  const database = openDb();
  const row = ownerUserId
    ? database.prepare('SELECT * FROM contacts WHERE id = ? AND owner_user_id = ?').get(contactId, ownerUserId)
    : database.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
  return row ? normalizeContact(row) : null;
}

function buildPreview(type, content) {
  return type === 'text' ? content : `[${type}]`;
}

function refreshContactPreview(database, contactId, updatedAt = Date.now()) {
  const latest = database.prepare(`
    SELECT type, content
    FROM messages
    WHERE contact_id = ? AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `).get(contactId);

  database.prepare(`
    UPDATE contacts
    SET last_message = ?, updated_at = ?
    WHERE id = ?
  `).run(latest ? buildPreview(latest.type, latest.content) : '', updatedAt, contactId);
}

function listMessages(contactId, limit = 50, before = Date.now() + 1, ownerUserId = null) {
  const database = openDb();
  const query = ownerUserId
    ? `
      SELECT messages.*
      FROM messages
      INNER JOIN contacts ON contacts.id = messages.contact_id
      WHERE messages.contact_id = ? AND messages.created_at < ? AND messages.deleted_at IS NULL AND contacts.owner_user_id = ?
      ORDER BY messages.created_at DESC
      LIMIT ?
    `
    : `
      SELECT * FROM messages
      WHERE contact_id = ? AND created_at < ? AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ?
    `;
  const args = ownerUserId ? [contactId, before, ownerUserId, limit] : [contactId, before, limit];
  return database.prepare(query).all(...args).reverse().map(normalizeMessage);
}

function createMessage({
  contactId,
  conversationId,
  clientId,
  type,
  content,
  direction = 'out',
  duration = null,
  burnAfterRead = false,
  burnDuration = null,
  createdAtOverride = null,
}) {
  const now = createdAtOverride || Date.now();
  const contact = getContact(contactId);
  const message = {
    id: uuidv4(),
    contact_id: contactId,
    conversation_id: conversationId || contact.conversation_id,
    client_id: clientId || `${contactId}:${now}`,
    direction,
    type,
    content,
    duration,
    burn_after_read: burnAfterRead ? 1 : 0,
    burn_duration: burnDuration,
    read_at: null,
    sync_state: 'local_only',
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  const database = openDb();
  const insert = database.transaction(() => {
    database.prepare(`
      INSERT INTO messages (
        id, contact_id, conversation_id, client_id, direction, type, content, duration,
        burn_after_read, burn_duration, read_at, sync_state, created_at, updated_at, deleted_at
      )
      VALUES (
        @id, @contact_id, @conversation_id, @client_id, @direction, @type, @content, @duration,
        @burn_after_read, @burn_duration, @read_at, @sync_state, @created_at, @updated_at, @deleted_at
      )
    `).run(message);

    database.prepare('UPDATE contacts SET last_message = ?, updated_at = ? WHERE id = ?')
      .run(buildPreview(type, content), now, contactId);

    if (type === 'text') {
      recordTextMessageRitual({
        ownerUserId: contact.owner_user_id,
        contactId,
        conversationId: message.conversation_id,
        content,
        timestamp: now,
      }, database);
    }
  });
  insert();

  return normalizeMessage(message);
}

function markMessageRead(messageId, ownerUserId = null) {
  const database = openDb();
  const now = Date.now();
  const result = ownerUserId
    ? database.prepare(`
      UPDATE messages
      SET read_at = ?
      WHERE id = ? AND contact_id IN (SELECT id FROM contacts WHERE owner_user_id = ?)
    `).run(now, messageId, ownerUserId)
    : database.prepare('UPDATE messages SET read_at = ? WHERE id = ?').run(now, messageId);
  return result.changes > 0;
}

function deleteMessage(messageId, ownerUserId = null) {
  const database = openDb();
  const existing = ownerUserId
    ? database.prepare(`
      SELECT messages.contact_id
      FROM messages
      INNER JOIN contacts ON contacts.id = messages.contact_id
      WHERE messages.id = ? AND contacts.owner_user_id = ?
    `).get(messageId, ownerUserId)
    : database.prepare('SELECT contact_id FROM messages WHERE id = ?').get(messageId);

  if (!existing) {
    return false;
  }

  const now = Date.now();
  const destroy = database.transaction(() => {
    database.prepare(`
      UPDATE messages
      SET deleted_at = ?, updated_at = ?, sync_state = 'pending_delete'
      WHERE id = ?
    `).run(now, now, messageId);

    refreshContactPreview(database, existing.contact_id, now);
  });

  destroy();
  return true;
}

function createCloudBackup({
  contactId,
  ownerUserId = 'local-user',
  messageId = null,
  type,
  content,
  duration = null,
  cloudUrl = null,
  source = 'chat_message',
}) {
  const now = Date.now();
  const contact = getContact(contactId, ownerUserId);
  const backup = {
    id: uuidv4(),
    owner_user_id: ownerUserId,
    contact_id: contactId,
    conversation_id: contact?.conversation_id || contactId,
    message_id: messageId,
    contact_name: contact?.name || '未知联系人',
    contact_phone: contact?.phone || '',
    peer_user_id: contact?.peer_user_id || null,
    type,
    content,
    duration,
    source,
    cloud_url: cloudUrl,
    sync_state: 'local_only',
    created_at: now,
    updated_at: now,
    restored_at: null,
  };

  openDb().prepare(`
    INSERT INTO cloud_backups (
      id, owner_user_id, contact_id, conversation_id, message_id, contact_name, contact_phone, peer_user_id,
      type, content, duration, source, cloud_url, sync_state, created_at, updated_at, restored_at
    )
    VALUES (
      @id, @owner_user_id, @contact_id, @conversation_id, @message_id, @contact_name, @contact_phone, @peer_user_id,
      @type, @content, @duration, @source, @cloud_url, @sync_state, @created_at, @updated_at, @restored_at
    )
  `).run(backup);

  return normalizeCloudBackup(backup);
}

function listCloudBackups(ownerUserId = 'local-user') {
  return openDb()
    .prepare('SELECT * FROM cloud_backups WHERE owner_user_id = ? ORDER BY created_at ASC')
    .all(ownerUserId)
    .map(normalizeCloudBackup);
}

function restoreCloudBackupToMessage(backupId, ownerUserId = 'local-user') {
  const database = openDb();
  const backup = database.prepare('SELECT * FROM cloud_backups WHERE id = ? AND owner_user_id = ?').get(backupId, ownerUserId);

  if (!backup) {
    return { status: 'not_found' };
  }

  if (backup.restored_at) {
    return { status: 'already_restored' };
  }

  const now = Date.now();
  let restoredMessage = null;
  const restore = database.transaction(() => {
    restoredMessage = createMessage({
      contactId: backup.contact_id,
      conversationId: backup.conversation_id,
      clientId: `${backup.id}:restore:${now}`,
      type: backup.type,
      content: backup.content,
      direction: 'out',
      duration: backup.duration,
      burnAfterRead: false,
      burnDuration: null,
    });

    database.prepare(`
      UPDATE cloud_backups
      SET restored_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, backupId);
  });

  restore();
  return { status: 'restored', message: restoredMessage };
}

function deleteCloudBackup(backupId, ownerUserId = 'local-user') {
  const result = openDb().prepare('DELETE FROM cloud_backups WHERE id = ? AND owner_user_id = ?').run(backupId, ownerUserId);
  return result.changes > 0;
}

function normalizeMembership(row) {
  const plan = row ? getMembershipPlanByCode(row.plan_code) : null;
  return row ? {
    id: row.id,
    user_id: row.user_id,
    plan_code: row.plan_code,
    plan_name: plan?.name || row.plan_code,
    plan_amount: plan?.amount || null,
    plan_days: plan?.days || null,
    plan_bonus_days: plan?.bonusDays || 0,
    plan_total_days: plan?.totalDays || null,
    status: row.status,
    start_at: row.start_at,
    expire_at: row.expire_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  } : null;
}

function normalizeMembershipOrder(row) {
  const plan = row ? getMembershipPlanByCode(row.plan_code) : null;
  return row ? {
    id: row.id,
    user_id: row.user_id,
    amount: row.amount,
    plan_code: row.plan_code,
    plan_name: plan?.name || row.plan_code,
    plan_amount: plan?.amount || row.amount,
    plan_days: plan?.days || null,
    plan_bonus_days: plan?.bonusDays || 0,
    plan_total_days: plan?.totalDays || null,
    status: row.status,
    payer_phone: row.payer_phone,
    paid_at: row.paid_at,
    payment_proof: row.payment_proof,
    note: row.note,
    review_note: row.review_note,
    reviewed_at: row.reviewed_at,
    reviewer: row.reviewer,
    created_at: row.created_at,
    updated_at: row.updated_at,
  } : null;
}

function normalizeMembershipPurchaseOrder(row) {
  const plan = row ? getMembershipPlanByCode(row.plan_code) : null;
  return row ? {
    id: row.id,
    user_id: row.user_id,
    amount: row.amount,
    plan_code: row.plan_code,
    plan_name: plan?.name || row.plan_code,
    plan_amount: plan?.amount || row.amount,
    plan_days: plan?.days || null,
    plan_bonus_days: plan?.bonusDays || 0,
    plan_total_days: plan?.totalDays || null,
    status: row.status,
    provider: row.provider,
    provider_order_id: row.provider_order_id,
    provider_transaction_id: row.provider_transaction_id,
    payment_payload: row.payment_payload ? JSON.parse(row.payment_payload) : null,
    paid_at: row.paid_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  } : null;
}

function buildMembershipSnapshot(base) {
  return Object.assign({}, base, {
    available_plans: getMembershipPlans(),
    gift_rules: [
      { title: '新用户赠送', detail: '注册后可享 3 天体验期' },
      { title: '首购赠送', detail: '首月体验套餐首购额外赠送 7 天' },
      { title: '邀请赠送', detail: '邀请好友后双方各送 3 天，后续接入邀请记录' },
    ],
  });
}

function hasPriorMembershipHistory(database, userId) {
  const membershipCount = database
    .prepare('SELECT COUNT(*) AS count FROM memberships WHERE user_id = ?')
    .get(userId).count;
  if (membershipCount > 0) {
    return true;
  }
  const approvedOrderCount = database
    .prepare("SELECT COUNT(*) AS count FROM membership_orders WHERE user_id = ? AND status = 'approved'")
    .get(userId).count;
  if (approvedOrderCount > 0) {
    return true;
  }
  const paidPurchaseCount = database
    .prepare("SELECT COUNT(*) AS count FROM membership_purchase_orders WHERE user_id = ? AND status = 'paid'")
    .get(userId).count;
  return paidPurchaseCount > 0;
}

function getMembershipSnapshot(userId = 'local-user') {
  const database = openDb();
  const now = Date.now();
  const membership = normalizeMembership(
    database.prepare('SELECT * FROM memberships WHERE user_id = ? ORDER BY expire_at DESC LIMIT 1').get(userId)
  );
  const pendingPurchaseOrder = normalizeMembershipPurchaseOrder(
    database.prepare("SELECT * FROM membership_purchase_orders WHERE user_id = ? AND status = 'pending_payment' ORDER BY created_at DESC LIMIT 1").get(userId)
  );

  if (membership && membership.status === 'active' && membership.expire_at > now) {
    return buildMembershipSnapshot({
      tier: 'paid',
      status: 'active',
      plan_code: membership.plan_code,
      plan_name: membership.plan_name,
      expire_at: membership.expire_at,
      start_at: membership.start_at,
      pending_order: null,
      pending_purchase_order: pendingPurchaseOrder,
    });
  }

  if (pendingPurchaseOrder) {
    return buildMembershipSnapshot({
      tier: 'free',
      status: 'pending_payment',
      plan_code: pendingPurchaseOrder.plan_code,
      plan_name: pendingPurchaseOrder.plan_name,
      expire_at: null,
      start_at: null,
      pending_order: null,
      pending_purchase_order: pendingPurchaseOrder,
    });
  }

  return buildMembershipSnapshot({
    tier: 'free',
    status: membership && membership.expire_at <= now ? 'expired' : 'inactive',
    plan_code: membership?.plan_code || DEFAULT_MEMBERSHIP_PLAN_CODE,
    plan_name: membership?.plan_name || resolveMembershipPlan(DEFAULT_MEMBERSHIP_PLAN_CODE)?.name,
    expire_at: membership?.expire_at || null,
    start_at: membership?.start_at || null,
    pending_order: null,
    pending_purchase_order: null,
  });
}

function createProviderOrderId() {
  return `m${Date.now().toString(36)}${uuidv4().replace(/-/g, '').slice(0, 10)}`;
}

function grantMembershipForPlan(database, { userId, planCode, overrideDays = null }) {
  const now = Date.now();
  const plan = getMembershipPlanByCode(planCode) || resolveMembershipPlan(DEFAULT_MEMBERSHIP_PLAN_CODE);
  const priorMembership = hasPriorMembershipHistory(database, userId);
  const bonusDays = getPlanBonusDays(planCode, priorMembership);
  const defaultDays = Number(plan?.days || 30) + bonusDays;
  const grantDays = Math.max(1, Number(overrideDays) || defaultDays);
  const activeMembership = database
    .prepare("SELECT * FROM memberships WHERE user_id = ? AND status = 'active' ORDER BY expire_at DESC LIMIT 1")
    .get(userId);
  const startAt = activeMembership && activeMembership.expire_at > now ? activeMembership.expire_at : now;
  const expireAt = startAt + grantDays * 24 * 60 * 60 * 1000;

  const membership = {
    id: activeMembership?.id || uuidv4(),
    user_id: userId,
    plan_code: plan?.code || DEFAULT_MEMBERSHIP_PLAN_CODE,
    status: 'active',
    start_at: activeMembership?.start_at || now,
    expire_at: expireAt,
    created_at: activeMembership?.created_at || now,
    updated_at: now,
  };

  database.prepare(`
    INSERT INTO memberships (id, user_id, plan_code, status, start_at, expire_at, created_at, updated_at)
    VALUES (@id, @user_id, @plan_code, @status, @start_at, @expire_at, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      plan_code = excluded.plan_code,
      status = excluded.status,
      start_at = excluded.start_at,
      expire_at = excluded.expire_at,
      updated_at = excluded.updated_at
  `).run(membership);

  return normalizeMembership(database.prepare('SELECT * FROM memberships WHERE id = ?').get(membership.id));
}

function createMembershipManualOrder({ userId, amount, planCode, payerPhone, paidAt, paymentProof, note = '' }) {
  const database = openDb();
  const now = Date.now();
  const normalizedPlanCode = normalizePlanCode(planCode);
  const plan = getMembershipPlanByCode(normalizedPlanCode);
  if (!plan) {
    throw new Error('会员套餐不存在');
  }
  const existingPending = database
    .prepare("SELECT id FROM membership_orders WHERE user_id = ? AND status = 'pending_review' ORDER BY created_at DESC LIMIT 1")
    .get(userId);

  if (existingPending) {
    throw new Error('你已有待审核的会员申请');
  }

  const order = {
    id: uuidv4(),
    user_id: userId,
    amount,
    plan_code: plan.code,
    status: 'pending_review',
    payer_phone: payerPhone,
    paid_at: paidAt,
    payment_proof: paymentProof,
    note,
    review_note: null,
    reviewed_at: null,
    reviewer: null,
    created_at: now,
    updated_at: now,
  };

  database.prepare(`
    INSERT INTO membership_orders (
      id, user_id, amount, plan_code, status, payer_phone, paid_at,
      payment_proof, note, review_note, reviewed_at, reviewer, created_at, updated_at
    ) VALUES (
      @id, @user_id, @amount, @plan_code, @status, @payer_phone, @paid_at,
      @payment_proof, @note, @review_note, @reviewed_at, @reviewer, @created_at, @updated_at
    )
  `).run(order);

  return normalizeMembershipOrder(order);
}

function listMembershipOrders(status = 'pending_review') {
  const database = openDb();
  const rows = status
    ? database.prepare('SELECT * FROM membership_orders WHERE status = ? ORDER BY created_at ASC').all(status)
    : database.prepare('SELECT * FROM membership_orders ORDER BY created_at ASC').all();
  return rows.map(normalizeMembershipOrder);
}

function createMembershipPurchaseOrder({ userId, amount, planCode, provider = 'wechat_virtual' }) {
  const database = openDb();
  const now = Date.now();
  const normalizedPlanCode = normalizePlanCode(planCode);
  const plan = getMembershipPlanByCode(normalizedPlanCode);
  if (!plan) {
    throw new Error('会员套餐不存在');
  }
  if (Number(amount) !== Number(plan.amount)) {
    throw new Error(`当前${plan.name}价格为 ${plan.amount} 元`);
  }

  const order = {
    id: uuidv4(),
    user_id: userId,
    amount: Number(plan.amount),
    plan_code: plan.code,
    status: 'pending_payment',
    provider,
    provider_order_id: createProviderOrderId(),
    provider_transaction_id: null,
    payment_payload: null,
    paid_at: null,
    created_at: now,
    updated_at: now,
  };

  const tx = database.transaction(() => {
    database.prepare(`
      UPDATE membership_purchase_orders
      SET status = 'closed', updated_at = ?
      WHERE user_id = ? AND status = 'pending_payment'
    `).run(now, userId);

    database.prepare(`
      INSERT INTO membership_purchase_orders (
        id, user_id, amount, plan_code, status, provider, provider_order_id,
        provider_transaction_id, payment_payload, paid_at, created_at, updated_at
      ) VALUES (
        @id, @user_id, @amount, @plan_code, @status, @provider, @provider_order_id,
        @provider_transaction_id, @payment_payload, @paid_at, @created_at, @updated_at
      )
    `).run(order);
  });

  tx();
  return normalizeMembershipPurchaseOrder(database.prepare('SELECT * FROM membership_purchase_orders WHERE id = ?').get(order.id));
}

function completeMembershipPurchaseOrder({ orderId, userId, providerTransactionId = '', paymentPayload = null }) {
  const database = openDb();
  const order = database.prepare('SELECT * FROM membership_purchase_orders WHERE id = ?').get(orderId);
  if (!order || order.user_id !== userId || order.status !== 'pending_payment') {
    return { order: null, membership: null };
  }

  const now = Date.now();
  let membership = null;
  const tx = database.transaction(() => {
    membership = grantMembershipForPlan(database, {
      userId: order.user_id,
      planCode: order.plan_code,
    });

    database.prepare(`
      UPDATE membership_purchase_orders
      SET status = 'paid',
          provider_transaction_id = ?,
          payment_payload = ?,
          paid_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(providerTransactionId || order.provider_order_id, paymentPayload ? JSON.stringify(paymentPayload) : null, now, now, orderId);
  });

  tx();
  return {
    order: normalizeMembershipPurchaseOrder(database.prepare('SELECT * FROM membership_purchase_orders WHERE id = ?').get(orderId)),
    membership,
  };
}

function approveMembershipOrder(orderId, reviewer = 'manual-admin', overrideDays = null) {
  const database = openDb();
  const order = database.prepare('SELECT * FROM membership_orders WHERE id = ?').get(orderId);
  if (!order || order.status !== 'pending_review') {
    return { order: null, membership: null };
  }

  const now = Date.now();
  let membership = null;

  const tx = database.transaction(() => {
    membership = grantMembershipForPlan(database, {
      userId: order.user_id,
      planCode: order.plan_code,
      overrideDays,
    });

    database.prepare(`
      UPDATE membership_orders
      SET status = 'approved', reviewed_at = ?, reviewer = ?, updated_at = ?
      WHERE id = ?
    `).run(now, reviewer, now, orderId);
  });

  tx();
  return {
    order: normalizeMembershipOrder(database.prepare('SELECT * FROM membership_orders WHERE id = ?').get(orderId)),
    membership,
  };
}

function rejectMembershipOrder(orderId, reviewer = 'manual-admin', reason = '') {
  const database = openDb();
  const now = Date.now();
  const result = database.prepare(`
    UPDATE membership_orders
    SET status = 'rejected', review_note = ?, reviewed_at = ?, reviewer = ?, updated_at = ?
    WHERE id = ? AND status = 'pending_review'
  `).run(reason, now, reviewer, now, orderId);

  if (!result.changes) {
    return null;
  }

  return normalizeMembershipOrder(database.prepare('SELECT * FROM membership_orders WHERE id = ?').get(orderId));
}

function formatEventDay(timestamp) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function getShanghaiHour(timestamp) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date(timestamp));
  return Number(parts.find((part) => part.type === 'hour')?.value || 0);
}

function startOfDay(timestamp) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function normalizeRitualMilestone(row) {
  return {
    type: row.type,
    label: row.label,
    event_day: row.event_day,
    event_at: row.event_at,
    value_delta: row.value_delta,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
  };
}

function upsertRitualEvent({ ownerUserId, contactId, conversationId = null, type, label, eventAt, valueDelta = 0, metadata = null }, database = openDb()) {
  const existing = database.prepare(`
    SELECT * FROM ritual_events
    WHERE owner_user_id = ? AND contact_id = ? AND type = ?
    ORDER BY event_at ASC
    LIMIT 1
  `).get(ownerUserId, contactId, type);

  if (existing && ['relationship_started', 'first_text_message'].includes(type)) {
    return existing;
  }

  const now = Date.now();
  const event = {
    id: uuidv4(),
    owner_user_id: ownerUserId,
    contact_id: contactId,
    conversation_id: conversationId,
    type,
    label,
    event_day: formatEventDay(eventAt),
    event_at: eventAt,
    value_delta: valueDelta,
    metadata_json: metadata ? JSON.stringify(metadata) : null,
    created_at: now,
    updated_at: now,
  };

  database.prepare(`
    INSERT INTO ritual_events (
      id, owner_user_id, contact_id, conversation_id, type, label, event_day, event_at,
      value_delta, metadata_json, created_at, updated_at
    ) VALUES (
      @id, @owner_user_id, @contact_id, @conversation_id, @type, @label, @event_day, @event_at,
      @value_delta, @metadata_json, @created_at, @updated_at
    )
  `).run(event);

  return event;
}

function updateRitualStreak({ ownerUserId, contactId, streakType, eventAt }, database = openDb()) {
  const eventDay = formatEventDay(eventAt);
  const now = Date.now();
  const existing = database.prepare(`
    SELECT * FROM ritual_streaks
    WHERE owner_user_id = ? AND contact_id = ? AND streak_type = ?
  `).get(ownerUserId, contactId, streakType);

  if (!existing) {
    const row = {
      owner_user_id: ownerUserId,
      contact_id: contactId,
      streak_type: streakType,
      current_days: 1,
      best_days: 1,
      last_event_day: eventDay,
      updated_at: now,
    };
    database.prepare(`
      INSERT INTO ritual_streaks (
        owner_user_id, contact_id, streak_type, current_days, best_days, last_event_day, updated_at
      ) VALUES (
        @owner_user_id, @contact_id, @streak_type, @current_days, @best_days, @last_event_day, @updated_at
      )
    `).run(row);
    return row;
  }

  if (existing.last_event_day === eventDay) {
    return existing;
  }

  const diffDays = Math.round((startOfDay(eventAt) - startOfDay(new Date(existing.last_event_day).getTime())) / (24 * 60 * 60 * 1000));
  const currentDays = diffDays === 1 ? existing.current_days + 1 : 1;
  const bestDays = Math.max(existing.best_days, currentDays);

  database.prepare(`
    UPDATE ritual_streaks
    SET current_days = ?, best_days = ?, last_event_day = ?, updated_at = ?
    WHERE owner_user_id = ? AND contact_id = ? AND streak_type = ?
  `).run(currentDays, bestDays, eventDay, now, ownerUserId, contactId, streakType);

  return database.prepare(`
    SELECT * FROM ritual_streaks
    WHERE owner_user_id = ? AND contact_id = ? AND streak_type = ?
  `).get(ownerUserId, contactId, streakType);
}

function recordRelationshipStarted({ ownerUserId, contactId, conversationId, peerName }, database = openDb()) {
  return upsertRitualEvent({
    ownerUserId,
    contactId,
    conversationId,
    type: 'relationship_started',
    label: `你们成为了好友：${peerName}`,
    eventAt: Date.now(),
    valueDelta: 3,
  }, database);
}

function recordTextMessageRitual({ ownerUserId, contactId, conversationId, content, timestamp }, database = openDb()) {
  const eventAt = timestamp || Date.now();
  const firstTextMessage = database.prepare(`
    SELECT id FROM ritual_events
    WHERE owner_user_id = ? AND contact_id = ? AND type = 'first_text_message'
    LIMIT 1
  `).get(ownerUserId, contactId);

  if (!firstTextMessage) {
    upsertRitualEvent({
      ownerUserId,
      contactId,
      conversationId,
      type: 'first_text_message',
      label: `第一次认真说话：${content.slice(0, 12)}`,
      eventAt,
      valueDelta: 2,
    }, database);
  }

  updateRitualStreak({ ownerUserId, contactId, streakType: 'message', eventAt }, database);

  const lateNightMessages = database.prepare(`
    SELECT created_at
    FROM messages
    WHERE contact_id = ? AND deleted_at IS NULL AND type = 'text' AND created_at <= ?
    ORDER BY created_at ASC
  `).all(contactId, eventAt);

  const lateNightOnly = lateNightMessages.filter((item) => {
    const hour = getShanghaiHour(item.created_at);
    return hour >= 23 || hour <= 3;
  });

  if (lateNightOnly.length >= 2) {
    const durationMinutes = Math.round((lateNightOnly[lateNightOnly.length - 1].created_at - lateNightOnly[0].created_at) / 60000);
    const existing = database.prepare(`
      SELECT * FROM ritual_events
      WHERE owner_user_id = ? AND contact_id = ? AND type = 'late_night_long_talk'
      ORDER BY event_at DESC
      LIMIT 1
    `).get(ownerUserId, contactId);
    const existingDuration = existing?.metadata_json ? (JSON.parse(existing.metadata_json).durationMinutes || 0) : 0;

    if (durationMinutes >= 120 && durationMinutes > existingDuration) {
      if (existing) {
        database.prepare(`
          UPDATE ritual_events
          SET label = ?, event_day = ?, event_at = ?, value_delta = ?, metadata_json = ?, updated_at = ?
          WHERE id = ?
        `).run(
          `深夜长谈 ${durationMinutes} 分钟`,
          formatEventDay(eventAt),
          eventAt,
          4,
          JSON.stringify({ durationMinutes }),
          Date.now(),
          existing.id,
        );
      } else {
        upsertRitualEvent({
          ownerUserId,
          contactId,
          conversationId,
          type: 'late_night_long_talk',
          label: `深夜长谈 ${durationMinutes} 分钟`,
          eventAt,
          valueDelta: 4,
          metadata: { durationMinutes },
        }, database);
      }
    }
  }
}

function getRitualSummary(contactId, ownerUserId = 'local-user', database = openDb()) {
  const contact = getContact(contactId, ownerUserId);
  if (!contact) {
    return null;
  }

  const milestones = database.prepare(`
    SELECT * FROM ritual_events
    WHERE owner_user_id = ? AND contact_id = ?
      AND type IN ('relationship_started', 'first_text_message', 'late_night_long_talk')
    ORDER BY event_at ASC
  `).all(ownerUserId, contactId);

  const streak = database.prepare(`
    SELECT * FROM ritual_streaks
    WHERE owner_user_id = ? AND contact_id = ? AND streak_type = 'message'
  `).get(ownerUserId, contactId);

  const loveValueRow = database.prepare(`
    SELECT COALESCE(SUM(value_delta), 0) AS total
    FROM ritual_events
    WHERE owner_user_id = ? AND contact_id = ?
  `).get(ownerUserId, contactId);

  const longestLateNight = milestones
    .filter((item) => item.type === 'late_night_long_talk')
    .reduce((max, item) => Math.max(max, item.metadata_json ? (JSON.parse(item.metadata_json).durationMinutes || 0) : 0), 0);

  const calendarDays = database.prepare(`
    SELECT event_day, COUNT(*) AS event_count, COALESCE(SUM(value_delta), 0) AS day_value
    FROM ritual_events
    WHERE owner_user_id = ? AND contact_id = ?
    GROUP BY event_day
    ORDER BY event_day DESC
    LIMIT 35
  `).all(ownerUserId, contactId);

  return {
    contact_id: contactId,
    contact_name: contact.name,
    love_value: loveValueRow.total,
    current_streak_days: streak?.current_days || 0,
    best_streak_days: streak?.best_days || 0,
    longest_late_night_minutes: longestLateNight,
    milestones: milestones.map(normalizeRitualMilestone),
    calendar_days: calendarDays,
  };
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  upsertUser,
  getUser,
  findUserByPhone,
  findAccountUserByPhone,
  findAccountUserById,
  findAccountUserByWechatOpenid,
  createAccountUser,
  bindWechatOpenidToAccountUser,
  updateAccountUserProfile,
  updateAccountUserPassword,
  createAccountSession,
  revokeActiveSessionsForUser,
  findSessionByToken,
  touchSession,
  revokeSessionByToken,
  bindLegacyLocalDataToUser,
  clearLegacyLocalDataForUser,
  listContacts,
  createContact,
  createOrUpdateContactForPeer,
  findContactByOwnerAndPeerUserId,
  findContactByOwnerAndPhone,
  createFriendRequest,
  listIncomingFriendRequests,
  acceptFriendRequest,
  getContact,
  listMessages,
  createMessage,
  markMessageRead,
  deleteMessage,
  createCloudBackup,
  listCloudBackups,
  restoreCloudBackupToMessage,
  deleteCloudBackup,
  getMembershipSnapshot,
  createMembershipManualOrder,
  listMembershipOrders,
  approveMembershipOrder,
  rejectMembershipOrder,
  getRitualSummary,
  recordRelationshipStarted,
  recordTextMessageRitual,
  createMembershipPurchaseOrder,
  completeMembershipPurchaseOrder,
  closeDb,
};
