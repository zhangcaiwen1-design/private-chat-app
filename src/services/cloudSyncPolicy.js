function normalizeCloudTier(tier) {
  return tier === 'paid' ? 'paid' : 'free';
}

function canUseCloudBackup(tier) {
  return normalizeCloudTier(tier) === 'paid';
}

function shouldAutoUploadMessage(tier, message) {
  if (!canUseCloudBackup(tier) || !message) {
    return false;
  }

  return ['text', 'image', 'voice', 'sticker'].includes(message.type);
}

module.exports = {
  normalizeCloudTier,
  canUseCloudBackup,
  shouldAutoUploadMessage,
};
