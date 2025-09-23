import { parentPort, workerData } from 'worker_threads';
import { AudioProcessor } from './audioProcessor.js';
import { AzureOpenAIClient } from './azureOpenAI.js';

const { workerId } = workerData;
const audioProcessor = new AudioProcessor();
const azureClient = new AzureOpenAIClient();

console.log(`🧵 Audio worker ${workerId} started`);

/**
 * Handle messages from main thread
 */
parentPort.on('message', async (message) => {
  const { taskId, type, data, options } = message;
  
  console.log(`🔄 Worker ${workerId} processing task ${taskId} (${type})`);
  
  try {
    let result;
    
    switch (type) {
      case 'compress_audio':
        result = await processAudioCompression(data, options);
        break;
        
      case 'split_audio':
        result = await processAudioSplitting(data, options);
        break;
        
      case 'transcribe_chunk':
        result = await processTranscriptionChunk(data, options);
        break;
        
      case 'extract_audio_chunk':
        result = await processAudioChunkExtraction(data, options);
        break;
        
      case 'parallel_transcription':
        result = await processParallelTranscription(data, options);
        break;
        
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    parentPort.postMessage({
      taskId,
      success: true,
      result
    });
    
  } catch (error) {
    console.error(`❌ Worker ${workerId} task ${taskId} failed:`, error);
    
    parentPort.postMessage({
      taskId,
      success: false,
      error: error.message
    });
  }
});

/**
 * Process audio compression
 */
async function processAudioCompression(data, options) {
  const { audioBuffer, filename, compressionOptions } = data;
  
  parentPort.postMessage({
    taskId: options.taskId,
    progress: { percentage: 0, message: 'Starting audio compression...' }
  });
  
  const result = await audioProcessor.compressAudio(audioBuffer, filename, compressionOptions);
  
  parentPort.postMessage({
    taskId: options.taskId,
    progress: { percentage: 100, message: 'Audio compression complete' }
  });
  
  return result;
}

/**
 * Process audio splitting
 */
async function processAudioSplitting(data, options) {
  const { audioBuffer, filename, chunkDurationMinutes } = data;
  
  parentPort.postMessage({
    taskId: options.taskId,
    progress: { percentage: 0, message: 'Starting audio splitting...' }
  });
  
  const result = await audioProcessor.splitAudioFile(audioBuffer, filename, chunkDurationMinutes);
  
  parentPort.postMessage({
    taskId: options.taskId,
    progress: { percentage: 100, message: 'Audio splitting complete' }
  });
  
  return result;
}

/**
 * Process single transcription chunk
 */
async function processTranscriptionChunk(data, options) {
  const { audioBuffer, filename, transcriptionOptions, chunkInfo } = data;
  
  parentPort.postMessage({
    taskId: options.taskId,
    progress: { 
      percentage: 0, 
      message: `Transcribing chunk ${chunkInfo.index}...` 
    }
  });
  
  const result = await azureClient.transcribeAudio(audioBuffer, filename, transcriptionOptions);
  
  parentPort.postMessage({
    taskId: options.taskId,
    progress: { 
      percentage: 100, 
      message: `Chunk ${chunkInfo.index} transcription complete` 
    }
  });
  
  // Add chunk info to result
  if (result.success) {
    result.chunkInfo = chunkInfo;
  }
  
  return result;
}

/**
 * Process audio chunk extraction
 */
async function processAudioChunkExtraction(data, options) {
  const { inputPath, outputPath, startTime, duration } = data;
  
  parentPort.postMessage({
    taskId: options.taskId,
    progress: { percentage: 0, message: 'Extracting audio chunk...' }
  });
  
  // Use audioProcessor's extractChunk method
  await audioProcessor.extractChunk(inputPath, outputPath, startTime, duration);
  
  parentPort.postMessage({
    taskId: options.taskId,
    progress: { percentage: 100, message: 'Audio chunk extraction complete' }
  });
  
  return { success: true, outputPath };
}

/**
 * Process parallel transcription of multiple chunks
 */
async function processParallelTranscription(data, options) {
  const { chunks, transcriptionOptions, maxConcurrency } = data;
  
  const results = [];
  const totalChunks = chunks.length;
  let processedChunks = 0;
  
  // Process chunks in batches with limited concurrency
  for (let i = 0; i < chunks.length; i += maxConcurrency) {
    const batch = chunks.slice(i, i + maxConcurrency);
    
    const batchPromises = batch.map(async (chunk, batchIndex) => {
      const chunkIndex = i + batchIndex;
      const chunkFilename = `chunk_${chunkIndex}.mp3`;
      
      try {
        const result = await azureClient.transcribeAudio(
          chunk.buffer, 
          chunkFilename, 
          transcriptionOptions
        );
        
        processedChunks++;
        const percentage = Math.round((processedChunks / totalChunks) * 100);
        
        parentPort.postMessage({
          taskId: options.taskId,
          progress: { 
            percentage, 
            message: `Processed ${processedChunks}/${totalChunks} chunks` 
          }
        });
        
        return {
          index: chunkIndex,
          startTime: chunk.startTime,
          duration: chunk.duration,
          text: result.success ? result.data.text : '',
          success: result.success,
          error: result.error
        };
        
      } catch (error) {
        processedChunks++;
        return {
          index: chunkIndex,
          startTime: chunk.startTime,
          duration: chunk.duration,
          text: '',
          success: false,
          error: error.message
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  // Sort by index and combine text
  results.sort((a, b) => a.index - b.index);
  const successfulResults = results.filter(r => r.success);
  const combinedText = successfulResults.map(r => r.text).join(' ');
  
  return {
    success: true,
    text: combinedText,
    chunks: results,
    totalChunks: results.length,
    successfulChunks: successfulResults.length,
    failedChunks: results.length - successfulResults.length
  };
}

/**
 * Handle uncaught errors
 */
process.on('uncaughtException', (error) => {
  console.error(`💥 Worker ${workerId} uncaught exception:`, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`💥 Worker ${workerId} unhandled rejection:`, reason);
  process.exit(1);
});

console.log(`✅ Audio worker ${workerId} ready for tasks`);