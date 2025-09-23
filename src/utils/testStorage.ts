// Test Supabase storage configuration
// This utility is for development and testing purposes only
import { supabase } from '@/integrations/supabase/client';

export async function testStorageConfiguration() {
  console.log('🧪 Testing Supabase storage configuration...');
  
  try {
    // Test 1: Check current user
    console.log('👤 Test 1: Checking current user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Error getting user:', userError);
      return false;
    }
    
    if (!user) {
      console.error('❌ No user logged in');
      console.log('💡 Please make sure you are logged in');
      return false;
    }
    
    console.log('✅ Logged in as:', user.email, 'ID:', user.id);
    
    // Test 2: List buckets (this might fail due to permissions)
    console.log('📁 Test 2: Listing storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.warn('⚠️ Cannot list buckets (expected):', bucketsError);
      console.log('💡 This is normal - regular users can\'t list all buckets');
      console.log('🔄 Proceeding to test recordings bucket directly...');
    } else {
      console.log('✅ Available buckets:', buckets.map(b => `${b.name} (public: ${b.public})`));
      
      // Test 2B: Check if recordings bucket exists in the list
      const recordingsBucket = buckets.find(bucket => bucket.id === 'recordings' || bucket.name === 'recordings');
      
      if (recordingsBucket) {
        console.log('✅ Found recordings bucket in list:', recordingsBucket);
      } else {
        console.log('⚠️ Recordings bucket not visible in list, but might still exist');
      }
    }
    
    // Test 3: Try to access recordings bucket directly
    console.log('📂 Test 3: Testing recordings bucket access...');
    const { data: objects, error: listError } = await supabase.storage
      .from('recordings')
      .list('', { limit: 10 });
    
    if (listError) {
      console.warn('⚠️ Cannot list objects in recordings bucket:', listError);
      console.log('💡 This could be normal - let\'s try other tests...');
    } else {
      console.log('✅ Can list objects in recordings bucket:', objects?.length || 0, 'files found');
    }
    
    // Test 4: Test upload with user's folder structure (most important test)
    console.log('📤 Test 4: Testing upload to user folder...');
    // Create a tiny valid audio file (MP3 header + minimal data)
    const mp3Header = new Uint8Array([
      0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    const testContent = new Blob([mp3Header], { type: 'audio/mpeg' });
    const testFileName = `${user.id}/test-${Date.now()}.mp3`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(testFileName, testContent);
    
    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
      
      if (uploadError.message.includes('Bucket not found')) {
        console.log('💡 The "recordings" bucket doesn\'t exist or isn\'t accessible');
        console.log('🔧 Solution: Ensure the bucket exists and is properly configured');
        return false;
      }
      
      if (uploadError.message.includes('new row violates row-level security')) {
        console.log('💡 RLS policies are blocking uploads');
        console.log('🔧 Solution: Check bucket policies allow authenticated users to upload');
        return false;
      }
      
      console.log('💡 Other upload error - check bucket configuration');
      return false;
    }
    
    console.log('✅ Upload test successful:', uploadData);
    
    // Test 5: Test public URL generation and access
    console.log('🔗 Test 5: Testing public URL...');
    const { data: { publicUrl } } = supabase.storage
      .from('recordings')
      .getPublicUrl(testFileName);
    
    console.log('📄 Generated public URL:', publicUrl);
    
    // Test 6: Try to fetch the public URL
    console.log('🌐 Test 6: Testing public URL accessibility...');
    try {
      const response = await fetch(publicUrl);
      if (response.ok) {
        console.log('✅ Public URL is accessible - files can be played back!');
        
        // Clean up test file
        console.log('🧹 Cleaning up test file...');
        await supabase.storage.from('recordings').remove([testFileName]);
        
        console.log('🎉 All storage tests passed! Supabase storage is ready for production!');
        return true;
      } else {
        console.error(`❌ Public URL returned ${response.status}: ${response.statusText}`);
        console.log('💡 Upload works but files aren\'t publicly accessible');
        console.log('🔧 Solution: Make sure the bucket is set to "Public" in dashboard');
        
        // Clean up even if access failed
        await supabase.storage.from('recordings').remove([testFileName]);
        return false;
      }
    } catch (fetchError) {
      console.error('❌ Failed to fetch public URL:', fetchError);
      console.log('💡 Network error or CORS issue');
      
      // Clean up
      await supabase.storage.from('recordings').remove([testFileName]);
      return false;
    }
    
  } catch (error) {
    console.error('💥 Unexpected error during storage test:', error);
    return false;
  }
}

// Export a function that can be called from browser console (development only)
if (process.env.NODE_ENV === 'development') {
  (window as any).testSupabaseStorage = testStorageConfiguration;
}