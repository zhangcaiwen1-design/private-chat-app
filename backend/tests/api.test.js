const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'private-chat-test-'));
process.env.DB_PATH = path.join(tempDir, 'test.db');
process.env.NODE_ENV = 'test';
process.env.ADMIN_MEMBERSHIP_KEY = 'test-admin-key';

const { createApp } = require('../server');
const { closeDb } = require('../services/db');

let app;

async function activatePaidMembership(userHeaders, payerPhone = userHeaders['x-user-phone']) {
  const orderRes = await request(app)
    .post('/api/v1/membership/manual-order')
    .set(userHeaders)
    .send({
      amount: 9.9,
      payer_phone: payerPhone,
      paid_at: Date.now(),
      payment_proof: 'data:image/png;base64,ZmFrZQ==',
      note: '自动化测试会员开通',
    })
    .expect(200);

  await request(app)
    .post(`/api/v1/admin/membership-orders/${orderRes.body.order.id}/approve`)
    .set('x-admin-key', 'test-admin-key')
    .send({ months: 1 })
    .expect(200);
}

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

test('legacy 阿宁 seed is sanitized away on startup', async () => {
  const database = require('../services/db').getDatabase();
  const now = Date.now();
  database.prepare(`
    INSERT INTO contacts (id, owner_user_id, conversation_id, name, phone, peer_user_id, avatar, last_message, sync_state, created_at, updated_at)
    VALUES (?, 'local-user', ?, '阿宁', '10086', NULL, NULL, '[voice]', 'local_only', ?, ?)
  `).run('legacy-aning-contact', 'legacy-aning-conversation', now, now);

  delete require.cache[require.resolve('../services/db')];
  const reloadedDb = require('../services/db');
  reloadedDb.closeDb();
  reloadedDb.initDatabase();
  const reopenedDatabase = reloadedDb.getDatabase();

  const row = reopenedDatabase.prepare('SELECT name, phone, last_message FROM contacts WHERE id = ?').get('legacy-aning-contact');
  expect(row.name).not.toBe('阿宁');
  expect(row.phone).toBe('13800138086');
  expect(row.last_message).toBe('刚给你留了条语音');
});

test('register creates a phone account and me returns the signed-in user', async () => {
  const deviceId = 'device-auth-1';

  const registerRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      phone: '13855550001',
      password: '123456',
      nickname: '测试用户',
      device_id: deviceId,
    })
    .expect(200);

  expect(registerRes.body.token).toEqual(expect.any(String));
  expect(registerRes.body.user.phone).toBe('13855550001');
  expect(registerRes.body.user.nickname).toBe('测试用户');
  expect(registerRes.body.user).not.toHaveProperty('password_hash');

  const meRes = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${registerRes.body.token}`)
    .set('x-device-id', deviceId)
    .expect(200);

  expect(meRes.body.user.phone).toBe('13855550001');
  expect(meRes.body.user.nickname).toBe('测试用户');
});

test('register does not bind local contacts until the user chooses bind', async () => {
  const beforeRes = await request(app).get('/api/v1/contacts').expect(200);
  expect(beforeRes.body.contacts.length).toBeGreaterThan(0);

  const deviceId = 'device-auth-2';
  const registerRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      phone: '13855550002',
      password: '123456',
      nickname: '小满',
      device_id: deviceId,
    })
    .expect(200);

  const localAfterRegister = await request(app).get('/api/v1/contacts').expect(200);
  expect(localAfterRegister.body.contacts.length).toBeGreaterThan(0);

  const accountHeaders = {
    Authorization: `Bearer ${registerRes.body.token}`,
    'x-device-id': deviceId,
    'x-user-id': registerRes.body.user.id,
    'x-user-name': encodeURIComponent(registerRes.body.user.nickname),
    'x-user-phone': registerRes.body.user.phone,
  };

  const accountBeforeBind = await request(app)
    .get('/api/v1/contacts')
    .set(accountHeaders)
    .expect(200);
  expect(accountBeforeBind.body.contacts).toHaveLength(0);

  await request(app)
    .post('/api/v1/auth/local-data/bind')
    .set(accountHeaders)
    .expect(200);

  const accountAfterBind = await request(app)
    .get('/api/v1/contacts')
    .set(accountHeaders)
    .expect(200);
  expect(accountAfterBind.body.contacts.length).toBeGreaterThan(0);
});

test('phone lookup returns public profile preview without exposing password fields', async () => {
  await request(app)
    .post('/api/v1/auth/register')
    .send({
      phone: '13855550003',
      password: '123456',
      nickname: '清禾',
      device_id: 'device-auth-3',
    })
    .expect(200);

  const lookupRes = await request(app)
    .post('/api/v1/auth/phone/lookup')
    .send({ phone: '13855550003' })
    .expect(200);

  expect(lookupRes.body.exists).toBe(true);
  expect(lookupRes.body.user.nickname).toBe('清禾');
  expect(lookupRes.body.user.avatar_url).toBeNull();
  expect(lookupRes.body.user).not.toHaveProperty('phone');
  expect(lookupRes.body.user).not.toHaveProperty('password_hash');
});

test('password update changes the login password for the current account', async () => {
  const deviceId = 'device-auth-password';
  const registerRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      phone: '13855550009',
      password: '123456',
      nickname: '改密用户',
      device_id: deviceId,
    })
    .expect(200);

  await request(app)
    .post('/api/v1/auth/password')
    .set('Authorization', `Bearer ${registerRes.body.token}`)
    .set('x-device-id', deviceId)
    .send({ password: '654321' })
    .expect(200);

  await request(app)
    .post('/api/v1/auth/login')
    .send({
      phone: '13855550009',
      password: '123456',
      device_id: 'device-auth-password-old',
    })
    .expect(401);

  await request(app)
    .post('/api/v1/auth/login')
    .send({
      phone: '13855550009',
      password: '654321',
      device_id: 'device-auth-password-new',
    })
    .expect(200);
});

test('profile update changes the login phone and rejects duplicate phones', async () => {
  const primaryDeviceId = 'device-auth-phone-primary';
  const primaryRegisterRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      phone: '13855550019',
      password: '123456',
      nickname: '改号用户',
      device_id: primaryDeviceId,
    })
    .expect(200);

  await request(app)
    .post('/api/v1/auth/register')
    .send({
      phone: '13855550020',
      password: '123456',
      nickname: '占用用户',
      device_id: 'device-auth-phone-secondary',
    })
    .expect(200);

  const profileRes = await request(app)
    .post('/api/v1/auth/profile')
    .set('Authorization', `Bearer ${primaryRegisterRes.body.token}`)
    .set('x-device-id', primaryDeviceId)
    .send({ phone: '13855550021' })
    .expect(200);

  expect(profileRes.body.user.phone).toBe('13855550021');

  await request(app)
    .post('/api/v1/auth/login')
    .send({
      phone: '13855550019',
      password: '123456',
      device_id: 'device-auth-phone-old',
    })
    .expect(401);

  await request(app)
    .post('/api/v1/auth/profile')
    .set('Authorization', `Bearer ${primaryRegisterRes.body.token}`)
    .set('x-device-id', primaryDeviceId)
    .send({ phone: '13855550020' })
    .expect(409);

  await request(app)
    .post('/api/v1/auth/login')
    .send({
      phone: '13855550021',
      password: '123456',
      device_id: 'device-auth-phone-new',
    })
    .expect(200);
});

test('qr friend request appears in target inbox and creates both contacts after acceptance', async () => {
  const senderHeaders = {
    'x-user-id': 'user-a',
    'x-user-name': 'user-a',
    'x-user-phone': '13911110000',
  };
  const receiverHeaders = {
    'x-user-id': 'user-b',
    'x-user-name': 'user-b',
    'x-user-phone': '13922220000',
  };

  await request(app).get('/api/v1/contacts').set(senderHeaders).expect(200);
  await request(app).get('/api/v1/contacts').set(receiverHeaders).expect(200);

  const addRes = await request(app)
    .post('/api/v1/contacts/qr-add')
    .set(senderHeaders)
    .send({ qr_code: 'QR::user-b::demo' })
    .expect(200);

  expect(addRes.body.contact.sync_state).toBe('request_sent');
  expect(addRes.body.contact.peer_user_id).toBe('user-b');

  const inboxRes = await request(app)
    .get('/api/v1/contacts/requests/incoming')
    .set(receiverHeaders)
    .expect(200);

  expect(inboxRes.body.requests).toHaveLength(1);
  expect(inboxRes.body.requests[0].requester_user_id).toBe('user-a');
  expect(inboxRes.body.requests[0].requester_name).toBe('user-a');

  const acceptRes = await request(app)
    .post(`/api/v1/contacts/requests/${inboxRes.body.requests[0].id}/accept`)
    .set(receiverHeaders)
    .expect(200);

  expect(acceptRes.body.contact.peer_user_id).toBe('user-a');
  expect(acceptRes.body.contact.sync_state).toBe('matched');

  const senderContacts = await request(app)
    .get('/api/v1/contacts')
    .set(senderHeaders)
    .expect(200);

  const receiverContacts = await request(app)
    .get('/api/v1/contacts')
    .set(receiverHeaders)
    .expect(200);

  expect(senderContacts.body.contacts.some((item) => item.peer_user_id === 'user-b' && item.sync_state === 'matched')).toBe(true);
  expect(receiverContacts.body.contacts.some((item) => item.peer_user_id === 'user-a' && item.sync_state === 'matched')).toBe(true);
});

test('phone friend request targets the matched user instead of only saving local contact', async () => {
  const senderHeaders = {
    'x-user-id': 'user-c',
    'x-user-name': 'user-c',
    'x-user-phone': '13933330000',
  };
  const receiverHeaders = {
    'x-user-id': 'user-d',
    'x-user-name': 'user-d',
    'x-user-phone': '13944440000',
  };

  await request(app).get('/api/v1/contacts').set(senderHeaders).expect(200);
  await request(app).get('/api/v1/contacts').set(receiverHeaders).expect(200);

  const addRes = await request(app)
    .post('/api/v1/contacts')
    .set(senderHeaders)
    .send({ name: '丁方', phone: '13944440000' })
    .expect(200);

  expect(addRes.body.request_status).toBe('pending');
  expect(addRes.body.contact.peer_user_id).toBe('user-d');
  expect(addRes.body.contact.sync_state).toBe('request_sent');

  const inboxRes = await request(app)
    .get('/api/v1/contacts/requests/incoming')
    .set(receiverHeaders)
    .expect(200);

  expect(inboxRes.body.requests.some((item) => item.requester_user_id === 'user-c' && item.channel === 'phone')).toBe(true);
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

test('contacts and messages expose sync-ready metadata', async () => {
  const contactRes = await request(app)
    .post('/api/v1/contacts')
    .send({ name: '同步联系人', phone: '13900000000' })
    .expect(200);

  expect(contactRes.body.contact.conversation_id).toMatch(/[a-f0-9-]{36}/i);
  expect(contactRes.body.contact.sync_state).toBe('local_only');
  expect(contactRes.body.contact.peer_user_id).toBe(null);

  const messageRes = await request(app)
    .post('/api/v1/messages')
    .send({
      contact_id: contactRes.body.contact.id,
      conversation_id: contactRes.body.contact.conversation_id,
      client_id: 'local-user:1700000000000:1',
      type: 'text',
      content: '准备同步的本地消息',
    })
    .expect(200);

  expect(messageRes.body.message.conversation_id).toBe(contactRes.body.contact.conversation_id);
  expect(messageRes.body.message.client_id).toBe('local-user:1700000000000:1');
  expect(messageRes.body.message.sync_state).toBe('local_only');
  expect(messageRes.body.message.updated_at).toBe(messageRes.body.message.created_at);
});

test('deleting the latest message hides it and restores the previous contact preview', async () => {
  const contactRes = await request(app)
    .post('/api/v1/contacts')
    .send({ name: '预览回退联系人', phone: '13700000000' })
    .expect(200);

  const contactId = contactRes.body.contact.id;
  const conversationId = contactRes.body.contact.conversation_id;

  await request(app)
    .post('/api/v1/messages')
    .send({
      contact_id: contactId,
      conversation_id: conversationId,
      client_id: 'local-user:1700000000000:2',
      type: 'text',
      content: '第一条消息',
    })
    .expect(200);

  const latestRes = await request(app)
    .post('/api/v1/messages')
    .send({
      contact_id: contactId,
      conversation_id: conversationId,
      client_id: 'local-user:1700000000000:3',
      type: 'text',
      content: '最后一条消息',
    })
    .expect(200);

  await request(app)
    .delete(`/api/v1/messages/${latestRes.body.message.id}`)
    .expect(200);

  const messagesRes = await request(app)
    .get(`/api/v1/messages/${contactId}`)
    .expect(200);

  expect(messagesRes.body.messages.map((message) => message.text)).toEqual(['第一条消息']);

  const contactsRes = await request(app)
    .get('/api/v1/contacts')
    .expect(200);

  const refreshedContact = contactsRes.body.contacts.find((item) => item.id === contactId);
  expect(refreshedContact.last_message).toBe('第一条消息');
});

test('cloud backups can be uploaded listed and deleted locally', async () => {
  const userHeaders = {
    'x-user-id': 'cloud-member-1',
    'x-user-name': 'cloud-member-1',
    'x-user-phone': '13600000001',
  };

  await activatePaidMembership(userHeaders);

  const contactRes = await request(app)
    .post('/api/v1/contacts')
    .set(userHeaders)
    .send({ name: '云备份联系人', phone: '13600000000' })
    .expect(200);

  const uploadRes = await request(app)
    .post('/api/v1/cloud-backups')
    .set(userHeaders)
    .send({
      contact_id: contactRes.body.contact.id,
      type: 'text',
      content: '云端备份消息',
      cloud_url: null,
    })
    .expect(200);

  expect(uploadRes.body.backup.contact_id).toBe(contactRes.body.contact.id);
  expect(uploadRes.body.backup.type).toBe('text');
  expect(uploadRes.body.backup.content).toBe('云端备份消息');
  expect(uploadRes.body.backup.sync_state).toBe('local_only');

  const listRes = await request(app)
    .get('/api/v1/cloud-backups')
    .set(userHeaders)
    .expect(200);

  expect(listRes.body.messages).toHaveLength(1);
  expect(listRes.body.messages[0].id).toBe(uploadRes.body.backup.id);

  await request(app)
    .delete(`/api/v1/cloud-backups/${uploadRes.body.backup.id}`)
    .set(userHeaders)
    .expect(200);

  const afterDeleteRes = await request(app)
    .get('/api/v1/cloud-backups')
    .set(userHeaders)
    .expect(200);

  expect(afterDeleteRes.body.messages).toHaveLength(0);
});

test('cloud backups expose contact, time, and source dimensions', async () => {
  const userHeaders = {
    'x-user-id': 'cloud-member-2',
    'x-user-name': 'cloud-member-2',
    'x-user-phone': '13610000001',
  };

  await activatePaidMembership(userHeaders);

  const contactRes = await request(app)
    .post('/api/v1/contacts')
    .set(userHeaders)
    .send({ name: '云维度联系人', phone: '13610000000', peer_user_id: 'peer-cloud-1' })
    .expect(200);

  const sendRes = await request(app)
    .post('/api/v1/messages')
    .set(userHeaders)
    .send({
      contact_id: contactRes.body.contact.id,
      conversation_id: contactRes.body.contact.conversation_id,
      client_id: 'local-user:1700000000000:cloud-1',
      type: 'text',
      content: '要上云的消息',
    })
    .expect(200);

  const uploadRes = await request(app)
    .post('/api/v1/cloud-backups')
    .set(userHeaders)
    .send({
      contact_id: contactRes.body.contact.id,
      message_id: sendRes.body.message.id,
      type: 'text',
      content: '要上云的消息',
    })
    .expect(200);

  expect(uploadRes.body.backup.contact_name).toBe('云维度联系人');
  expect(uploadRes.body.backup.contact_phone).toBe('13610000000');
  expect(uploadRes.body.backup.peer_user_id).toBe('peer-cloud-1');
  expect(uploadRes.body.backup.conversation_id).toBe(contactRes.body.contact.conversation_id);
  expect(uploadRes.body.backup.message_id).toBe(sendRes.body.message.id);
  expect(uploadRes.body.backup.source).toBe('chat_message');
  expect(uploadRes.body.backup.restored_at).toBeNull();
  expect(uploadRes.body.backup.created_at).toBeGreaterThan(0);
});

test('paid members can restore a text cloud backup into the local conversation', async () => {
  const userHeaders = {
    'x-user-id': 'cloud-member-3',
    'x-user-name': 'cloud-member-3',
    'x-user-phone': '13620000001',
  };

  await activatePaidMembership(userHeaders);

  const contactRes = await request(app)
    .post('/api/v1/contacts')
    .set(userHeaders)
    .send({ name: '云恢复联系人', phone: '13620000000' })
    .expect(200);

  const uploadRes = await request(app)
    .post('/api/v1/cloud-backups')
    .set(userHeaders)
    .send({
      contact_id: contactRes.body.contact.id,
      type: 'text',
      content: '从云端恢复回来',
      source: 'manual_backup',
    })
    .expect(200);

  const restoreRes = await request(app)
    .post(`/api/v1/cloud-backups/${uploadRes.body.backup.id}/restore`)
    .set(userHeaders)
    .expect(200);

  expect(restoreRes.body.message.contact_id).toBe(contactRes.body.contact.id);
  expect(restoreRes.body.message.text).toBe('从云端恢复回来');
  expect(restoreRes.body.message.sync_state).toBe('local_only');

  const duplicateRestoreRes = await request(app)
    .post(`/api/v1/cloud-backups/${uploadRes.body.backup.id}/restore`)
    .set(userHeaders)
    .expect(409);

  expect(duplicateRestoreRes.body.error).toBe('该云记录已恢复到本地');

  const messagesRes = await request(app)
    .get(`/api/v1/messages/${contactRes.body.contact.id}`)
    .set(userHeaders)
    .expect(200);

  expect(messagesRes.body.messages.filter((item) => item.text === '从云端恢复回来')).toHaveLength(1);

  const backupsRes = await request(app)
    .get('/api/v1/cloud-backups')
    .set(userHeaders)
    .expect(200);

  const restoredBackup = backupsRes.body.messages.find((item) => item.id === uploadRes.body.backup.id);
  expect(restoredBackup.restored_at).toBeGreaterThan(0);
});

test('paid members can restore an image cloud backup into the local conversation', async () => {
  const userHeaders = {
    'x-user-id': 'cloud-member-4',
    'x-user-name': 'cloud-member-4',
    'x-user-phone': '13621000001',
  };

  await activatePaidMembership(userHeaders);

  const contactRes = await request(app)
    .post('/api/v1/contacts')
    .set(userHeaders)
    .send({ name: '云恢复图片联系人', phone: '13621000000' })
    .expect(200);

  const imageUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NkYGD4DwABBAEAffR0WQAAAABJRU5ErkJggg==';
  const uploadRes = await request(app)
    .post('/api/v1/cloud-backups')
    .set(userHeaders)
    .send({
      contact_id: contactRes.body.contact.id,
      type: 'image',
      content: imageUri,
      source: 'manual_backup',
    })
    .expect(200);

  const restoreRes = await request(app)
    .post(`/api/v1/cloud-backups/${uploadRes.body.backup.id}/restore`)
    .set(userHeaders)
    .expect(200);

  expect(restoreRes.body.message.contact_id).toBe(contactRes.body.contact.id);
  expect(restoreRes.body.message.type).toBe('image');
  expect(restoreRes.body.message.uri).toBe(imageUri);
  expect(restoreRes.body.message.sync_state).toBe('local_only');

  const messagesRes = await request(app)
    .get(`/api/v1/messages/${contactRes.body.contact.id}`)
    .set(userHeaders)
    .expect(200);

  expect(messagesRes.body.messages.filter((item) => item.type === 'image' && item.uri === imageUri)).toHaveLength(1);

  await request(app)
    .post(`/api/v1/cloud-backups/${uploadRes.body.backup.id}/restore`)
    .set(userHeaders)
    .expect(409);
});

test('paid members can restore a voice cloud backup into the local conversation', async () => {
  const userHeaders = {
    'x-user-id': 'cloud-member-5',
    'x-user-name': 'cloud-member-5',
    'x-user-phone': '13622000001',
  };

  await activatePaidMembership(userHeaders);

  const contactRes = await request(app)
    .post('/api/v1/contacts')
    .set(userHeaders)
    .send({ name: '云恢复语音联系人', phone: '13622000000' })
    .expect(200);

  const voiceUri = 'file:///voice-preview-restore.wav';
  const uploadRes = await request(app)
    .post('/api/v1/cloud-backups')
    .set(userHeaders)
    .send({
      contact_id: contactRes.body.contact.id,
      type: 'voice',
      content: voiceUri,
      duration: 7,
      source: 'manual_backup',
    })
    .expect(200);

  const restoreRes = await request(app)
    .post(`/api/v1/cloud-backups/${uploadRes.body.backup.id}/restore`)
    .set(userHeaders)
    .expect(200);

  expect(restoreRes.body.message.contact_id).toBe(contactRes.body.contact.id);
  expect(restoreRes.body.message.type).toBe('voice');
  expect(restoreRes.body.message.uri).toBe(voiceUri);
  expect(restoreRes.body.message.duration).toBe(7);
  expect(restoreRes.body.message.sync_state).toBe('local_only');

  const messagesRes = await request(app)
    .get(`/api/v1/messages/${contactRes.body.contact.id}`)
    .set(userHeaders)
    .expect(200);

  expect(messagesRes.body.messages.filter((item) => item.type === 'voice' && item.uri === voiceUri && item.duration === 7)).toHaveLength(1);

  await request(app)
    .post(`/api/v1/cloud-backups/${uploadRes.body.backup.id}/restore`)
    .set(userHeaders)
    .expect(409);
});

test('ritual summary exposes milestone, streak, and love-value data for a matched pair', async () => {
  const userA = {
    'x-user-id': 'ritual-user-a',
    'x-user-name': 'xiaoman',
    'x-user-phone': '13981110001',
  };
  const userB = {
    'x-user-id': 'ritual-user-b',
    'x-user-name': 'aning',
    'x-user-phone': '13981110002',
  };

  await request(app).get('/api/v1/contacts').set(userA).expect(200);
  await request(app).get('/api/v1/contacts').set(userB).expect(200);

  await request(app)
    .post('/api/v1/contacts/qr-add')
    .set(userA)
    .send({ qr_code: 'QR::ritual-user-b::demo' })
    .expect(200);

  const inboxRes = await request(app)
    .get('/api/v1/contacts/requests/incoming')
    .set(userB)
    .expect(200);

  const acceptedRes = await request(app)
    .post(`/api/v1/contacts/requests/${inboxRes.body.requests[0].id}/accept`)
    .set(userB)
    .expect(200);

  const contactForB = acceptedRes.body.contact;

  await request(app)
    .post('/api/v1/messages')
    .set(userB)
    .send({
      contact_id: contactForB.id,
      conversation_id: contactForB.conversation_id,
      client_id: 'ritual-user-b:1700000000000:a',
      type: 'text',
      content: '今天也想你',
    })
    .expect(200);

  const summaryRes = await request(app)
    .get(`/api/v1/rituals/${contactForB.id}/summary`)
    .set(userB)
    .expect(200);

  expect(summaryRes.body.contact_id).toBe(contactForB.id);
  expect(summaryRes.body.love_value).toBeGreaterThan(0);
  expect(summaryRes.body.love_value).toBeLessThanOrEqual(20);
  expect(summaryRes.body.current_streak_days).toBe(1);
  expect(summaryRes.body.milestones.some((item) => item.type === 'relationship_started')).toBe(true);
  expect(summaryRes.body.milestones.some((item) => item.type === 'first_text_message')).toBe(true);
  expect(summaryRes.body.milestones.every((item) => !item.label.includes('任务'))).toBe(true);
});

test('ritual summary tracks longest late-night chat and accumulates love value', async () => {
  const userHeaders = {
    'x-user-id': 'ritual-user-c',
    'x-user-name': 'wantang',
    'x-user-phone': '13981110003',
  };

  const contactRes = await request(app)
    .post('/api/v1/contacts')
    .set(userHeaders)
    .send({ name: '深夜对象', phone: '13681110003' })
    .expect(200);

  const contactId = contactRes.body.contact.id;
  const conversationId = contactRes.body.contact.conversation_id;
  const firstLateNightAt = new Date('2023-11-14T23:40:00+08:00').getTime();
  const secondLateNightAt = new Date('2023-11-15T01:55:00+08:00').getTime();

  await request(app)
    .post('/api/v1/messages')
    .set(userHeaders)
    .send({
      contact_id: contactId,
      conversation_id: conversationId,
      client_id: 'ritual-user-c:1700000001000:a',
      type: 'text',
      content: '23:40 还没睡吗',
      created_at_override: firstLateNightAt,
    })
    .expect(200);

  await request(app)
    .post('/api/v1/messages')
    .set(userHeaders)
    .send({
      contact_id: contactId,
      conversation_id: conversationId,
      client_id: 'ritual-user-c:1700000001000:b',
      type: 'text',
      content: '01:55 还在想你',
      created_at_override: secondLateNightAt,
    })
    .expect(200);

  const summaryRes = await request(app)
    .get(`/api/v1/rituals/${contactId}/summary`)
    .set(userHeaders)
    .expect(200);

  expect(summaryRes.body.longest_late_night_minutes).toBeGreaterThanOrEqual(135);
  expect(summaryRes.body.love_value).toBeGreaterThanOrEqual(6);
  expect(summaryRes.body.milestones.some((item) => item.type === 'late_night_long_talk')).toBe(true);
});

test('membership stays free until a manual order is approved', async () => {
  const userHeaders = {
    'x-user-id': 'membership-user-1',
    'x-user-name': 'membership-user-1',
    'x-user-phone': '13955550001',
  };

  const beforeRes = await request(app)
    .get('/api/v1/membership/me')
    .set(userHeaders)
    .expect(200);

  expect(beforeRes.body.tier).toBe('free');
  expect(beforeRes.body.status).toBe('inactive');
  expect(beforeRes.body.expire_at).toBeNull();

  const orderRes = await request(app)
    .post('/api/v1/membership/manual-order')
    .set(userHeaders)
    .send({
      amount: 9.9,
      payer_phone: '13955550001',
      paid_at: 1715251200000,
      payment_proof: 'data:image/png;base64,ZmFrZQ==',
      note: '微信已付款',
    })
    .expect(200);

  expect(orderRes.body.order.status).toBe('pending_review');
  expect(orderRes.body.order.plan_code).toBe('monthly_9_9');

  const pendingRes = await request(app)
    .get('/api/v1/membership/me')
    .set(userHeaders)
    .expect(200);

  expect(pendingRes.body.tier).toBe('free');
  expect(pendingRes.body.status).toBe('pending_review');

  await request(app)
    .post('/api/v1/cloud-backups')
    .set(userHeaders)
    .send({
      contact_id: 'missing-contact',
      type: 'text',
      content: '未开通不能上云',
    })
    .expect(403);
});

test('admin approval activates membership and unlocks cloud access', async () => {
  const userHeaders = {
    'x-user-id': 'membership-user-2',
    'x-user-name': 'membership-user-2',
    'x-user-phone': '13955550002',
  };

  const contactRes = await request(app)
    .post('/api/v1/contacts')
    .set(userHeaders)
    .send({ name: '云会员联系人', phone: '13630000000' })
    .expect(200);

  const orderRes = await request(app)
    .post('/api/v1/membership/manual-order')
    .set(userHeaders)
    .send({
      amount: 9.9,
      payer_phone: '13955550002',
      paid_at: 1715251300000,
      payment_proof: 'data:image/png;base64,ZmFrZTI=',
      note: '支付宝已付款',
    })
    .expect(200);

  const pendingListRes = await request(app)
    .get('/api/v1/admin/membership-orders?status=pending_review')
    .set('x-admin-key', 'test-admin-key')
    .expect(200);

  expect(pendingListRes.body.orders.some((item) => item.id === orderRes.body.order.id)).toBe(true);

  const approveRes = await request(app)
    .post(`/api/v1/admin/membership-orders/${orderRes.body.order.id}/approve`)
    .set('x-admin-key', 'test-admin-key')
    .send({ months: 1 })
    .expect(200);

  expect(approveRes.body.membership.status).toBe('active');
  expect(approveRes.body.membership.plan_code).toBe('monthly_9_9');
  expect(approveRes.body.membership.expire_at).toBeGreaterThan(Date.now());

  const meRes = await request(app)
    .get('/api/v1/membership/me')
    .set(userHeaders)
    .expect(200);

  expect(meRes.body.tier).toBe('paid');
  expect(meRes.body.status).toBe('active');

  await request(app)
    .post('/api/v1/cloud-backups')
    .set(userHeaders)
    .send({
      contact_id: contactRes.body.contact.id,
      type: 'text',
      content: '会员可自动上云',
    })
    .expect(200);
});

test('admin can reject a pending membership order', async () => {
  const userHeaders = {
    'x-user-id': 'membership-user-3',
    'x-user-name': 'membership-user-3',
    'x-user-phone': '13955550003',
  };

  const orderRes = await request(app)
    .post('/api/v1/membership/manual-order')
    .set(userHeaders)
    .send({
      amount: 9.9,
      payer_phone: '13955550003',
      paid_at: 1715251400000,
      payment_proof: 'data:image/png;base64,ZmFrZTM=',
      note: '付款截图模糊',
    })
    .expect(200);

  const rejectRes = await request(app)
    .post(`/api/v1/admin/membership-orders/${orderRes.body.order.id}/reject`)
    .set('x-admin-key', 'test-admin-key')
    .send({ reason: '付款信息无法核对' })
    .expect(200);

  expect(rejectRes.body.order.status).toBe('rejected');
  expect(rejectRes.body.order.review_note).toBe('付款信息无法核对');

  const meRes = await request(app)
    .get('/api/v1/membership/me')
    .set(userHeaders)
    .expect(200);

  expect(meRes.body.tier).toBe('free');
  expect(meRes.body.status).toBe('inactive');
});

test('free tier cannot upload cloud backups', async () => {
  const contactRes = await request(app)
    .post('/api/v1/contacts')
    .send({ name: '免费版联系人', phone: '13500000000' })
    .expect(200);

  await request(app)
    .post('/api/v1/cloud-backups')
    .send({
      contact_id: contactRes.body.contact.id,
      type: 'text',
      content: '免费版不能上传',
    })
    .expect(403);
});
