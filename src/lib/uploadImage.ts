import { supabase } from './supabase';

export const uploadImageToStorage = async (base64String: string, bucket: string = 'images'): Promise<string> => {
  try {
    // Check if it's already a URL
    if (!base64String.startsWith('data:image')) {
      return base64String;
    }

    // Convert base64 to Blob
    const response = await fetch(base64String);
    const blob = await response.blob();
    
    // Generate unique filename
    const fileExt = blob.type.split('/')[1] || 'jpg';
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading image to storage:', error);
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Failed to upload image:', error);
    // Return original base64 or fallback if upload fails
    return base64String; 
  }
};
