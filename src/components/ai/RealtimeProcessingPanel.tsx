import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Zap, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Pause,
  Play,
  AlertCircle 
} from 'lucide-react';
import { useRealtimeAI } from '@/hooks/useRealtimeAI';
import { cn } from '@/lib/utils';

export default function RealtimeProcessingPanel({ className }: { className?: string }) {
  const { 
    processingQueue, 
    isProcessing, 
    cancelProcessing, 
    retryProcessing 
  } = useRealtimeAI();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'transcribing':
      case 'analyzing':
      case 'coaching':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Brain className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued':
        return 'bg-blue-100 text-blue-800';
      case 'transcribing':
      case 'analyzing':
      case 'coaching':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'queued': return 'Queued';
      case 'transcribing': return 'Transcribing';
      case 'analyzing': return 'Analyzing';
      case 'coaching': return 'Coaching Analysis';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  if (processingQueue.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4" />
            AI Processing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Brain className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">No active AI processing</p>
            <p className="text-xs text-gray-400 mt-1">
              Upload recordings to see real-time AI analysis
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Processing
            {isProcessing && (
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {processingQueue.length} active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {processingQueue.map((item) => (
            <div
              key={item.recordingId}
              className="border border-gray-200 rounded-lg p-3 space-y-3"
            >
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(item.status)}
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs", getStatusColor(item.status))}
                  >
                    {formatStatus(item.status)}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1">
                  {item.status === 'failed' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => retryProcessing(item.recordingId)}
                      className="h-6 px-2 text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  )}
                  
                  {(item.status === 'queued' || 
                    item.status === 'transcribing' || 
                    item.status === 'analyzing' || 
                    item.status === 'coaching') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancelProcessing(item.recordingId)}
                      className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                    >
                      <Pause className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {item.status !== 'completed' && item.status !== 'failed' && (
                <div className="space-y-1">
                  <Progress value={item.progress} className="h-2" />
                  <p className="text-xs text-gray-600">{item.currentStep}</p>
                </div>
              )}

              {/* Error Message */}
              {item.status === 'failed' && item.error && (
                <div className="flex items-start gap-2 p-2 bg-red-50 rounded border border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-red-800">Processing Failed</p>
                    <p className="text-xs text-red-600 mt-1">{item.error}</p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {item.status === 'completed' && (
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-green-800">
                    AI processing completed successfully
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 