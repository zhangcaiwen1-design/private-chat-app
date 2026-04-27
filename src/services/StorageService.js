import * as ApiService from './ApiService';

// Get contacts from API
export async function getContacts() {
  try {
    const result = await ApiService.getContacts();
    return result.contacts || [];
  } catch (error) {
    console.error('Error getting contacts:', error);
    return [];
  }
}

// Add contact via API
export async function saveContact(phone, name) {
  try {
    const result = await ApiService.addContact(phone, name);
    return result.contact;
  } catch (error) {
    console.error('Error saving contact:', error);
    throw error;
  }
}

// Add contact by QR code
export async function addContactByQR(qrCode) {
  try {
    const result = await ApiService.addContactByQR(qrCode);
    return result.contact;
  } catch (error) {
    console.error('Error adding contact by QR:', error);
    throw error;
  }
}

// Delete contact via API
export async function deleteContact(contactId) {
  try {
    await ApiService.deleteContact(contactId);
    return true;
  } catch (error) {
    console.error('Error deleting contact:', error);
    return false;
  }
}

// Get messages from API
export async function getMessages(contactId, limit = 50) {
  try {
    const result = await ApiService.getMessages(contactId, limit);
    return result.messages || [];
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
}

// Save message (sent via API, cached locally for offline)
export async function saveMessage(contactId, message) {
  // Messages are sent via API and returned with server-assigned ID
  // This function is for local caching if needed
  return message;
}
