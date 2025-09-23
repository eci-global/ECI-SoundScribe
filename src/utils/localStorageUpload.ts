// Local storage based file upload for testing when Supabase storage isn't available

export interface LocalUploadResult {
  publicUrl: string;
  fileName: string;
  isLocal: boolean;
}

// In-memory storage for files (since localStorage quota is too small for audio files)
const inMemoryFiles = new Map<string, Blob>();
const MAX_MEMORY_FILES = 50; // Limit to prevent memory issues

export async function uploadFileLocally(file: File, userId: string): Promise<LocalUploadResult> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  
  try {
    // Create a blob URL for immediate use
    const blobUrl = URL.createObjectURL(file);
    
    // Store the original file in memory for later retrieval
    const storageKey = `audio_file_${fileName}`;
    
    // Clean up old files if we're at the limit
    if (inMemoryFiles.size >= MAX_MEMORY_FILES) {
      const oldestKey = inMemoryFiles.keys().next().value;
      if (oldestKey) {
        inMemoryFiles.delete(oldestKey);
        console.log('🧹 Cleaned up old file from memory:', oldestKey);
      }
    }
    
    inMemoryFiles.set(storageKey, file);
    
    // Store metadata in localStorage (small, so it fits)
    const metadataKey = `audio_meta_${fileName}`;
    try {
      localStorage.setItem(metadataKey, JSON.stringify({
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        storageKey: storageKey,
        uploadedAt: new Date().toISOString()
      }));
    } catch (localStorageError) {
      console.warn('⚠️ Could not store metadata in localStorage:', localStorageError);
    }
    
    console.log('✅ File stored in memory with key:', storageKey);
    console.log('✅ File metadata stored in localStorage:', metadataKey);
    console.log('📊 File size:', formatBytes(file.size));
    console.log('🔗 Blob URL created:', blobUrl);
    
    // Debug: Show what we just stored
    console.log('🔍 UPLOAD DEBUG - Just stored:');
    console.log('   - Storage key:', storageKey);
    console.log('   - File name:', fileName);
    console.log('   - Will return URL:', blobUrl);
    console.log('   - File type:', file.type);
    console.log('   - In-memory storage size:', inMemoryFiles.size, 'files');
    
    // Test immediate retrieval
    const testRetrieve = inMemoryFiles.get(storageKey);
    console.log('   - Immediate retrieval test:', testRetrieve ? '✅ SUCCESS' : '❌ FAILED');
    
    // Return the blob URL for immediate playback
    return {
      publicUrl: blobUrl,
      fileName,
      isLocal: true
    };
  } catch (error) {
    console.error('❌ Local file storage failed:', error);
    throw error;
  }
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getLocalFile(fileName: string): string | null {
  const storageKey = `audio_file_${fileName}`;
  
  // First try in-memory storage
  const inMemoryFile = inMemoryFiles.get(storageKey);
  if (inMemoryFile) {
    console.log(`🔍 Found file in memory with key: ${storageKey}`);
    const blobUrl = URL.createObjectURL(inMemoryFile);
    console.log(`✅ Created blob URL: ${blobUrl}`);
    return blobUrl;
  }
  
  // Fallback to localStorage (for backward compatibility)
  const file = localStorage.getItem(storageKey);
  console.log(`🔍 Searching localStorage with key: ${storageKey}`);
  console.log(`${file ? '✅' : '❌'} File ${file ? 'found' : 'not found'} in localStorage`);
  return file;
}

// Enhanced file finding that tries multiple key patterns
export function findLocalFile(fileName: string): string | null {
  console.log(`🔍 Attempting to find file: ${fileName}`);
  
  // If it's already a blob URL, return as-is
  if (fileName.startsWith('blob:')) {
    console.log(`✅ Already a blob URL, returning as-is`);
    return fileName;
  }
  
  // Remove localStorage:// prefix if present
  const cleanFileName = fileName.replace('localStorage://', '');
  
  // Try various key patterns
  const possibleKeys = [
    `audio_file_${cleanFileName}`,
    `audio_file_${fileName}`, // in case fileName is already clean
    cleanFileName.includes('/') ? `audio_file_${cleanFileName.split('/').pop()}` : null,
  ].filter(Boolean);
  
  for (const key of possibleKeys) {
    console.log(`   Trying key: ${key}`);
    
    // First try in-memory storage
    const inMemoryFile = inMemoryFiles.get(key!);
    if (inMemoryFile) {
      console.log(`   ✅ Found file in memory with key: ${key}`);
      console.log(`   📊 File size: ${Math.round(inMemoryFile.size / 1024)}KB`);
      console.log(`   🎵 File type: ${inMemoryFile.type}`);
      const blobUrl = URL.createObjectURL(inMemoryFile);
      console.log(`   🔗 Created blob URL: ${blobUrl}`);
      return blobUrl;
    }
    
    // Fallback to localStorage
    const file = localStorage.getItem(key!);
    if (file) {
      console.log(`   ✅ Found file in localStorage with key: ${key}`);
      console.log(`   📊 File size: ${Math.round(file.length / 1024)}KB`);
      console.log(`   🎵 File type: ${file.substring(0, 30)}...`);
      return file;
    } else {
      console.log(`   ❌ Not found with key: ${key}`);
    }
  }
  
  console.log(`❌ File not found with any key pattern`);
  return null;
}

// Debug function to list all stored files
export function listStoredFiles(): void {
  console.log('📁 In-memory audio files:');
  if (inMemoryFiles.size === 0) {
    console.log('   (no files in memory)');
  } else {
    inMemoryFiles.forEach((file, key) => {
      const size = Math.round(file.size / 1024);
      console.log(`   🎵 ${key}: ${size}KB (${file.type})`);
    });
  }
  
  console.log('📁 localStorage audio files:');
  const audioKeys = Object.keys(localStorage).filter(key => key.startsWith('audio_file_'));
  if (audioKeys.length === 0) {
    console.log('   (no audio files in localStorage)');
  } else {
    audioKeys.forEach(key => {
      const file = localStorage.getItem(key);
      const size = file ? Math.round(file.length / 1024) : 0;
      console.log(`   📄 ${key}: ${size}KB`);
    });
  }
}

// Debug function to list ALL localStorage keys (to see what's really there)
export function listAllLocalStorageKeys(): void {
  console.log('🧠 In-memory files:');
  if (inMemoryFiles.size === 0) {
    console.log('   (no files in memory)');
  } else {
    inMemoryFiles.forEach((file, key) => {
      const size = Math.round(file.size / 1024);
      console.log(`   🎵 ${key}: ${size}KB (${file.type})`);
    });
  }
  
  console.log('🗂️ ALL localStorage keys:');
  const allKeys = Object.keys(localStorage);
  if (allKeys.length === 0) {
    console.log('   (localStorage is empty)');
  } else {
    allKeys.forEach(key => {
      const value = localStorage.getItem(key);
      const size = value ? Math.round(value.length / 1024) : 0;
      const type = key.startsWith('audio_') ? '🎵' : 
                   key.startsWith('user_') ? '👤' : 
                   key.startsWith('sb-') ? '🔑' : '📝';
      console.log(`   ${type} ${key}: ${size}KB`);
    });
  }
}

// Debug function for comprehensive file access debugging
export function debugFileAccess(targetFileName: string): void {
  console.log('\n🐛 === FILE ACCESS DEBUG ===');
  console.log(`🎯 Target file: ${targetFileName}`);
  
  // List ALL localStorage keys first
  listAllLocalStorageKeys();
  
  console.log('\n');
  
  // List audio files specifically
  listStoredFiles();
  
  // Try to find the specific file
  console.log('\n🔍 Searching for target file...');
  const found = findLocalFile(targetFileName);
  
  if (found) {
    console.log(`✅ SUCCESS: File found and ready for playback`);
    console.log(`📊 Data preview: ${found.substring(0, 50)}...`);
  } else {
    console.log(`❌ FAILURE: File not accessible`);
    
    // Additional debugging for failed cases
    console.log('\n🔧 Additional debugging:');
    const cleanFileName = targetFileName.replace('localStorage://', '');
    console.log(`   - Clean filename: ${cleanFileName}`);
    console.log(`   - Expected key: audio_file_${cleanFileName}`);
    
    // Try direct access
    const directAccess = localStorage.getItem(`audio_file_${cleanFileName}`);
    console.log(`   - Direct access result: ${directAccess ? 'FOUND' : 'NOT FOUND'}`);
  }
  console.log('🐛 === END DEBUG ===\n');
}

export function deleteLocalFile(fileName: string): void {
  const storageKey = `audio_file_${fileName}`;
  const metadataKey = `audio_meta_${fileName}`;
  
  // Remove from in-memory storage
  const deleted = inMemoryFiles.delete(storageKey);
  console.log(`${deleted ? '✅' : '❌'} ${deleted ? 'Deleted' : 'Not found'} in-memory file:`, storageKey);
  
  // Remove from localStorage
  localStorage.removeItem(storageKey);
  localStorage.removeItem(metadataKey);
  console.log('✅ Cleared localStorage entries:', storageKey, metadataKey);
}

// Clean up old blob URLs
export function cleanupBlobUrls() {
  // This would be called when the app unmounts or routes change
  // For now, we'll let the browser handle cleanup
}

// Get sample audio for testing
export function getSampleAudioUrl(): string {
  // Return a data URL for a simple audio file
  return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBj2Y2u7FeSkGJn7J7+ONQAY=';
}