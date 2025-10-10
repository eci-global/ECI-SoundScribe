import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useSupportMode } from '@/contexts/SupportContext';
import {
  Upload,
  FileAudio,
  FileVideo,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkUploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface BulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, title: string, description: string, contentType?: any, enableCoaching?: boolean) => Promise<void>;
}

export default function BulkUploadModal({ open, onClose, onUpload }: BulkUploadModalProps) {
  const [files, setFiles] = useState<BulkUploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  // Get current application mode from context
  const { currentMode } = useSupportMode();

  // Helper function to determine default content type based on mode
  const getDefaultContentType = () => {
    if (currentMode === 'sales') return 'sales_call';
    if (currentMode === 'support') return 'customer_support';
    return 'other';
  };

  const handleFileDrop = useCallback((droppedFiles: File[]) => {
    const newFiles: BulkUploadFile[] = droppedFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
    
    toast({
      title: `${droppedFiles.length} file(s) added`,
      description: `Ready for bulk upload`
    });
  }, [toast]);

  const { isDragOver, getRootProps, getInputProps } = useDragAndDrop({
    onFileDrop: handleFileDrop,
    multiple: true,
    maxSize: 2 * 1024 * 1024 * 1024 // 2GB limit
  });

  // Handle file input change for browse button
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const filesArray = Array.from(selectedFiles);
      handleFileDrop(filesArray);
    }
    // Reset the input value so the same file can be selected again
    event.target.value = '';
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const startBulkUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = files.length;
      let completedFiles = 0;

      // Process files in batches to avoid overwhelming the system
      const BATCH_SIZE = 3;
      
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (fileItem) => {
          try {
            const fileTitle = fileItem.file.name.replace(/\.[^/.]+$/, "");
            await onUpload(fileItem.file, fileTitle, '', getDefaultContentType(), true);
            completedFiles++;
            setUploadProgress((completedFiles / totalFiles) * 100);
          } catch (error) {
            console.error(`Error uploading ${fileItem.file.name}:`, error);
            completedFiles++;
            setUploadProgress((completedFiles / totalFiles) * 100);
            throw error;
          }
        });

        // Wait for current batch to complete before starting next batch
        await Promise.allSettled(batchPromises);
      }

      toast({
        title: "Bulk upload completed!",
        description: `${files.length} files uploaded successfully`
      });
      
      // Reset and close
      setTimeout(() => {
        setFiles([]);
        setIsUploading(false);
        setUploadProgress(0);
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast({
        title: "Bulk upload failed",
        description: "Some files failed to upload. Please try again.",
        variant: "destructive"
      });
      setIsUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('audio/')) {
      return <FileAudio className="w-4 h-4 text-blue-500" />;
    } else if (file.type.startsWith('video/')) {
      return <FileVideo className="w-4 h-4 text-purple-500" />;
    }
    return <FileAudio className="w-4 h-4 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl bg-white border border-eci-gray-200 shadow-xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-eci-gray-200 flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-semibold text-eci-gray-800 flex items-center gap-2">
            <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-eci-red" />
            Bulk Upload
          </DialogTitle>
          <DialogDescription className="text-eci-gray-600 text-xs sm:text-sm">
            Upload multiple audio or video files at once with drag & drop
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 sm:py-3">
          {/* File Upload Area */}
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer",
                isDragOver
                  ? "border-eci-red bg-eci-red/5"
                  : "border-eci-gray-300 hover:border-eci-gray-400 hover:bg-eci-gray-50"
              )}
            >
              <input {...getInputProps()} onChange={handleFileInputChange} />
              
              <Upload className="w-8 h-8 text-eci-gray-400 mx-auto mb-2" />
              <p className="text-sm text-eci-gray-600 mb-1">
                {isDragOver ? "Drop files here" : "Drag & drop files here, or click to browse"}
              </p>
              <p className="text-xs text-eci-gray-500">
                Supports MP3, WAV, MP4, MOV, AVI, MKV up to 2GB each
              </p>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={(e) => {
                  e.stopPropagation();
                  // Find the file input within this component
                  const fileInput = e.currentTarget.parentElement?.querySelector('input[type="file"]');
                  if (fileInput) {
                    fileInput.click();
                  }
                }}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Browse Files
              </Button>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-eci-gray-800">
                    Files ({files.length})
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFiles([])}
                    disabled={isUploading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {files.map((fileItem) => (
                    <div
                      key={fileItem.id}
                      className="flex items-center gap-3 p-3 bg-eci-gray-50 rounded-lg border border-eci-gray-200"
                    >
                      {getFileIcon(fileItem.file)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-eci-gray-800 truncate">
                            {fileItem.file.name}
                          </p>
                          <span className="text-xs text-eci-gray-500">
                            {formatFileSize(fileItem.file.size)}
                          </span>
                        </div>
                        
                        {fileItem.error && (
                          <p className="text-xs text-red-500 mt-1">{fileItem.error}</p>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(fileItem.id)}
                        disabled={isUploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Overall Progress */}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-eci-gray-800">
                        Overall Progress
                      </span>
                      <span className="text-sm text-eci-gray-600">
                        {Math.round(uploadProgress)}%
                      </span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 border-t border-eci-gray-100 bg-white">
          <div className="flex gap-2 sm:gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isUploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="button"
              disabled={files.length === 0 || isUploading}
              onClick={startBulkUpload}
              className="flex-1 bg-eci-red hover:bg-eci-red-dark text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {files.length} File{files.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 