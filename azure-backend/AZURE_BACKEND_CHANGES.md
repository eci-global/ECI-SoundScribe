# Azure Backend Changes Documentation

## Overview

This document outlines the comprehensive changes made to the SoundScribe Azure backend to support video processing, large file handling, improved audio processing capabilities, and automatic retry mechanisms for enhanced reliability.

## 🎯 Major Features Added

### 1. Video Support
- **Automatic audio extraction** from uploaded video files (MP4, MOV, AVI, etc.)
- **Video-to-audio conversion** using FFmpeg
- **Content type detection** and processing

### 2. Large File Processing
- **Audio chunking** for files larger than 25MB
- **Intelligent compression** to reduce file sizes
- **Multi-chunk transcription** with result combination
- **Progress tracking** for large file operations

### 3. Enhanced Audio Processing
- **FFmpeg integration** for professional audio manipulation
- **Audio compression** (WAV → MP3, 0.5x compression ratio)
- **Duration extraction** with multiple fallback methods
- **Audio format validation** and optimization

### 4. Automatic Retry Mechanism (NEW)
- **Intelligent error detection** for "corrupted or unsupported" audio files
- **Automatic retry logic** for both initial and chunked processing
- **MP3 conversion fallback** when original format fails
- **Seamless user experience** - no manual retry needed

## 📁 File Changes

### Core Backend Files

#### `package.json`
```json
{
  "name": "video-enabled-backend",
  "main": "server-with-video-support.js",
  "type": "module",
  "dependencies": {
    "fluent-ffmpeg": "^2.1.3",
    "ffmpeg-static": "^5.2.0",
    "ffprobe-static": "^3.1.0"
  }
}
```

#### `server-with-video-support.js` (NEW)
- **Main entry point** for the video-enabled backend
- **Worker pool management** (4 concurrent workers)
- **Request routing** and error handling
- **Health check endpoints**

#### `processor.js`
**Key Changes:**
- Enhanced duration extraction with priority fallbacks
- Large file chunking support
- Improved error handling and logging
- Audio duration persistence fixes
- **Automatic retry mechanism** for transcription failures

**Duration Extraction Logic:**
```javascript
// Priority-based duration extraction
let duration = transcriptionResult.data.duration || null;
if (!duration && transcriptionResult.data.segments) {
  // Calculate from segments
}
if (!duration && audioDuration) {
  // Use pre-extracted duration
}
if (!duration) {
  // FFmpeg fallback extraction
}
```

**Automatic Retry Logic (NEW):**
```javascript
// In processRecording function
if (!transcriptionResult.success && transcriptionResult.error?.error?.message && 
    (transcriptionResult.error.error.message.includes('corrupted') || 
     transcriptionResult.error.error.message.includes('unsupported'))) {
  
  console.log('🔄 Initial transcription failed with corrupted file error - attempting automatic retry...');
  
  // Wait for resources to stabilize
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Try with original buffer first
  transcriptionResult = await this.azureClient.transcribeAudio(
    originalBuffer, 
    filename, 
    transcriptionOptions
  );
  
  // If still failing, try MP3 conversion
  if (!transcriptionResult.success) {
    const mp3Buffer = await this.audioProcessor.compressToMp3(originalBuffer, filename);
    if (mp3Buffer) {
      transcriptionResult = await this.azureClient.transcribeAudio(
        mp3Buffer, 
        filename.replace(/\.[^/.]+$/, '_mp3.mp3'), 
        transcriptionOptions
      );
    }
  }
}
```

**Chunking Retry Logic (NEW):**
```javascript
// In processLargeAudioWithChunking function
const batchPromises = batch.map(async (chunk) => {
  // First attempt with the chunk buffer
  let result = await this.azureClient.transcribeAudio(
    chunk.buffer, 
    chunkFilename, 
    transcriptionOptions
  );
  
  // If transcription fails with corrupted/unsupported error, try automatic retry
  if (!result.success && result.error?.error?.message && 
      (result.error.error.message.includes('corrupted') || 
       result.error.error.message.includes('unsupported'))) {
    
    console.log(`🔄 Chunk ${chunk.index} failed with corrupted file error - attempting automatic retry...`);
    
    // Wait a moment for resources to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try with original chunk buffer first
    result = await this.azureClient.transcribeAudio(
      chunk.buffer, 
      chunkFilename, 
      transcriptionOptions
    );
    
    // If still failing, try converting to MP3
    if (!result.success) {
      const mp3Buffer = await this.audioProcessor.compressToMp3(chunk.buffer, chunkFilename);
      if (mp3Buffer) {
        const mp3Filename = chunkFilename.replace(/\.mp3$/, '_mp3.mp3');
        result = await this.azureClient.transcribeAudio(
          mp3Buffer, 
          mp3Filename, 
          transcriptionOptions
        );
      }
    }
  }
  
  return {
    index: chunk.index,
    startTime: chunk.startTime,
    duration: chunk.duration,
    text: result.success ? result.data.text : '',
    success: result.success,
    error: result.error
  };
});
```

#### `utils/audioProcessor.js`
**Complete FFmpeg Integration:**
- Audio compression (WAV → MP3)
- Audio splitting for chunking
- Duration extraction via FFprobe
- Temp file management
- **Enhanced MP3 conversion** for retry scenarios

**Key Methods:**
- `compressAudio()` - Compress audio files
- `splitAudioFile()` - Split large files into chunks
- `getAudioInfo()` - Extract audio metadata
- `isAlreadyOptimized()` - Check if compression needed
- `compressToMp3()` - Convert any audio format to MP3 for retry attempts

**MP3 Conversion Method (NEW):**
```javascript
async compressToMp3(inputBuffer, filename) {
  try {
    console.log(`🎵 Converting to MP3 format: ${filename}`);
    const inputPath = path.join(this.tempDir, `mp3_input_${Date.now()}_${filename}`);
    const outputPath = path.join(this.tempDir, `mp3_output_${Date.now()}_${filename.replace(/\.[^/.]+$/, '.mp3')}`);
    
    await fs.writeFile(inputPath, inputBuffer);
    
    const result = await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-acodec mp3', // MP3 codec
          '-ar 16000', // 16kHz sample rate
          '-ac 1', // Mono channel
          '-f mp3' // Force MP3 format
        ])
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(err))
        .save(outputPath);
    });
    
    const mp3Buffer = await fs.readFile(result);
    await this.cleanup([inputPath, result]);
    return mp3Buffer;
  } catch (error) {
    console.error(`❌ Error in compressToMp3: ${error.message}`);
    return null;
  }
}
```

#### `utils/fileHandler.js`
**New Features:**
- `writeBufferToTempFile()` - Write buffers to temp files
- Enhanced temp file management
- Better cleanup procedures

#### `utils/azureOpenAI.js`
**API Improvements:**
- Fixed URL construction (removed double slashes)
- Updated to `gpt-4o-transcribe` model
- Enhanced system prompts for better JSON responses
- Improved error handling

#### `supabase.js`
**Database Enhancements:**
- Added debugging logs for duration tracking
- Retry mechanism for missing columns
- Better error handling for processing progress

#### `web.config`
**Azure Configuration:**
```xml
<handlers>
  <add name="iisnode" path="server-with-video-support.js" verb="*" modules="iisnode" />
</handlers>
```

## 🔧 Technical Implementation

### FFmpeg Integration

#### Path Configuration
```javascript
// Handle ffprobe-static object structure
if (typeof ffprobePath === 'string') {
  ffprobeBinaryPath = ffprobePath;
} else if (ffprobePath && typeof ffprobePath === 'object' && ffprobePath.path) {
  ffprobeBinaryPath = String(ffprobePath.path);
} else {
  ffprobeBinaryPath = ffmpegBinaryPath.replace('ffmpeg', 'ffprobe');
}
```

#### Audio Compression
```javascript
ffmpeg(inputPath)
  .audioCodec('libmp3lame')
  .audioBitrate('128k')
  .audioChannels(2)
  .audioFrequency(44100)
  .save(outputPath);
```

#### Audio Chunking
```javascript
ffmpeg(inputPath)
  .setStartTime(startTime)
  .setDuration(endTime - startTime)
  .audioCodec('libmp3lame')
  .audioBitrate('128k')
  .save(outputPath);
```

### Large File Processing Pipeline

1. **File Download** from Supabase storage
2. **Format Validation** and preprocessing
3. **Audio Compression** (if needed)
4. **Duration Extraction** using FFprobe
5. **Chunking Decision** based on file size
6. **Multi-chunk Processing** if file > 25MB
7. **Result Combination** and analysis
8. **Database Storage** with metadata

### Error Handling

#### Graceful Fallbacks
- FFprobe failures → Duration estimation
- Chunking failures → Single file processing
- Compression failures → Original file usage
- API failures → Retry mechanisms
- **Transcription failures → Automatic retry with MP3 conversion**

#### Enhanced Logging
```javascript
console.log(`🔧 FFmpeg path: ${ffmpegBinaryPath}`);
console.log(`🔧 FFprobe path: ${ffprobeBinaryPath}`);
console.log(`📊 Compression ratio: ${compressionRatio}x`);
console.log(`✅ Audio splitting completed: ${chunks.length} chunks`);
console.log(`🔄 Initial transcription failed with corrupted file error - attempting automatic retry...`);
console.log(`🔄 Chunk ${chunk.index} failed with corrupted file error - attempting automatic retry...`);
console.log(`✅ Chunk ${chunk.index} automatic retry successful with MP3 format!`);
```

## 🚀 Deployment Changes

### Azure App Service Configuration

#### Startup Command
```bash
node server-with-video-support.js
```

#### Environment Variables
```bash
AZURE_OPENAI_ENDPOINT=https://dkora-mc9jz7vq-eastus2.cognitiveservices.azure.com
AZURE_OPENAI_WHISPER_ENDPOINT=https://dkora-mc9jz7vq-eastus2.cognitiveservices.azure.com
AZURE_OPENAI_WHISPER_DEPLOYMENT=gpt-4o-transcribe
AZURE_OPENAI_API_VERSION=2025-03-01-preview
AZURE_OPENAI_API_KEY=<your-api-key>
AZURE_OPENAI_WHISPER_API_KEY=<your-api-key>
```

### Deployment Scripts

#### `deploy-comprehensive-fix.ps1`
- Sets Azure App Service startup command
- Installs dependencies
- Deploys video-enabled backend
- Verifies deployment

## 📊 Performance Improvements

### File Size Handling
- **Before:** Limited to 25MB files
- **After:** Handles 71.9MB+ files with chunking

### Processing Speed
- **Compression:** 0.5x file size reduction
- **Chunking:** Parallel processing of audio segments
- **Duration:** Persistent tracking across processing

### Error Recovery
- **Graceful degradation** when FFmpeg fails
- **Retry mechanisms** for API calls
- **Fallback processing** for failed operations
- **Automatic retry** for "corrupted or unsupported" errors
- **MP3 conversion fallback** for problematic audio formats

## 🔍 Testing Results

### Large File Processing
- ✅ **71.9MB WAV file** successfully processed
- ✅ **Audio compression** from 71.9MB → 36MB
- ✅ **Chunking** and multi-segment transcription
- ✅ **Duration persistence** after processing

### Video Processing
- ✅ **MP4 video** with audio extraction
- ✅ **Video-to-audio conversion** using FFmpeg
- ✅ **Transcription** of extracted audio

### Error Handling
- ✅ **FFprobe path issues** resolved
- ✅ **Graceful fallbacks** implemented
- ✅ **Enhanced logging** for debugging
- ✅ **Automatic retry mechanism** working for both initial and chunked processing
- ✅ **MP3 conversion fallback** successfully handles problematic audio formats

## 🛠️ Troubleshooting

### Common Issues

#### FFprobe Path Errors
```bash
❌ FFprobe error: spawn [object Object] ENOENT
```
**Solution:** Fixed path extraction from ffprobe-static object

#### Large File Errors
```bash
❌ Audio chunk too large: 37713068 bytes (max 25MB for Whisper)
```
**Solution:** Implemented chunking and compression

#### Duration Disappearing
```bash
⚠️ Duration disappears after processing
```
**Solution:** Added persistent duration tracking with multiple fallbacks

#### "Corrupted or Unsupported" Audio Errors
```bash
❌ Audio file might be corrupted or unsupported
```
**Solution:** Implemented automatic retry mechanism with MP3 conversion fallback
- **Initial processing:** Automatically retries with original buffer, then MP3 conversion
- **Chunked processing:** Each chunk gets automatic retry with original buffer, then MP3 conversion
- **No manual intervention required:** System handles retries seamlessly

#### Frontend Showing "Error" Status for Non-Existent Recordings
```bash
⚠️ Recent Calls panel shows recordings with "Error" status but database is empty
```
**Solution:** Added cache invalidation and better error handling
- **Cache detection:** Frontend detects when cached data shows error status
- **Clear cache button:** Users can clear browser cache to resolve stale data
- **Empty state handling:** Proper display when no recordings exist
- **Console warnings:** Debug information to help identify cache issues
- **LiveDuration error handling:** Enhanced error handling in duration components
- **Status-based display:** Different display logic for recordings with error status
- **Robust hook error handling:** Better error handling in useRealtimeDuration hook

#### LiveDuration Component Enhancements
```javascript
// Enhanced error handling in LiveDuration components
export function HybridDuration({ recordingId, fallbackDuration, className, showIcon = true }) {
  try {
    // Early return for invalid recordingId
    if (!recordingId) {
      console.log('⚠️ HybridDuration: Invalid recordingId provided');
      return <span className="text-xs text-gray-500">—</span>;
    }

    const { duration, isCalculating, error } = useRealtimeDuration(recordingId);

    // If real-time has an error, use static display
    if (error) {
      return <StaticDuration seconds={fallbackDuration} className={className} showIcon={showIcon} />;
    }

    return <LiveDuration recordingId={recordingId} fallbackDuration={fallbackDuration} />;
  } catch (err) {
    console.error(`💥 HybridDuration error for ${recordingId?.slice(0, 8) || 'unknown'}...:`, err);
    return <StaticDuration seconds={fallbackDuration} className={className} showIcon={showIcon} />;
  }
}
```

**Key Improvements:**
- **Early validation:** Check for valid recordingId before making database calls
- **Error boundaries:** Try-catch blocks in real-time update handlers and component rendering
- **Graceful degradation:** Fallback to static display when real-time fails
- **Status-aware display:** Different UI for recordings with error status
- **Network resilience:** Handle missing recordings and network errors gracefully
- **Comprehensive logging:** Detailed debug logging for troubleshooting duration issues
- **Error isolation:** Each component handles its own errors without affecting others

#### Real-time Subscription Fixes
```javascript
// Fixed Supabase client configuration
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'soundscribe-web',
    },
  },
});
```

**Real-time Improvements:**
- **Proper configuration:** Added realtime configuration to Supabase client
- **Connection tracking:** Monitor real-time connection status (SUBSCRIBED, CHANNEL_ERROR, CLOSED, TIMED_OUT)
- **Enhanced error handling:** Better error handling for subscription setup and cleanup
- **Graceful fallback:** Components gracefully fall back to static display when real-time fails
- **Connection state management:** Track real-time connection state to provide appropriate UI feedback
- **Robust cleanup:** Proper channel cleanup with error handling

### Debug Commands

#### Check FFmpeg Installation
```bash
curl -s https://soundscribe-backend.azurewebsites.net/
```

#### Monitor Processing Logs
```bash
# Check Azure App Service logs
az webapp log tail --name soundscribe-backend --resource-group soundscribe-rg
```

## 📈 Future Enhancements

### Planned Improvements
1. **Advanced video processing** (multiple formats)
2. **Real-time progress updates** via WebSocket
3. **Batch processing** for multiple files
4. **Advanced audio analysis** (speaker detection, sentiment)
5. **Caching layer** for processed results
6. **Enhanced retry strategies** with exponential backoff
7. **Audio format detection** and pre-processing optimization

### Performance Optimizations
1. **Streaming processing** for very large files
2. **Distributed processing** across multiple workers
3. **CDN integration** for faster file delivery
4. **Database optimization** for large datasets

## 📝 Migration Notes

### From Previous Version
1. **Update startup command** to use `server-with-video-support.js`
2. **Install new dependencies** (FFmpeg packages)
3. **Update environment variables** for new endpoints
4. **Test with large files** to verify chunking

### Breaking Changes
- **Main entry point** changed from `server-simple.js`
- **New dependencies** required (fluent-ffmpeg, ffmpeg-static, ffprobe-static)
- **Environment variables** updated for gpt-4o-transcribe

## 🎯 Summary

The Azure backend has been completely overhauled to support:
- **Video file processing** with automatic audio extraction
- **Large file handling** through intelligent chunking
- **Professional audio processing** via FFmpeg integration
- **Robust error handling** with graceful fallbacks
- **Enhanced performance** and scalability

This transformation enables SoundScribe to process virtually any audio or video file size while maintaining high quality and reliability.

---

**Last Updated:** July 29, 2025  
**Version:** 2.0.0  
**Commit:** dbe6c77