import * as ApiService from './ApiService';

// Upload message to cloud backup
export async function uploadToCloud(message) {
  try {
    const result = await ApiService.uploadToCloud(
      message.contact_id,
      message.type,
      message.content,
      message.cloud_url || null
    );
    return result;
  } catch (error) {
    console.error('Upload to cloud failed:', error);
    throw error;
  }
}

// Get all cloud backups
export async function getCloudBackups(type = 'all') {
  try {
    const result = await ApiService.getCloudMessages(type);
    return result.messages || [];
  } catch (error) {
    console.error('Get cloud backups failed:', error);
    throw error;
  }
}

// Download/view a cloud message
export async function downloadFromCloud(cloudId) {
  try {
    const result = await ApiService.getCloudFileUrl(cloudId);
    return result;
  } catch (error) {
    console.error('Download from cloud failed:', error);
    throw error;
  }
}

// Delete from cloud
export async function deleteFromCloud(cloudId) {
  try {
    await ApiService.deleteCloudBackup(cloudId);
    return true;
  } catch (error) {
    console.error('Delete from cloud failed:', error);
    throw error;
  }
}
