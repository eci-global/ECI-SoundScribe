import { Transform, PassThrough } from 'stream';
import { EventEmitter } from 'events';

/**
 * Streaming processor for real-time audio processing
 * Enables progressive processing and immediate feedback
 */
export class StreamProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.chunkSize = options.chunkSize || 1024 * 1024; // 1MB chunks
    this.processingDelay = options.processingDelay || 100; // 100ms delay between chunks
    this.enableRealTimeUpdates = options.enableRealTimeUpdates !== false;
    this.totalSize = 0;
    this.processedSize = 0;
  }

  /**
   * Create a streaming transform for progressive file processing
   */
  createProgressiveTransform() {
    return new Transform({
      transform: (chunk, encoding, callback) => {
        this.processedSize += chunk.length;
        
        if (this.enableRealTimeUpdates) {
          const progress = this.totalSize > 0 ? 
            Math.round((this.processedSize / this.totalSize) * 100) : 0;
          
          this.emit('progress', {
            processedBytes: this.processedSize,
            totalBytes: this.totalSize,
            percentage: progress,
            chunk: chunk.length
          });
        }
        
        // Add small delay to prevent overwhelming the processor
        setTimeout(() => {
          callback(null, chunk);
        }, this.processingDelay);
      }
    });
  }

  /**
   * Process buffer in streaming chunks with real-time updates
   */
  async processBufferStreaming(buffer, processor, progressCallback) {
    this.totalSize = buffer.length;
    this.processedSize = 0;
    
    console.log(`🌊 Starting streaming processing of ${this.formatBytes(buffer.length)} buffer`);
    
    const chunks = this.splitBufferIntoChunks(buffer, this.chunkSize);
    const results = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkProgress = Math.round(((i + 1) / chunks.length) * 100);
      
      try {
        // Process chunk
        const chunkResult = await processor(chunk, i);
        results.push(chunkResult);
        
        // Update progress
        if (progressCallback) {
          progressCallback({
            stage: 'streaming',
            progress: chunkProgress,
            message: `Processing chunk ${i + 1}/${chunks.length}`,
            chunkIndex: i,
            chunkSize: chunk.length,
            totalChunks: chunks.length
          });
        }
        
        this.emit('chunkProcessed', {
          index: i,
          size: chunk.length,
          result: chunkResult,
          progress: chunkProgress
        });
        
        // Small delay to prevent overwhelming the system
        if (i < chunks.length - 1) {
          await this.delay(this.processingDelay);
        }
        
      } catch (error) {
        console.error(`❌ Chunk ${i} processing failed:`, error);
        this.emit('chunkError', {
          index: i,
          error: error.message,
          chunk: chunk.length
        });
        
        // Continue with other chunks
        results.push({ success: false, error: error.message, chunkIndex: i });
      }
    }
    
    console.log(`✅ Streaming processing complete: ${results.length} chunks processed`);
    
    return {
      success: true,
      chunks: results,
      totalChunks: chunks.length,
      successfulChunks: results.filter(r => r.success !== false).length,
      failedChunks: results.filter(r => r.success === false).length
    };
  }

  /**
   * Create a streaming pipeline for file processing
   */
  createStreamingPipeline(inputStream, processors = []) {
    let pipeline = inputStream;
    
    // Add progressive transform for monitoring
    const progressTransform = this.createProgressiveTransform();
    pipeline = pipeline.pipe(progressTransform);
    
    // Chain processors
    for (const processor of processors) {
      pipeline = pipeline.pipe(processor);
    }
    
    // Add final output stream
    const outputStream = new PassThrough();
    pipeline.pipe(outputStream);
    
    return {
      inputStream,
      outputStream,
      progressTransform,
      pipeline
    };
  }

  /**
   * Process audio stream with real-time transcription
   */
  async streamAudioTranscription(audioBuffer, transcriptionProcessor, options = {}) {
    const chunkDurationSeconds = options.chunkDurationSeconds || 30; // 30 second chunks
    const overlapSeconds = options.overlapSeconds || 5; // 5 second overlap
    const sampleRate = options.sampleRate || 16000;
    
    console.log(`🎤 Starting streaming transcription with ${chunkDurationSeconds}s chunks`);
    
    // Calculate chunk size in bytes (assuming 16-bit mono audio)
    const bytesPerSecond = sampleRate * 2; // 16-bit = 2 bytes per sample
    const chunkSizeBytes = chunkDurationSeconds * bytesPerSecond;
    const overlapBytes = overlapSeconds * bytesPerSecond;
    
    const transcriptions = [];
    const totalChunks = Math.ceil(audioBuffer.length / (chunkSizeBytes - overlapBytes));
    
    for (let i = 0; i < totalChunks; i++) {
      const startByte = i * (chunkSizeBytes - overlapBytes);
      const endByte = Math.min(startByte + chunkSizeBytes, audioBuffer.length);
      const chunk = audioBuffer.slice(startByte, endByte);
      
      if (chunk.length < bytesPerSecond) {
        // Skip chunks smaller than 1 second
        continue;
      }
      
      try {
        console.log(`🔄 Processing audio chunk ${i + 1}/${totalChunks} (${this.formatBytes(chunk.length)})`);
        
        const transcriptionResult = await transcriptionProcessor(chunk, {
          chunkIndex: i,
          startTimeSeconds: startByte / bytesPerSecond,
          durationSeconds: chunk.length / bytesPerSecond
        });
        
        if (transcriptionResult.success) {
          transcriptions.push({
            index: i,
            startTime: startByte / bytesPerSecond,
            duration: chunk.length / bytesPerSecond,
            text: transcriptionResult.text || transcriptionResult.data?.text || '',
            confidence: transcriptionResult.confidence || 1.0
          });
          
          // Emit real-time transcription event
          this.emit('transcriptionChunk', {
            index: i,
            text: transcriptionResult.text || transcriptionResult.data?.text || '',
            startTime: startByte / bytesPerSecond,
            isPartial: i < totalChunks - 1
          });
        }
        
        // Update progress
        this.emit('progress', {
          stage: 'transcription',
          progress: Math.round(((i + 1) / totalChunks) * 100),
          message: `Transcribed ${i + 1}/${totalChunks} chunks`
        });
        
      } catch (error) {
        console.error(`❌ Transcription chunk ${i} failed:`, error);
        this.emit('transcriptionError', {
          index: i,
          error: error.message,
          startTime: startByte / bytesPerSecond
        });
      }
    }
    
    // Combine transcriptions with overlap handling
    const combinedText = this.combineOverlappingTranscriptions(transcriptions, overlapSeconds);
    
    return {
      success: true,
      text: combinedText,
      chunks: transcriptions,
      totalChunks,
      processingMode: 'streaming'
    };
  }

  /**
   * Split buffer into chunks
   */
  splitBufferIntoChunks(buffer, chunkSize) {
    const chunks = [];
    for (let i = 0; i < buffer.length; i += chunkSize) {
      chunks.push(buffer.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Combine overlapping transcriptions, removing duplicate content
   */
  combineOverlappingTranscriptions(transcriptions, overlapSeconds) {
    if (transcriptions.length === 0) return '';
    if (transcriptions.length === 1) return transcriptions[0].text;
    
    let combinedText = transcriptions[0].text;
    
    for (let i = 1; i < transcriptions.length; i++) {
      const current = transcriptions[i];
      const previous = transcriptions[i - 1];
      
      // Simple overlap removal - remove first few words that might be duplicated
      const currentWords = current.text.split(' ');
      const previousWords = previous.text.split(' ');
      
      // Find overlap by comparing last words of previous with first words of current
      let overlapWordCount = 0;
      const maxOverlapWords = Math.floor(overlapSeconds * 2); // Rough estimate
      
      for (let j = 1; j <= Math.min(maxOverlapWords, currentWords.length, previousWords.length); j++) {
        const prevSuffix = previousWords.slice(-j).join(' ').toLowerCase();
        const currPrefix = currentWords.slice(0, j).join(' ').toLowerCase();
        
        if (prevSuffix === currPrefix) {
          overlapWordCount = j;
        }
      }
      
      // Add current text, skipping overlapped words
      const newWords = currentWords.slice(overlapWordCount);
      if (newWords.length > 0) {
        combinedText += ' ' + newWords.join(' ');
      }
    }
    
    return combinedText.trim();
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

  /**
   * Simple delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset processor state
   */
  reset() {
    this.totalSize = 0;
    this.processedSize = 0;
    this.removeAllListeners();
  }
}

export default StreamProcessor;