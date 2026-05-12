export const DEFAULT_APP_UNLOCK_PIN = String(process.env.EXPO_PUBLIC_APP_UNLOCK_PIN || '198703');

export const SCREENS = {
  CALCULATOR: 'Calculator',
  AUTH: 'Auth',
  CHAT_LIST: 'ChatList',
  CHAT_WINDOW: 'ChatWindow',
  CLOUD: 'Cloud',
  RITUALS: 'Rituals',
  MEMBERSHIP: 'Membership',
  PHONE_SETTINGS: 'PhoneSettings',
  UNLOCK_PIN_SETTINGS: 'UnlockPinSettings',
};

export const STORAGE_KEYS = {
  CONTACTS: 'contacts',
  MESSAGES: 'messages',
};
