
import React, { useRef } from 'react';
import { Upload, FileAudio, FileVideo, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';

interface ModernFileUploadProps {
  onFileSelect: (files: File[]) => void;
  selectedFile?: File | null;
  onFileRemove?: () => void;
  accept?: string[];
  multiple?: boolean;
  className?: string;
}

export const ModernFileUpload: React.FC<ModernFileUploadProps> = ({
  onFileSelect,
  selectedFile,
  onFileRemove,
  accept = ['audio/*', 'video/*'],
  multiple = false,
  className
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const { isDragOver, isDragActive, getRootProps, getInputProps } = useDragAndDrop({
    onFileDrop: onFileSelect,
    accept,
    multiple,
    maxSize: 2 * 1024 * 1024 * 1024 // 2GB limit
  });

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFileSelect(files);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('audio/')) return FileAudio;
    if (file.type.startsWith('video/')) return FileVideo;
    return Upload;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div
      {...getRootProps()}
      onClick={handleClick}
      className={cn(
        'relative overflow-hidden cursor-pointer transition-all duration-300 rounded-2xl border-2 border-dashed',
        'bg-white',
        isDragActive
          ? 'border-eci-red bg-eci-red/5 scale-[1.01] shadow-md'
          : 'border-eci-gray-300 hover:border-eci-gray-400 hover:bg-eci-gray-50',
        'min-h-[200px] flex flex-col items-center justify-center p-8',
        className
      )}
    >
      <input
        {...getInputProps()}
        ref={inputRef}
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      {selectedFile ? (
        <div className="flex flex-col items-center space-y-4 w-full">
          <div className="flex items-center justify-between w-full max-w-sm">
            <div className="flex items-center space-x-3">
              {React.createElement(getFileIcon(selectedFile), {
                className: "h-8 w-8 text-eci-red"
              })}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-eci-gray-800 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-eci-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            {onFileRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFileRemove();
                }}
                className="p-1 hover:bg-eci-red/10 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-eci-red" />
              </button>
            )}
          </div>
          <p className="text-xs text-eci-gray-500 text-center">
            Click or drag to replace file
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className={cn(
            'p-4 rounded-full transition-all duration-300',
            'bg-eci-gray-100',
            isDragActive && 'scale-110 bg-eci-red/10'
          )}>
            <Upload className={cn(
              'h-8 w-8 transition-colors duration-300',
              isDragActive ? 'text-eci-red' : 'text-eci-gray-500'
            )} />
          </div>
          
          <div className="space-y-2">
            <p className={cn(
              'text-lg font-semibold transition-colors duration-300',
              isDragActive ? 'text-eci-red' : 'text-eci-gray-700'
            )}>
              {isDragActive ? 'Drop files here' : 'Upload your recording'}
            </p>
            <p className="text-sm text-eci-gray-500">
              Drag and drop audio or video files, or click to browse
            </p>
            <p className="text-xs text-eci-gray-400">
              Supports MP3, WAV, MP4, MOV, AVI, MKV files up to 2GB
            </p>
          </div>
        </div>
      )}
      
      {/* Animated background effects */}
      <div className={cn(
        'absolute inset-0 bg-eci-red/10',
        'opacity-0 transition-opacity duration-300 rounded-2xl',
        isDragActive && 'opacity-100'
      )} />
    </div>
  );
};
