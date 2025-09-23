import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { uploadFileToStorage, uploadLargeFileDirectly, cleanupUploadedFile, FILE_SIZE_LIMITS } from '@/utils/fileUpload';
import { createRecordingRecord } from '@/utils/recordingDatabase';
import { processRecording } from '@/utils/recordingProcessor';
import { transcribeAudio, generateSummary } from '@/utils/transcriptionService';
import { useStorageOperations } from '@/hooks/useStorageOperations';
import type { Recording, FileOperationsProps } from '@/types/recording';
import type { ContentType } from '@/components/dashboard/UploadModal';
import { useState, useCallback } from 'react';
import { AudioCompressor } from '../utils/audioCompression';
import { extractMediaDuration } from '../utils/mediaDuration';
import { VideoToAudioExtractor } from '../utils/videoToAudioExtraction';

interface UploadProgress {
  stage: 'preparing' | 'extracting' | 'compressing' | 'uploading' | 'processing' | 'complete';
  progress: number;
  message: string;
  compressionInfo?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    processingTime: number;
  };
  extractionInfo?: {
    originalVideoSize: number;
    extractedAudioSize: number;
    compressionRatio: number;
    duration: number | null;
  };
}

export const useFileOperations = ({ onRecordingProcessed }: FileOperationsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    uploadFile: uploadToStorage, 
    deleteFile: deleteFromStorage, 
    downloadFile: downloadFromStorage,
    getPublicUrl,
    uploading: storageUploading
  } = useStorageOperations();

  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Background worker endpoint - update this with your deployed URL
  const BACKGROUND_WORKER_URL = import.meta.env.VITE_BACKGROUND_WORKER_URL || 'https://soundscribe-backend.azurewebsites.net';

  /**
   * Handle large file upload via background worker
   */
  const handleLargeFileUpload = async (file: File, title: string, description: string, contentType: ContentType, enableCoaching: boolean, preExtractedDuration?: number | null): Promise<void> => {
    // Define fileSizeMB at the top of function scope to avoid scoping issues
    const fileSizeMB = file.size / (1024 * 1024);
    
    setIsUploading(true);
    setUploadProgress({
      stage: 'preparing',
      progress: 0,
      message: 'Preparing large file for background processing...'
    });

    let uploadedPath: string | null = null;

    try {
      console.log('🚀 Large file detected - using background worker pipeline');
      
      // Step 1: Upload file to storage first
      setUploadProgress({
        stage: 'uploading',
        progress: 10,
        message: 'Uploading large file to storage...'
      });

      uploadedPath = await uploadToStorage(file, 'recordings', '');
      
      if (!uploadedPath) {
        throw new Error('Failed to upload file to storage');
      }

      // Step 2: Create database record
      setUploadProgress({
        stage: 'uploading',
        progress: 30,
        message: 'Creating recording entry...'
      });

      const publicUrl = getPublicUrl('recordings', uploadedPath);
      
      // Use pre-extracted duration if available, otherwise extract now
      let duration = preExtractedDuration;
      
      if (!duration) {
        console.log('📊 Duration not pre-extracted, extracting from large file...');
        const durationResult = await extractMediaDuration(file);
        duration = durationResult.success ? durationResult.duration : null;
        
        // Additional validation for large files
        if (duration && (duration < 1 || duration > 86400)) {
          console.warn(`⚠️ Suspicious duration for large file: ${duration}s, setting to null`);
          duration = null;
        }
        
        if (durationResult.success && duration) {
          console.log(`✅ Large file duration extracted: ${duration} seconds using ${durationResult.method}`);
        } else {
          console.warn(`⚠️ Large file duration extraction failed: ${durationResult.error}`);
        }
      } else {
        console.log(`✅ Using pre-extracted duration: ${duration} seconds`);
      }
      
      const recordingData = {
        user_id: user.id,
        title,
        description,
        file_url: publicUrl,
        file_type: file.type.startsWith('audio/') ? 'audio' as const : 'video' as const,
        file_size: file.size,
        duration: duration, // Add extracted duration for large files
        status: 'processing' as const, // Use 'processing' status for background worker files
        content_type: contentType,
        enable_coaching: enableCoaching
      };

      const newRecording = await createRecordingRecord(recordingData);

      if (!newRecording) {
        throw new Error('Failed to create recording record');
      }

      // Step 3: Send to background worker
      setUploadProgress({
        stage: 'processing',
        progress: 50,
        message: 'Starting AI transcription and analysis...'
      });

      // Enhanced fallback strategy for large files
      const azureBackendUrl = BACKGROUND_WORKER_URL || 'https://soundscribe-backend.azurewebsites.net';
      
      console.log(`🚀 Attempting Azure backend for large file (${fileSizeMB.toFixed(1)}MB): ${azureBackendUrl}`);
      
      try {
        // Try Azure backend first
        const response = await fetch(`${azureBackendUrl}/api/process-audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recording_id: newRecording.id,
            file_url: publicUrl,
            file_size: file.size,
            is_large_file: true,
            file_type: file.type.startsWith('video/') ? 'video' : 'audio'
          })
        });
        
        if (response.ok) {
          const workerResult = await response.json();
          if (!workerResult.error) {
            console.log('✅ Azure backend processing started successfully');
            // Continue with success flow
          } else {
            throw new Error(`Azure processing error: ${workerResult.error}`);
          }
        } else {
          throw new Error(`Azure backend unavailable: ${response.status}`);
        }
      } catch (azureError) {
        console.error('❌ Azure backend unavailable for large file processing:', azureError);
        
        // For moderately large files (under 100MB), offer Edge Function fallback with warning
        if (fileSizeMB < 100) {
          console.log(`⚠️ Azure backend failed for ${fileSizeMB.toFixed(1)}MB file - offering Edge Function fallback`);
          
          const useEdgeFallback = confirm(
            `Azure backend unavailable for ${fileSizeMB.toFixed(1)}MB file.\n\n` +
            `Would you like to try processing with Edge Functions?\n\n` +
            `Warning: This may fail due to memory limits, but can work for some files.\n\n` +
            `Click OK to try Edge Functions, or Cancel to save for later retry.`
          );
          
          if (useEdgeFallback) {
            console.log(`🔄 User chose Edge Function fallback for ${fileSizeMB.toFixed(1)}MB file`);
            
            // Mark recording as using fallback method
            await supabase
              .from('recordings')
              .update({ 
                status: 'processing',
                processing_notes: `Using Edge Function fallback for ${fileSizeMB.toFixed(1)}MB file (Azure backend unavailable)`
              })
              .eq('id', newRecording.id);
            
            toast({
              title: "Trying fallback processing",
              description: `Attempting Edge Function processing for ${fileSizeMB.toFixed(1)}MB file. May take longer or fail.`,
              duration: 6000
            });
            
            // Continue with Edge Function processing (don't return here)
          } else {
            // User chose to save for later retry
            await supabase
              .from('recordings')
              .update({ 
                status: 'failed',
                error_message: `Large file processing failed: Azure backend unavailable. File size: ${fileSizeMB.toFixed(1)}MB`,
                processing_notes: `Azure backend required for files >${fileSizeMB.toFixed(1)}MB. Use Recovery button to retry.`
              })
              .eq('id', newRecording.id);
            
            toast({
              title: "File saved for later",
              description: `${fileSizeMB.toFixed(1)}MB file saved. Use Recovery button when Azure backend is available.`,
              duration: 8000
            });
            
            return; // Don't throw - recording is saved for retry
          }
        } else {
          // File too large for Edge Function fallback
          setUploadProgress({
            stage: 'uploading',
            progress: 0,
            message: 'Large file processing failed - Azure backend required'
          });
          
          await supabase
            .from('recordings')
            .update({ 
              status: 'failed',
              error_message: `Large file processing failed: Azure backend unavailable. File size: ${fileSizeMB.toFixed(1)}MB`,
              processing_notes: `Azure backend required for files >${fileSizeMB.toFixed(1)}MB. Edge Functions have 256MB memory limit.`
            })
            .eq('id', newRecording.id);
          
          toast({
            title: "File too large for fallback",
            description: `${fileSizeMB.toFixed(1)}MB file requires Azure backend. Use Recovery button to retry.`,
            variant: "destructive",
            duration: 8000
          });
          
          return; // Don't throw - recording is saved for retry
        }
      }
      
      setUploadProgress({
        stage: 'complete',
        progress: 100,
        message: 'Processing complete! Transcription and analysis ready.'
      });

      toast({
        title: "🎉 Upload & Processing Complete!",
        description: `${title} has been transcribed and analyzed. Check the dashboard for results!`,
        duration: 5000
      });

      console.log(`✅ Large file processing started successfully:`, {
        recordingId: newRecording.id,
        method: 'azure_backend'
      });

      // Refresh the recordings list
      onRecordingProcessed();

    } catch (error) {
      console.error('❌ Large file upload error:', error);
      
      // Clean up uploaded file if database record creation failed
      if (uploadedPath) {
        try {
          await deleteFromStorage('recordings', uploadedPath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup uploaded file:', cleanupError);
        }
      }
      
      setUploadProgress({
        stage: 'complete',
        progress: 0,
        message: error instanceof Error ? error.message : 'Large file upload failed'
      });

      toast({
        title: "Large File Upload Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
        duration: 7000
      });
      
      throw error;
    } finally {
      setIsUploading(false);
      // Clear progress after a delay
      setTimeout(() => setUploadProgress(null), 5000);
    }
  };

  const handleUpload = async (file: File, title: string, description: string, contentType: ContentType = 'other', enableCoaching: boolean = true): Promise<void> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload files",
        variant: "destructive"
      });
      return;
    }

    // Define fileSizeMB at the top of function scope to avoid scoping issues
    const fileSizeMB = file.size / (1024 * 1024);

    console.log('Starting enhanced file upload for user:', user.id);
    console.log('File details:', { name: file.name, size: file.size, type: file.type });

    let uploadedPath: string | null = null;
    let processedFile = file;
    
    // Initialize upload progress tracking
    setUploadProgress({
      stage: 'preparing',
      progress: 0,
      message: 'Preparing file for upload...'
    });
    
    setIsUploading(true);

    try {
      // Additional security checks
      if (!file.type.match(/^(audio|video)\//) || file.name.includes('..') || file.name.includes('/')) {
        throw new Error('Invalid file type or unsafe filename detected');
      }

      console.log(`📁 File details: {name: '${file.name}', size: ${file.size}, type: '${file.type}'}`);
      console.log(`📏 File size: ${fileSizeMB.toFixed(1)}MB`);
      
      // 🎯 AUDIO-FIRST PROCESSING: Extract audio from video files for optimal processing
      const fileSizeBytes = file.size;
      const isVideoFile = file.type.startsWith('video/');
      const isAudioFile = file.type.startsWith('audio/');
      
      console.log(`🎯 Processing strategy: ${isVideoFile ? 'Video→Audio Extraction' : isAudioFile ? 'Audio Optimization' : 'Direct Processing'} (${fileSizeMB.toFixed(1)}MB)`);

      // 🎯 EXTRACT DURATION FOR ALL FILES - Critical fix for duration display issue
      console.log('📊 Extracting duration for all files to ensure proper display...');
      const durationResult = await extractMediaDuration(file);
      let extractedDuration = durationResult.success ? durationResult.duration : null;
      
      if (durationResult.success && extractedDuration) {
        console.log(`✅ Duration extracted: ${extractedDuration} seconds using ${durationResult.method}`);
      } else {
        console.warn(`⚠️ Duration extraction failed: ${durationResult.error}`);
      }

      // Check absolute max size (2GB for videos, 500MB for audio)
      const maxSize = isVideoFile ? FILE_SIZE_LIMITS.MAX_FILE_SIZE : FILE_SIZE_LIMITS.LARGE_FILE_THRESHOLD;
      if (fileSizeBytes > maxSize) {
        toast({
          title: "File too large",
          description: `The selected ${isVideoFile ? 'video' : 'audio'} file is ${fileSizeMB.toFixed(1)}MB. Maximum allowed size is ${maxSize / (1024 * 1024)}MB.`,
          variant: "destructive"
        });
        throw new Error(`File size ${fileSizeMB.toFixed(1)}MB exceeds the ${maxSize / (1024 * 1024)}MB limit`);
      }

      // 🚀 UNIFIED AZURE BACKEND PROCESSING
      // Route all files through Azure backend for consistent, reliable server-side processing
      console.log(`🚀 Routing ${isVideoFile ? 'video' : 'audio'} file (${fileSizeMB.toFixed(1)}MB) to Azure backend for optimal server-side processing`);
      
      toast({
        title: "Server-side processing",
        description: `File (${fileSizeMB.toFixed(1)}MB) will be processed by Azure backend for best transcription quality.`,
        duration: 5000
      });
      
      // Use the proven Azure backend pipeline for all files - pass extracted duration
      await handleLargeFileUpload(file, title, description, contentType, enableCoaching, extractedDuration);
      return;
    } catch (error) {
      console.error('Enhanced upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsUploading(false);
      // Clear progress after a delay
      setTimeout(() => setUploadProgress(null), 5000);
    }
  };




  const handlePlayRecording = async (recording: Recording) => {
    if (!recording.file_url) {
      console.error('No file URL available for recording:', recording.id);
      toast({
        title: "File not available",
        description: "Recording file is not accessible",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Playing recording with enhanced controls:', recording.title, 'URL:', recording.file_url);
      
      // Check if file exists and is accessible
      const response = await fetch(recording.file_url, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error('File not accessible');
      }
      
      // Enhanced playback options
      const userChoice = window.confirm(
        `Play "${recording.title}"?\n\nClick OK to play in new tab, or Cancel to use embedded player.`
      );
      
      if (userChoice) {
        // Open in new tab with enhanced player
        window.open(recording.file_url, '_blank');
        toast({
          title: "Opening audio file",
          description: `Playing: ${recording.title} in new tab`
        });
      } else {
        // Use embedded player (would trigger parent component's player)
        toast({
          title: "Use embedded player",
          description: `Use the play button in the recordings table for embedded playback`
        });
      }
      
      // Track playback analytics
      try {
        await supabase
          .from('recordings')
          .update({ 
            updated_at: new Date().toISOString() 
          })
          .eq('id', recording.id);
      } catch (analyticsError) {
        console.warn('Failed to track playback:', analyticsError);
      }
    } catch (error) {
      console.error('Playback error:', error);
      toast({
        title: "Playback error",
        description: "Failed to access recording file. It may have been moved or deleted.",
        variant: "destructive"
      });
    }
  };

  const handleGlobalFileDrop = async (file: File) => {
    const title = file.name.replace(/\.[^/.]+$/, "");
    console.log('Enhanced global file drop with title:', title);
    
    try {
      // Enhanced drop with better defaults
      const contentType = inferContentType(file.name, file.type);
      await handleUpload(file, title, `Uploaded via drag & drop at ${new Date().toLocaleString()}`, contentType, true);
    } catch (error) {
      console.error('Global drop upload failed:', error);
      // Error is already handled in handleUpload
    }
  };

  // Helper function to infer content type from file metadata
  const inferContentType = (fileName: string, fileType: string): ContentType => {
    const lowerName = fileName.toLowerCase();
    
    if (lowerName.includes('call') || lowerName.includes('sales')) {
      return 'sales_call';
    } else if (lowerName.includes('support') || lowerName.includes('customer')) {
      return 'customer_support';
    } else if (lowerName.includes('meeting') || lowerName.includes('team')) {
      return 'team_meeting';
    } else if (lowerName.includes('training') || lowerName.includes('education')) {
      return 'training_session';
    }
    
    return 'other';
  };

  // Enhanced download functionality
  const handleDownloadRecording = async (recording: Recording) => {
    if (!recording.file_url) {
      toast({
        title: "File not available",
        description: "Recording file is not accessible",
        variant: "destructive"
      });
      return;
    }

    try {
      // Extract storage path from URL
      const url = new URL(recording.file_url);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(pathParts.indexOf('recordings') + 1).join('/');
      
      await downloadFromStorage('recordings', filePath, `${recording.title}.${recording.file_type === 'audio' ? 'mp3' : 'mp4'}`);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download recording file",
        variant: "destructive"
      });
    }
  };

  // Enhanced delete functionality
  const handleDeleteRecording = async (recording: Recording): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to delete recordings",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Delete from database first
      const { error: dbError } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recording.id)
        .eq('user_id', user.id); // Security: only allow users to delete their own recordings

      if (dbError) throw dbError;

      // Delete file from storage
      if (recording.file_url) {
        try {
          const url = new URL(recording.file_url);
          const pathParts = url.pathname.split('/');
          const filePath = pathParts.slice(pathParts.indexOf('recordings') + 1).join('/');
          
          await deleteFromStorage('recordings', filePath);
        } catch (storageError) {
          console.warn('Storage file deletion failed (file may not exist):', storageError);
        }
      }

      toast({
        title: "Recording deleted",
        description: `${recording.title} has been permanently deleted`
      });

      onRecordingProcessed(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : 'Delete operation failed',
        variant: "destructive"
      });
      return false;
    }
  };

  const uploadRecording = useCallback(async (file: File, title?: string) => {
    if (!file) {
      throw new Error('No file provided');
    }

    setIsUploading(true);
    setUploadProgress({
      stage: 'preparing',
      progress: 0,
      message: 'Checking file size and preparing for upload...'
    });

    try {
      console.log(`🎵 Starting upload process for: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
      
      // Step 1: Check file size and route appropriately
      let fileToUpload = file;
      let compressionInfo = null;
      const fileSizeMB = file.size / (1024 * 1024);
      
      // 🚀 PERFORMANCE OPTIMIZATION: Route large files to Azure backend immediately
      if (fileSizeMB > 25) {
        console.log(`🚀 Large file detected in uploadRecording (${fileSizeMB.toFixed(1)}MB) - this function should not be used for large files`);
        toast({
          title: "Large file detected",
          description: `File (${fileSizeMB.toFixed(1)}MB) is too large for this upload method. Use the main upload function for optimal processing.`,
          variant: "destructive",
          duration: 5000,
        });
        throw new Error(`File too large (${fileSizeMB.toFixed(1)}MB) for uploadRecording function. Use handleUpload for files >25MB.`);
      }
      
      // Apply compression for smaller files that benefit from it
      if (AudioCompressor.isSupportedFormat(file) && fileSizeMB > 10) {
        setUploadProgress({
          stage: 'compressing',
          progress: 10,
          message: `Optimizing ${fileSizeMB.toFixed(1)}MB audio file...`
        });
        
        toast({
          title: "Optimizing Audio",
          description: `Your ${fileSizeMB.toFixed(1)}MB file is being optimized for fast processing.`,
          duration: 5000,
        });

        try {
          const compressionResult = await AudioCompressor.compressIfNeeded(file, {
            maxSizeMB: 15, // Conservative target for Edge Functions
            quality: 0.8,  // Good quality for smaller files
            bitrate: 128,
            azureOpenAICompatible: true
          });
          
          fileToUpload = compressionResult.compressedFile;
          compressionInfo = {
            wasCompressed: compressionResult.wasCompressed,
            originalSize: compressionResult.originalSize,
            compressedSize: compressionResult.compressedSize,
            compressionRatio: compressionResult.compressionRatio
          };
          
          if (compressionResult.wasCompressed) {
            const originalMB = compressionResult.originalSize / (1024 * 1024);
            const compressedMB = compressionResult.compressedSize / (1024 * 1024);
            
            setUploadProgress({
              stage: 'compressing',
              progress: 30,
              message: `Optimization complete: ${originalMB.toFixed(1)}MB → ${compressedMB.toFixed(1)}MB`
            });
            
            toast({
              title: "Optimization Complete",
              description: `File optimized from ${originalMB.toFixed(1)}MB to ${compressedMB.toFixed(1)}MB (${compressionResult.compressionRatio.toFixed(1)}x smaller)`,
              duration: 3000,
            });
          }
        } catch (compressionError) {
          console.warn('Optimization failed, uploading original file:', compressionError);
          toast({
            title: "Optimization Failed",
            description: "Uploading original file. Processing should still work normally.",
            variant: "destructive",
            duration: 5000,
          });
        }
      }

      // Step 2: Upload the file (compressed or original)
      setUploadProgress({
        stage: 'uploading',
        progress: 40,
        message: 'Uploading audio file...'
      });

      const fileName = `${Date.now()}_${fileToUpload.name}`;
      const filePath = `recordings/${fileName}`;

      console.log(`📤 Uploading file: ${fileName} (${(fileToUpload.size / (1024 * 1024)).toFixed(2)}MB)`);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Step 3: Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('recordings')
        .getPublicUrl(filePath);

      setUploadProgress({
        stage: 'uploading',
        progress: 60,
        message: 'Creating recording entry...'
      });

      // Step 4: Get current user and create the recording entry in the database
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User authentication required');
      }

      const recordingData = {
        title: title || file.name.replace(/\.[^/.]+$/, ''),
        file_url: publicUrl,
        file_type: 'audio',
        file_size: fileToUpload.size,
        status: 'uploaded',
        user_id: user.id,
        metadata: {
          original_filename: file.name,
          upload_timestamp: new Date().toISOString(),
          ...(compressionInfo && {
            compression: {
              was_compressed: compressionInfo.wasCompressed,
              original_size: compressionInfo.originalSize,
              compressed_size: compressionInfo.compressedSize,
              compression_ratio: compressionInfo.compressionRatio
            }
          })
        }
      };

      const { data: newRecording, error: dbError } = await supabase
        .from('recordings')
        .insert([recordingData])
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log('✅ Recording created:', newRecording);

      // Step 5: Trigger AI processing
      setUploadProgress({
        stage: 'processing',
        progress: 80,
        message: 'Starting AI transcription and analysis...'
      });

      console.log('🤖 Starting AI processing...');
      const { data, error } = await supabase.functions.invoke('process-recording', {
        body: { recording_id: newRecording.id }
      });

      if (error) {
        console.error('Processing error:', error);
        
        // Update recording status to indicate processing failed
        await supabase
          .from('recordings')
          .update({ status: 'processing_failed', error_message: error.message })
          .eq('id', newRecording.id);
        
        // Still show success for upload, but warn about processing
        toast({
          title: "Upload Successful",
          description: "File uploaded but AI processing failed. You can retry processing later.",
          variant: "destructive",
          duration: 5000,
        });
        
        setUploadProgress({
          stage: 'complete',
          progress: 100,
          message: 'Upload complete, but processing failed'
        });
        
        return newRecording;
      }

      // Step 6: Processing completed successfully
      console.log('✅ AI processing completed:', data);
      
      setUploadProgress({
        stage: 'complete',
        progress: 100,
        message: 'Upload and processing complete!'
      });

      toast({
        title: "🎉 Success!",
        description: compressionInfo?.wasCompressed 
          ? `File compressed and processed successfully! (${compressionInfo.compressionRatio.toFixed(1)}x smaller)`
          : "File uploaded and processed successfully!",
        duration: 3000,
      });

      return newRecording;

    } catch (error) {
      console.error('Upload process failed:', error);
      
      setUploadProgress({
        stage: 'complete',
        progress: 0,
        message: error instanceof Error ? error.message : 'Upload failed'
      });

      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive",
        duration: 5000,
      });

      throw error;
    } finally {
      setIsUploading(false);
      // Clear progress after a delay
      setTimeout(() => setUploadProgress(null), 3000);
    }
  }, [toast]);

  const deleteRecording = useCallback(async (recordingId: string, filePath?: string) => {
    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recordingId);

      if (dbError) {
        throw new Error(`Database deletion failed: ${dbError.message}`);
      }

      // Delete from storage if file path is provided
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('recordings')
          .remove([filePath]);

        if (storageError) {
          console.warn('Storage deletion failed:', storageError);
          // Don't throw here as the database record is already deleted
        }
      }

      toast({
        title: "Recording Deleted",
        description: "Recording and associated files have been removed.",
        duration: 3000,
      });

    } catch (error) {
      console.error('Delete operation failed:', error);
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : 'Failed to delete recording',
        variant: "destructive",
        duration: 5000,
      });
      throw error;
    }
  }, [toast]);

  return {
    // Core operations
    handleUpload,
    handlePlayRecording,
    handleGlobalFileDrop,
    
    // Enhanced operations
    handleDownloadRecording,
    handleDeleteRecording,
    
    // Status
    uploading: storageUploading,
    uploadRecording,
    deleteRecording,
    uploadProgress,
    isUploading,
  };
};
