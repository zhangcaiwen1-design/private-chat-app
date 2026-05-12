import Constants from 'expo-constants';

const DEFAULT_DOWNLOAD_URL = 'https://privatechat.yifan1.com/download/latest.apk';
const DEFAULT_VERSION_CONFIG_URL = 'https://privatechat.yifan1.com/app-version.json';

export const CURRENT_APP_VERSION = String(Constants.expoConfig?.version || '0.0.0');
export const APP_DOWNLOAD_URL = Constants.expoConfig?.extra?.appDownloadUrl || DEFAULT_DOWNLOAD_URL;
export const APP_VERSION_CONFIG_URL = Constants.expoConfig?.extra?.appVersionConfigUrl || DEFAULT_VERSION_CONFIG_URL;

function parseVersionPart(value) {
  const parsed = Number.parseInt(String(value || '0'), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function compareVersions(left, right) {
  const leftParts = String(left || '0').split('.');
  const rightParts = String(right || '0').split('.');
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = parseVersionPart(leftParts[index]);
    const rightValue = parseVersionPart(rightParts[index]);

    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
}

export async function fetchAppVersionConfig() {
  const response = await fetch(APP_VERSION_CONFIG_URL, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`版本配置拉取失败：${response.status}`);
  }

  const data = await response.json();
  return {
    enabled: data.enabled !== false,
    latestVersion: String(data.latestVersion || CURRENT_APP_VERSION),
    minimumSupportedVersion: String(data.minimumSupportedVersion || data.latestVersion || CURRENT_APP_VERSION),
    downloadUrl: data.downloadUrl || APP_DOWNLOAD_URL,
    title: data.title || '发现新版本',
    message: data.message || '当前版本已停止服务，请先更新到最新版后再继续使用。',
  };
}

export function shouldForceUpdate(config) {
  if (!config?.enabled) {
    return false;
  }

  return compareVersions(CURRENT_APP_VERSION, config.minimumSupportedVersion) < 0;
}
