
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface StorageFile {
  id: string;
  name: string;
  path: string;
  size: number;
  created_at: string;
  updated_at: string;
  metadata?: any;
  bucket_id: string;
  owner?: string;
}

export interface StorageBucket {
  id: string;
  name: string;
  public: boolean;
  created_at: string;
  updated_at: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const useStorageOperations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());

  // List all buckets
  const getBuckets = useCallback(async (): Promise<StorageBucket[]> => {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching buckets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch storage buckets",
        variant: "destructive"
      });
      return [];
    }
  }, [toast]);

  // List files in a bucket
  const listFiles = useCallback(async (bucketId: string, path: string = ''): Promise<StorageFile[]> => {
    try {
      const { data, error } = await supabase.storage
        .from(bucketId)
        .list(path, {
          limit: 100,
          offset: 0
        });
      
      if (error) throw error;
      
      return (data || []).map(file => ({
        id: `${bucketId}/${path}${file.name}`,
        name: file.name,
        path: path ? `${path}/${file.name}` : file.name,
        size: file.metadata?.size || 0,
        created_at: file.created_at || new Date().toISOString(),
        updated_at: file.updated_at || new Date().toISOString(),
        metadata: file.metadata,
        bucket_id: bucketId,
        owner: file.metadata?.owner
      }));
    } catch (error) {
      console.error('Error listing files:', error);
      toast({
        title: "Error",
        description: `Failed to list files in ${bucketId}`,
        variant: "destructive"
      });
      return [];
    }
  }, [toast]);

  // Upload file with progress tracking
  const uploadFile = useCallback(async (
    file: File, 
    bucketId: string, 
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string | null> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload files",
        variant: "destructive"
      });
      return null;
    }

    setUploading(true);
    try {
      // Validate file size (2GB limit)
      const maxSize = 2 * 1024 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 2GB.');
      }

      // Create unique filename with user folder structure and proper sanitization
      const fileExt = file.name.split('.').pop();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
      const uniqueName = `${user.id}/${Date.now()}_${sanitizedName}`;
      const fullPath = path ? `${path}/${uniqueName}` : uniqueName;

      console.log('Uploading file with sanitized path:', fullPath);
      console.log('File details:', {
        name: file.name,
        size: formatBytes(file.size),
        type: file.type
      });

      // Upload with progress tracking
      const { data, error } = await supabase.storage
        .from(bucketId)
        .upload(fullPath, file, {
          cacheControl: '3600',
          upsert: false,
          metadata: {
            userId: user.id,
            originalName: file.name,
            mimeType: file.type,
            uploadedAt: new Date().toISOString(),
            fileSize: file.size.toString()
          }
        });

      if (error) throw error;

      toast({
        title: "Upload successful",
        description: `${file.name} uploaded successfully`
      });

      return data.path;
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
    }
  }, [user, toast]);

  // Download file
  const downloadFile = useCallback(async (bucketId: string, path: string, filename?: string): Promise<void> => {
    setDownloadingFiles(prev => new Set([...prev, path]));
    try {
      const { data, error } = await supabase.storage
        .from(bucketId)
        .download(path);

      if (error) throw error;
      if (!data) throw new Error('No file data received');

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || path.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: `Downloading ${filename || path.split('/').pop()}`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : 'Download failed',
        variant: "destructive"
      });
    } finally {
      setDownloadingFiles(prev => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    }
  }, [toast]);

  // Delete file
  const deleteFile = useCallback(async (bucketId: string, path: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to delete files",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase.storage
        .from(bucketId)
        .remove([path]);

      if (error) throw error;

      toast({
        title: "File deleted",
        description: `Successfully deleted ${path.split('/').pop()}`
      });
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : 'Delete failed',
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  // Get public URL for file
  const getPublicUrl = useCallback((bucketId: string, path: string): string => {
    const { data } = supabase.storage
      .from(bucketId)
      .getPublicUrl(path);
    return data.publicUrl;
  }, []);

  // Move/rename file
  const moveFile = useCallback(async (
    bucketId: string, 
    fromPath: string, 
    toPath: string
  ): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to move files",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase.storage
        .from(bucketId)
        .move(fromPath, toPath);

      if (error) throw error;

      toast({
        title: "File moved",
        description: `Moved to ${toPath}`
      });
      return true;
    } catch (error) {
      console.error('Move error:', error);
      toast({
        title: "Move failed",
        description: error instanceof Error ? error.message : 'Move failed',
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  // Create folder
  const createFolder = useCallback(async (
    bucketId: string, 
    path: string, 
    folderName: string
  ): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to create folders",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Create an empty .keep file to represent the folder
      const folderPath = path ? `${path}/${folderName}/.keep` : `${folderName}/.keep`;
      const emptyFile = new Blob([''], { type: 'text/plain' });
      
      const { error } = await supabase.storage
        .from(bucketId)
        .upload(folderPath, emptyFile);

      if (error) throw error;

      toast({
        title: "Folder created",
        description: `Created folder: ${folderName}`
      });
      return true;
    } catch (error) {
      console.error('Create folder error:', error);
      toast({
        title: "Create folder failed",
        description: error instanceof Error ? error.message : 'Create folder failed',
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  // Get storage usage statistics
  const getStorageStats = useCallback(async (bucketId?: string) => {
    try {
      let totalSize = 0;
      let fileCount = 0;
      
      if (bucketId) {
        const files = await listFiles(bucketId);
        totalSize = files.reduce((sum, file) => sum + file.size, 0);
        fileCount = files.length;
      } else {
        // Get stats for all buckets
        const buckets = await getBuckets();
        for (const bucket of buckets) {
          const files = await listFiles(bucket.id);
          totalSize += files.reduce((sum, file) => sum + file.size, 0);
          fileCount += files.length;
        }
      }

      return {
        totalSize,
        fileCount,
        formattedSize: formatBytes(totalSize)
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalSize: 0,
        fileCount: 0,
        formattedSize: '0 Bytes'
      };
    }
  }, [getBuckets, listFiles]);

  // Helper function to format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return {
    // State
    uploading,
    downloadingFiles,
    
    // Operations
    getBuckets,
    listFiles,
    uploadFile,
    downloadFile,
    deleteFile,
    moveFile,
    createFolder,
    getPublicUrl,
    getStorageStats
  };
};
