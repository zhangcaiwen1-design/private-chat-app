import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = 'user_id';

// 生成随机用户ID
function generateUserId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 获取或创建用户ID
export async function getUserId() {
  try {
    let userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = generateUserId();
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  } catch {
    return generateUserId();
  }
}

// 生成带时间戳的邀请码（更安全）
export async function generateInviteCode() {
  const userId = await getUserId();
  const timestamp = Date.now().toString(36);
  return `QR-${userId}-${timestamp}`;
}

// 解析二维码内容
export function parseQRCode(code) {
  // 格式: QR-userId-timestamp 或 QR-userId
  if (!code.startsWith('QR-')) return null;
  const parts = code.split('-');
  if (parts.length >= 2) {
    return parts[1]; // 返回userId
  }
  return null;
}