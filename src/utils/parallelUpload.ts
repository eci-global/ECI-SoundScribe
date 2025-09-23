/**
 * Parallel Upload Optimization Utilities
 * 
 * This module provides utilities to parallelize various upload operations
 * for maximum performance while maintaining error handling and safety.
 */

import { extractMediaDuration } from './mediaDuration';
import { validateFile } from './fileUpload';

export interface ParallelUploadOptions {
  enableDurationExtraction?: boolean;
  enableValidation?: boolean;
  enableCompression?: boolean;
  enableFormatDetection?: boolean;
}

export interface ParallelUploadResult {
  duration: number | null;
  durationMethod?: string;
  validationPassed: boolean;
  processingTime: number;
  errors: Array<{
    operation: string;
    error: string;
  }>;
  format?: string;
  estimatedCompressionRatio?: number;
}

/**
 * Run file operations in parallel for maximum speed
 */
export async function runParallelFileOperations(
  file: File,
  options: ParallelUploadOptions = {}
): Promise<ParallelUploadResult> {
  const startTime = performance.now();
  const {
    enableDurationExtraction = true,
    enableValidation = true,
  } = options;

  console.log('🚀 Starting parallel file operations...');

  const operations: Array<Promise<any>> = [];
  const results: any = {};
  const errors: Array<{ operation: string; error: string }> = [];

  // OPTIMIZATION: Run duration extraction in parallel with validation
  if (enableDurationExtraction) {
    operations.push(
      extractMediaDuration(file)
        .then(result => {
          results.duration = result.success ? result.duration : null;
          results.durationMethod = result.method;
          console.log('✅ Parallel duration extraction completed');
        })
        .catch(error => {
          console.warn('⚠️ Parallel duration extraction failed:', error);
          results.duration = null;
          errors.push({ operation: 'duration_extraction', error: error.message });
        })
    );
  }

  if (enableValidation) {
    operations.push(
      validateFile(file)
        .then(() => {
          results.validationPassed = true;
          console.log('✅ Parallel file validation completed');
        })
        .catch(error => {
          console.warn('⚠️ Parallel file validation failed:', error);
          results.validationPassed = false;
          errors.push({ operation: 'file_validation', error: error.message });
        })
    );
  }

  // Wait for all operations to complete
  await Promise.allSettled(operations);

  const processingTime = performance.now() - startTime;
  console.log(`⚡ Parallel operations completed in ${processingTime.toFixed(0)}ms`);

  return {
    duration: results.duration || null,
    durationMethod: results.durationMethod,
    validationPassed: results.validationPassed !== false, // Default to true if not run
    processingTime,
    errors
  };
}

/**
 * Create a Web Worker for CPU-intensive operations (duration extraction)
 */
export function createDurationExtractionWorker(): Worker | null {
  if (typeof Worker === 'undefined') {
    console.warn('⚠️ Web Workers not supported in this environment');
    return null;
  }

  try {
    // Create inline worker for duration extraction
    const workerCode = `
      // Import duration extraction logic (would need to be adapted for worker context)
      self.addEventListener('message', async (e) => {
        const { id, file, type } = e.data;
        
        try {
          if (type === 'extract_duration') {
            // For now, just return a placeholder
            // In a full implementation, we'd implement duration extraction in the worker
            self.postMessage({
              id,
              success: false,
              error: 'Worker-based duration extraction not yet implemented'
            });
          }
        } catch (error) {
          self.postMessage({
            id,
            success: false,
            error: error.message
          });
        }
      });
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    // Clean up the blob URL after worker is created
    URL.revokeObjectURL(workerUrl);

    return worker;
  } catch (error) {
    console.warn('⚠️ Failed to create duration extraction worker:', error);
    return null;
  }
}

/**
 * Batch process multiple files in parallel
 */
export async function batchProcessFiles(
  files: File[],
  options: ParallelUploadOptions = {}
): Promise<Array<ParallelUploadResult & { file: File }>> {
  console.log(`🔄 Starting batch processing for ${files.length} files...`);
  
  const batchStartTime = performance.now();
  
  // Process files in parallel with a concurrency limit to avoid overwhelming the browser
  const CONCURRENCY_LIMIT = 3;
  const results: Array<ParallelUploadResult & { file: File }> = [];
  
  for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
    const batch = files.slice(i, i + CONCURRENCY_LIMIT);
    
    const batchPromises = batch.map(async (file) => {
      const result = await runParallelFileOperations(file, options);
      return { ...result, file };
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    console.log(`📊 Processed batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}/${Math.ceil(files.length / CONCURRENCY_LIMIT)}`);
  }
  
  const totalTime = performance.now() - batchStartTime;
  console.log(`✅ Batch processing completed in ${totalTime.toFixed(0)}ms for ${files.length} files`);
  
  return results;
}