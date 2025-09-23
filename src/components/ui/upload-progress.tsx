
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UploadProgressProps {
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  fileName: string;
  onCancel?: () => void;
  error?: string;
}

export function UploadProgress({ 
  progress, 
  status, 
  fileName, 
  onCancel, 
  error 
}: UploadProgressProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Upload className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Failed';
      default:
        return 'Preparing...';
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      case 'processing':
        return 'bg-yellow-600';
      default:
        return 'bg-blue-600';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
              {fileName}
            </p>
            <p className="text-xs text-gray-500">{getStatusText()}</p>
          </div>
        </div>
        {onCancel && status !== 'completed' && status !== 'error' && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {status !== 'completed' && status !== 'error' && (
        <div className="space-y-1">
          <Progress 
            value={progress} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{Math.round(progress)}%</span>
            <span>{status === 'processing' ? 'Analyzing...' : 'Uploading...'}</span>
          </div>
        </div>
      )}

      {error && status === 'error' && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {status === 'completed' && (
        <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded">
          Upload completed successfully
        </div>
      )}
    </div>
  );
}
