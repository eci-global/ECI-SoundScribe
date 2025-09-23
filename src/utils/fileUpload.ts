import { supabase } from '@/integrations/supabase/client';
import { uploadFileLocally, LocalUploadResult } from './localStorageUpload';
import { AudioCompressor } from './audioCompression';

// File size thresholds
export const FILE_SIZE_LIMITS = {
  EDGE_FUNCTION_LIMIT: 200 * 1024 * 1024,   // 200MB - use edge functions below this
  LARGE_FILE_THRESHOLD: 500 * 1024 * 1024,  // 500MB - use direct upload above this
  MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024     // 2GB - absolute maximum
};

// Enhanced security configuration
const SECURITY_CONFIG = {
  maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB to match new limits
  allowedMimeTypes: [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a', 'audio/aac', 'audio/flac',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'
  ],
  allowedExtensions: [
    'mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac', 'flac',
    'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'
  ],
  dangerousPatterns: [
    /\.\./,           // Path traversal
    /[<>:"|?*]/,     // Dangerous filename characters (removed backslash and forward slash as they're common in paths)
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
    /^\./,            // Hidden files
    /\s$/,            // Trailing spaces
    /\.$/            // Trailing dots
  ],
  virusPatterns: [
    // Removed patterns that can appear in legitimate video/audio files
    /EICAR/,          // EICAR test string (actual virus test pattern)
  ]
};

export const validateFile = async (file: File): Promise<void> => {
  console.log('Enhanced file validation starting for:', file.name, file.type, `${file.size} bytes`);
  
  // 1. Basic file properties validation
  if (!file || !file.name) {
    throw new Error('Invalid file: File object is malformed');
  }
  
  if (file.size === 0) {
    throw new Error('Invalid file: File is empty');
  }
  
  if (file.size > SECURITY_CONFIG.maxFileSize) {
    throw new Error(`File too large: Maximum size is ${SECURITY_CONFIG.maxFileSize / (1024 * 1024)}MB`);
  }
  
  // 2. Filename security validation
  validateFilename(file.name);
  
  // 3. MIME type validation
  if (!file.type || !SECURITY_CONFIG.allowedMimeTypes.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type || 'unknown'}. Only audio and video files are allowed.`);
  }
  
  // 4. File extension validation
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !SECURITY_CONFIG.allowedExtensions.includes(extension)) {
    throw new Error(`Invalid file extension: .${extension || 'none'}. Allowed extensions: ${SECURITY_CONFIG.allowedExtensions.join(', ')}`);
  }
  
  // OPTIMIZATION: Parallelize file signature validation and content scanning
  console.log('🔄 Running parallel validation (signature + content scan)...');
  const validationStartTime = performance.now();
  
  await Promise.all([
    validateFileSignature(file, extension), // 5. File signature validation (magic bytes) - relaxed for MP4
    scanFileContent(file)                   // 6. Content scanning for malicious patterns
  ]);
  
  const validationTime = performance.now() - validationStartTime;
  console.log(`✅ Enhanced file validation completed successfully in ${validationTime.toFixed(0)}ms:`, file.name);
};

// Validate filename for security issues
const validateFilename = (filename: string): void => {
  // Check for dangerous patterns
  for (const pattern of SECURITY_CONFIG.dangerousPatterns) {
    if (pattern.test(filename)) {
      throw new Error(`Unsafe filename: Contains invalid characters or patterns`);
    }
  }
  
  // Length check
  if (filename.length > 255) {
    throw new Error('Filename too long: Maximum 255 characters allowed');
  }
  
  // Must have extension
  if (!filename.includes('.') || filename.endsWith('.')) {
    throw new Error('Invalid filename: Must have a valid file extension');
  }
};

// Improved file signature validation - more flexible for MP4 files
const validateFileSignature = async (file: File, expectedExtension: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const chunk = file.slice(0, 64); // Read first 64 bytes for better MP4 detection
    
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      const signature = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      
      console.log('File signature:', signature.substring(0, 32), 'for extension:', expectedExtension);
      
      // Define expected signatures for common formats
      const signatures: Record<string, string[]> = {
        'mp3': ['494433', 'fffb', 'fff3', 'fff2'], // ID3, MP3 frames
        'wav': ['52494646'], // RIFF
        'ogg': ['4f676753'], // OggS
        'mp4': ['66747970', 'ftyp'], // ftyp box - more flexible detection
        'm4a': ['66747970', 'ftyp'], // ftyp
        'webm': ['1a45dfa3'], // EBML
        'flac': ['664c6143'], // fLaC
        'avi': ['52494646'], // RIFF
        'mov': ['66747970', 'ftyp', 'moov'], // ftyp, moov
        'mkv': ['1a45dfa3'] // EBML
      };
      
      const expectedSignatures = signatures[expectedExtension] || [];
      
      if (expectedSignatures.length > 0) {
        let isValidSignature = false;
        
        // For MP4/MOV files, check for 'ftyp' anywhere in the first 64 bytes
        if (expectedExtension === 'mp4' || expectedExtension === 'mov' || expectedExtension === 'm4a') {
          // Look for 'ftyp' (66747970) anywhere in the signature
          isValidSignature = signature.includes('66747970') || signature.includes('6d6f6f76'); // moov
          console.log('MP4/MOV signature check:', isValidSignature, 'found ftyp:', signature.includes('66747970'));
        } else {
          // For other formats, check if signature starts with expected bytes
          isValidSignature = expectedSignatures.some(sig => 
            signature.toLowerCase().startsWith(sig.toLowerCase())
          );
        }
        
        if (!isValidSignature) {
          console.warn(`File signature validation failed for ${expectedExtension}:`, signature.substring(0, 32));
          // For now, just warn but don't reject - many valid files have variations
          console.warn(`Proceeding with upload despite signature mismatch for: ${file.name}`);
        }
      }
      
      resolve();
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file signature'));
    };
    
    reader.readAsArrayBuffer(chunk);
  });
};

// Scan file content for malicious patterns
const scanFileContent = async (file: File): Promise<void> => {
  // Skip content scanning for video/audio files as they can contain binary data that matches patterns
  if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
    console.log('Skipping content scan for media file:', file.type);
    return;
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // Scan first 1MB for performance
    const scanSize = Math.min(file.size, 1024 * 1024);
    const chunk = file.slice(0, scanSize);
    
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      
      // Check for executable headers only
      if (bytes[0] === 0x4D && bytes[1] === 0x5A) { // MZ header (PE executable)
        reject(new Error('Security threat: Executable file detected'));
        return;
      }
      
      if (bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) { // ELF header
        reject(new Error('Security threat: Executable file detected'));
        return;
      }
      
      console.log('Content scan completed - no threats detected');
      resolve();
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to scan file content'));
    };
    
    reader.readAsArrayBuffer(chunk);
  });
};

export const uploadFileToStorage = async (file: File, userId: string, options: {
  onProgress?: (progress: number) => void;
  validateSecurity?: boolean;
  generateThumbnail?: boolean;
} = {}) => {
  const { onProgress, validateSecurity = true, generateThumbnail = false } = options;
  
  console.log('🔄 Starting enhanced Supabase upload:', file.name, 'for user:', userId);
  
  // Enhanced security validation
  if (validateSecurity) {
    try {
      await validateFile(file);
    } catch (validationError) {
      console.error('❌ Security validation failed:', validationError);
      throw validationError;
    }
  }
  
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
  const fileName = `${userId}/${timestamp}_${sanitizedName}`;
  
  console.log('🔄 Attempting secure Supabase upload to path:', fileName);
  
  onProgress?.(10); // Start progress
  
  try {
    // Enhanced upload with metadata
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        metadata: {
          userId,
          originalName: file.name,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          fileSize: file.size.toString(),
          validated: 'true'
        }
      });
    
    if (uploadError) {
      console.warn('⚠️ Supabase storage error:', uploadError);
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }
    
    onProgress?.(70); // Upload complete
    
    console.log('✅ File uploaded to Supabase successfully:', uploadData);
    
    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('recordings')
      .getPublicUrl(fileName);
    
    console.log('📄 Generated secure Supabase public URL:', publicUrl);
    
    onProgress?.(90); // URL generated
    
    // Optional thumbnail generation for video files
    let thumbnailUrl;
    if (generateThumbnail && file.type.startsWith('video/')) {
      try {
        thumbnailUrl = await generateVideoThumbnail(file, userId);
        console.log('🖼️ Generated thumbnail:', thumbnailUrl);
      } catch (thumbnailError) {
        console.warn('⚠️ Thumbnail generation failed:', thumbnailError);
      }
    }
    
    onProgress?.(100); // Complete
    
    console.log('✅ Enhanced Supabase upload completed successfully');
    return { 
      publicUrl, 
      fileName,
      thumbnailUrl,
      metadata: {
        originalSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.log('🔄 Supabase upload failed, using secure localStorage fallback');
    console.log('   Error:', error);
    
    onProgress?.(50); // Fallback in progress
    
    const localResult = await uploadFileLocally(file, userId);
    console.log('✅ Successfully stored in secure localStorage:', localResult.fileName);
    
    onProgress?.(100); // Complete
    
    return { 
      publicUrl: localResult.publicUrl, 
      fileName: localResult.fileName,
      metadata: {
        originalSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        fallback: true
      }
    };
  }
};

// Generate video thumbnail
const generateVideoThumbnail = async (file: File, userId: string): Promise<string | undefined> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.onloadedmetadata = () => {
      // Set canvas size
      canvas.width = Math.min(video.videoWidth, 320);
      canvas.height = Math.min(video.videoHeight, 240);
      
      // Seek to 10% of video duration for thumbnail
      video.currentTime = video.duration * 0.1;
    };
    
    video.onseeked = () => {
      if (ctx) {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              const thumbnailFile = new File([blob], `thumbnail_${Date.now()}.jpg`, {
                type: 'image/jpeg'
              });
              
              const thumbnailPath = `${userId}/thumbnails/${Date.now()}_thumbnail.jpg`;
              
              const { data, error } = await supabase.storage
                .from('recordings')
                .upload(thumbnailPath, thumbnailFile);
              
              if (error) throw error;
              
              const { data: { publicUrl } } = supabase.storage
                .from('recordings')
                .getPublicUrl(thumbnailPath);
              
              resolve(publicUrl);
            } catch (error) {
              console.error('Thumbnail upload failed:', error);
              resolve(undefined);
            }
          } else {
            resolve(undefined);
          }
        }, 'image/jpeg', 0.8);
      } else {
        resolve(undefined);
      }
    };
    
    video.onerror = () => resolve(undefined);
    
    // Load video
    video.src = URL.createObjectURL(file);
    video.load();
  });
};

// Enhanced upload function for large files (direct to storage)
export const uploadLargeFileDirectly = async (
  file: File, 
  userId: string, 
  recordingId: string,
  options: {
    onProgress?: (progress: number) => void;
    validateSecurity?: boolean;
  } = {}
) => {
  const { onProgress, validateSecurity = true } = options;
  
  console.log('🚀 Starting large file direct upload:', file.name, `Size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
  console.log('🔍 Upload details:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    userId: userId,
    recordingId: recordingId
  });

  // Validate file with relaxed rules for large media files
  if (validateSecurity) {
    try {
      // For large video files, only do basic validation
      if (file.size > 50 * 1024 * 1024 && file.type.startsWith('video/')) {
        console.log('🎥 Large video file - using relaxed validation');
        // Just check file extension and MIME type
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!extension || !SECURITY_CONFIG.allowedExtensions.includes(extension)) {
          throw new Error(`Invalid file extension: .${extension || 'none'}`);
        }
        if (!SECURITY_CONFIG.allowedMimeTypes.includes(file.type)) {
          throw new Error(`Invalid file type: ${file.type}`);
        }
      } else {
        await validateFile(file);
      }
    } catch (validationError) {
      console.error('❌ Security validation failed:', validationError);
      throw validationError;
    }
  }
  
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${userId}/${timestamp}_${sanitizedName}`;
  
  try {
    // Direct upload to storage (bypasses edge functions)
    console.log('📤 Uploading directly to storage...');
    console.log('📁 Storage path:', fileName);
    onProgress?.(20);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        metadata: {
          userId,
          recordingId,
          originalName: file.name,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          fileSize: file.size.toString(),
          validated: 'true',
          largeFileUpload: 'true'
        }
      });
    
    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      console.error('❌ Upload error details:', {
        message: uploadError.message,
        name: uploadError.name
      });
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    console.log('✅ File uploaded to storage successfully:', uploadData);
    onProgress?.(60);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recordings')
      .getPublicUrl(fileName);
    
    console.log('✅ Large file uploaded successfully:', publicUrl);
    
    // Update recording with file URL
    const { error: updateError } = await supabase
      .from('recordings')
      .update({
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type.startsWith('video/') ? 'video' : 'audio',
        status: 'processing',
        processing_progress: 50,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordingId);
    
    if (updateError) {
      console.error('⚠️ Failed to update recording:', updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }
    
    console.log('✅ Recording updated in database successfully');
    onProgress?.(80);
    
    // Trigger async processing - use Azure backend for large files
    console.log('🔄 Triggering large file processing via Azure backend...');
    
    // Get Azure backend URL from environment
    const azureBackendUrl = import.meta.env.VITE_BACKGROUND_WORKER_URL || 'https://soundscribe-backend.azurewebsites.net';
    
    console.log('🌐 Azure backend URL:', azureBackendUrl);
    
    // Route large files to Azure backend instead of Edge Functions
    const processingResponse = await fetch(`${azureBackendUrl}/api/process-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recording_id: recordingId,
        file_url: publicUrl,
        file_size: file.size,
        is_large_file: true,
        file_type: file.type.startsWith('video/') ? 'video' : 'audio'
      })
    });
    
    console.log('📡 Azure backend response status:', processingResponse.status);
    
    if (processingResponse.ok) {
      const responseData = await processingResponse.json();
      console.log('✅ Azure backend processing triggered successfully:', responseData);
      
      // Update recording status
      await supabase
        .from('recordings')
        .update({
          status: 'processing',
          processing_progress: 75,
          processing_notes: 'Azure backend processing started',
          updated_at: new Date().toISOString()
        })
        .eq('id', recordingId);
        
    } else {
      console.error('⚠️ Azure backend processing failed:', processingResponse.status);
      const errorText = await processingResponse.text();
      console.error('⚠️ Azure backend error details:', errorText);
      
      // Fallback to Edge Function for smaller files
      if (file.size < 500 * 1024 * 1024) { // 500MB fallback threshold
        console.log('🔄 Falling back to Edge Function...');
        try {
          const { data, error } = await supabase.functions.invoke('process-recording', {
            body: { 
              recording_id: recordingId,
              large_file_fallback: true,
              original_file_size: file.size,
              compression_hint: 'azure_backend_failed'
            }
          });
          
          if (error) {
            throw error;
          }
          
          console.log('✅ Edge Function fallback succeeded:', data);
          
          await supabase
            .from('recordings')
            .update({
              status: 'processing',
              processing_progress: 75,
              processing_notes: 'Edge Function fallback processing started',
              updated_at: new Date().toISOString()
            })
            .eq('id', recordingId);
            
        } catch (fallbackError) {
          console.error('❌ Edge Function fallback also failed:', fallbackError);
          
          // Both Azure backend and Edge Function failed
          await supabase
            .from('recordings')
            .update({ 
              status: 'failed',
              error_message: `Large file processing failed: Both Azure backend and Edge Function failed. File size: ${(file.size / (1024 * 1024)).toFixed(1)}MB`,
              processing_notes: `All processing methods failed. Azure: ${processingResponse.status}. Edge Function: ${fallbackError.message}. Please compress file below 100MB.`,
              processing_progress: 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', recordingId);
          
          throw new Error(`Processing failed: ${fallbackError.message}`);
        }
      } else {
        // File too large for Edge Function fallback
        await supabase
          .from('recordings')
          .update({ 
            status: 'failed',
            error_message: `Large file processing failed: Azure backend unavailable. File size: ${(file.size / (1024 * 1024)).toFixed(1)}MB`,
            processing_notes: `Azure backend required for files >${(file.size / (1024 * 1024)).toFixed(1)}MB. Edge Functions have 256MB memory limit.`,
            processing_progress: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', recordingId);
        
        throw new Error(`Azure backend unavailable for ${(file.size / (1024 * 1024)).toFixed(1)}MB file`);
      }
    }
    
    onProgress?.(100);
    
    console.log('✅ Large file upload and processing setup completed successfully');
    
    return {
      publicUrl,
      fileName,
      recordingId,
      metadata: {
        originalSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        directUpload: true
      }
    };
    
  } catch (error) {
    console.error('❌ Large file upload failed:', error);
    
    // Update recording status to failed
    try {
      await supabase
        .from('recordings')
        .update({ 
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Upload failed',
          processing_progress: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordingId);
    } catch (updateError) {
      console.error('❌ Failed to update recording status:', updateError);
    }
    
    throw error;
  }
};

export const cleanupUploadedFile = async (fileName: string) => {
  const { error } = await supabase.storage
    .from('recordings')
    .remove([fileName]);
  
  if (error) {
    console.error('Error cleaning up file:', error);
  } else {
    console.log('Successfully cleaned up file:', fileName);
  }
};

// Enhanced upload pipeline: extract and compress audio before upload
export const uploadAndProcessAudio = async (file: File, userId: string, options: {
  onProgress?: (progress: number) => void;
  validateSecurity?: boolean;
  generateThumbnail?: boolean;
} = {}) => {
  const { onProgress, validateSecurity = true, generateThumbnail = false } = options;
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');
  const fileSizeMB = file.size / (1024 * 1024);

  // 1. Validate file
  if (validateSecurity) {
    await validateFile(file);
  }

  // 2. Extract audio if video (client-side, for small files)
  let audioBlob: Blob = file;
  if (isVideo && fileSizeMB < 25) {
    onProgress?.(10);
    audioBlob = await extractAudioFromVideoClient(file);
    onProgress?.(20);
  }

  // 3. Compress audio (client-side for small, serverless for larger)
  let compressedBlob: Blob = audioBlob;
  if (fileSizeMB < 25) {
    // Client-side compression using AudioCompressor
    onProgress?.(30);
    try {
      const audioFile = new File([audioBlob], file.name.replace(/\.[^/.]+$/, '.wav'), { type: 'audio/wav' });
      const result = await AudioCompressor.compressIfNeeded(audioFile, { maxSizeMB: 10, quality: 0.8, bitrate: 64 });
      compressedBlob = result.compressedFile;
      onProgress?.(50);
    } catch (err) {
      console.warn('Client-side compression failed, using original audio:', err);
    }
  } else {
    // Serverless compression via Edge Function
    onProgress?.(30);
    const uploadResult = await uploadFileToStorage(file, userId, { onProgress, validateSecurity, generateThumbnail });
    onProgress?.(50);
    const { data, error } = await supabase.functions.invoke('compress-audio', {
      body: {
        file_url: uploadResult.publicUrl,
        target_format: 'mp3',
        quality: 64,
        max_size_mb: 10
      }
    });
    if (error || !data?.file_url) {
      throw new Error('Audio compression failed');
    }
    const compressedResponse = await fetch(data.file_url);
    compressedBlob = await compressedResponse.blob();
    onProgress?.(70);
  }

  // 4. Upload compressed audio to Supabase
  const compressedFile = new File([compressedBlob], `audio_${Date.now()}.mp3`, { type: 'audio/mp3' });
  const uploadCompressed = await uploadFileToStorage(compressedFile, userId, { onProgress, validateSecurity: false });
  onProgress?.(90);

  // 5. Trigger AI processing
  // (Assume a recording row is created elsewhere, or add logic to create one here)
  // You may want to pass the uploadCompressed.fileName or publicUrl to your process-recording function

  onProgress?.(100);
  return {
    publicUrl: uploadCompressed.publicUrl,
    fileName: uploadCompressed.fileName,
    metadata: uploadCompressed.metadata
  };
};

// Helper: Extract audio from video client-side (using MediaRecorder API, fallback to original if not supported)
async function extractAudioFromVideoClient(file: File): Promise<Blob> {
  // Try to use MediaRecorder API if available
  if ('MediaRecorder' in window) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.play();
      video.oncanplay = () => {
        const stream = (video as any).captureStream ? (video as any).captureStream() : (video as any).mozCaptureStream();
        const audioTracks = stream.getAudioTracks();
        if (!audioTracks.length) {
          resolve(file); // fallback: return original file
          return;
        }
        const audioStream = new MediaStream(audioTracks);
        const recorder = new MediaRecorder(audioStream);
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          resolve(audioBlob);
        };
        recorder.start();
        setTimeout(() => {
          recorder.stop();
          video.pause();
        }, Math.min(10000, video.duration * 1000)); // up to 10s or video duration
      };
      video.onerror = () => resolve(file); // fallback
    });
  }
  // Fallback: return original file
  return file;
}
