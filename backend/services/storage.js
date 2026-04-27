const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Local storage directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/home/admin/private-chat/uploads';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Generate file path
function generateFilePath(userId, type, fileId, ext) {
  const subDir = type === 'avatar' ? 'avatars' : `${type}s`;
  return path.join(UPLOAD_DIR, 'users', userId, subDir, `${fileId}${ext}`);
}

// Save file locally
async function saveFile(filePath, buffer) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// Get file URL (relative path)
function getFileUrl(filePath) {
  // Return path relative to upload directory
  return filePath.replace(UPLOAD_DIR, '').replace(/\\/g, '/');
}

// Delete file
function deleteFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Get absolute path from relative URL
function getAbsolutePath(relativePath) {
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }
  return path.join(UPLOAD_DIR, relativePath);
}

module.exports = {
  UPLOAD_DIR,
  generateFilePath,
  saveFile,
  getFileUrl,
  deleteFile,
  getAbsolutePath,
  ensureDir
};
