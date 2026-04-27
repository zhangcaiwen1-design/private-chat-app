import * as ApiService from './ApiService';

// Burn duration options in milliseconds
export const BURN_OPTIONS = {
  '1分钟': 60 * 1000,
  '5分钟': 5 * 60 * 1000,
  '30分钟': 30 * 60 * 1000,
  '1小时': 60 * 60 * 1000,
};

// Check if message should be destroyed
export function shouldDestroyMessage(message) {
  if (!message.burn_after_read || !message.read_at) return false;
  const elapsed = Date.now() - message.read_at;
  return elapsed > message.burn_duration;
}

// Send message via API
export async function sendMessage(contactId, type, content, burnAfterRead = false, burnDuration = null) {
  try {
    const result = await ApiService.sendMessage(contactId, type, content, burnAfterRead, burnDuration);
    return result.message;
  } catch (error) {
    console.error('Send message failed:', error);
    throw error;
  }
}

// Get messages from API
export async function getMessages(contactId, limit = 50) {
  try {
    const result = await ApiService.getMessages(contactId, limit);
    return result.messages || [];
  } catch (error) {
    console.error('Get messages failed:', error);
    throw error;
  }
}

// Mark message as read via API
export async function markAsRead(messageId, contactId) {
  try {
    await ApiService.markMessageRead(messageId);
  } catch (error) {
    console.error('Mark as read failed:', error);
  }
}

// Delete message via API
export async function deleteMessage(messageId, contactId) {
  try {
    await ApiService.deleteMessage(messageId);
    return true;
  } catch (error) {
    console.error('Delete message failed:', error);
    return false;
  }
}
