import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { PassThrough } from 'stream';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Configure ffmpeg to use static binary
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Audio processing utilities for background worker
 * Optimizes audio files for faster Azure OpenAI processing
 */
export class AudioProcessor {
  constructor() {
    this.tempDir = os.tmpdir();
  }

  /**
   * Compress audio file for optimal Whisper processing
   * Based on research: 128kbps bitrate, 16kHz sample rate optimal for Whisper
   */
  async compressAudio(inputBuffer, filename, options = {}) {
    const startTime = Date.now();
    const tempInputPath = path.join(this.tempDir, `input_${Date.now()}_${filename}`);
    const tempOutputPath = path.join(this.tempDir, `compressed_${Date.now()}.mp3`);

    try {
      console.log(`🎵 Starting audio compression for ${filename} (${inputBuffer.length} bytes)`);

      // Write input buffer to temporary file
      await fs.writeFile(tempInputPath, inputBuffer);

      // Get audio info first
      const audioInfo = await this.getAudioInfo(tempInputPath);
      console.log(`📊 Original audio: ${audioInfo.duration}s, ${audioInfo.bitrate}kbps, ${audioInfo.sampleRate}Hz`);

      // Skip compression if file is already optimized
      if (this.isAlreadyOptimized(audioInfo, inputBuffer.length)) {
        console.log('✅ Audio already optimized, skipping compression');
        await this.cleanup([tempInputPath]);
        return {
          success: true,
          buffer: inputBuffer,
          wasCompressed: false,
          originalSize: inputBuffer.length,
          compressedSize: inputBuffer.length,
          processingTime: Date.now() - startTime
        };
      }

      // Perform compression
      await this.performCompression(tempInputPath, tempOutputPath, options);

      // Read compressed file
      const compressedBuffer = await fs.readFile(tempOutputPath);
      const compressionRatio = inputBuffer.length / compressedBuffer.length;

      const duration = Date.now() - startTime;
      console.log(`✅ Audio compression complete in ${duration}ms`);
      console.log(`📉 Size: ${this.formatBytes(inputBuffer.length)} → ${this.formatBytes(compressedBuffer.length)} (${compressionRatio.toFixed(1)}x smaller)`);

      // Cleanup temp files
      await this.cleanup([tempInputPath, tempOutputPath]);

      return {
        success: true,
        buffer: compressedBuffer,
        wasCompressed: true,
        originalSize: inputBuffer.length,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        processingTime: duration
      };

    } catch (error) {
      console.error('❌ Audio compression failed:', error);
      
      // Cleanup on error
      await this.cleanup([tempInputPath, tempOutputPath]);
      
      return {
        success: false,
        error: error.message,
        buffer: inputBuffer, // Return original on failure
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Perform the actual compression using ffmpeg
   */
  performCompression(inputPath, outputPath, options = {}) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        // Optimize for Whisper: 128kbps bitrate, 16kHz sample rate, mono
        .audioBitrate(options.bitrate || '128k')
        .audioFrequency(options.sampleRate || 16000)
        .audioChannels(options.channels || 1) // Mono for faster processing
        .audioCodec('libmp3lame')
        .format('mp3')
        // Additional optimizations
        .audioFilters([
          'highpass=f=80', // Remove low-frequency noise
          'lowpass=f=8000', // Remove high-frequency noise (nyquist for 16kHz)
          'volume=1.5' // Slight volume boost for better recognition
        ])
        .output(outputPath)
        .on('start', (command) => {
          console.log('🔧 FFmpeg command:', command);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`⏳ Compression progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log('✅ FFmpeg compression completed');
          resolve();
        })
        .on('error', (error) => {
          console.error('❌ FFmpeg error:', error);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Get audio file information
   */
  getAudioInfo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (error, metadata) => {
        if (error) {
          reject(error);
          return;
        }

        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        if (!audioStream) {
          reject(new Error('No audio stream found'));
          return;
        }

        resolve({
          duration: parseFloat(metadata.format.duration) || 0,
          bitrate: parseInt(audioStream.bit_rate) / 1000 || 0, // Convert to kbps
          sampleRate: parseInt(audioStream.sample_rate) || 0,
          channels: parseInt(audioStream.channels) || 0,
          codec: audioStream.codec_name,
          format: metadata.format.format_name
        });
      });
    });
  }

  /**
   * Check if audio is already optimized for Whisper
   */
  isAlreadyOptimized(audioInfo, fileSize) {
    const fileSizeMB = fileSize / (1024 * 1024);
    
    // Consider optimized if:
    // - Already MP3 with reasonable bitrate (64-192 kbps)
    // - Sample rate is 16kHz or less
    // - File size is reasonable for duration
    const isOptimalBitrate = audioInfo.bitrate >= 64 && audioInfo.bitrate <= 192;
    const isOptimalSampleRate = audioInfo.sampleRate <= 16000;
    const isReasonableSize = fileSizeMB < 10; // Under 10MB is reasonable
    const isMP3 = audioInfo.codec === 'mp3';

    return isMP3 && isOptimalBitrate && isOptimalSampleRate && isReasonableSize;
  }

  /**
   * Split large audio file into chunks for parallel processing
   */
  async splitAudioFile(inputBuffer, filename, chunkDurationMinutes = 5) {
    const startTime = Date.now();
    const tempInputPath = path.join(this.tempDir, `split_input_${Date.now()}_${filename}`);
    
    try {
      console.log(`✂️ Splitting audio into ${chunkDurationMinutes}-minute chunks`);
      
      // Write input to temp file
      await fs.writeFile(tempInputPath, inputBuffer);
      
      // Get audio duration
      const audioInfo = await this.getAudioInfo(tempInputPath);
      const totalChunks = Math.ceil(audioInfo.duration / (chunkDurationMinutes * 60));
      
      console.log(`📊 Audio duration: ${audioInfo.duration}s, creating ${totalChunks} chunks`);
      
      const chunks = [];
      const chunkDuration = chunkDurationMinutes * 60; // Convert to seconds
      
      for (let i = 0; i < totalChunks; i++) {
        const startTime = i * chunkDuration;
        const chunkPath = path.join(this.tempDir, `chunk_${i}_${Date.now()}.mp3`);
        
        await this.extractChunk(tempInputPath, chunkPath, startTime, chunkDuration);
        const chunkBuffer = await fs.readFile(chunkPath);
        
        chunks.push({
          index: i,
          buffer: chunkBuffer,
          startTime: startTime,
          duration: Math.min(chunkDuration, audioInfo.duration - startTime)
        });
        
        // Cleanup chunk file
        await fs.unlink(chunkPath);
      }
      
      // Cleanup input file
      await fs.unlink(tempInputPath);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Audio splitting complete in ${duration}ms, created ${chunks.length} chunks`);
      
      return {
        success: true,
        chunks,
        totalDuration: audioInfo.duration,
        processingTime: duration
      };
      
    } catch (error) {
      console.error('❌ Audio splitting failed:', error);
      await this.cleanup([tempInputPath]);
      
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Extract a specific chunk from audio file
   */
  extractChunk(inputPath, outputPath, startTime, duration) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration)
        .audioBitrate('128k')
        .audioFrequency(16000)
        .audioChannels(1)
        .audioCodec('libmp3lame')
        .format('mp3')
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }

  /**
   * Cleanup temporary files
   */
  async cleanup(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore cleanup errors
        console.warn(`⚠️ Failed to cleanup ${filePath}:`, error.message);
      }
    }
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

export default AudioProcessor;