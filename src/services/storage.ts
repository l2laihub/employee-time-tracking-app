import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload a profile photo to Supabase storage
 * @param userId User ID to associate with the photo
 * @param file File to upload
 * @returns Object with URL or error
 */
export async function uploadProfilePhoto(
  userId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  try {
    // Validate file
    if (!file) {
      return { error: 'No file provided' };
    }

    // Check file size
    if (file.size > 5 * 1024 * 1024) { // 5MB
      return { error: 'File size must be less than 5MB' };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return { error: 'Only JPEG and PNG files are allowed' };
    }

    // Generate a unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/${uuidv4()}.${fileExt}`;

    console.log('Uploading profile photo:', {
      userId,
      fileName,
      fileType: file.type,
      fileSize: file.size
    });

    // Upload file to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('employee-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      
      // Check for specific error types
      if (uploadError.message.includes('row-level security policy')) {
        return { 
          error: 'Permission denied. The application does not have access to upload photos. Please contact your administrator.'
        };
      }
      
      return { error: uploadError.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('employee-photos')
      .getPublicUrl(fileName);

    console.log('Profile photo uploaded successfully:', publicUrl);
    return { url: publicUrl };
  } catch (error) {
    console.error('Failed to upload profile photo:', error);
    return {
      error: error instanceof Error
        ? error.message
        : 'Failed to upload profile photo. Please try again later.'
    };
  }
}

/**
 * Delete a profile photo from Supabase storage
 * @param photoUrl URL of the photo to delete
 * @returns Object with success or error
 */
export async function deleteProfilePhoto(
  photoUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!photoUrl) {
      return { success: false, error: 'No photo URL provided' };
    }

    // Extract the path from the URL
    const path = photoUrl.split('employee-photos/')[1];
    if (!path) {
      return { success: false, error: 'Invalid photo URL format' };
    }

    console.log('Deleting profile photo:', path);

    // Delete file from Supabase storage
    const { error: deleteError } = await supabase.storage
      .from('employee-photos')
      .remove([path]);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      
      // Check for specific error types
      if (deleteError.message.includes('row-level security policy')) {
        return { 
          success: false,
          error: 'Permission denied. The application does not have access to delete photos. Please contact your administrator.'
        };
      }
      
      return { success: false, error: deleteError.message };
    }

    console.log('Profile photo deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete profile photo:', error);
    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : 'Failed to delete profile photo. Please try again later.'
    };
  }
}
