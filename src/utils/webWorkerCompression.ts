/**
 * Web Worker Audio Compression Utility
 * 
 * Provides a simple interface to use Web Worker-based audio compression
 * to avoid blocking the main thread during compression operations.
 */

import type { CompressionOptions } from './audioCompression';
import type { WorkerRequest, WorkerResponse } from '../workers/audioCompressionWorker';

export interface WebWorkerCompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  wasCompressed: boolean;
  processingTime: number;
  usedWebWorker: boolean;
  format?: string;
}

class WebWorkerCompressionManager {
  private worker: Worker | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string, {
    resolve: (result: WebWorkerCompressionResult) => void;
    reject: (error: Error) => void;
    startTime: number;
  }>();

  /**
   * Initialize the Web Worker for compression
   */
  private async initializeWorker(): Promise<Worker | null> {
    if (this.worker) {
      return this.worker;
    }

    try {
      // Check if Web Workers are supported
      if (typeof Worker === 'undefined') {
        console.warn('⚠️ Web Workers not supported in this environment');
        return null;
      }

      // Create the worker
      const workerUrl = new URL('../workers/audioCompressionWorker.ts', import.meta.url);
      this.worker = new Worker(workerUrl, { type: 'module' });

      // Set up message handling
      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(e.data);
      };

      this.worker.onerror = (error) => {
        console.error('❌ Web Worker error:', error);
        this.rejectAllPendingRequests(new Error('Web Worker encountered an error'));
      };

      console.log('✅ Web Worker compression initialized');
      return this.worker;
    } catch (error) {
      console.warn('⚠️ Failed to initialize Web Worker:', error);
      return null;
    }
  }

  /**
   * Handle messages from the Web Worker
   */
  private handleWorkerMessage(response: WorkerResponse) {
    const request = this.pendingRequests.get(response.id);
    if (!request) {
      console.warn('⚠️ Received response for unknown request:', response.id);
      return;
    }

    this.pendingRequests.delete(response.id);
    const processingTime = performance.now() - request.startTime;

    if (response.success && response.result) {
      // Convert ArrayBuffer back to File
      const compressedBlob = new Blob([response.result.buffer], { type: response.result.type });
      const compressedFile = new File([compressedBlob], response.result.name, { type: response.result.type });

      const result: WebWorkerCompressionResult = {
        compressedFile,
        originalSize: 0, // Will be set by caller
        compressedSize: compressedFile.size,
        compressionRatio: 0, // Will be calculated by caller
        wasCompressed: true,
        processingTime,
        usedWebWorker: true
      };

      request.resolve(result);
    } else {
      request.reject(new Error(response.error || 'Compression failed'));
    }
  }

  /**
   * Reject all pending requests (used when worker fails)
   */
  private rejectAllPendingRequests(error: Error) {
    for (const request of this.pendingRequests.values()) {
      request.reject(error);
    }
    this.pendingRequests.clear();
  }

  /**
   * Compress audio file using Web Worker
   */
  async compressWithWebWorker(
    file: File,
    options: CompressionOptions = {}
  ): Promise<WebWorkerCompressionResult> {
    const worker = await this.initializeWorker();
    
    if (!worker) {
      throw new Error('Web Worker not available - falling back to main thread compression');
    }

    const requestId = `compression_${++this.requestId}`;
    const startTime = performance.now();

    return new Promise<WebWorkerCompressionResult>((resolve, reject) => {
      // Store the request
      this.pendingRequests.set(requestId, { resolve, reject, startTime });

      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Web Worker compression timeout'));
      }, 60000); // 60 second timeout

      // Update resolve to clear timeout
      const originalResolve = resolve;
      const originalReject = reject;
      
      this.pendingRequests.set(requestId, {
        resolve: (result) => {
          clearTimeout(timeout);
          originalResolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          originalReject(error);
        },
        startTime
      });

      // Send compression request to worker
      const request: WorkerRequest = {
        id: requestId,
        file,
        options
      };

      worker.postMessage(request);
    });
  }

  /**
   * Terminate the Web Worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.rejectAllPendingRequests(new Error('Web Worker terminated'));
    }
  }
}

// Global instance
const compressionManager = new WebWorkerCompressionManager();

/**
 * Compress audio file with automatic fallback to main thread
 */
export async function compressWithWebWorkerFallback(
  file: File,
  options: CompressionOptions = {}
): Promise<WebWorkerCompressionResult> {
  const fileSizeMB = file.size / (1024 * 1024);
  
  try {
    console.log(`🔄 Attempting Web Worker compression for ${fileSizeMB.toFixed(1)}MB file...`);
    
    const result = await compressionManager.compressWithWebWorker(file, options);
    result.originalSize = file.size;
    result.compressionRatio = file.size / result.compressedSize;
    
    console.log(`✅ Web Worker compression completed: ${fileSizeMB.toFixed(1)}MB → ${(result.compressedSize / (1024 * 1024)).toFixed(1)}MB`);
    
    return result;
  } catch (error) {
    console.warn('⚠️ Web Worker compression failed, attempting main thread fallback:', error);
    
    try {
      // Fallback to main thread compression
      const { AudioCompressor } = await import('./audioCompression');
      
      // Check if main thread compression is available before attempting
      if (!AudioCompressor.isAvailable()) {
        console.warn('⚠️ Main thread compression also not available, returning original file');
        throw new Error('Compression not available in current browser environment');
      }
      
      const fallbackResult = await AudioCompressor.compressIfNeeded(file, options);
      
      console.log(`✅ Main thread compression completed as fallback`);
      
      return {
        compressedFile: fallbackResult.compressedFile,
        originalSize: fallbackResult.originalSize,
        compressedSize: fallbackResult.compressedSize,
        compressionRatio: fallbackResult.compressionRatio,
        wasCompressed: fallbackResult.wasCompressed,
        processingTime: fallbackResult.processingTime,
        usedWebWorker: false
      };
    } catch (fallbackError) {
      console.warn('⚠️ Both Web Worker and main thread compression failed:', fallbackError);
      
      // Return original file if all compression attempts fail
      return {
        compressedFile: file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 1,
        wasCompressed: false,
        processingTime: 0,
        usedWebWorker: false
      };
    }
  }
}

/**
 * Cleanup function to call when the component unmounts
 */
export function cleanupWebWorkerCompression() {
  compressionManager.terminate();
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupWebWorkerCompression);
}