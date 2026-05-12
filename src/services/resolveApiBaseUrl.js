function normalizeUrl(url) {
  return String(url || '').replace(/\/$/, '');
}

function isLoopbackHost(hostname) {
  return hostname === '127.0.0.1' || hostname === 'localhost';
}

function isPrivateLanHost(hostname) {
  return /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
}

function pickConfiguredApiBaseUrl(options = {}) {
  const envBaseUrl = normalizeUrl(options.envBaseUrl);
  const appConfigBaseUrl = normalizeUrl(options.appConfigBaseUrl);

  if (options.platform === 'web' && appConfigBaseUrl) {
    return appConfigBaseUrl;
  }

  if (!options.isDev && appConfigBaseUrl) {
    return appConfigBaseUrl;
  }

  return envBaseUrl || appConfigBaseUrl || 'http://localhost:3001/api/v1';
}

function resolveApiBaseUrl(configuredBaseUrl, options = {}) {
  const normalized = normalizeUrl(configuredBaseUrl);

  if (!normalized) {
    return normalized;
  }

  if (options.platform !== 'web') {
    return normalized;
  }

  const hostname = options.windowHostname;
  if (!hostname || hostname === 'localhost') {
    return normalized;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.hostname !== hostname && isLoopbackHost(hostname) && (isLoopbackHost(parsed.hostname) || isPrivateLanHost(parsed.hostname))) {
      parsed.hostname = hostname;
      return parsed.toString().replace(/\/$/, '');
    }
  } catch {
    return normalized;
  }

  return normalized;
}

module.exports = { pickConfiguredApiBaseUrl, resolveApiBaseUrl };
