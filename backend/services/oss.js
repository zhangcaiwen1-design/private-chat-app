const OSS = require('ali-oss');

let client = null;

const config = {
  region: process.env.OSS_REGION || 'cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET
};

function getClient() {
  if (!client) {
    client = new OSS(config);
  }
  return client;
}

// Generate OSS key for user files
function generateOssKey(userId, type, fileId) {
  const extensions = {
    image: '.jpg',
    voice: '.m4a',
    avatar: '.jpg'
  };
  const ext = extensions[type] || '.bin';
  return `users/${userId}/${type}s/${fileId}${ext}`;
}

// Upload file buffer to OSS
async function uploadFile(ossKey, buffer, options = {}) {
  const client = getClient();
  const result = await client.put(ossKey, buffer, {
    ...options
  });
  return result;
}

// Get signed URL for downloading (15 minutes expiry)
async function getSignedUrl(ossKey, expires = 15 * 60) {
  const client = getClient();
  const url = await client.signatureUrl(ossKey, { expires });
  return url;
}

// Delete file from OSS
async function deleteFile(ossKey) {
  const client = getClient();
  await client.delete(ossKey);
}

// Check if file exists
async function fileExists(ossKey) {
  const client = getClient();
  try {
    await client.head(ossKey);
    return true;
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      return false;
    }
    throw error;
  }
}

module.exports = {
  getClient,
  generateOssKey,
  uploadFile,
  getSignedUrl,
  deleteFile,
  fileExists
};
