import {
  acceptConversationRequest,
  createConversation,
  createConversationFromQr,
  listConversationMessages,
  listConversations,
  listIncomingConversationRequests,
  sendConversationMessage,
} from './ChatRepository';

export async function getContacts() {
  return listConversations();
}

export async function getIncomingFriendRequests() {
  return listIncomingConversationRequests();
}

export async function acceptFriendRequest(requestId) {
  return acceptConversationRequest(requestId);
}

export async function saveContact(contactOrPhone, maybeName) {
  if (typeof contactOrPhone === 'object') {
    return createConversation({
      name: contactOrPhone.name,
      phone: contactOrPhone.phone,
      peerUserId: contactOrPhone.peerUserId || null,
    });
  }

  return createConversation({ name: maybeName, phone: contactOrPhone });
}

export async function addContactByQR(qrCode) {
  return createConversationFromQr(qrCode);
}

export async function getMessages(contactId, limit = 50) {
  return listConversationMessages(contactId, limit);
}

export async function saveMessage(contact, message) {
  return sendConversationMessage(contact, message);
}
