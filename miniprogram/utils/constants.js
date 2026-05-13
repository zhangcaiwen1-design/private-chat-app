const API_BASE_URL = 'https://privatechat.yifan1.com/api/v1';
const DEFAULT_LOCK_PIN = '1111';
const TEMP_ALLOW_CHAT_WITHOUT_MEMBERSHIP = false;

const STORAGE_KEYS = {
  session: 'pcc.session',
  deviceId: 'pcc.deviceId',
  lockPin: 'pcc.lockPin',
  locked: 'pcc.locked',
  reviewer: 'pcc.reviewer',
};

module.exports = {
  API_BASE_URL,
  DEFAULT_LOCK_PIN,
  TEMP_ALLOW_CHAT_WITHOUT_MEMBERSHIP,
  STORAGE_KEYS,
};
