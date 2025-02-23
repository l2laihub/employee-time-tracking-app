import { supabase } from './supabase';

/**
 * Check if a bucket exists and is properly configured
 */
async function checkBucketExists(bucketId: string): Promise<{ exists: boolean; error?: string }> {
  try {
    console.log('Checking bucket:', bucketId);
    
    const { data: buckets, error } = await supabase
      .storage
      .listBuckets();

    if (error) {
      console.error('Error listing buckets:', error);
      return { exists: false, error: 'Failed to check storage configuration' };
    }

    console.log('Available buckets:', buckets);
    
    if (!buckets) {
      return { exists: false, error: 'No storage buckets found' };
    }

    const bucket = buckets.find(b => b.id === bucketId);
    if (!bucket) {
      return { exists: false, error: `Bucket '${bucketId}' not found` };
    }

    return { exists: true };
  } catch (error) {
    console.error('Failed to check bucket:', error);
    return { 
      exists: false, 
      error: error instanceof Error ? error.message : 'Failed to check storage configuration'
    };
  }
}

/**
 * Initialize storage buckets and ensure they exist
 */
export async function initializeStorage() {
  try {
    console.log('Initializing storage...');
    
    // Check if employee-photos bucket exists
    const { exists, error } = await checkBucketExists('employee-photos');
    
    if (!exists) {
      console.error('Storage initialization failed:', error);
      return false;
    }

    console.log('Storage initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize storage:', error);
    return false;
  }
}

/**
 * Upload a file to storage
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  try {
    // Check file size
    if (file.size > 5 * 1024 * 1024) { // 5MB
      return { error: 'File size must be less than 5MB' };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return { error: 'Only JPEG and PNG files are allowed' };
    }

    // Check if bucket exists
    const { exists, error: bucketError } = await checkBucketExists(bucket);
    if (!exists) {
      console.error('Bucket check failed:', bucketError);
      return { error: bucketError || 'Storage is not properly configured' };
    }

    console.log('Uploading file:', { bucket, path, type: file.type, size: file.size });

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    console.log('File uploaded successfully:', publicUrl);
    return { url: publicUrl };
  } catch (error) {
    console.error('Failed to upload file:', error);
    return {
      error: error instanceof Error
        ? error.message
        : 'Failed to upload file. Please try again later.'
    };
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if bucket exists
    const { exists, error: bucketError } = await checkBucketExists(bucket);
    if (!exists) {
      console.error('Bucket check failed:', bucketError);
      return {
        success: false,
        error: bucketError || 'Storage is not properly configured'
      };
    }

    console.log('Deleting file:', { bucket, path });

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      throw error;
    }

    console.log('File deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete file:', error);
    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : 'Failed to delete file. Please try again later.'
    };
  }
}

/**
 * Get the file extension from a File object
 */
export function getFileExtension(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() || '';
}

/**
 * Generate a unique filename for storage
 */
export function generateStorageFilename(userId: string, file: File): string {
  const ext = getFileExtension(file);
  const timestamp = Date.now();
  return `${userId}/${timestamp}.${ext}`;
}