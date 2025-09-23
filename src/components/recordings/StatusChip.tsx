import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusChipProps {
  status: 'uploading' | 'processing' | 'processing_large_file' | 'transcribing' | 'transcribed' | 'transcription_failed' | 'completed' | 'failed';
  className?: string;
}

export default function StatusChip({ status, className }: StatusChipProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          label: 'Completed',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'processing':
        return {
          icon: Loader2,
          label: 'Processing',
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          animate: true
        };
      case 'processing_large_file':
        return {
          icon: Clock,
          label: 'Processing Large File',
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'transcribing':
        return {
          icon: Loader2,
          label: 'Transcribing',
          variant: 'secondary' as const,
          className: 'bg-purple-100 text-purple-800 border-purple-200',
          animate: true
        };
      case 'transcribed':
        return {
          icon: CheckCircle,
          label: 'Transcribed',
          variant: 'secondary' as const,
          className: 'bg-emerald-100 text-emerald-800 border-emerald-200'
        };
      case 'transcription_failed':
        return {
          icon: AlertCircle,
          label: 'Transcription Failed',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      case 'uploading':
        return {
          icon: Upload,
          label: 'Uploading',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      case 'failed':
        return {
          icon: AlertCircle,
          label: 'Failed',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      default:
        return {
          icon: Clock,
          label: 'Unknown',
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'flex items-center gap-1 text-xs font-medium',
        config.className,
        className
      )}
    >
      <Icon 
        className={cn(
          'w-3 h-3',
          config.animate && 'animate-spin'
        )} 
      />
      {config.label}
    </Badge>
  );
}