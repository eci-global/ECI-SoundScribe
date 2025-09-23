// Web Worker: audioCompressionWorker.ts
/* eslint-disable no-restricted-globals */
import { AudioCompressor } from '../utils/audioCompression';

export interface WorkerRequest {
  id: string;
  file: File;
  options: Partial<import('../utils/audioCompression').CompressionOptions>;
}

export interface WorkerResponse {
  id: string;
  success: boolean;
  error?: string;
  result?: {
    buffer: ArrayBuffer;
    name: string;
    type: string;
    format?: string;
  };
}

self.addEventListener('message', async (e: MessageEvent<WorkerRequest>) => {
  const { id, file, options } = e.data;
  try {
    console.log('🔄 Web Worker: Starting compression for file:', file.name);
    console.log('🔄 Web Worker: Compression options:', options);
    
    const res = await AudioCompressor.compressIfNeeded(file, options);
    const buffer = await res.compressedFile.arrayBuffer();
    
    const response: WorkerResponse = {
      id,
      success: true,
      result: {
        buffer,
        name: res.compressedFile.name,
        type: res.compressedFile.type,
        format: res.format
      }
    };
    
    console.log('✅ Web Worker: Compression completed successfully');
    console.log('✅ Web Worker: Result format:', res.format);
    
    // Transfer ArrayBuffer
    // @ts-ignore
    self.postMessage(response, [buffer]);
  } catch (err: any) {
    console.error('❌ Web Worker: Compression failed:', err);
    
    const response: WorkerResponse = {
      id,
      success: false,
      error: err?.message || 'Compression failed'
    };
    // @ts-ignore
    self.postMessage(response);
  }
}); 