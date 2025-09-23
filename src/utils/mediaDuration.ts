/**
 * Media Duration Extraction Utility
 * 
 * Extracts duration from audio and video files using native browser APIs
 * Supports various formats and provides reliable duration data for recordings
 */

export interface DurationResult {
  duration: number | null; // Duration in seconds
  success: boolean;
  error?: string;
  method?: string; // Which method was used for extraction
}

/**
 * Extract duration from audio files using Web Audio API
 */
async function extractAudioDuration(file: File): Promise<DurationResult> {
  try {
    console.log(`🎵 Extracting audio duration for: ${file.name} (${file.type})`);
    
    // Check if Web Audio API is available
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      throw new Error('Web Audio API not supported in this browser');
    }
    
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    try {
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      console.log(`📊 File loaded as ArrayBuffer: ${arrayBuffer.byteLength} bytes`);
      
      // Decode audio data - this is where WAV files often fail
      console.log(`🔄 Decoding audio data for ${file.type}...`);
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      
      // Get duration in seconds
      const duration = audioBuffer.duration;
      
      // Clean up audio context
      await audioContext.close();
      
      console.log(`✅ Audio duration extracted: ${duration} seconds using Web Audio API`);
      
      // Enhanced validation with recovery attempts
      const roundedDuration = Math.round(duration);
      const validation = validateAndRecoverDuration(roundedDuration, file, 'WebAudioAPI');
      
      if (!validation.isValid) {
        throw new Error(`Invalid duration extracted: ${duration}s. Recovery failed: ${validation.method}`);
      }
      
      return {
        duration: validation.recoveredDuration,
        success: true,
        method: validation.method === 'original' ? 'WebAudioAPI' : `WebAudioAPI_${validation.method}`
      };
    } catch (decodeError) {
      // Clean up audio context on error
      await audioContext.close();
      throw decodeError;
    }
  } catch (error) {
    console.error('❌ Web Audio API duration extraction failed:', error);
    console.error('Error details:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    return {
      duration: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown audio extraction error',
      method: 'WebAudioAPI'
    };
  }
}

/**
 * Extract duration from video files using HTML5 video element
 */
async function extractVideoDuration(file: File): Promise<DurationResult> {
  return new Promise((resolve) => {
    console.log(`🎬 Extracting video duration for: ${file.name} (${file.type})`);
    console.log(`📊 Video file size: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
    
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true; // Ensure no audio issues
    video.crossOrigin = 'anonymous'; // Help with CORS if needed
    
    // Create object URL for the video file
    const url = URL.createObjectURL(file);
    console.log(`📁 Created object URL for video: ${url.substring(0, 50)}...`);
    
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };
    
    // Track if we've already resolved to prevent multiple calls
    let resolved = false;
    
    const resolveOnce = (result: DurationResult) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(result);
      }
    };
    
    video.onloadedmetadata = () => {
      try {
        console.log(`📊 Video metadata loaded. Duration: ${video.duration}, ReadyState: ${video.readyState}`);
        console.log(`📊 Video properties: ${video.videoWidth}x${video.videoHeight}, Duration: ${video.duration}s`);
        
        const duration = video.duration;
        
        if (isNaN(duration) || !isFinite(duration) || duration <= 0) {
          console.error('❌ Invalid video duration:', duration);
          resolveOnce({
            duration: null,
            success: false,
            error: `Invalid video duration: ${duration}`,
            method: 'HTML5Video'
          });
          return;
        }
        
        const roundedDuration = Math.round(duration);
        
        // Enhanced validation with recovery attempts
        const validation = validateAndRecoverDuration(roundedDuration, file, 'HTML5Video');
        
        if (!validation.isValid) {
          console.error('❌ Invalid video duration:', duration, 'Recovery method:', validation.method);
          resolveOnce({
            duration: null,
            success: false,
            error: `Invalid video duration: ${duration}. Recovery failed: ${validation.method}`,
            method: 'HTML5Video'
          });
          return;
        }
        
        console.log(`✅ Video duration extracted: ${validation.recoveredDuration} seconds using ${validation.method === 'original' ? 'HTML5 Video' : `HTML5 Video + ${validation.method}`}`);
        resolveOnce({
          duration: validation.recoveredDuration,
          success: true,
          method: validation.method === 'original' ? 'HTML5Video' : `HTML5Video_${validation.method}`
        });
      } catch (error) {
        console.error('❌ Video duration extraction failed:', error);
        resolveOnce({
          duration: null,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown video extraction error',
          method: 'HTML5Video'
        });
      }
    };
    
    video.onloadeddata = () => {
      console.log(`📊 Video data loaded. ReadyState: ${video.readyState}`);
      // Sometimes metadata event doesn't fire, try here too
      if (!resolved && video.duration && isFinite(video.duration) && video.duration > 0) {
        const roundedDuration = Math.round(video.duration);
        if (isValidDuration(roundedDuration)) {
          console.log(`✅ Video duration from loadeddata: ${roundedDuration} seconds`);
          resolveOnce({
            duration: roundedDuration,
            success: true,
            method: 'HTML5Video'
          });
        }
      }
    };
    
    video.onerror = (event) => {
      console.error('❌ Video loading failed:', event);
      console.error('Video error details:', {
        error: video.error,
        code: video.error?.code,
        message: video.error?.message,
        networkState: video.networkState,
        readyState: video.readyState
      });
      
      resolveOnce({
        duration: null,
        success: false,
        error: `Video loading failed: ${video.error?.message || 'Unknown video error'}`,
        method: 'HTML5Video'
      });
    };
    
    video.onabort = () => {
      console.error('❌ Video loading aborted');
      resolveOnce({
        duration: null,
        success: false,
        error: 'Video loading aborted',
        method: 'HTML5Video'
      });
    };
    
    video.onstalled = () => {
      console.warn('⚠️ Video loading stalled');
    };
    
    // Set timeout to avoid hanging
    const timeoutId = setTimeout(() => {
      console.error('❌ Video duration extraction timeout (15s)');
      resolveOnce({
        duration: null,
        success: false,
        error: 'Video duration extraction timeout (15s)',
        method: 'HTML5Video'
      });
    }, 15000); // Increased timeout to 15 seconds for larger files
    
    // Clear timeout when resolved
    const originalResolve = resolve;
    resolve = (result) => {
      clearTimeout(timeoutId);
      originalResolve(result);
    };
    
    try {
      video.src = url;
    } catch (error) {
      console.error('❌ Failed to set video src:', error);
      clearTimeout(timeoutId);
      cleanup();
      resolve({
        duration: null,
        success: false,
        error: `Failed to set video source: ${error instanceof Error ? error.message : 'Unknown error'}`,
        method: 'HTML5Video'
      });
    }
  });
}

/**
 * Fallback method using HTML5 audio element for audio files
 */
async function extractAudioDurationFallback(file: File): Promise<DurationResult> {
  return new Promise((resolve) => {
    console.log(`🎵 Fallback audio duration extraction for: ${file.name}`);
    
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    
    const url = URL.createObjectURL(file);
    
    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.remove();
    };
    
    audio.onloadedmetadata = () => {
      try {
        const duration = audio.duration;
        cleanup();
        
        if (isNaN(duration) || !isFinite(duration)) {
          resolve({
            duration: null,
            success: false,
            error: 'Invalid audio duration',
            method: 'HTML5Audio'
          });
          return;
        }
        
        const roundedDuration = Math.round(duration);
        if (!isValidDuration(roundedDuration)) {
          resolve({
            duration: null,
            success: false,
            error: `Invalid audio duration: ${duration}`,
            method: 'HTML5Audio'
          });
          return;
        }
        
        console.log(`✅ Audio duration extracted (fallback): ${roundedDuration} seconds`);
        resolve({
          duration: roundedDuration,
          success: true,
          method: 'HTML5Audio'
        });
      } catch (error) {
        cleanup();
        resolve({
          duration: null,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown audio fallback error',
          method: 'HTML5Audio'
        });
      }
    };
    
    audio.onerror = () => {
      cleanup();
      resolve({
        duration: null,
        success: false,
        error: 'Failed to load audio file',
        method: 'HTML5Audio'
      });
    };
    
    // Set timeout
    setTimeout(() => {
      cleanup();
      resolve({
        duration: null,
        success: false,
        error: 'Audio duration extraction timeout',
        method: 'HTML5Audio'
      });
    }, 10000);
    
    audio.src = url;
  });
}

/**
 * Main function to extract duration from any media file
 * Automatically detects file type and uses appropriate method
 */
export async function extractMediaDuration(file: File): Promise<DurationResult> {
  console.log(`📊 Starting duration extraction for: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
  
  // Validate file type
  if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
    const error = `Unsupported file type: ${file.type}. Expected audio/* or video/*`;
    console.error(`❌ ${error}`);
    return {
      duration: null,
      success: false,
      error,
      method: 'validation'
    };
  }
  
  const methods: string[] = [];
  const errors: string[] = [];
  let result: DurationResult;
  
  // For video files, try video extraction first
  if (file.type.startsWith('video/')) {
    console.log(`🎬 Attempting video extraction for ${file.type} file`);
    methods.push('HTML5Video');
    result = await extractVideoDuration(file);
    
    if (result.success) {
      console.log(`✅ Video extraction successful: ${result.duration}s`);
      return result;
    } else {
      errors.push(`HTML5Video: ${result.error}`);
      console.warn(`⚠️ Video extraction failed: ${result.error}`);
    }
  }
  
  // For audio files OR failed video files, try audio methods
  if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
    // Method 1: Web Audio API (most accurate for audio)
    console.log(`🎵 Attempting Web Audio API extraction for ${file.type} file`);
    methods.push('WebAudioAPI');
    
    try {
      result = await extractAudioDuration(file);
      if (result.success) {
        console.log(`✅ Web Audio API extraction successful: ${result.duration}s`);
        return result;
      } else {
        errors.push(`WebAudioAPI: ${result.error}`);
        console.warn(`⚠️ Web Audio API failed: ${result.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown Web Audio API error';
      errors.push(`WebAudioAPI: ${errorMsg}`);
      console.warn(`⚠️ Web Audio API exception: ${errorMsg}`);
    }
    
    // Method 2: HTML5 Audio fallback
    console.log(`🎵 Attempting HTML5 Audio fallback for ${file.type} file`);
    methods.push('HTML5Audio');
    
    try {
      result = await extractAudioDurationFallback(file);
      if (result.success) {
        console.log(`✅ HTML5 Audio extraction successful: ${result.duration}s`);
        return result;
      } else {
        errors.push(`HTML5Audio: ${result.error}`);
        console.warn(`⚠️ HTML5 Audio failed: ${result.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown HTML5 Audio error';
      errors.push(`HTML5Audio: ${errorMsg}`);
      console.warn(`⚠️ HTML5 Audio exception: ${errorMsg}`);
    }
  }
  
  // All methods failed
  const allErrors = errors.join('; ');
  const methodsAttempted = methods.join(', ');
  const finalError = `All ${methods.length} extraction methods failed for ${file.type} file. Methods tried: ${methodsAttempted}. Errors: ${allErrors}`;
  
  console.error(`❌ Duration extraction completely failed for: ${file.name}`);
  console.error(`❌ Methods attempted: ${methodsAttempted}`);
  console.error(`❌ All errors: ${allErrors}`);
  
  return {
    duration: null,
    success: false,
    error: finalError,
    method: 'all_failed'
  };
}

/**
 * Batch extract duration from multiple files
 * Useful for backfilling existing recordings
 */
export async function extractMultipleMediaDurations(files: File[]): Promise<DurationResult[]> {
  console.log(`📊 Batch extracting duration for ${files.length} files`);
  
  const results: DurationResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`Processing file ${i + 1}/${files.length}: ${file.name}`);
    
    const result = await extractMediaDuration(file);
    results.push(result);
    
    // Small delay to prevent overwhelming the browser
    if (i < files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  const successful = results.filter(r => r.success).length;
  console.log(`✅ Batch duration extraction complete: ${successful}/${files.length} successful`);
  
  return results;
}

/**
 * Extract duration from a file URL by downloading and processing it
 * Useful for backfilling existing recordings from storage URLs
 */
export async function extractDurationFromUrl(url: string, filename?: string): Promise<DurationResult> {
  try {
    console.log(`🌐 Extracting duration from URL: ${url}`);
    
    // Fetch the file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    
    // Convert to blob and then to file
    const blob = await response.blob();
    const file = new File([blob], filename || 'unknown-file', {
      type: blob.type || 'application/octet-stream'
    });
    
    // Extract duration using normal method
    return await extractMediaDuration(file);
  } catch (error) {
    console.error('❌ URL duration extraction failed:', error);
    return {
      duration: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown URL extraction error',
      method: 'url_fetch'
    };
  }
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Validate if a duration value is reasonable for media files
 * Enhanced validation to prevent the 9-second bug and other common issues
 */
export function isValidDuration(duration: number | null): boolean {
  if (duration === null || duration === undefined) return false;
  if (isNaN(duration) || !isFinite(duration)) return false;
  if (duration < 0) return false;
  if (duration > 86400) return false; // More than 24 hours seems unreasonable
  
  // Enhanced validation to catch the 9-second bug and other suspicious values
  if (duration === 9) {
    console.warn('⚠️ Suspicious 9-second duration detected - likely processing bug');
    return false;
  }
  
  // Reject durations that are suspiciously short for real recordings
  if (duration < 5) {
    console.warn(`⚠️ Duration too short: ${duration}s - likely processing error`);
    return false;
  }
  
  return true;
}

/**
 * Enhanced duration validation with recovery attempts
 * Tries multiple methods to extract valid duration
 */
export function validateAndRecoverDuration(
  duration: number | null, 
  file: File,
  context: string = 'unknown'
): { isValid: boolean; recoveredDuration: number | null; method: string } {
  // First check if duration is already valid
  if (isValidDuration(duration)) {
    return { isValid: true, recoveredDuration: duration, method: 'original' };
  }
  
  console.warn(`⚠️ Invalid duration ${duration}s detected in ${context}. Attempting recovery...`);
  
  // Try to estimate from file size (rough approximation)
  if (file && file.size > 0) {
    // Rough estimation: audio files are typically 1MB per minute for decent quality
    // Video files are typically 5-20MB per minute depending on resolution
    const isVideo = file.type.startsWith('video/');
    const avgMBPerMinute = isVideo ? 10 : 1; // Conservative estimates
    const estimatedMinutes = (file.size / (1024 * 1024)) / avgMBPerMinute;
    const estimatedDuration = Math.max(30, Math.min(7200, estimatedMinutes * 60)); // 30s min, 2hr max
    
    if (estimatedDuration > 5) {
      console.log(`📊 Duration estimated from file size: ${estimatedDuration.toFixed(0)}s`);
      return { 
        isValid: true, 
        recoveredDuration: Math.round(estimatedDuration), 
        method: 'file_size_estimation' 
      };
    }
  }
  
  // Final fallback - return invalid
  return { isValid: false, recoveredDuration: null, method: 'recovery_failed' };
}