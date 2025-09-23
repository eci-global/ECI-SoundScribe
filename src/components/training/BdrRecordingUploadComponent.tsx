/**
 * BDR Recording Upload Component
 * 
 * Comprehensive interface for uploading BDR training audio recordings that pairs with
 * Excel scorecard uploads. Includes title matching validation, batch upload capability,
 * and clear instructions for proper audio-scorecard pairing.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileAudio, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  X,
  Eye,
  Settings,
  RefreshCw,
  Target,
  FileVideo,
  Info,
  Plus,
  Trash2,
  FolderOpen,
  BookOpen,
  Link
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BDRTrainingProgram } from '@/types/bdr-training';
import { toast } from 'sonner';
import { extractFilenameWithoutExtension, getMatchPreview } from '@/utils/titleMatcher';
import { ContentType } from '@/components/dashboard/UploadModal';

interface BdrRecordingUploadComponentProps {
  trainingProgram: BDRTrainingProgram;
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: string) => void;
  onUpload: (
    file: File, 
    title: string, 
    description: string, 
    contentType?: ContentType, 
    enableCoaching?: boolean
  ) => Promise<void>;
}

interface RecordingFile {
  file: File;
  id: string;
  title: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  matchPreview?: {
    exactMatches: number;
    potentialMatches: number;
    filenameWithoutExtension: string;
  };
}

interface UploadStatus {
  status: 'idle' | 'uploading' | 'completed' | 'error';
  progress: number;
  message: string;
  completedFiles: number;
  totalFiles: number;
}

export function BdrRecordingUploadComponent({ 
  trainingProgram, 
  onUploadComplete, 
  onUploadError,
  onUpload 
}: BdrRecordingUploadComponentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recordingFiles, setRecordingFiles] = useState<RecordingFile[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    progress: 0,
    message: '',
    completedFiles: 0,
    totalFiles: 0
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const [enableBatchMode, setEnableBatchMode] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  const validateAudioFile = (file: File): string | null => {
    // Check file type - audio or video files
    const validTypes = ['audio/', 'video/'];
    const isValidType = validTypes.some(type => file.type.startsWith(type));
    
    if (!isValidType) {
      return 'Please select an audio or video file (.mp3, .wav, .mp4, .mov, etc.)';
    }

    // Check file size (500MB limit)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File size must be less than 500MB';
    }

    return null;
  };

  const generateCallIdentifier = (filename: string): string => {
    // Extract clean identifier from filename
    const withoutExtension = filename.replace(/\.(mp3|wav|mp4|mov|m4a|aac|flac|avi|mkv|webm)$/i, '');
    // Replace spaces and special chars with underscores, keep alphanumeric
    return withoutExtension.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  };

  const previewTitleMatching = async (filename: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const matchPreview = await getMatchPreview(filename, user?.id);
      
      return {
        exactMatches: matchPreview.exactMatchCount,
        potentialMatches: matchPreview.potentialMatches.length,
        filenameWithoutExtension: matchPreview.filenameWithoutExtension
      };
    } catch (error) {
      console.error('Error previewing title matches:', error);
      return {
        exactMatches: 0,
        potentialMatches: 0,
        filenameWithoutExtension: extractFilenameWithoutExtension(filename)
      };
    }
  };

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newRecordingFiles: RecordingFile[] = [];

    for (const file of fileArray) {
      const validationError = validateAudioFile(file);
      if (validationError) {
        toast.error(`${file.name}: ${validationError}`);
        continue;
      }

      // Generate title from filename
      const title = file.name.replace(/\.[^/.]+$/, "");
      
      // Preview title matching
      const matchPreview = await previewTitleMatching(file.name);

      const recordingFile: RecordingFile = {
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        title,
        status: 'pending',
        progress: 0,
        matchPreview
      };

      newRecordingFiles.push(recordingFile);
    }

    if (newRecordingFiles.length > 0) {
      setRecordingFiles(prev => [...prev, ...newRecordingFiles]);
      toast.success(`${newRecordingFiles.length} audio file(s) added for BDR training upload`);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const updateFileTitle = (fileId: string, newTitle: string) => {
    setRecordingFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, title: newTitle } : file
    ));
  };

  const removeFile = (fileId: string) => {
    setRecordingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearAllFiles = () => {
    setRecordingFiles([]);
    setUploadStatus({
      status: 'idle',
      progress: 0,
      message: '',
      completedFiles: 0,
      totalFiles: 0
    });
  };

  const uploadSingleFile = async (recordingFile: RecordingFile) => {
    try {
      // Generate call identifier for BDR training
      const callIdentifier = generateCallIdentifier(recordingFile.file.name);
      
      // Update file status
      setRecordingFiles(prev => prev.map(f => 
        f.id === recordingFile.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      // Embed training information in description since we can't pass trainingData
      const bdrDescription = `BDR training recording for program: ${trainingProgram.name} | Call ID: ${callIdentifier} | Program ID: ${trainingProgram.id}`;

      // Upload with BDR training data content type
      await onUpload(
        recordingFile.file,
        recordingFile.title,
        bdrDescription,
        'bdr_training_data',
        true // Enable coaching for BDR training
      );

      // Mark as completed
      setRecordingFiles(prev => prev.map(f => 
        f.id === recordingFile.id ? { ...f, status: 'completed', progress: 100 } : f
      ));

      return true;
    } catch (error) {
      console.error(`Error uploading ${recordingFile.file.name}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setRecordingFiles(prev => prev.map(f => 
        f.id === recordingFile.id ? { ...f, status: 'error', error: errorMessage } : f
      ));

      return false;
    }
  };

  const handleUpload = async () => {
    if (recordingFiles.length === 0) {
      toast.error('Please add audio files first');
      return;
    }

    // Validate training program
    if (!trainingProgram) {
      toast.error('Training program not selected');
      return;
    }

    try {
      setUploadStatus({
        status: 'uploading',
        progress: 0,
        message: 'Starting BDR recording uploads...',
        completedFiles: 0,
        totalFiles: recordingFiles.length
      });

      let completedFiles = 0;
      const totalFiles = recordingFiles.length;

      // Process files with concurrency control
      const BATCH_SIZE = 2; // Smaller batch for large audio files
      
      for (let i = 0; i < recordingFiles.length; i += BATCH_SIZE) {
        const batch = recordingFiles.slice(i, i + BATCH_SIZE);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (recordingFile) => {
          const success = await uploadSingleFile(recordingFile);
          if (success) {
            completedFiles++;
          }
          
          // Update overall progress
          const progress = (completedFiles / totalFiles) * 100;
          setUploadStatus(prev => ({
            ...prev,
            progress,
            message: `Uploaded ${completedFiles} of ${totalFiles} BDR recordings`,
            completedFiles
          }));
          
          return success;
        });

        // Wait for current batch to complete
        await Promise.allSettled(batchPromises);
      }

      // Final status
      const successfulUploads = completedFiles;
      const failedUploads = totalFiles - successfulUploads;

      if (failedUploads === 0) {
        setUploadStatus({
          status: 'completed',
          progress: 100,
          message: `All ${successfulUploads} BDR recordings uploaded successfully!`,
          completedFiles: successfulUploads,
          totalFiles
        });

        toast.success(`BDR training recordings uploaded successfully! You can now upload matching Excel scorecards.`);
        onUploadComplete?.({ 
          success: true, 
          uploadedFiles: successfulUploads,
          failedFiles: failedUploads 
        });
      } else {
        setUploadStatus({
          status: 'completed',
          progress: 100,
          message: `Completed: ${successfulUploads} successful, ${failedUploads} failed`,
          completedFiles: successfulUploads,
          totalFiles
        });

        toast.error(`Upload completed with ${failedUploads} failed files. Check individual file status below.`);
      }

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadStatus({
        status: 'error',
        progress: 0,
        message: errorMessage,
        completedFiles: 0,
        totalFiles: recordingFiles.length
      });

      onUploadError?.(errorMessage);
      toast.error(`Upload failed: ${errorMessage}`);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('audio/')) {
      return <FileAudio className="h-5 w-5 text-blue-600" />;
    } else if (file.type.startsWith('video/')) {
      return <FileVideo className="h-5 w-5 text-purple-600" />;
    }
    return <FileAudio className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: RecordingFile['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'uploading': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: RecordingFile['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'uploading': return <RefreshCw className="h-4 w-4 animate-spin" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Instructions Card */}
      {showInstructions && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <Info className="h-5 w-5" />
                <span>BDR Recording Upload Instructions</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInstructions(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Upload Audio Recordings First</h4>
                  <p className="text-blue-700 text-sm">
                    Upload your BDR call recordings (.mp3, .wav, .mp4, etc.) with titles that match your Excel scorecard file names.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Title Matching is Critical</h4>
                  <p className="text-blue-700 text-sm">
                    Audio file: <code className="bg-blue-100 px-1 rounded">BDR_Call_001.mp3</code> should match 
                    Excel file: <code className="bg-blue-100 px-1 rounded">BDR_Call_001.xlsx</code>
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Upload Excel Scorecards After</h4>
                  <p className="text-blue-700 text-sm">
                    Once recordings are uploaded, use the Excel upload section to upload matching scorecard data.
                    The system will automatically link them by title.
                  </p>
                </div>
              </div>
            </div>

            <Alert>
              <Link className="h-4 w-4" />
              <AlertDescription className="text-blue-700">
                <strong>Pro Tip:</strong> Upload audio files in batches of 5-10 for optimal performance. 
                Large files will be automatically compressed to reduce upload time.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileAudio className="h-5 w-5 text-blue-600" />
            <span>Upload BDR Training Recordings</span>
            <Badge variant="outline" className="ml-2">
              {trainingProgram.name}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {isDragOver ? 'Drop audio files here' : 'Upload BDR Training Recordings'}
            </p>
            <p className="text-gray-600 mb-4">
              Drop your audio/video files here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports .mp3, .wav, .mp4, .mov, .m4a and more up to 500MB each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              multiple
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Batch Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="batchMode"
                checked={enableBatchMode}
                onChange={(e) => setEnableBatchMode(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="batchMode" className="text-sm">
                Batch Mode (Upload multiple files at once)
              </Label>
            </div>
            
            {recordingFiles.length > 0 && (
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {recordingFiles.length} files ready
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFiles}
                  disabled={uploadStatus.status === 'uploading'}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {recordingFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <span>Selected Recordings ({recordingFiles.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-96 overflow-y-auto space-y-3">
              {recordingFiles.map((recordingFile) => (
                <div
                  key={recordingFile.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border"
                >
                  {getFileIcon(recordingFile.file)}
                  
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={recordingFile.title}
                        onChange={(e) => updateFileTitle(recordingFile.id, e.target.value)}
                        className="flex-1 h-8 text-sm"
                        disabled={recordingFile.status === 'uploading'}
                      />
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatFileSize(recordingFile.file.size)}
                      </span>
                    </div>
                    
                    {/* Title Match Preview */}
                    {recordingFile.matchPreview && (
                      <div className="flex items-center gap-2 text-xs">
                        <Target className="h-3 w-3 text-blue-500" />
                        <span className="text-gray-600">
                          Title matching: 
                        </span>
                        {recordingFile.matchPreview.exactMatches > 0 ? (
                          <Badge variant="default" className="text-xs">
                            ✓ {recordingFile.matchPreview.exactMatches} exact matches
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-yellow-700">
                            ⚠ No matches found
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Progress bar for uploading files */}
                    {recordingFile.status === 'uploading' && (
                      <Progress value={recordingFile.progress} className="h-2" />
                    )}

                    {/* Error message */}
                    {recordingFile.error && (
                      <p className="text-xs text-red-600">{recordingFile.error}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 ${getStatusColor(recordingFile.status)}`}>
                      {getStatusIcon(recordingFile.status)}
                      <span className="text-xs font-medium capitalize">
                        {recordingFile.status}
                      </span>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(recordingFile.id)}
                      disabled={recordingFile.status === 'uploading'}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {uploadStatus.status !== 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className={getStatusColor(uploadStatus.status === 'uploading' ? 'uploading' : uploadStatus.status === 'completed' ? 'completed' : 'error')}>
                {uploadStatus.status === 'uploading' && <RefreshCw className="h-5 w-5 animate-spin" />}
                {uploadStatus.status === 'completed' && <CheckCircle className="h-5 w-5" />}
                {uploadStatus.status === 'error' && <AlertCircle className="h-5 w-5" />}
              </div>
              <span>Upload Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{uploadStatus.message}</span>
                <span className="text-sm text-gray-600">
                  {uploadStatus.completedFiles}/{uploadStatus.totalFiles} files
                </span>
              </div>
              <Progress value={uploadStatus.progress} className="w-full" />
            </div>

            {uploadStatus.status === 'completed' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-700">
                  <strong>Upload Complete!</strong> Your BDR training recordings are now ready. 
                  You can proceed to upload the matching Excel scorecard data using the Excel upload section above.
                </AlertDescription>
              </Alert>
            )}

            {uploadStatus.status === 'error' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-700">
                  <strong>Upload Error:</strong> {uploadStatus.message}
                  Check individual file status above and try again.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Button */}
      {recordingFiles.length > 0 && uploadStatus.status === 'idle' && (
        <div className="flex justify-end">
          <Button 
            onClick={handleUpload}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload {recordingFiles.length} BDR Recording{recordingFiles.length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}