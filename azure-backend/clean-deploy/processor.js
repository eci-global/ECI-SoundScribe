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
    const startTime = Date.now();
    console.log(`🚀 Starting processing for recording: ${recordingId}`);
    
    // 🔧 FFmpeg Warm-up Check (prevents cold start issues)
    try {
      console.log('🔧 Performing FFmpeg warm-up check...');
      const warmupResult = await this.audioProcessor.getAudioInfo(Buffer.from('dummy'), 'warmup.wav');
      console.log('✅ FFmpeg warm-up successful');
    } catch (warmupError) {
      console.warn('⚠️ FFmpeg warm-up failed, but continuing:', warmupError.message);
      // Don't fail the entire process for warm-up issues
    }
    
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

      // Stage 4: Extract audio duration BEFORE transcription (CRITICAL FOR WHISPER DURATION LIMITS)
      await progress.updateProgress('transcribing', 0, 'Analyzing audio duration...');
      
      let audioDuration = null;
      try {
        // Write buffer to temp file for duration analysis
        const tempAudioPath = await this.fileHandler.writeBufferToTempFile(optimizedBuffer, `duration_check_${filename}`);
        const audioInfo = await this.audioProcessor.getAudioInfo(tempAudioPath);
        
        // Extract duration with proper null checking
        if (audioInfo && audioInfo.format && audioInfo.format.duration) {
          audioDuration = parseFloat(audioInfo.format.duration);
          console.log(`📊 Audio duration detected: ${audioDuration.toFixed(1)}s (${(audioDuration / 60).toFixed(1)} minutes)`);
          
          // Check Whisper duration limit (10-15 minutes practical limit)
          if (audioDuration > 15 * 60) { // 15 minutes = 900 seconds
            console.log(`⚠️ Audio duration ${(audioDuration / 60).toFixed(1)} minutes exceeds Whisper limit (~15 min) - FORCING CHUNKING`);
          }
        } else {
          console.warn('⚠️ Could not extract audio duration from audioInfo:', {
            hasAudioInfo: !!audioInfo,
            hasFormat: !!(audioInfo && audioInfo.format),
            duration: audioInfo?.format?.duration
          });
          audioDuration = null;
        }
        
        // Clean up temp file
        await this.fileHandler.cleanup([tempAudioPath]);
        
      } catch (durationError) {
        console.warn('⚠️ Could not extract audio duration:', durationError.message);
        audioDuration = null;
      }
      
      await progress.updateProgress('transcribing', 10, 'Starting AI transcription...');
      
      const transcriptionOptions = {
        response_format: 'json',
        language: 'en', // Default to English, can be made configurable
        temperature: 0.1 // Lower temperature for more consistent transcription
      };

      let transcriptionResult;
      const optimizedSizeMB = optimizedBuffer.length / (1024 * 1024);

      // Enhanced processing options with duration information
      const enhancedProcessingOptions = {
        ...processingOptions,
        audioDurationSeconds: audioDuration,
        audioDurationMinutes: audioDuration ? audioDuration / 60 : null
      };

      // Smart transcription routing based on strategy, file size AND duration
      transcriptionResult = await this.performSmartTranscription(
        optimizedBuffer,
        filename,
        transcriptionOptions,
        enhancedProcessingOptions,
        progress
      );

      if (!transcriptionResult.success) {
        // Enhanced error logging for debugging retry issues
        console.error('🚨 Transcription failed with detailed error info:');
        console.error('   Error object:', transcriptionResult.error);
        console.error('   Error type:', typeof transcriptionResult.error);
        console.error('   Error keys:', transcriptionResult.error ? Object.keys(transcriptionResult.error) : 'N/A');
        console.error('   Error message:', transcriptionResult.error?.message || transcriptionResult.error?.toString() || 'Unknown error');
        console.error('   Error response:', transcriptionResult.error?.response?.data || 'No response data');
        console.error('   Error status:', transcriptionResult.error?.response?.status || 'No status');
        
        // Create a more informative error message
        let errorMessage = 'Transcription failed';
        if (transcriptionResult.error?.message) {
          errorMessage += `: ${transcriptionResult.error.message}`;
        } else if (transcriptionResult.error?.response?.data?.error?.message) {
          errorMessage += `: ${transcriptionResult.error.response.data.error.message}`;
        } else if (typeof transcriptionResult.error === 'string') {
          errorMessage += `: ${transcriptionResult.error}`;
        } else {
          errorMessage += ': Unknown error occurred';
        }
        
        // Check if this is a corrupted file error that needs automatic retry
        if (errorMessage.includes('corrupted') || errorMessage.includes('unsupported')) {
          console.log('🔄 Detected corrupted file error - attempting automatic retry with different settings...');
          
          // Wait a moment for resources to stabilize (like retry button behavior)
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try with original file buffer (skip compression)
          console.log('🔄 Retry attempt 1: Using original file without compression');
          try {
            const originalTranscriptionResult = await this.azureClient.transcribeAudio(originalBuffer, filename, transcriptionOptions);
            if (originalTranscriptionResult.success) {
              console.log('✅ Automatic retry successful with original file!');
              transcriptionResult = originalTranscriptionResult;
            } else {
              throw new Error('Original file retry also failed');
            }
          } catch (retryError) {
            console.log('❌ Original file retry failed, trying MP3 format...');
            
            // Try converting to MP3 format instead of WAV
            try {
              const mp3Buffer = await this.audioProcessor.compressToMp3(originalBuffer, filename);
              const mp3TranscriptionResult = await this.azureClient.transcribeAudio(mp3Buffer, filename.replace(/\.[^/.]+$/, '.mp3'), transcriptionOptions);
              if (mp3TranscriptionResult.success) {
                console.log('✅ Automatic retry successful with MP3 format!');
                transcriptionResult = mp3TranscriptionResult;
              } else {
                throw new Error('MP3 retry also failed');
              }
            } catch (mp3Error) {
              console.log('❌ MP3 retry failed, throwing original error');
              throw new Error(errorMessage);
            }
          }
        } else {
          throw new Error(errorMessage);
        }
      }

      // Debug: Log the transcription result structure
      console.log('🔍 Transcription result structure:', {
        hasData: !!transcriptionResult.data,
        dataKeys: transcriptionResult.data ? Object.keys(transcriptionResult.data) : [],
        duration: transcriptionResult.data?.duration,
        textLength: transcriptionResult.data?.text?.length
      });

      const transcript = transcriptionResult.data.text;
      if (!transcript || transcript.trim().length < 10) {
        throw new Error('Transcription produced no usable text');
      }

      await progress.updateProgress('transcribing', 100, `Transcription complete (${transcript.length} characters)`);

      // Stage 5: AI Analysis (with resilience for rate limiting)
      await progress.updateProgress('analyzing', 0, 'Generating AI insights...');

      let summary = null;
      let summaryRateLimited = false;
      let coachingEvaluation = null;
      let coachingRateLimited = false;

      // Generate summary with rate limit handling
      await progress.updateProgress('analyzing', 25, 'Generating summary...');
      try {
        const summaryResult = await this.azureClient.generateSummary(transcript);
        
        if (summaryResult.success) {
          summary = summaryResult.data.choices[0]?.message?.content || null;
          console.log('✅ Summary generated successfully');
        } else if (summaryResult.rateLimited) {
          summaryRateLimited = true;
          console.log('⚠️ Summary generation rate limited - will continue without summary');
        } else {
          console.warn('❌ Summary generation failed:', summaryResult.error);
        }
      } catch (summaryError) {
        console.error('❌ Summary generation error:', summaryError);
      }

      // Generate coaching evaluation if enabled (with rate limit handling)
      if (recording.enable_coaching) {
        await progress.updateProgress('analyzing', 75, 'Generating coaching insights...');
        try {
          const coachingResult = await this.azureClient.generateCoachingEvaluation(transcript);
          
          if (coachingResult.success) {
            try {
              const coachingText = coachingResult.data.choices[0]?.message?.content;
              
              // Extract JSON from markdown code blocks if present
              let jsonText = coachingText;
              if (coachingText.includes('```json')) {
                const jsonMatch = coachingText.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                  jsonText = jsonMatch[1];
                }
              } else if (coachingText.includes('```')) {
                const jsonMatch = coachingText.match(/```\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                  jsonText = jsonMatch[1];
                }
              }
              
              // Clean up any remaining whitespace
              jsonText = jsonText.trim();
              
              coachingEvaluation = JSON.parse(jsonText);
              console.log('✅ Coaching evaluation generated successfully');
            } catch (parseError) {
              console.warn('❌ Failed to parse coaching evaluation JSON:', parseError);
              console.warn('❌ Raw response:', coachingResult.data.choices[0]?.message?.content);
            }
          } else if (coachingResult.rateLimited) {
            coachingRateLimited = true;
            console.log('⚠️ Coaching evaluation rate limited - will continue without coaching');
          } else {
            console.warn('❌ Coaching evaluation failed:', coachingResult.error);
          }
        } catch (coachingError) {
          console.error('❌ Coaching evaluation error:', coachingError);
        }
      }

      // Determine completion status
      const hasAnyAI = summary || coachingEvaluation;
      const allRateLimited = summaryRateLimited && (recording.enable_coaching ? coachingRateLimited : false);
      
      if (hasAnyAI) {
        await progress.updateProgress('analyzing', 100, 'AI analysis complete');
      } else if (allRateLimited) {
        await progress.updateProgress('analyzing', 100, 'AI analysis rate limited - transcript available');
      } else {
        await progress.updateProgress('analyzing', 100, 'AI analysis partially failed - transcript available');
      }

      // Stage 6: Finalize and save results (always save transcript, AI optional)
      await progress.updateProgress('finalizing', 0, 'Saving results...');

      // Debug: Log temp files and transcription result
      console.log('🔍 Debug - Temp files available:', tempFiles);
      console.log('🔍 Debug - Transcription result structure:', {
        hasData: !!transcriptionResult.data,
        dataKeys: transcriptionResult.data ? Object.keys(transcriptionResult.data) : [],
        duration: transcriptionResult.data?.duration,
        segments: transcriptionResult.data?.segments?.length || 0
      });

      // Extract duration with fallback - gpt-4o-transcribe might not return duration
      let duration = transcriptionResult.data.duration || null;
      console.log('📊 Initial duration from transcription:', duration);
      
      if (!duration && transcriptionResult.data.segments && transcriptionResult.data.segments.length > 0) {
        // Calculate duration from segments if available
        const lastSegment = transcriptionResult.data.segments[transcriptionResult.data.segments.length - 1];
        duration = lastSegment.end || null;
        console.log('📊 Calculated duration from segments:', duration);
      }

      // If still no duration, use the audioDuration we extracted earlier
      if (!duration && audioDuration) {
        duration = Math.round(audioDuration);
        console.log('📊 Using pre-extracted audio duration:', duration, 'seconds');
      }

      // If still no duration, try to extract it from the audio file using FFmpeg
      if (!duration) {
        console.log('🔍 No duration found, attempting FFmpeg extraction...');
        console.log('🔍 Available temp files:', tempFiles);
        
        if (tempFiles.length > 0) {
          try {
            // Look for any media file (audio or video)
            const mediaFile = tempFiles.find(file => 
              file.includes('.mp3') || file.includes('.wav') || file.includes('.m4a') ||
              file.includes('.mp4') || file.includes('.mov') || file.includes('.avi')
            );
            
            console.log('🔍 Found media file:', mediaFile);
            
            if (mediaFile) {
              console.log('🎵 Extracting duration from media file using FFmpeg:', mediaFile);
              const { getAudioInfo } = await import('./utils/audioProcessor.js');
              const audioInfo = await getAudioInfo(mediaFile);
              console.log('🔍 Audio info result:', audioInfo);
              
              if (audioInfo && audioInfo.format && audioInfo.format.duration) {
                duration = Math.round(audioInfo.format.duration);
                console.log('📊 Extracted duration from media file:', duration, 'seconds');
              } else {
                console.warn('⚠️ Audio info missing duration:', audioInfo);
              }
            } else {
              console.warn('⚠️ No media file found in temp files');
            }
          } catch (durationError) {
            console.error('❌ Failed to extract duration from media file:', durationError);
            console.error('❌ Error details:', durationError.message);
          }
        } else {
          console.warn('⚠️ No temp files available for duration extraction');
        }
      }

      console.log('📊 Final duration value:', duration);

      const aiResults = {
        transcript,
        ai_summary: summary || null, // Store AI summary in the correct field
        duration: duration, // Use extracted duration
        // Store only essential metadata, not raw transcript data
        ai_insights: coachingEvaluation || null, // Store coaching data, not raw transcript
        ai_generated_at: new Date().toISOString(),
        // Add metadata about what succeeded/failed
        processing_metadata: {
          transcription_success: true,
          summary_success: !!summary,
          summary_rate_limited: summaryRateLimited,
          coaching_success: !!coachingEvaluation,
          coaching_rate_limited: coachingRateLimited,
          partial_success: !hasAnyAI,
          duration_source: duration ? (
            transcriptionResult.data.duration ? 'transcription' : 
            transcriptionResult.data.segments ? 'segments' : 'ffmpeg'
          ) : 'none'
        }
      };

      // Debug: Log what we're saving
      console.log('💾 Saving AI results:', {
        hasTranscript: !!aiResults.transcript,
        hasSummary: !!aiResults.ai_summary,
        duration: aiResults.duration,
        durationSource: aiResults.processing_metadata.duration_source
      });

      if (coachingEvaluation) {
        aiResults.coaching_evaluation = coachingEvaluation;
      }

      const updateResult = await updateRecordingWithAI(recordingId, aiResults);
      if (!updateResult.success) {
        throw new Error(`Failed to save results: ${updateResult.error}`);
      }

      await progress.updateProgress('finalizing', 100, 'Results saved');
      
      // Complete with appropriate message
      const completionMessage = hasAnyAI 
        ? 'Processing completed successfully'
        : allRateLimited 
          ? 'Processing completed with rate limiting - transcript available'
          : 'Processing completed with partial AI failure - transcript available';
      
      await progress.complete(aiResults, completionMessage);

      // Cleanup temp files
      await this.fileHandler.cleanup(tempFiles);

      console.log(`✅ ${completionMessage} for recording: ${recordingId}`);
      
      return {
        success: true,
        results: aiResults,
        partial_success: !hasAnyAI,
        rate_limited: allRateLimited
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
    const audioDurationMinutes = processingOptions.audioDurationMinutes;
    const chunkSizeMinutes = processingOptions.chunkSizeMinutes || 5;
    const parallelChunks = processingOptions.parallelChunks || 3;
    
    console.log(`🎯 Using ${strategy} transcription strategy for ${fileSizeMB.toFixed(1)}MB file`);
    if (audioDurationMinutes) {
      console.log(`📊 Audio duration: ${audioDurationMinutes.toFixed(1)} minutes`);
    }
    
    // 🚨 CRITICAL: Check Whisper duration limit FIRST (regardless of strategy)
    const WHISPER_DURATION_LIMIT_MINUTES = 15; // Practical limit based on user reports
    
    if (audioDurationMinutes && audioDurationMinutes > WHISPER_DURATION_LIMIT_MINUTES) {
      console.log(`🚨 DURATION LIMIT EXCEEDED: ${audioDurationMinutes.toFixed(1)} min > ${WHISPER_DURATION_LIMIT_MINUTES} min`);
      console.log(`🔀 FORCING CHUNKING: File too long for Whisper API (causes 500 errors)`);
      
      return await this.processLargeAudioWithChunking(
        audioBuffer, filename, transcriptionOptions, progress, chunkSizeMinutes, parallelChunks
      );
    }
    
    switch (strategy) {
      case 'fast':
        // Direct processing, but only if under duration limit
        if (audioDurationMinutes && audioDurationMinutes > 10) {
          console.log('⚡ Fast transcription: duration > 10 min, switching to chunking for safety');
          return await this.processLargeAudioWithChunking(
            audioBuffer, filename, transcriptionOptions, progress, chunkSizeMinutes, 2
          );
        }
        console.log('⚡ Fast transcription: direct processing');
        return await this.azureClient.transcribeAudio(audioBuffer, filename, transcriptionOptions);
      
      case 'standard':
        // Use chunking for large files OR long duration files
        if (fileSizeMB > 25 || (audioDurationMinutes && audioDurationMinutes > 10)) {
          const reason = fileSizeMB > 25 ? 'large file size' : 'long duration';
          console.log(`📚 Standard transcription: chunking due to ${reason}`);
          return await this.processLargeAudioWithChunking(
            audioBuffer, filename, transcriptionOptions, progress, 5, 2
          );
        } else {
          console.log('📄 Standard transcription: direct processing');
          return await this.azureClient.transcribeAudio(audioBuffer, filename, transcriptionOptions);
        }
      
      case 'optimized':
        // Use chunking for medium+ files OR long duration files with parallel processing
        if (fileSizeMB > 15 || (audioDurationMinutes && audioDurationMinutes > 8)) {
          const reason = fileSizeMB > 15 ? 'file size' : 'duration';
          console.log(`📊 Optimized transcription: chunking due to ${reason} with ${parallelChunks} parallel threads`);
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
        // Use streaming transcription for real-time results, but check duration first
        if (audioDurationMinutes && audioDurationMinutes > 12) {
          console.log('🌊 Streaming transcription: long duration, using chunked streaming');
          return await this.processLargeAudioWithChunking(
            audioBuffer, filename, transcriptionOptions, progress, 3, 2 // Smaller chunks for streaming
          );
        }
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
        // Fallback to standard behavior with duration checks
        if (fileSizeMB > 25 || (audioDurationMinutes && audioDurationMinutes > 10)) {
          const reason = fileSizeMB > 25 ? 'file size' : 'duration';
          console.log(`🔄 Default fallback: chunking due to ${reason}`);
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
