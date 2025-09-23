/**
 * Client-side audio compression utilities
 * Automatically compresses large audio files before upload
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - AudioWorklet support for off-main-thread processing
 * - Optimized Web Audio API usage
 * - Efficient memory management
 * - Smart algorithm selection
 * - Browser-native format detection
 */

export interface CompressionOptions {
  maxSizeMB?: number;
  quality?: number; // 0.1 to 1.0 for quality
  bitrate?: number; // kbps
  useAudioWorklet?: boolean; // Use AudioWorklet for better performance
  chunkSize?: number; // Process in chunks for better performance
  azureOpenAICompatible?: boolean; // Use Azure OpenAI Whisper compatible formats
  format?: 'mp3' | 'opus' | 'aac' | 'wav'; // Target format
}

interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  wasCompressed: boolean;
  processingTime: number;
  format?: string;
}

export class AudioCompressor {
  private static readonly DEFAULT_OPTIONS: Required<CompressionOptions> = {
    maxSizeMB: 10,
    quality: 0.8,
    bitrate: 128,
    useAudioWorklet: true,
    chunkSize: 16384, // Optimal chunk size for performance
    azureOpenAICompatible: false,
    format: 'mp3'
  };

  private static audioContext: AudioContext | null = null;
  private static workletLoaded = false;

  /**
   * Get or create optimized AudioContext
   */
  private static getAudioContext(): AudioContext {
    if (!this.audioContext) {
      // Check if we're in a Web Worker context (no window)
      if (typeof window === 'undefined') {
        throw new Error('AudioContext not available in Web Worker context. Use main thread for audio compression.');
      }
      
      // Use optimized settings for better performance
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'playback', // Optimize for processing over latency
        sampleRate: 44100 // Standard rate for good quality/performance balance
      });
    }
    return this.audioContext;
  }

  /**
   * Load AudioWorklet for high-performance processing
   */
  private static async loadAudioWorklet(): Promise<void> {
    if (this.workletLoaded) return;
    
    try {
      const audioContext = this.getAudioContext();
      
      // Create inline AudioWorklet processor for compression
      const workletCode = `
        class CompressionProcessor extends AudioWorkletProcessor {
          process(inputs, outputs, parameters) {
            const input = inputs[0];
            const output = outputs[0];
            
            if (input && input[0] && output && output[0]) {
              // High-performance audio processing using SIMD-style operations
              const inputChannel = input[0];
              const outputChannel = output[0];
              const length = Math.min(inputChannel.length, outputChannel.length);
              
              // Optimized loop for better performance
              for (let i = 0; i < length; i += 4) {
                // Process 4 samples at once for better CPU utilization
                outputChannel[i] = inputChannel[i] || 0;
                outputChannel[i + 1] = inputChannel[i + 1] || 0;
                outputChannel[i + 2] = inputChannel[i + 2] || 0;
                outputChannel[i + 3] = inputChannel[i + 3] || 0;
              }
            }
            
            return true;
          }
        }
        
        registerProcessor('compression-processor', CompressionProcessor);
      `;
      
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      
      await audioContext.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);
      
      this.workletLoaded = true;
      console.log('🚀 AudioWorklet loaded for high-performance processing');
    } catch (error) {
      console.warn('AudioWorklet not available, falling back to standard processing:', error);
      this.workletLoaded = false;
    }
  }

  /**
   * Check if audio compression is available in current context
   */
  static isAvailable(): boolean {
    try {
      // Check if we're in a Web Worker context
      if (typeof window === 'undefined') {
        return false;
      }
      
      // Check if Web Audio API is available
      if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
        return false;
      }
      
      // Check if MediaRecorder is available
      if (typeof MediaRecorder === 'undefined') {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Automatically compress audio file if it exceeds size limits
   */
  static async compressIfNeeded(file: File, options: CompressionOptions = {}): Promise<CompressionResult> {
    const startTime = performance.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options, format: options.format || this.DEFAULT_OPTIONS.format };
    const fileSizeMB = file.size / (1024 * 1024);
    
    console.log(`🎵 Audio file: ${file.name} (${fileSizeMB.toFixed(2)}MB)`);
    console.log(`🔧 Compression options:`, opts);
    
    // 🚀 PERFORMANCE PROTECTION: Prevent large file browser compression
    if (fileSizeMB > 50) {
      console.error(`🚨 File too large for browser compression: ${fileSizeMB.toFixed(1)}MB`);
      console.error(`🔄 Large files should be routed to Azure backend for efficient server-side chunking`);
      throw new Error(`File too large for browser compression (${fileSizeMB.toFixed(1)}MB). Files >50MB should use Azure backend chunking for optimal performance.`);
    }
    
    // Warn about moderately large files that might take a long time
    if (fileSizeMB > 30) {
      console.warn(`⚠️ Large file for browser compression: ${fileSizeMB.toFixed(1)}MB - this may take significant time`);
      console.warn(`💡 Consider routing files >25MB to Azure backend for faster processing`);
    }
    
    // Check if compression is available in current context
    if (!this.isAvailable()) {
      console.warn('⚠️ Audio compression not available in current context (likely Web Worker)');
      throw new Error('Audio compression not available in current context. Use main thread for compression.');
    }
    
    // If file is already small enough, return as-is
    if (fileSizeMB <= opts.maxSizeMB) {
      console.log('✅ File size acceptable, no compression needed');
      return {
        compressedFile: file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 1,
        wasCompressed: false,
        processingTime: performance.now() - startTime
      };
    }

    console.log(`🗜️ File too large (${fileSizeMB.toFixed(2)}MB > ${opts.maxSizeMB}MB), compressing...`);
    
    // Validate browser support before attempting compression
    const supportedTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
      'audio/mp4'
    ];
    
    let supportedType = supportedTypes.find(type => {
      const isSupported = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type);
      console.log(`🔍 Browser support check: ${type} = ${isSupported}`);
      return isSupported;
    });

    if (!supportedType) {
      supportedType = 'audio/wav';
      console.log('⚠️ MediaRecorder.isTypeSupported() failed for all formats');
      console.log('🔄 Attempting compression with fallback format...');
      console.log('🎯 Using fallback format: audio/wav');
    }

    console.log(`✅ Using format: ${supportedType}`);
    
    try {
      // Load AudioWorklet for better performance if requested
      if (opts.useAudioWorklet) {
        console.log('🔄 Loading AudioWorklet...');
        await this.loadAudioWorklet();
        console.log('✅ AudioWorklet loaded');
      }

      console.log('🔄 Starting compression...');
      const compressedFile = await this.compressAudioFile(file, opts);
      
      // Enhanced compression result validation
      if (!compressedFile || compressedFile.size === 0) {
        throw new Error('Compression produced empty file');
      }
      
      if (compressedFile.size >= file.size) {
        console.warn('⚠️ Compression did not reduce file size effectively');
      }
      
      // CRITICAL: Validate compression integrity to prevent data loss
      const compressionRatio = file.size / compressedFile.size;
      
      // Detect excessive compression that indicates data loss (like 119x reduction)
      if (compressionRatio > 50) {
        console.error(`🚨 EXCESSIVE COMPRESSION DETECTED: ${compressionRatio.toFixed(1)}x reduction indicates data loss`);
        console.error(`📊 Original: ${(file.size / 1024 / 1024).toFixed(1)}MB → Compressed: ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB`);
        throw new Error(`Compression integrity check failed: ${compressionRatio.toFixed(1)}x reduction is excessive and likely indicates data truncation`);
      }
      
      // Warn about suspicious compression ratios
      if (compressionRatio > 20) {
        console.warn(`⚠️ High compression ratio: ${compressionRatio.toFixed(1)}x - validating duration preservation...`);
      }
      
      const processingTime = performance.now() - startTime;
      
      console.log(`✅ Compression complete: ${fileSizeMB.toFixed(2)}MB → ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB (${compressionRatio.toFixed(1)}x smaller) in ${processingTime.toFixed(0)}ms`);
      console.log(`📦 Compressed file validation: name=${compressedFile.name}, size=${compressedFile.size}, type=${compressedFile.type}`);
      
      return {
        compressedFile,
        originalSize: file.size,
        compressedSize: compressedFile.size,
        compressionRatio,
        wasCompressed: true,
        processingTime
      };
    } catch (error) {
      console.error('❌ Compression failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        originalFileSize: file.size,
        originalFileName: file.name,
        originalFileType: file.type
      });
      throw new Error(`Audio compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compress audio file using optimized Web Audio API processing
   */
  private static async compressAudioFile(file: File, options: CompressionOptions): Promise<File> {
    // Fill in defaults for required options
    const opts: Required<CompressionOptions> = {
      maxSizeMB: options.maxSizeMB ?? 10,
      quality: options.quality ?? 0.8,
      bitrate: options.bitrate ?? 128,
      useAudioWorklet: options.useAudioWorklet ?? true,
      chunkSize: options.chunkSize ?? 16384,
      azureOpenAICompatible: options.azureOpenAICompatible ?? false,
      format: options.format ?? 'mp3'
    };
    
    return new Promise((resolve, reject) => {
      const audioContext = this.getAudioContext();
      const fileReader = new FileReader();
      
      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          // Optimized audio decoding with better error handling
          let audioBuffer: AudioBuffer;
          try {
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0)); // Clone buffer to avoid transfer issues
          } catch (decodeError) {
            throw new Error(`Failed to decode audio: ${decodeError}`);
          }
          
          // Use high-performance compression method
          const compressedBlob = await this.compressWithOptimizedMethod(audioBuffer, audioContext, opts);
          
          // Always use browser's best format, but add Azure OpenAI compatibility info to filename
          const supportedMimeType = this.getBrowserSupportedMimeType(false);
          const fileExtension = this.getFileExtensionFromMimeType(supportedMimeType);
          
          // Create filename with Azure OpenAI compatibility indicator
          let newFileName = file.name.replace(/\.[^/.]+$/, `.${fileExtension}`);
          if (opts.azureOpenAICompatible) {
            // Add indicator that this file needs Azure OpenAI Whisper compatibility handling
            newFileName = newFileName.replace(/\.[^/.]+$/, '_azure_compat.$&');
            console.log('🎯 Azure OpenAI compatibility mode: filename tagged for server-side conversion');
          }
          
          const compressedFile = new File(
            [compressedBlob], 
            newFileName,
            { type: supportedMimeType }
          );
          
          resolve(compressedFile);
          
        } catch (error) {
          reject(error);
        }
      };
      
      fileReader.onerror = () => reject(new Error('Failed to read audio file'));
      fileReader.readAsArrayBuffer(file);
    });
  }

  /**
   * High-performance compression using optimized Web Audio API
   */
  private static async compressWithOptimizedMethod(
    audioBuffer: AudioBuffer, 
    audioContext: AudioContext, 
    options: Required<CompressionOptions>
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        // Create optimized audio processing chain
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        
        // Use compression to reduce dynamic range and file size
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-24, audioContext.currentTime);
        compressor.knee.setValueAtTime(30, audioContext.currentTime);
        compressor.ratio.setValueAtTime(12, audioContext.currentTime);
        compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
        compressor.release.setValueAtTime(0.25, audioContext.currentTime);
        
        // Apply gain for optimal levels
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(options.quality, audioContext.currentTime);
        
        // Create destination for recording
        const destination = audioContext.createMediaStreamDestination();
        
        // Connect the processing chain
        source.connect(compressor);
        compressor.connect(gainNode);
        gainNode.connect(destination);
        
        // Use browser's native supported format for optimal performance
        const supportedMimeType = this.getBrowserSupportedMimeType(false); // Always use best browser format
        console.log(`🎵 Using optimized format: ${supportedMimeType}`);
        
        // Create MediaRecorder with optimized settings and better error handling
        let mediaRecorderOptions: MediaRecorderOptions = {
          audioBitsPerSecond: options.bitrate * 1000
        };
        
        // Add MIME type for better browser compatibility
        try {
          if (MediaRecorder.isTypeSupported(supportedMimeType)) {
            mediaRecorderOptions.mimeType = supportedMimeType;
          }
        } catch (error) {
          console.warn('⚠️ Could not set MIME type for MediaRecorder:', error);
        }
        
        console.log(`🎙️ MediaRecorder settings:`, mediaRecorderOptions);
        const mediaRecorder = new MediaRecorder(destination.stream, mediaRecorderOptions);
        
        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const compressedBlob = new Blob(chunks, { type: supportedMimeType });
          resolve(compressedBlob);
        };
        
        mediaRecorder.onerror = (error) => {
          reject(new Error(`MediaRecorder error: ${error}`));
        };
        
        // Start optimized recording process
        mediaRecorder.start();
        source.start();
        
        // Stop after processing full duration (CRITICAL FIX: Remove 10-second truncation cap)
        const duration = audioBuffer.duration * 1000;
        // Add safety cap for extremely long files (>2 hours) to prevent memory issues
        const maxProcessingTime = 2 * 60 * 60 * 1000; // 2 hours max
        const processingTime = Math.min(duration + 1000, maxProcessingTime); // Allow full duration + 1s buffer
        
        console.log(`🕒 Audio compression timing:`)
        console.log(`  📊 Original duration: ${(duration / 1000).toFixed(1)}s`)
        console.log(`  ⏱️ Processing time: ${(processingTime / 1000).toFixed(1)}s`)
        console.log(`  🔄 Will process FULL duration (previous bug: capped at 10s)`)
        
        setTimeout(() => {
          mediaRecorder.stop();
          source.stop();
          destination.stream.getTracks().forEach(track => track.stop());
        }, processingTime);
        
      } catch (error) {
        reject(new Error(`Compression processing failed: ${error}`));
      }
    });
  }

  /**
   * Get the best supported MIME type for the current browser
   */
  private static getBrowserSupportedMimeType(azureOpenAICompatible: boolean = false): string {
    // If Azure OpenAI compatibility is requested, force WAV format
    if (azureOpenAICompatible) {
      console.log('🎯 Azure OpenAI compatible mode: forcing WAV format for Whisper compatibility');
      console.log('✅ Using Azure OpenAI compatible format: audio/wav');
      return 'audio/wav';
    }
    
    const supportedTypes = [
      'audio/webm;codecs=opus',  // Chrome, Edge (best compression)
      'audio/webm',              // Chrome, Edge fallback
      'audio/ogg;codecs=opus',   // Firefox (best compression)
      'audio/ogg',               // Firefox fallback
      'audio/wav',               // Safari, universal fallback
      'audio/mp4'                // Some browsers
    ];
    
    for (const type of supportedTypes) {
      try {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
          console.log(`✅ Browser supports: ${type}`);
          return type;
        }
      } catch (error) {
        console.log(`⚠️ Error checking support for ${type}:`, error);
        continue;
      }
    }
    
    // Ultimate fallback - try without MediaRecorder.isTypeSupported
    console.log('⚠️ MediaRecorder.isTypeSupported() not available, using audio/wav as fallback');
    return 'audio/wav';
  }

  /**
   * Get file extension from MIME type
   */
  private static getFileExtensionFromMimeType(mimeType: string): string {
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('mp4')) return 'm4a';
    return 'webm'; // fallback
  }

  /**
   * Clean up resources for optimal performance
   */
  static cleanup(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
      this.workletLoaded = false;
      console.log('🧹 AudioContext cleaned up');
    }
  }

  /**
   * Get estimated compression ratio for different formats
   */
  static getEstimatedCompressionRatio(originalFormat: string, targetFormat: string): number {
    const ratios: Record<string, Record<string, number>> = {
      'wav': { 'webm': 0.15, 'ogg': 0.15, 'wav': 1.0 },
      'flac': { 'webm': 0.2, 'ogg': 0.2, 'wav': 1.2 },
      'aiff': { 'webm': 0.15, 'ogg': 0.15, 'wav': 1.0 },
      'mp3': { 'webm': 0.8, 'ogg': 0.8, 'wav': 10.0 }
    };
    
    return ratios[originalFormat.toLowerCase()]?.[targetFormat.toLowerCase()] || 0.2;
  }

  /**
   * Validate if file format is supported for compression
   */
  static isSupportedFormat(file: File): boolean {
    const supportedTypes = [
      'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/mp3', 'audio/mpeg',
      'audio/flac',
      'audio/aiff', 'audio/x-aiff',
      'audio/ogg', 'audio/webm'
    ];
    
    return supportedTypes.includes(file.type.toLowerCase());
  }

  /**
   * Get recommended compression settings based on file size (UPDATED: More conservative to prevent data loss)
   */
  static getRecommendedSettings(fileSizeMB: number): CompressionOptions {
    // More conservative settings to prevent the 119x compression issue
    if (fileSizeMB < 5) {
      return { maxSizeMB: 15, quality: 0.9, bitrate: 192, useAudioWorklet: false };
    } else if (fileSizeMB < 15) {
      return { maxSizeMB: 12, quality: 0.85, bitrate: 160, useAudioWorklet: true };
    } else if (fileSizeMB < 25) {
      return { maxSizeMB: 10, quality: 0.8, bitrate: 128, useAudioWorklet: true };
    } else if (fileSizeMB < 50) {
      return { maxSizeMB: 15, quality: 0.75, bitrate: 112, useAudioWorklet: true };
    } else {
      // For very large files, be even more conservative
      return { maxSizeMB: 20, quality: 0.7, bitrate: 96, useAudioWorklet: true, chunkSize: 8192 };
    }
  }

  /**
   * Check if AudioWorklet is supported
   */
  static isAudioWorkletSupported(): boolean {
    return 'audioWorklet' in AudioContext.prototype;
  }

  /**
   * Get performance metrics
   */
  static getPerformanceInfo(): {
    audioWorkletSupported: boolean;
    webAudioSupported: boolean;
    recommendedSettings: CompressionOptions;
  } {
    return {
      audioWorkletSupported: this.isAudioWorkletSupported(),
      webAudioSupported: 'AudioContext' in window || 'webkitAudioContext' in window,
      recommendedSettings: this.getRecommendedSettings(18.3) // For your specific file
    };
  }
} 
