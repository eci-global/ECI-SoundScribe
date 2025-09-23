import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { useRecordingDetail } from '@/hooks/useRecordingDetail';
import SpotlightPage from '@/components/spotlight/SpotlightPage';
import { SpotlightProvider } from '@/contexts/SpotlightContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MemoryGuard from '@/components/MemoryGuard';
import { MemoizedSpeakerResolver } from '@/utils/memoizedSpeakerResolution';
import GongLayout from '@/components/layout/GongLayout';
import { GongNavSection } from '@/components/navigation/GongTopNav';
import { Button } from '@/components/ui/button';
import type { Recording } from '@/types/recording';

export default function RecordingDetail() {
  const { recordingId } = useParams<{ recordingId: string }>();
  const navigate = useNavigate();
  const [retryCount, setRetryCount] = useState(0);
  
  const { 
    data: recording, 
    isLoading, 
    error, 
    refetch,
    isRefetching 
  } = useRecordingDetail(recordingId!);

  // Simplified cleanup - removed aggressive memory operations
  const handleMemoryCleanup = () => {
    console.log('🧹 Simple cleanup in RecordingDetail');
    
    // Only clear specific cache for this recording
    if (recordingId) {
      MemoizedSpeakerResolver.clearCache(recordingId);
    }
  };

  // Handle retry
  const handleRetry = async () => {
    console.log('🔄 Retrying recording detail fetch');
    
    // Simple retry without aggressive cleanup
    refetch();
  };

  // Auto cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up RecordingDetail component');
      if (recordingId) {
        MemoizedSpeakerResolver.clearCache(recordingId);
      }
    };
  }, [recordingId]);

  const handleBackToList = () => {
    navigate('/outreach/recordings');
  };

  const handleNavigate = (section: GongNavSection) => {
    console.log('Navigating to section:', section);
    // Navigate to different sections while maintaining the layout
    switch (section) {
      case 'dashboard':
        navigate('/');
        break;
      case 'uploads':
        navigate('/uploads');
        break;
      case 'processing':
        navigate('/uploads?tab=queue');
        break;
      case 'assistant':
        navigate('/AssistantCoach');
        break;
      case 'summaries':
        navigate('/outreach/recordings');
        break;
      case 'analytics':
        navigate('/analytics');
        break;
      case 'notifications':
        navigate('/notifications');
        break;
      case 'help':
        navigate('/help');
        break;
      case 'admin':
        navigate('/admin');
        break;
      default:
        break;
    }
  };

  if (isLoading) {
    return (
      <MemoryGuard onMemoryCleanup={handleMemoryCleanup}>
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/outreach/recordings')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Recordings</span>
              </Button>
              <Skeleton className="h-6 w-64" />
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
              </div>
            </div>
          </div>
        </div>
      </MemoryGuard>
    );
  }

  if (error) {
    return (
      <MemoryGuard onMemoryCleanup={handleMemoryCleanup}>
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/outreach/recordings')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Recordings</span>
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Recording Error</h1>
            </div>
          </div>
          
          <div className="p-6">
            <Alert className="max-w-2xl">
              <AlertDescription className="space-y-4">
                <div>
                  <p className="font-medium text-red-800">Failed to load recording</p>
                  <p className="text-sm text-red-700 mt-1">
                    {error?.message || 'An unexpected error occurred while loading the recording.'}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={handleRetry}
                    disabled={isRefetching}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                    <span>{isRefetching ? 'Retrying...' : 'Try Again'}</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => navigate('/outreach/recordings')}
                  >
                    Back to Recordings
                  </Button>
                </div>
                
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>Troubleshooting tips:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Check your internet connection</li>
                    <li>Try refreshing the page</li>
                    <li>Clear your browser cache</li>
                    <li>Contact support if the issue persists</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </MemoryGuard>
    );
  }

  if (!recording) {
    return (
      <MemoryGuard onMemoryCleanup={handleMemoryCleanup}>
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/outreach/recordings')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Recordings</span>
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Recording Not Found</h1>
            </div>
          </div>
          
          <div className="p-6">
            <Alert className="max-w-2xl">
              <AlertDescription>
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-gray-800">Recording not found</p>
                    <p className="text-sm text-gray-600 mt-1">
                      The recording you're looking for doesn't exist or you don't have permission to view it.
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => navigate('/outreach/recordings')}
                  >
                    Back to Recordings
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </MemoryGuard>
    );
  }

  return (
    <MemoryGuard onMemoryCleanup={handleMemoryCleanup}>
      <GongLayout onNavigate={handleNavigate}>
        <SpotlightProvider>
          <SpotlightPage 
            key={`${recordingId}-${retryCount}`} // Force re-render on retry
            recording={recording}
            onRecordingUpdate={() => {
              console.log('🔄 Recording updated, refetching...');
              refetch();
            }}
          />
        </SpotlightProvider>
      </GongLayout>
    </MemoryGuard>
  );
}
