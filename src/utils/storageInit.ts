import { supabase } from '@/integrations/supabase/client';

export const initializeStorage = async () => {
  try {
    // Try to create the recordings bucket if it doesn't exist
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }

    const recordingsBucket = buckets?.find(bucket => bucket.name === 'recordings');
    
    if (!recordingsBucket) {
      console.log('Creating recordings bucket...');
      const { data, error } = await supabase.storage.createBucket('recordings', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['audio/*', 'video/*']
      });

      if (error) {
        console.error('Error creating bucket:', error);
        return false;
      }
      
      console.log('Successfully created recordings bucket:', data);
    }

    return true;
  } catch (error) {
    console.error('Storage initialization error:', error);
    return false;
  }
};

export const ensureBucketExists = async () => {
  const initialized = await initializeStorage();
  if (!initialized) {
    console.warn('Storage bucket initialization failed - uploads may not work');
  }
  return initialized;
};