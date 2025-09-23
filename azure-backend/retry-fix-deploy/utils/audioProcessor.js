import { PassThrough } from 'stream';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';

// Ensure paths are strings and handle ffprobe-static object structure
const ffmpegBinaryPath = String(ffmpegPath);
let ffprobeBinaryPath;

// Handle ffprobe-static which might return an object with path property
if (typeof ffprobePath === 'string') {
  ffprobeBinaryPath = ffprobePath;
} else if (ffprobePath && typeof ffprobePath === 'object' && ffprobePath.path) {
  ffprobeBinaryPath = String(ffprobePath.path);
} else {
  // Fallback: try to derive ffprobe path from ffmpeg path
  ffprobeBinaryPath = ffmpegBinaryPath.replace('ffmpeg', 'ffprobe');
}

console.log(`🔧 FFmpeg path: ${ffmpegBinaryPath}`);
console.log(`🔧 FFprobe path: ${ffprobeBinaryPath}`);

ffmpeg.setFfmpegPath(ffmpegBinaryPath);
ffmpeg.setFfprobePath(ffprobeBinaryPath);

/**
 * Audio processing utilities for background worker
 * Handles audio compression, splitting, and information extraction
 */
export class AudioProcessor {
  constructor() {
    this.tempDir = os.tmpdir();
  }

  /**
   * Extract audio from video file
   */
  async extractAudioFromVideo(videoBuffer, filename) {
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🎬 Extracting audio from video: ${filename} (attempt ${attempt}/${maxRetries})`);
        
        const inputPath = path.join(this.tempDir, `video_input_${Date.now()}_${filename}`);
        const outputPath = path.join(this.tempDir, `audio_extracted_${Date.now()}_${filename.replace(/\.[^/.]+$/, '.wav')}`);
        
        // Write video buffer to temp file
        await fs.writeFile(inputPath, videoBuffer);
        console.log(`📝 Wrote video file: ${inputPath}`);
        
        // Extract audio using FFmpeg with enhanced error handling
        const result = await new Promise((resolve, reject) => {
          const ffmpegProcess = ffmpeg(inputPath)
            .audioCodec('pcm_s16le') // WAV format with 16-bit PCM
            .audioChannels(1) // Mono for better transcription
            .audioFrequency(16000) // 16kHz for optimal transcription
            .format('wav')
            .on('start', (commandLine) => {
              console.log(`🔧 FFmpeg command: ${commandLine}`);
            })
            .on('progress', (progress) => {
              console.log(`📊 Extraction progress: ${progress.percent}%`);
            })
            .on('end', () => {
              console.log(`✅ Audio extraction completed: ${outputPath}`);
              resolve(outputPath);
            })
            .on('error', (err) => {
              console.error(`❌ Audio extraction failed (attempt ${attempt}): ${err.message}`);
              reject(err);
            })
            .save(outputPath);
        });
        
        // Read extracted audio file
        const audioBuffer = await fs.readFile(result);
        
        // Cleanup temp files
        await this.cleanup([inputPath, result]);
        
        const extractionRatio = (audioBuffer.length / videoBuffer.length).toFixed(2);
        console.log(`📊 Audio extraction ratio: ${extractionRatio}x (${this.formatBytes(videoBuffer.length)} → ${this.formatBytes(audioBuffer.length)})`);
        
        if (attempt > 1) {
          console.log(`✅ Audio extraction succeeded on attempt ${attempt}`);
        }
        
        return {
          success: true,
          buffer: audioBuffer,
          originalSize: videoBuffer.length,
          extractedSize: audioBuffer.length,
          extractionRatio: parseFloat(extractionRatio),
          wasExtracted: true,
          attempts: attempt
        };
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Audio extraction attempt ${attempt} failed: ${error.message}`);
        
        // Clean up any temp files that might have been created
        try {
          const tempFiles = [
            path.join(this.tempDir, `video_input_${Date.now()}_${filename}`),
            path.join(this.tempDir, `audio_extracted_${Date.now()}_${filename.replace(/\.[^/.]+$/, '.wav')}`)
          ];
          await this.cleanup(tempFiles);
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup temp files:', cleanupError.message);
        }
        
        // If this is the last attempt, return failure
        if (attempt === maxRetries) {
          console.error(`🚨 Audio extraction failed after ${maxRetries} attempts`);
          return {
            success: false,
            error: error.message,
            buffer: videoBuffer,
            originalSize: videoBuffer.length,
            extractedSize: videoBuffer.length,
            extractionRatio: 1,
            wasExtracted: false,
            attempts: maxRetries
          };
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Compress audio file using FFmpeg
   */
  async compressAudio(inputBuffer, filename, options = {}) {
    try {
      console.log(`🎵 Starting audio compression for ${filename} (${this.formatBytes(inputBuffer.length)})`);
      
      // Check if this is a video file that needs audio extraction first
      const isVideoFile = /\.(mp4|mov|avi|mkv|webm|flv|wmv|m4v)$/i.test(filename);
      
      let audioBuffer = inputBuffer;
      let extractionStats = { wasExtracted: false };
      
      if (isVideoFile) {
        console.log(`🎬 Detected video file, extracting audio first...`);
        const extractionResult = await this.extractAudioFromVideo(inputBuffer, filename);
        
        if (extractionResult.success) {
          audioBuffer = extractionResult.buffer;
          extractionStats = extractionResult;
          console.log(`✅ Audio extracted from video successfully`);
        } else {
          console.warn(`⚠️ Audio extraction failed, attempting direct compression: ${extractionResult.error}`);
        }
      }
      
      // Check if the file is already in a good format (MP3 with reasonable bitrate)
      const isMp3File = /\.mp3$/i.test(filename);
      if (isMp3File && audioBuffer.length < 25 * 1024 * 1024) { // Less than 25MB
        console.log(`✅ File is already MP3 format and under size limit, skipping compression`);
        return {
          success: true,
          buffer: audioBuffer,
          originalSize: audioBuffer.length,
          compressedSize: audioBuffer.length,
          compressionRatio: 1,
          wasCompressed: false,
          wasExtracted: extractionStats.wasExtracted,
          extractionStats: extractionStats
        };
      }
      
      const inputPath = path.join(this.tempDir, `input_${Date.now()}_${filename}`);
      const outputPath = path.join(this.tempDir, `compressed_${Date.now()}_${filename.replace(/\.[^/.]+$/, '.wav')}`);
      
      // Write audio buffer to temp file
      await fs.writeFile(inputPath, audioBuffer);
      console.log(`📝 Wrote input file: ${inputPath}`);
      
      // Compress using FFmpeg with Azure OpenAI compatible settings
      const result = await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .audioCodec('pcm_s16le') // WAV format with 16-bit PCM
          .audioChannels(1) // Mono for better transcription
          .audioFrequency(16000) // 16kHz for optimal transcription
          .format('wav')
          .outputOptions([
            '-acodec pcm_s16le', // Explicitly set audio codec
            '-ar 16000', // Sample rate
            '-ac 1', // Mono channel
            '-f wav' // Force WAV format
          ])
          .on('start', (commandLine) => {
            console.log(`🔧 FFmpeg compression command: ${commandLine}`);
          })
          .on('progress', (progress) => {
            console.log(`📊 Compression progress: ${progress.percent}%`);
          })
          .on('end', () => {
            console.log(`✅ Audio compression completed: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            console.error(`❌ Audio compression failed: ${err.message}`);
            reject(err);
          })
          .save(outputPath);
      });
      
      // Read compressed file
      const compressedBuffer = await fs.readFile(result);
      
      // Cleanup temp files
      await this.cleanup([inputPath, result]);
      
      const compressionRatio = (compressedBuffer.length / inputBuffer.length).toFixed(2);
      console.log(`📊 Compression ratio: ${compressionRatio}x (${this.formatBytes(inputBuffer.length)} → ${this.formatBytes(compressedBuffer.length)})`);
      
      return {
        success: true,
        buffer: compressedBuffer,
        originalSize: inputBuffer.length,
        compressedSize: compressedBuffer.length,
        compressionRatio: parseFloat(compressionRatio),
        wasCompressed: true,
        wasExtracted: extractionStats.wasExtracted,
        extractionStats: extractionStats
      };
      
    } catch (error) {
      console.error(`❌ Audio compression failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        buffer: inputBuffer,
        originalSize: inputBuffer.length,
        compressedSize: inputBuffer.length,
        compressionRatio: 1,
        wasCompressed: false
      };
    }
  }

  /**
   * Get audio info using FFprobe
   */
  async getAudioInfo(filePath) {
    try {
      console.log(`🔍 Getting audio info for: ${filePath}`);
      
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            console.error(`❌ FFprobe error: ${err.message}`);
            console.error(`❌ FFprobe path: ${ffprobeBinaryPath}`);
            console.error(`❌ File path: ${filePath}`);
            
            // Return a fallback object instead of rejecting
            resolve({
              format: {
                duration: null,
                bit_rate: null,
                format_name: 'unknown'
              },
              streams: [{
                sample_rate: null
              }]
            });
            return;
          }
          
          console.log(`✅ Audio info extracted:`, {
            duration: metadata.format?.duration,
            bitrate: metadata.format?.bit_rate,
            sampleRate: metadata.streams?.[0]?.sample_rate,
            format: metadata.format?.format_name
          });
          
          resolve(metadata);
        });
      });
    } catch (error) {
      console.error(`❌ Failed to get audio info: ${error.message}`);
      return {
        format: {
          duration: null,
          bit_rate: null,
          format_name: 'unknown'
        },
        streams: [{
          sample_rate: null
        }]
      };
    }
  }

  /**
   * Split audio file into chunks
   */
  async splitAudioFile(audioBuffer, filename, chunkMinutes = 5) {
    try {
      console.log(`✂️ Starting audio splitting for ${filename} (${this.formatBytes(audioBuffer.length)})`);
      
      const inputPath = path.join(this.tempDir, `split_input_${Date.now()}_${filename}`);
      await fs.writeFile(inputPath, audioBuffer);
      
      // Get audio duration first
      const audioInfo = await this.getAudioInfo(inputPath);
      const totalDuration = audioInfo.format?.duration || 0;
      
      if (!totalDuration) {
        console.warn(`⚠️ Could not determine audio duration, using single chunk`);
        await this.cleanup([inputPath]);
        return {
          success: true,
          chunks: [{
            index: 0,
            buffer: audioBuffer,
            filename: filename,
            startTime: 0,
            duration: null
          }],
          totalDuration: null
        };
      }
      
      const chunkDuration = chunkMinutes * 60; // Convert to seconds
      const numChunks = Math.ceil(totalDuration / chunkDuration);
      
      console.log(`📊 Splitting into ${numChunks} chunks of ${chunkMinutes} minutes each`);
      
      const chunks = [];
      
      for (let i = 0; i < numChunks; i++) {
        const startTime = i * chunkDuration;
        const endTime = Math.min((i + 1) * chunkDuration, totalDuration);
        const chunkFilename = `${filename.replace(/\.[^/.]+$/, '')}_chunk_${i + 1}.wav`;
        const outputPath = path.join(this.tempDir, `chunk_${Date.now()}_${i}_${chunkFilename}`);
        
        console.log(`🎵 Creating chunk ${i + 1}/${numChunks}: ${startTime}s - ${endTime}s`);
        
        const chunkBuffer = await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .setStartTime(startTime)
            .setDuration(endTime - startTime)
            .audioCodec('pcm_s16le') // WAV format with 16-bit PCM
            .audioChannels(1) // Mono for better transcription
            .audioFrequency(16000) // 16kHz for optimal transcription
            .format('wav')
            .on('end', () => {
              fs.readFile(outputPath)
                .then(resolve)
                .catch(reject);
            })
            .on('error', reject)
            .save(outputPath);
        });
        
        chunks.push({
          index: i,
          buffer: chunkBuffer,
          filename: chunkFilename,
          startTime: startTime,
          duration: endTime - startTime
        });
        
        // Cleanup chunk temp file
        await this.cleanup([outputPath]);
      }
      
      // Cleanup input temp file
      await this.cleanup([inputPath]);
      
      console.log(`✅ Audio splitting completed: ${chunks.length} chunks created`);
      
      return {
        success: true,
        chunks: chunks,
        totalDuration: totalDuration
      };
      
    } catch (error) {
      console.error(`❌ Audio splitting failed: ${error.message}`);
      console.error(`❌ FFmpeg path: ${ffmpegBinaryPath}`);
      console.error(`❌ FFprobe path: ${ffprobeBinaryPath}`);
      
      // Cleanup any temp files that might exist
      try {
        const inputPath = path.join(this.tempDir, `split_input_${Date.now()}_${filename}`);
        await this.cleanup([inputPath]);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup temp files: ${cleanupError.message}`);
      }
      
      // Return single chunk as fallback
      return {
        success: false,
        error: error.message,
        chunks: [{
          index: 0,
          buffer: audioBuffer,
          filename: filename,
          startTime: 0,
          duration: null
        }],
        totalDuration: null
      };
    }
  }

  /**
   * Check if audio is already optimized
   */
  isAlreadyOptimized(audioInfo, fileSize) {
    // Consider optimized if:
    // - File size is under 25MB
    // - Audio format is WAV with 16kHz mono
    // - Or MP3 with reasonable bitrate
    const maxSize = 25 * 1024 * 1024; // 25MB
    const maxBitrate = 192000; // 192kbps
    
    const isWavOptimized = fileSize < maxSize && 
                          audioInfo.format?.format_name?.includes('wav') &&
                          audioInfo.streams?.[0]?.sample_rate === 16000 &&
                          audioInfo.streams?.[0]?.channels === 1;
    
    const isMp3Optimized = fileSize < maxSize && 
                          audioInfo.format?.format_name?.includes('mp3') &&
                          (!audioInfo.format?.bit_rate || parseInt(audioInfo.format.bit_rate) <= maxBitrate);
    
    return isWavOptimized || isMp3Optimized;
  }

  /**
   * Format bytes utility
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Cleanup temp files
   */
  async compressToMp3(inputBuffer, filename) {
    try {
      console.log(`🎵 Converting to MP3 format: ${filename}`);
      
      const inputPath = path.join(this.tempDir, `mp3_input_${Date.now()}_${filename}`);
      const outputPath = path.join(this.tempDir, `mp3_output_${Date.now()}_${filename.replace(/\.[^/.]+$/, '.mp3')}`);
      
      // Write input buffer to temp file
      await fs.writeFile(inputPath, inputBuffer);
      console.log(`📝 Wrote input file for MP3 conversion: ${inputPath}`);
      
      // Convert to MP3 using FFmpeg
      const result = await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            '-acodec mp3', // MP3 codec
            '-ar 16000', // 16kHz sample rate
            '-ac 1', // Mono channel
            '-b:a 128k', // 128kbps bitrate
            '-f mp3' // Force MP3 format
          ])
          .on('start', (commandLine) => {
            console.log(`🔧 FFmpeg MP3 conversion command: ${commandLine}`);
          })
          .on('progress', (progress) => {
            console.log(`📊 MP3 conversion progress: ${progress.percent}%`);
          })
          .on('end', () => {
            console.log(`✅ MP3 conversion completed: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            console.error(`❌ MP3 conversion failed: ${err.message}`);
            reject(err);
          })
          .save(outputPath);
      });
      
      // Read converted MP3 file
      const mp3Buffer = await fs.readFile(result);
      
      // Cleanup temp files
      await this.cleanup([inputPath, result]);
      
      console.log(`📊 MP3 conversion: ${this.formatBytes(inputBuffer.length)} → ${this.formatBytes(mp3Buffer.length)}`);
      
      return mp3Buffer;
      
    } catch (error) {
      console.error(`❌ MP3 conversion failed: ${error.message}`);
      throw error;
    }
  }

  async cleanup(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        console.log(`🧹 Cleaned up temp file: ${filePath}`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn(`⚠️ Failed to cleanup ${filePath}: ${error.message}`);
        }
      }
    }
  }
}
