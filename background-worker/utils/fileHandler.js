import fs from 'fs';
import path from 'path';
import { downloadFileFromStorage } from '../supabase.js';

/**
 * File handler utilities for processing large files
 */
export class FileHandler {
  constructor() {
    this.tempDir = process.env.TEMP_DIR || '/tmp';
    this.maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB) || 500;
    this.chunkSizeMB = parseInt(process.env.CHUNK_SIZE_MB) || 25;
  }

  /**
   * Download file from Supabase Storage to temporary location
   */
  async downloadFile(bucket, filePath, recordingId) {
    try {
      console.log(`📥 Downloading file: ${bucket}/${filePath}`);
      
      const result = await downloadFileFromStorage(bucket, filePath);
      if (!result.success) {
        throw new Error(`Failed to download file: ${result.error}`);
      }

      // Create temp file path
      const filename = path.basename(filePath);
      const tempFilePath = path.join(this.tempDir, `${recordingId}_${filename}`);
      
      // Convert blob to buffer and save to temp file
      const arrayBuffer = await result.data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      await fs.promises.writeFile(tempFilePath, buffer);
      
      console.log(`✅ File downloaded to: ${tempFilePath} (${buffer.length} bytes)`);
      
      return {
        success: true,
        tempFilePath,
        fileSize: buffer.length,
        buffer
      };
    } catch (error) {
      console.error('❌ File download failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanup(filePaths) {
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }

    for (const filePath of filePaths) {
      try {
        if (filePath && await this.fileExists(filePath)) {
          await fs.promises.unlink(filePath);
          console.log(`🧹 Cleaned up temp file: ${filePath}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup file ${filePath}:`, error.message);
      }
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   */
  async getFileStats(filePath) {
    try {
      const stats = await fs.promises.stat(filePath);
      return {
        size: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      console.error('Failed to get file stats:', error);
      return null;
    }
  }

  /**
   * Validate file size and type
   */
  validateFile(fileBuffer, filename) {
    const fileSizeMB = fileBuffer.length / (1024 * 1024);
    
    // Check file size
    if (fileSizeMB > this.maxFileSizeMB) {
      return {
        valid: false,
        error: `File size ${fileSizeMB.toFixed(1)}MB exceeds maximum allowed size of ${this.maxFileSizeMB}MB`
      };
    }

    // Check file extension
    const ext = path.extname(filename).toLowerCase();
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.mp4', '.mov', '.avi'];
    
    if (!allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `File type ${ext} is not supported. Allowed types: ${allowedExtensions.join(', ')}`
      };
    }

    return {
      valid: true,
      sizeMB: fileSizeMB,
      extension: ext
    };
  }

  /**
   * Determine if file needs chunked processing
   */
  needsChunkedProcessing(fileSizeBytes) {
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    return fileSizeMB > this.chunkSizeMB;
  }

  /**
   * Extract file path from Supabase URL
   */
  extractFilePathFromUrl(fileUrl) {
    try {
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      
      // Find the 'recordings' part and get everything after it
      const recordingsIndex = pathParts.findIndex(part => part === 'recordings');
      if (recordingsIndex === -1) {
        throw new Error('Invalid file URL format - recordings bucket not found');
      }
      
      const filePath = pathParts.slice(recordingsIndex + 1).join('/');
      if (!filePath) {
        throw new Error('Invalid file URL format - no file path found');
      }
      
      return filePath;
    } catch (error) {
      throw new Error(`Failed to extract file path from URL: ${error.message}`);
    }
  }

  /**
   * Get MIME type from file extension
   */
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo'
    };
    
    return mimeTypes[ext] || 'audio/mpeg';
  }

  /**
   * Create temporary directory if it doesn't exist
   */
  async ensureTempDir() {
    try {
      await fs.promises.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
      throw error;
    }
  }
}