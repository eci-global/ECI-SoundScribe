/**
 * Video-to-Audio Extraction Utility
 * 
 * Extracts audio from video files using Web Audio API and MediaRecorder
 * Optimized for large video files (2GB+) to create small audio files for transcription
 */

import { AudioCompressor } from './audioCompression';

export interface AudioExtractionOptions {
  quality?: number; // 0.1-1.0, lower = smaller file
  bitrate?: number; // Target bitrate in kbps
  format?: 'mp3' | 'opus' | 'webm' | 'auto';
  targetSizeMB?: number; // Target output file size
  sampleRate?: number; // Sample rate (8000, 16000, 22050, 44100)
  channels?: number; // 1 for mono, 2 for stereo
}

export interface ExtractionResult {
  audioFile: File;
  originalVideoSize: number;
  extractedAudioSize: number;
  compressionRatio: number;
  duration: number | null;
  format: string;
  processingTime: number;
  sampleRate: number;
  channels: number;
}

export interface ExtractionProgress {
  stage: 'loading' | 'extracting' | 'compressing' | 'complete';
  progress: number; // 0-100
  message: string;
  timeRemaining?: number; // seconds
}

export interface AudioValidationResult {
  isValid: boolean;
  duration?: number;
  hasContent?: boolean;
  fileSize: number;
  issue?: string;
}

export class VideoToAudioExtractor {
  private static readonly DEFAULT_OPTIONS: Required<AudioExtractionOptions> = {
    quality: 0.6, // Good balance for speech
    bitrate: 32, // Very low for speech-only files
    format: 'auto',
    targetSizeMB: 10, // Target 10MB for extracted audio
    sampleRate: 16000, // Optimal for speech recognition
    channels: 1 // Mono for speech
  };

  /**
   * Check if video-to-audio extraction is supported
   */
  static isSupported(): boolean {
    try {
      // Check for required APIs
      if (typeof MediaRecorder === 'undefined') return false;
      if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') return false;
      if (typeof HTMLVideoElement === 'undefined') return false;
      
      // Check MediaRecorder support for audio formats
      const supportedFormats = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg'
      ];
      
      const hasSupport = supportedFormats.some(format => 
        MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(format)
      );
      
      return hasSupport;
    } catch (error) {
      console.warn('Video-to-audio extraction support check failed:', error);
      return false;
    }
  }

  /**
   * Extract audio from video file with progress tracking
   */
  static async extractAudioFromVideo(
    videoFile: File,
    options: AudioExtractionOptions = {},
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractionResult> {
    const startTime = performance.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    console.log(`🎬→🎵 Extracting audio from video: ${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(1)}MB)`);
    console.log(`🔧 Extraction options:`, opts);
    
    if (!this.isSupported()) {
      throw new Error('Video-to-audio extraction not supported in this browser');
    }

    onProgress?.({
      stage: 'loading',
      progress: 0,
      message: 'Loading video file...'
    });

    // Step 1: Load video file
    const video = document.createElement('video');
    video.muted = true;
    video.crossOrigin = 'anonymous';
    
    const videoUrl = URL.createObjectURL(videoFile);
    
    try {
      // Load video metadata
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video'));
        video.src = videoUrl;
      });

      onProgress?.({
        stage: 'extracting',
        progress: 20,
        message: 'Setting up audio extraction...'
      });

      // Step 2: Set up audio context and extraction
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: opts.sampleRate
      });

      const audioExtraction = await this.performAudioExtraction(
        video,
        audioContext,
        opts,
        onProgress
      );

      onProgress?.({
        stage: 'compressing',
        progress: 80,
        message: 'Optimizing audio for transcription...'
      });

      // Step 3: Optimize the extracted audio
      const optimizedAudio = await this.optimizeForTranscription(
        audioExtraction.audioFile,
        opts
      );

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Audio extraction complete!'
      });

      const processingTime = performance.now() - startTime;
      const compressionRatio = videoFile.size / optimizedAudio.size;

      console.log(`✅ Audio extraction complete: ${(videoFile.size / 1024 / 1024).toFixed(1)}MB → ${(optimizedAudio.size / 1024 / 1024).toFixed(1)}MB (${compressionRatio.toFixed(0)}x smaller)`);

      return {
        audioFile: optimizedAudio,
        originalVideoSize: videoFile.size,
        extractedAudioSize: optimizedAudio.size,
        compressionRatio,
        duration: audioExtraction.duration,
        format: optimizedAudio.type,
        processingTime,
        sampleRate: opts.sampleRate,
        channels: opts.channels
      };

    } finally {
      URL.revokeObjectURL(videoUrl);
      video.remove();
    }
  }

  /**
   * Perform the actual audio extraction from video
   */
  private static async performAudioExtraction(
    video: HTMLVideoElement,
    audioContext: AudioContext,
    options: Required<AudioExtractionOptions>,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<{ audioFile: File; duration: number | null }> {
    
    return new Promise((resolve, reject) => {
      try {
        // Create media source from video element
        const mediaSource = audioContext.createMediaElementSource(video);
        
        // Create destination for recording
        const destination = audioContext.createMediaStreamDestination();
        
        // Create audio analyzer for level monitoring
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        analyzer.smoothingTimeConstant = 0.8;
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        
        // Apply audio processing for speech optimization
        const gainNode = audioContext.createGain();
        // Start with moderate gain, will adjust based on levels
        gainNode.gain.setValueAtTime(options.quality * 1.2, audioContext.currentTime);
        
        // Enhanced dynamics compressor optimized for speech
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-20, audioContext.currentTime); // Higher threshold for better speech
        compressor.knee.setValueAtTime(15, audioContext.currentTime); // Softer knee
        compressor.ratio.setValueAtTime(8, audioContext.currentTime); // Less aggressive ratio
        compressor.attack.setValueAtTime(0.001, audioContext.currentTime); // Faster attack
        compressor.release.setValueAtTime(0.1, audioContext.currentTime); // Faster release
        
        // High-pass filter to remove low-frequency noise
        const highpassFilter = audioContext.createBiquadFilter();
        highpassFilter.type = 'highpass';
        highpassFilter.frequency.setValueAtTime(80, audioContext.currentTime); // Remove frequencies below 80Hz
        highpassFilter.Q.setValueAtTime(0.7, audioContext.currentTime);
        
        // Connect enhanced audio processing chain
        mediaSource.connect(highpassFilter);
        highpassFilter.connect(compressor);
        compressor.connect(gainNode);
        gainNode.connect(analyzer);
        analyzer.connect(destination);
        
        // Audio level monitoring for automatic gain adjustment
        let levelCheckCount = 0;
        let lowLevelWarnings = 0;
        const levelMonitor = setInterval(() => {
          analyzer.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          
          levelCheckCount++;
          console.log(`🔊 Audio level check ${levelCheckCount}: ${average.toFixed(1)}/255`);
          
          // If levels are consistently low, increase gain
          if (average < 30 && levelCheckCount > 3) {
            lowLevelWarnings++;
            if (lowLevelWarnings > 2) {
              const newGain = Math.min(gainNode.gain.value * 1.5, 3.0); // Cap at 3x gain
              gainNode.gain.setValueAtTime(newGain, audioContext.currentTime);
              console.log(`📈 Auto-adjusting gain to ${newGain.toFixed(2)} due to low audio levels`);
              lowLevelWarnings = 0; // Reset to avoid over-amplification
            }
          }
        }, 2000); // Check every 2 seconds
        
        // Determine best supported audio format
        const supportedFormat = this.getBestSupportedFormat(options.format);
        
        console.log(`🎵 Recording audio in format: ${supportedFormat}`);
        
        // Create MediaRecorder with optimized settings
        const mediaRecorder = new MediaRecorder(destination.stream, {
          mimeType: supportedFormat,
          audioBitsPerSecond: options.bitrate * 1000
        });
        
        const audioChunks: Blob[] = [];
        let recordingStartTime: number;
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
            
            // Update progress based on video playback
            if (video.duration && video.currentTime) {
              const progress = Math.min(90, 20 + (video.currentTime / video.duration) * 60);
              onProgress?.({
                stage: 'extracting',
                progress,
                message: `Extracting audio... ${Math.round(progress)}%`,
                timeRemaining: video.duration - video.currentTime
              });
            }
          }
        };
        
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: supportedFormat });
          const audioFile = new File([audioBlob], 
            `${video.src.split('/').pop()?.replace(/\.[^/.]+$/, '')}_audio.${this.getExtensionFromMimeType(supportedFormat)}`,
            { type: supportedFormat }
          );
          
          // Enhanced debug logging for audio properties
          const fileSizeMB = audioFile.size / (1024 * 1024);
          const duration = video.duration || null;
          const finalGain = gainNode.gain.value;
          
          console.log('🎵 Audio Extraction Complete - Debug Properties:');
          console.log(`📁 File: ${audioFile.name}`);
          console.log(`📏 Size: ${fileSizeMB.toFixed(2)}MB`);
          console.log(`⏱️ Duration: ${duration?.toFixed(1)}s`);
          console.log(`🔊 Final Gain: ${finalGain.toFixed(2)}x`);
          console.log(`🎛️ Format: ${supportedFormat}`);
          console.log(`🎚️ Processing: highpass(80Hz) → compressor → gain → analyzer`);
          console.log(`📊 Compression Settings: threshold(-20dB), ratio(8:1), attack(1ms), release(100ms)`);
          
          if (fileSizeMB < 0.1) {
            console.warn(`⚠️ Extracted audio is very small (${fileSizeMB.toFixed(3)}MB) - may indicate poor quality or silent content`);
          }
          
          if (duration && fileSizeMB > 0) {
            const bitsPerSecond = (audioFile.size * 8) / duration;
            const kbps = bitsPerSecond / 1000;
            console.log(`🎵 Effective bitrate: ${kbps.toFixed(1)} kbps`);
            
            if (kbps < 16) {
              console.warn(`⚠️ Very low effective bitrate (${kbps.toFixed(1)} kbps) - audio quality may be poor`);
            }
          }
          
          resolve({
            audioFile,
            duration: video.duration || null
          });
        };
        
        mediaRecorder.onerror = (error) => {
          reject(new Error(`Audio recording failed: ${error}`));
        };
        
        // Progress monitoring variables
        let lastProgressTime = performance.now();
        let lastVideoCurrentTime = 0;
        let progressStuckCount = 0;
        
        // Start recording and play video
        mediaRecorder.start(1000); // Collect data every second
        recordingStartTime = performance.now();
        
        // Progress monitoring interval to detect stuck extraction
        const progressMonitor = setInterval(() => {
          const currentTime = performance.now();
          const timeSinceLastProgress = currentTime - lastProgressTime;
          
          // Check if video progress has stalled
          if (video.currentTime === lastVideoCurrentTime && timeSinceLastProgress > 30000) {
            progressStuckCount++;
            console.warn(`⚠️ Audio extraction progress stalled for ${timeSinceLastProgress/1000}s (stuck count: ${progressStuckCount})`);
            
            // If stuck for more than 60 seconds (2 intervals), abort
            if (progressStuckCount >= 2) {
              clearInterval(progressMonitor);
              clearInterval(levelMonitor);
              mediaRecorder.stop();
              destination.stream.getTracks().forEach(track => track.stop());
              reject(new Error('Audio extraction stuck - no progress for 60 seconds. Try uploading the video directly.'));
              return;
            }
          } else if (video.currentTime !== lastVideoCurrentTime) {
            // Progress detected, reset counters
            lastProgressTime = currentTime;
            lastVideoCurrentTime = video.currentTime;
            progressStuckCount = 0;
          }
        }, 30000); // Check every 30 seconds
        
        video.onended = () => {
          clearInterval(progressMonitor);
          clearInterval(levelMonitor);
          mediaRecorder.stop();
          destination.stream.getTracks().forEach(track => track.stop());
        };
        
        video.onerror = () => {
          clearInterval(progressMonitor);
          clearInterval(levelMonitor);
          mediaRecorder.stop();
          reject(new Error('Video playback failed during audio extraction'));
        };
        
        // Start video playback for audio extraction
        video.play().catch(error => {
          clearInterval(progressMonitor);
          clearInterval(levelMonitor);
          reject(new Error(`Failed to play video: ${error}`));
        });
        
        // Set timeout for very long videos (reduced from 2 hours to 1 hour)
        const maxTimeout = setTimeout(() => {
          clearInterval(progressMonitor);
          clearInterval(levelMonitor);
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            reject(new Error('Audio extraction timeout (max 1 hour). Try uploading shorter videos or upload directly.'));
          }
        }, 60 * 60 * 1000); // 1 hour max
        
        // Clean up timeout on completion
        mediaRecorder.onstop = () => {
          clearTimeout(maxTimeout);
          clearInterval(progressMonitor);
          clearInterval(levelMonitor);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Optimize extracted audio for transcription
   */
  private static async optimizeForTranscription(
    audioFile: File,
    options: Required<AudioExtractionOptions>
  ): Promise<File> {
    try {
      // If file is already small enough, return as-is
      if (audioFile.size <= options.targetSizeMB * 1024 * 1024) {
        console.log(`✅ Audio file already optimized (${(audioFile.size / 1024 / 1024).toFixed(1)}MB)`);
        return audioFile;
      }

      // Use AudioCompressor for further optimization
      const compressionResult = await AudioCompressor.compressIfNeeded(audioFile, {
        maxSizeMB: options.targetSizeMB,
        quality: options.quality * 0.8, // Slightly lower quality for final optimization
        bitrate: options.bitrate,
        azureOpenAICompatible: true
      });

      if (compressionResult.wasCompressed) {
        console.log(`🗜️ Audio further optimized: ${(audioFile.size / 1024 / 1024).toFixed(1)}MB → ${(compressionResult.compressedFile.size / 1024 / 1024).toFixed(1)}MB`);
        return compressionResult.compressedFile;
      }

      return audioFile;
    } catch (error) {
      console.warn('Audio optimization failed, using original extracted audio:', error);
      return audioFile;
    }
  }

  /**
   * Get the best supported audio format for recording
   */
  private static getBestSupportedFormat(preferredFormat: string): string {
    const formats = [
      'audio/webm;codecs=opus',  // Best compression for speech
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];

    // If specific format requested, try it first
    if (preferredFormat !== 'auto') {
      const specificFormat = `audio/${preferredFormat}`;
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(specificFormat)) {
        return specificFormat;
      }
    }

    // Find best supported format
    for (const format of formats) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(format)) {
        return format;
      }
    }

    // Fallback
    return 'audio/wav';
  }

  /**
   * Get file extension from MIME type
   */
  private static getExtensionFromMimeType(mimeType: string): string {
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mp4')) return 'm4a';
    if (mimeType.includes('wav')) return 'wav';
    return 'webm';
  }

  /**
   * Get estimated extraction time based on video duration and size
   */
  static getEstimatedExtractionTime(videoFile: File, videoDuration?: number): number {
    const fileSizeMB = videoFile.size / (1024 * 1024);
    
    // Base processing time: ~1 second per minute of video
    const baseTime = (videoDuration || 600) / 60; // Default to 10 minutes if unknown
    
    // Add overhead for large files
    const sizeOverhead = Math.max(0, (fileSizeMB - 100) / 100); // 1 second per 100MB over 100MB
    
    return Math.max(5, baseTime + sizeOverhead); // Minimum 5 seconds
  }

  /**
   * Get recommended settings for different video sizes
   */
  static getRecommendedSettings(videoSizeMB: number): AudioExtractionOptions {
    if (videoSizeMB < 25) {
      // Small files - can afford higher quality
      return {
        quality: 0.8,
        bitrate: 64,
        targetSizeMB: 12,
        sampleRate: 22050,
        channels: 1
      };
    } else if (videoSizeMB < 100) {
      // Medium files - balanced approach to prevent browser hanging
      return {
        quality: 0.7,
        bitrate: 56,
        targetSizeMB: 15,
        sampleRate: 22050,
        channels: 1
      };
    } else if (videoSizeMB < 500) {
      // Large files - more aggressive compression
      return {
        quality: 0.6,
        bitrate: 48,
        targetSizeMB: 10,
        sampleRate: 16000,
        channels: 1
      };
    } else {
      // Very large files (500MB+) - most aggressive
      return {
        quality: 0.4,
        bitrate: 32,
        targetSizeMB: 6,
        sampleRate: 16000,
        channels: 1
      };
    }
  }

  /**
   * Validate extracted audio to ensure it contains actual content
   */
  static async validateExtractedAudio(audioFile: File, originalDuration?: number): Promise<AudioValidationResult> {
    const fileSizeMB = audioFile.size / (1024 * 1024);
    
    console.log(`🔍 Validating extracted audio: ${audioFile.name} (${fileSizeMB.toFixed(2)}MB)`);
    
    // Basic file size checks
    if (audioFile.size < 1000) { // Less than 1KB
      return {
        isValid: false,
        fileSize: audioFile.size,
        hasContent: false,
        issue: 'Audio file too small (less than 1KB) - likely empty or corrupted'
      };
    }

    if (fileSizeMB < 0.01) { // Less than 10KB
      return {
        isValid: false,
        fileSize: audioFile.size,
        hasContent: false,
        issue: 'Audio file too small (less than 10KB) - likely contains no speech content'
      };
    }

    try {
      // Create audio element for duration check
      const audioUrl = URL.createObjectURL(audioFile);
      const audio = document.createElement('audio');
      
      const duration = await new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Audio duration check timeout'));
        }, 5000);
        
        audio.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve(audio.duration);
        };
        
        audio.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Audio file corrupted or invalid format'));
        };
        
        audio.src = audioUrl;
      });

      URL.revokeObjectURL(audioUrl);

      console.log(`📊 Audio validation - Duration: ${duration}s, Size: ${fileSizeMB.toFixed(2)}MB`);

      // Duration checks
      if (!duration || duration < 0.5) {
        return {
          isValid: false,
          fileSize: audioFile.size,
          duration,
          hasContent: false,
          issue: 'Audio duration too short (less than 0.5 seconds) - likely no speech content'
        };
      }

      // Check if duration seems reasonable compared to file size
      // Very rough heuristic: expect at least 1KB per second of audio
      const expectedMinSize = duration * 500; // 500 bytes per second minimum
      if (audioFile.size < expectedMinSize) {
        return {
          isValid: false,
          fileSize: audioFile.size,
          duration,
          hasContent: false,
          issue: `Audio file too small for duration (${duration}s) - likely silent or very low quality`
        };
      }

      // If we have original duration, check if extraction lost too much
      if (originalDuration && duration < originalDuration * 0.8) {
        console.warn(`⚠️ Audio extraction may have lost content: ${duration}s extracted vs ${originalDuration}s original`);
      }

      console.log('✅ Audio validation passed');
      return {
        isValid: true,
        fileSize: audioFile.size,
        duration,
        hasContent: true
      };

    } catch (error) {
      console.error('❌ Audio validation failed:', error);
      return {
        isValid: false,
        fileSize: audioFile.size,
        hasContent: false,
        issue: `Audio validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}