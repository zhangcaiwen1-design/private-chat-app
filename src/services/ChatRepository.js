import * as ApiService from './ApiService';
import { getUserId } from './UserService';

function buildClientMessageId(userId) {
  return `${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function mapConversation(contact) {
  return {
    ...contact,
    conversationId: contact.conversation_id,
    peerUserId: contact.peer_user_id,
    ownerUserId: contact.owner_user_id,
    syncState: contact.sync_state,
  };
}

function mapFriendRequest(request) {
  return {
    ...request,
    requesterUserId: request.requester_user_id,
    requesterName: request.requester_name,
    requesterPhone: request.requester_phone,
    requesterContactId: request.requester_contact_id,
    targetUserId: request.target_user_id,
    targetPhone: request.target_phone,
  };
}

function mapMessage(message) {
  return {
    ...message,
    conversationId: message.conversation_id,
    clientId: message.client_id,
    syncState: message.sync_state,
    burnAfterRead: message.burn_after_read,
    burnDuration: message.burn_duration,
    readAt: message.read_at,
  };
}

export async function listConversations() {
  const result = await ApiService.getContacts();
  return (result.contacts || []).map(mapConversation);
}

export async function createConversation({ name, phone = '', peerUserId = null }) {
  const result = await ApiService.addContact(phone, name, peerUserId);
  return {
    contact: mapConversation(result.contact),
    requestStatus: result.request_status || 'local_only',
    friendRequest: result.friend_request ? mapFriendRequest(result.friend_request) : null,
  };
}

export async function createConversationFromQr(qrCode) {
  const result = await ApiService.addContactByQR(qrCode);
  return {
    contact: mapConversation(result.contact),
    requestStatus: result.request_status || 'request_sent',
    friendRequest: result.friend_request ? mapFriendRequest(result.friend_request) : null,
  };
}

export async function listIncomingConversationRequests() {
  const result = await ApiService.getIncomingFriendRequests();
  return (result.requests || []).map(mapFriendRequest);
}

export async function acceptConversationRequest(requestId) {
  const result = await ApiService.acceptIncomingFriendRequest(requestId);
  return mapConversation(result.contact);
}

export async function listConversationMessages(contactId, limit = 50) {
  const result = await ApiService.getMessages(contactId, limit);
  return (result.messages || []).map(mapMessage);
}

export async function sendConversationMessage(contact, message) {
  const userId = await getUserId();
  const type = message.type || 'text';
  const content = type === 'text' ? message.text : message.uri;
  const result = await ApiService.sendMessage(
    contact.id,
    contact.conversationId,
    buildClientMessageId(userId),
    type,
    content,
    Boolean(message.burnAfterRead),
    message.burnDuration || null,
    message.duration || null,
  );

  return mapMessage(result.message);
}

export async function removeConversationMessage(messageId) {
  await ApiService.deleteMessage(messageId);
  return true;
}

export function normalizeConversationMessage(message) {
  return mapMessage(message);
}
