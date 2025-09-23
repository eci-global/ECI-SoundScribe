import { AzureOpenAIClient } from './utils/azureOpenAI.js';
import { FileHandler } from './utils/fileHandler.js';
import { ProgressTracker } from './utils/progressTracker.js';
import { AudioProcessor } from './utils/audioProcessor.js';
import { StreamProcessor } from './utils/streamProcessor.js';
import { WorkerPool } from './utils/workerPool.js';
import { getRecording, updateRecordingWithAI, logProcessingActivity } from './supabase.js';
import path from 'path';

/**
 * Main processor for large file AI analysis
 */
export class FileProcessor {
  constructor() {
    this.azureClient = new AzureOpenAIClient();
    this.fileHandler = new FileHandler();
    this.audioProcessor = new AudioProcessor();
    this.streamProcessor = new StreamProcessor({
      enableRealTimeUpdates: true,
      processingDelay: 50 // 50ms delay for better responsiveness
    });
    
    // Initialize worker pool for parallel processing (with error handling)
    try {
      this.workerPool = new WorkerPool({
        maxWorkers: parseInt(process.env.WORKER_POOL_SIZE) || 4,
        taskTimeout: 300000 // 5 minutes
      });
      
      // Setup worker pool event handlers
      this.setupWorkerPoolEvents();
      console.log('✅ Worker pool initialized successfully');
    } catch (error) {
      console.warn('⚠️ Worker pool initialization failed:', error.message);
      console.log('🔄 Continuing without worker pool - parallel processing disabled');
      this.workerPool = null;
    }
  }

  /**
   * Setup worker pool event handlers for monitoring
   */
  setupWorkerPoolEvents() {
    this.workerPool.on('taskStarted', (info) => {
      console.log(`🔄 Worker task started: ${info.type} on worker ${info.workerId}`);
    });

    this.workerPool.on('taskCompleted', (info) => {
      console.log(`✅ Worker task completed: ${info.type} in ${info.duration}ms`);
    });

    this.workerPool.on('taskFailed', (info) => {
      console.error(`❌ Worker task failed: ${info.type} - ${info.error}`);
    });

    this.workerPool.on('taskTimeout', (info) => {
      console.error(`⏰ Worker task timeout: ${info.type} on worker ${info.workerId}`);
    });
  }

  /**
   * Process a recording with full AI analysis pipeline
   */
  async processRecording(recordingId, processingOptions = {}) {
    const progress = new ProgressTracker(recordingId);
    let tempFiles = [];

    try {
      console.log(`🚀 Starting ${processingOptions.processingStrategy || 'standard'} processing for recording: ${recordingId}`);
      
      // Stage 1: Initialize and validate
      await progress.updateProgress('initializing', 0, 'Validating recording...');
      
      const recordingResult = await getRecording(recordingId);
      if (!recordingResult.success) {
        throw new Error(`Failed to fetch recording: ${recordingResult.error}`);
      }
      
      const recording = recordingResult.data;
      if (!recording.file_url) {
        throw new Error('Recording has no file URL');
      }

      await progress.updateProgress('initializing', 50, 'Recording validated');

      // Stage 2: Download file
      await progress.updateProgress('downloading', 0, 'Downloading file from storage...');
      
      const filePath = this.fileHandler.extractFilePathFromUrl(recording.file_url);
      const downloadResult = await this.fileHandler.downloadFile('recordings', filePath, recordingId);
      
      if (!downloadResult.success) {
        throw new Error(`File download failed: ${downloadResult.error}`);
      }
      
      tempFiles.push(downloadResult.tempFilePath);
      await progress.updateProgress('downloading', 100, `File downloaded (${(downloadResult.fileSize / (1024 * 1024)).toFixed(1)}MB)`);

      // Stage 3: Validate and preprocess
      await progress.updateProgress('preprocessing', 0, 'Validating file format...');
      
      const filename = path.basename(filePath);
      const validation = this.fileHandler.validateFile(downloadResult.buffer, filename);
      
      if (!validation.valid) {
        throw new Error(`File validation failed: ${validation.error}`);
      }

      await progress.updateProgress('preprocessing', 50, 'Optimizing audio for AI processing...');

      // Stage 3.5: Smart audio optimization based on processing strategy
      let optimizedBuffer = downloadResult.buffer;
      let processingStats = { wasCompressed: false };

      const fileSizeMB = downloadResult.buffer.length / (1024 * 1024);
      const shouldCompress = this.shouldCompressAudio(fileSizeMB, filename, processingOptions);
      
      if (shouldCompress) {
        console.log(`🎵 Optimizing ${fileSizeMB.toFixed(1)}MB audio file for ${processingOptions.processingStrategy || 'standard'} processing`);
        
        const compressionSettings = this.getOptimalCompressionSettings(processingOptions);
        const compressionResult = await this.audioProcessor.compressAudio(
          downloadResult.buffer,
          filename,
          compressionSettings
        );

        if (compressionResult.success) {
          optimizedBuffer = compressionResult.buffer;
          processingStats = compressionResult;
          
          const newSizeMB = optimizedBuffer.length / (1024 * 1024);
          await progress.updateProgress('preprocessing', 75, 
            `Audio optimized: ${fileSizeMB.toFixed(1)}MB → ${newSizeMB.toFixed(1)}MB (${compressionResult.compressionRatio.toFixed(1)}x)`);
        } else {
          console.warn('⚠️ Audio optimization failed, using original file:', compressionResult.error);
          await progress.updateProgress('preprocessing', 75, 'Using original audio file');
        }
      } else {
        await progress.updateProgress('preprocessing', 75, `Audio optimization skipped (${processingOptions.processingStrategy || 'standard'} strategy)`);
      }

      await progress.updateProgress('preprocessing', 100, 'File preprocessing complete');

      // Stage 4: Smart transcription based on processing strategy
      await progress.updateProgress('transcribing', 0, 'Starting AI transcription...');
      
      const transcriptionOptions = {
        response_format: 'verbose_json',
        language: 'en', // Default to English, can be made configurable
        temperature: 0.1 // Lower temperature for more consistent transcription
      };

      let transcriptionResult;
      const optimizedSizeMB = optimizedBuffer.length / (1024 * 1024);

      // Smart transcription routing based on strategy and file size
      transcriptionResult = await this.performSmartTranscription(
        optimizedBuffer,
        filename,
        transcriptionOptions,
        processingOptions,
        progress
      );

      if (!transcriptionResult.success) {
        throw new Error(`Transcription failed: ${transcriptionResult.error}`);
      }

      const transcript = transcriptionResult.data.text;
      if (!transcript || transcript.trim().length < 10) {
        throw new Error('Transcription produced no usable text');
      }

      await progress.updateProgress('transcribing', 100, `Transcription complete (${transcript.length} characters)`);

      // Stage 5: AI Analysis
      await progress.updateProgress('analyzing', 0, 'Generating AI insights...');

      // Generate summary
      await progress.updateProgress('analyzing', 25, 'Generating summary...');
      const summaryResult = await this.azureClient.generateSummary(transcript);
      
      let summary = 'Summary generation failed';
      if (summaryResult.success) {
        summary = summaryResult.data.choices[0]?.message?.content || summary;
      }

      // Generate coaching evaluation if enabled
      let coachingEvaluation = null;
      if (recording.enable_coaching) {
        await progress.updateProgress('analyzing', 75, 'Generating coaching insights...');
        const coachingResult = await this.azureClient.generateCoachingEvaluation(transcript);
        
        if (coachingResult.success) {
          try {
            const coachingText = coachingResult.data.choices[0]?.message?.content;
            coachingEvaluation = JSON.parse(coachingText);
          } catch (parseError) {
            console.warn('Failed to parse coaching evaluation JSON:', parseError);
          }
        }
      }

      await progress.updateProgress('analyzing', 100, 'AI analysis complete');

      // Stage 6: Finalize and save results
      await progress.updateProgress('finalizing', 0, 'Saving results...');

      const aiResults = {
        transcript,
        summary,
        duration: transcriptionResult.data.duration || null,
        ai_insights: transcriptionResult.data,
        ai_generated_at: new Date().toISOString()
      };

      if (coachingEvaluation) {
        aiResults.coaching_evaluation = coachingEvaluation;
      }

      const updateResult = await updateRecordingWithAI(recordingId, aiResults);
      if (!updateResult.success) {
        throw new Error(`Failed to save results: ${updateResult.error}`);
      }

      await progress.updateProgress('finalizing', 100, 'Results saved');
      await progress.complete(aiResults);

      // Cleanup temp files
      await this.fileHandler.cleanup(tempFiles);

      console.log(`✅ Processing completed successfully for recording: ${recordingId}`);
      
      return {
        success: true,
        results: aiResults
      };

    } catch (error) {
      console.error(`❌ Processing failed for recording ${recordingId}:`, error);
      
      // Cleanup temp files on error
      await this.fileHandler.cleanup(tempFiles);
      
      // Update progress as failed
      await progress.fail(error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process multiple recordings in batch
   */
  async batchProcessRecordings(recordingIds, concurrency = 3) {
    console.log(`🔄 Starting batch processing of ${recordingIds.length} recordings with concurrency ${concurrency}`);
    
    const results = [];
    const inProgress = new Set();
    let completed = 0;

    for (let i = 0; i < recordingIds.length; i += concurrency) {
      const batch = recordingIds.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (recordingId) => {
        inProgress.add(recordingId);
        try {
          const result = await this.processRecording(recordingId);
          completed++;
          console.log(`📊 Batch progress: ${completed}/${recordingIds.length} recordings completed`);
          return { recordingId, ...result };
        } catch (error) {
          console.error(`Batch processing error for ${recordingId}:`, error);
          return { recordingId, success: false, error: error.message };
        } finally {
          inProgress.delete(recordingId);
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    console.log(`✅ Batch processing complete: ${successful} successful, ${failed} failed`);
    
    return {
      success: true,
      totalProcessed: results.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Get processing status for a recording
   */
  async getProcessingStatus(recordingId) {
    try {
      const result = await getRecording(recordingId);
      if (!result.success) {
        return { success: false, error: result.error };
      }

      const recording = result.data;
      return {
        success: true,
        status: {
          id: recording.id,
          status: recording.status,
          progress: recording.processing_progress || 0,
          hasTranscript: !!recording.transcript,
          hasSummary: !!recording.summary,
          hasCoaching: !!recording.coaching_evaluation,
          updatedAt: recording.updated_at,
          errorMessage: recording.error_message
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Determine if audio should be compressed based on processing strategy
   */
  shouldCompressAudio(fileSizeMB, filename, processingOptions = {}) {
    const strategy = processingOptions.processingStrategy || 'standard';
    const enableCompression = processingOptions.enableCompression;
    
    // Override: if explicitly enabled/disabled
    if (enableCompression !== undefined) {
      return enableCompression;
    }
    
    // Strategy-based logic
    switch (strategy) {
      case 'fast':
        // Only compress if file is very large or not MP3
        return fileSizeMB > 15 || !filename.toLowerCase().endsWith('.mp3');
      
      case 'standard':
        // Compress if reasonably large or not optimized format
        return fileSizeMB > 8 || !filename.toLowerCase().endsWith('.mp3');
      
      case 'optimized':
      case 'chunked':
        // Always compress for optimized strategies
        return fileSizeMB > 5 || !filename.toLowerCase().endsWith('.mp3');
      
      default:
        return fileSizeMB > 10 || !filename.toLowerCase().endsWith('.mp3');
    }
  }

  /**
   * Get optimal compression settings based on processing strategy
   */
  getOptimalCompressionSettings(processingOptions = {}) {
    const strategy = processingOptions.processingStrategy || 'standard';
    
    switch (strategy) {
      case 'fast':
        return {
          bitrate: '128k',
          sampleRate: 16000,
          channels: 1
        };
      
      case 'standard':
        return {
          bitrate: '128k',
          sampleRate: 16000,
          channels: 1
        };
      
      case 'optimized':
        return {
          bitrate: '96k',   // More aggressive compression
          sampleRate: 16000,
          channels: 1
        };
      
      case 'chunked':
        return {
          bitrate: '96k',   // Aggressive compression for chunked files
          sampleRate: 16000,
          channels: 1
        };
      
      default:
        return {
          bitrate: '128k',
          sampleRate: 16000,
          channels: 1
        };
    }
  }

  /**
   * Smart transcription routing based on strategy and file characteristics
   */
  async performSmartTranscription(audioBuffer, filename, transcriptionOptions, processingOptions, progress) {
    const strategy = processingOptions.processingStrategy || 'standard';
    const fileSizeMB = audioBuffer.length / (1024 * 1024);
    const chunkSizeMinutes = processingOptions.chunkSizeMinutes || 5;
    const parallelChunks = processingOptions.parallelChunks || 3;
    
    console.log(`🎯 Using ${strategy} transcription strategy for ${fileSizeMB.toFixed(1)}MB file`);
    
    switch (strategy) {
      case 'fast':
        // Direct processing, no chunking
        console.log('⚡ Fast transcription: direct processing');
        return await this.azureClient.transcribeAudio(audioBuffer, filename, transcriptionOptions);
      
      case 'standard':
        // Use chunking only for very large files
        if (fileSizeMB > 25) {
          console.log('📚 Standard transcription: chunking large file');
          return await this.processLargeAudioWithChunking(
            audioBuffer, filename, transcriptionOptions, progress, 5, 2
          );
        } else {
          console.log('📄 Standard transcription: direct processing');
          return await this.azureClient.transcribeAudio(audioBuffer, filename, transcriptionOptions);
        }
      
      case 'optimized':
        // Use chunking for medium+ files with parallel processing
        if (fileSizeMB > 15) {
          console.log(`📊 Optimized transcription: chunking with ${parallelChunks} parallel threads`);
          return await this.processLargeAudioWithChunking(
            audioBuffer, filename, transcriptionOptions, progress, chunkSizeMinutes, parallelChunks
          );
        } else {
          console.log('📋 Optimized transcription: direct processing');
          return await this.azureClient.transcribeAudio(audioBuffer, filename, transcriptionOptions);
        }
      
      case 'chunked':
        // Always use chunking with maximum parallelization
        console.log(`🔀 Chunked transcription: aggressive chunking with ${parallelChunks} parallel threads`);
        return await this.processLargeAudioWithChunking(
          audioBuffer, filename, transcriptionOptions, progress, chunkSizeMinutes, parallelChunks
        );
      
      case 'streaming':
        // Use streaming transcription for real-time results
        console.log('🌊 Streaming transcription: real-time processing');
        return await this.processStreamingTranscription(
          audioBuffer, filename, transcriptionOptions, progress, processingOptions
        );
      
      case 'parallel':
        // Use worker pool for maximum parallel processing
        console.log(`🏭 Parallel transcription: worker pool with ${parallelChunks} workers`);
        return await this.processParallelTranscriptionWithWorkers(
          audioBuffer, filename, transcriptionOptions, progress, processingOptions
        );
      
      default:
        // Fallback to standard behavior
        if (fileSizeMB > 25) {
          return await this.processLargeAudioWithChunking(
            audioBuffer, filename, transcriptionOptions, progress
          );
        } else {
          return await this.azureClient.transcribeAudio(audioBuffer, filename, transcriptionOptions);
        }
    }
  }

  /**
   * Process audio with streaming transcription for real-time updates
   */
  async processStreamingTranscription(audioBuffer, filename, transcriptionOptions, progress, processingOptions = {}) {
    try {
      console.log(`🌊 Starting streaming transcription for ${filename}`);
      
      // Setup stream processor event handlers for real-time updates
      this.streamProcessor.on('transcriptionChunk', (chunk) => {
        // Emit partial transcription results immediately
        console.log(`📝 Partial transcription ${chunk.index}: "${chunk.text.substring(0, 50)}..."`);
        
        // Update progress with partial results
        if (progress) {
          progress.updateProgress('transcribing', 
            Math.round((chunk.index / (chunk.totalChunks || 1)) * 100),
            `Streaming transcription: ${chunk.text.substring(0, 30)}...`
          );
        }
      });

      this.streamProcessor.on('transcriptionError', (error) => {
        console.warn(`⚠️ Streaming transcription error: ${error.error}`);
      });

      // Create transcription processor function
      const transcriptionProcessor = async (audioChunk, chunkInfo) => {
        const chunkFilename = `${filename.split('.')[0]}_stream_${chunkInfo.chunkIndex}.mp3`;
        return await this.azureClient.transcribeAudio(audioChunk, chunkFilename, transcriptionOptions);
      };

      // Process audio stream with real-time transcription
      const result = await this.streamProcessor.streamAudioTranscription(
        audioBuffer,
        transcriptionProcessor,
        {
          chunkDurationSeconds: processingOptions.streamChunkSeconds || 20,
          overlapSeconds: processingOptions.streamOverlapSeconds || 3,
          sampleRate: 16000
        }
      );

      console.log(`✅ Streaming transcription complete: ${result.chunks.length} chunks processed`);
      
      // Reset stream processor for next use
      this.streamProcessor.reset();
      
      return {
        success: true,
        data: {
          text: result.text,
          duration: result.chunks.reduce((total, chunk) => total + chunk.duration, 0),
          processingMode: 'streaming',
          chunks: result.chunks.length,
          streamingEnabled: true
        }
      };

    } catch (error) {
      console.error('❌ Streaming transcription failed:', error);
      this.streamProcessor.reset();
      
      // Fallback to standard transcription
      console.log('🔄 Falling back to standard transcription');
      return await this.azureClient.transcribeAudio(audioBuffer, filename, transcriptionOptions);
    }
  }

  /**
   * Process audio using worker pool for maximum parallel transcription
   */
  async processParallelTranscriptionWithWorkers(audioBuffer, filename, transcriptionOptions, progress, processingOptions = {}) {
    try {
      // Check if worker pool is available
      if (!this.workerPool) {
        console.log('⚠️ Worker pool not available, falling back to chunked processing');
        return await this.processLargeAudioWithChunking(
          audioBuffer, filename, transcriptionOptions, progress, 
          processingOptions.chunkSizeMinutes || 5, 
          processingOptions.parallelChunks || 3
        );
      }

      console.log(`🏭 Starting worker pool transcription for ${filename}`);
      
      const chunkMinutes = processingOptions.chunkSizeMinutes || 5;
      const maxConcurrency = processingOptions.parallelChunks || 4;
      
      // Step 1: Split audio using worker pool
      await progress.updateProgress('transcribing', 10, 'Splitting audio for parallel processing...');
      
      const splitResult = await this.workerPool.executeTask('split_audio', {
        audioBuffer,
        filename,
        chunkDurationMinutes: chunkMinutes
      });
      
      if (!splitResult.success) {
        console.warn('⚠️ Worker pool audio splitting failed, falling back to single processing');
        return await this.azureClient.transcribeAudio(audioBuffer, filename, transcriptionOptions);
      }
      
      const chunks = splitResult.chunks;
      console.log(`🔀 Worker pool split audio into ${chunks.length} chunks`);
      
      await progress.updateProgress('transcribing', 20, `Processing ${chunks.length} chunks in parallel...`);
      
      // Step 2: Process chunks in parallel using worker pool
      const transcriptionTasks = chunks.map((chunk, index) => {
        return this.workerPool.executeTask('transcribe_chunk', {
          audioBuffer: chunk.buffer,
          filename: `${filename.split('.')[0]}_worker_chunk_${index}.mp3`,
          transcriptionOptions,
          chunkInfo: {
            index,
            startTime: chunk.startTime,
            duration: chunk.duration
          }
        });
      });
      
      // Execute all transcription tasks in parallel
      const transcriptionResults = await Promise.allSettled(transcriptionTasks);
      
      // Process results
      const successfulTranscriptions = [];
      const failedTranscriptions = [];
      
      transcriptionResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successfulTranscriptions.push({
            index,
            startTime: chunks[index].startTime,
            duration: chunks[index].duration,
            text: result.value.data.text,
            success: true
          });
        } else {
          const error = result.status === 'rejected' ? result.reason.message : result.value.error;
          failedTranscriptions.push({
            index,
            startTime: chunks[index].startTime,
            duration: chunks[index].duration,
            text: '',
            success: false,
            error
          });
          console.warn(`⚠️ Worker chunk ${index} transcription failed:`, error);
        }
        
        // Update progress
        const progressPercent = Math.round(((index + 1) / chunks.length) * 70) + 20; // 20-90%
        progress.updateProgress('transcribing', progressPercent, 
          `Processed ${index + 1}/${chunks.length} chunks`);
      });
      
      await progress.updateProgress('transcribing', 95, 'Combining transcription results...');
      
      // Sort by index and combine text
      const allTranscriptions = [...successfulTranscriptions, ...failedTranscriptions];
      allTranscriptions.sort((a, b) => a.index - b.index);
      
      const combinedText = successfulTranscriptions
        .sort((a, b) => a.index - b.index)
        .map(t => t.text)
        .join(' ');
      
      console.log(`✅ Worker pool transcription complete: ${successfulTranscriptions.length}/${chunks.length} chunks successful`);
      
      return {
        success: true,
        data: {
          text: combinedText,
          duration: splitResult.totalDuration,
          chunks: allTranscriptions.length,
          successfulChunks: successfulTranscriptions.length,
          failedChunks: failedTranscriptions.length,
          processingMode: 'parallel_workers'
        }
      };
      
    } catch (error) {
      console.error('❌ Worker pool transcription failed:', error);
      // Fallback to standard transcription
      console.log('🔄 Falling back to standard transcription');
      return await this.azureClient.transcribeAudio(audioBuffer, filename, transcriptionOptions);
    }
  }

  /**
   * Process large audio files using chunking for parallel transcription
   */
  async processLargeAudioWithChunking(audioBuffer, filename, transcriptionOptions, progress, chunkMinutes = 5, maxConcurrency = 3) {
    try {
      console.log(`📂 Processing large audio file with chunking strategy`);
      
      // Split audio into chunks for parallel processing
      const splittingResult = await this.audioProcessor.splitAudioFile(audioBuffer, filename, chunkMinutes);
      
      if (!splittingResult.success) {
        console.warn('⚠️ Audio splitting failed, falling back to single file processing');
        return await this.azureClient.transcribeAudio(audioBuffer, filename, transcriptionOptions);
      }

      const chunks = splittingResult.chunks;
      console.log(`🔀 Split audio into ${chunks.length} chunks for parallel processing`);

      // Process chunks in parallel with configurable concurrency
      const transcriptions = [];
      const concurrency = Math.min(maxConcurrency, chunks.length);
      
      for (let i = 0; i < chunks.length; i += concurrency) {
        const batch = chunks.slice(i, i + concurrency);
        const progressPercent = Math.round((i / chunks.length) * 100);
        
        await progress.updateProgress('transcribing', progressPercent, 
          `Processing chunks ${i + 1}-${i + batch.length} of ${chunks.length}...`);
        
        const batchPromises = batch.map(async (chunk) => {
          const chunkFilename = `${filename.split('.')[0]}_chunk_${chunk.index}.mp3`;
          const result = await this.azureClient.transcribeAudio(
            chunk.buffer, 
            chunkFilename, 
            transcriptionOptions
          );
          
          return {
            index: chunk.index,
            startTime: chunk.startTime,
            duration: chunk.duration,
            text: result.success ? result.data.text : '',
            success: result.success,
            error: result.error
          };
        });

        const batchResults = await Promise.all(batchPromises);
        transcriptions.push(...batchResults);
      }

      // Sort transcriptions by index and combine
      transcriptions.sort((a, b) => a.index - b.index);
      
      const failedChunks = transcriptions.filter(t => !t.success);
      if (failedChunks.length > 0) {
        console.warn(`⚠️ ${failedChunks.length} chunks failed transcription`);
      }

      const successfulTranscriptions = transcriptions.filter(t => t.success);
      const combinedText = successfulTranscriptions.map(t => t.text).join(' ');
      
      console.log(`✅ Chunked transcription complete: ${successfulTranscriptions.length}/${chunks.length} chunks successful`);

      return {
        success: true,
        data: {
          text: combinedText,
          duration: splittingResult.totalDuration,
          chunks: transcriptions.length,
          successfulChunks: successfulTranscriptions.length,
          failedChunks: failedChunks.length
        }
      };

    } catch (error) {
      console.error('❌ Chunked processing failed:', error);
      // Fall back to single file processing
      console.log('🔄 Falling back to single file processing');
      return await this.azureClient.transcribeAudio(audioBuffer, filename, transcriptionOptions);
    }
  }

  /**
   * Graceful shutdown of processor and worker pool
   */
  async shutdown() {
    console.log('🛑 Shutting down file processor...');
    
    try {
      // Shutdown worker pool
      if (this.workerPool) {
        await this.workerPool.shutdown();
      }
      
      // Reset stream processor
      if (this.streamProcessor) {
        this.streamProcessor.reset();
      }
      
      console.log('✅ File processor shutdown complete');
    } catch (error) {
      console.error('❌ Error during processor shutdown:', error);
    }
  }

  /**
   * Get processor statistics
   */
  getProcessorStats() {
    const workerStats = this.workerPool ? this.workerPool.getStats() : null;
    
    return {
      timestamp: new Date().toISOString(),
      workerPool: workerStats,
      streamProcessor: {
        available: !!this.streamProcessor
      },
      audioProcessor: {
        available: !!this.audioProcessor
      },
      azureClient: {
        available: !!this.azureClient
      }
    };
  }
}