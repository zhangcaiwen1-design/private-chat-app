import AsyncStorage from '@react-native-async-storage/async-storage';

const SENSITIVE_KEYS = ['currentChat', 'previewMessages'];

/**
 * Authenticate with biometric (fingerprint, face, etc.)
 * For MVP, this is a mock that always succeeds after a delay.
 * In production, replace with react-native-biometrics or expo-local-authentication.
 */
export async function authenticateWithBiometric() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 500);
  });
}

/**
 * Clear any sensitive data from AsyncStorage (session data, preview messages, etc.)
 */
export async function clearSession() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const keysToRemove = keys.filter((key) => SENSITIVE_KEYS.includes(key));
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  } catch (e) {
    // Silent fail - session cleanup is best effort
  }
}
