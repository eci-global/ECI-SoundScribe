
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Phone, User, Calendar } from 'lucide-react';
import type { Recording } from '@/types/recording';

interface OutreachCallHistoryProps {
  recordings: Recording[];
}

export default function OutreachCallHistory({ recordings }: OutreachCallHistoryProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: 'default' as const, label: 'Completed' },
      processing: { variant: 'secondary' as const, label: 'Processing' },
      uploading: { variant: 'secondary' as const, label: 'Uploading' },
      failed: { variant: 'destructive' as const, label: 'Failed' },
      pending: { variant: 'outline' as const, label: 'Pending' }
    };
    
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  if (!recordings.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5" />
            <span>Call History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No call recordings found</p>
            <p className="text-sm">Upload your first call recording to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Phone className="h-5 w-5" />
          <span>Recent Calls ({recordings.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recordings.map((recording) => {
            const statusInfo = getStatusBadge(recording.status);
            
            return (
              <div key={recording.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{recording.title}</h3>
                    {recording.description && (
                      <p className="text-sm text-gray-600 mb-2">{recording.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(recording.created_at)}</span>
                      </div>
                      {recording.duration && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(recording.duration)}</span>
                        </div>
                      )}
                      {recording.file_size && (
                        <span>{Math.round(recording.file_size / 1024 / 1024)} MB</span>
                      )}
                    </div>
                  </div>
                  <Badge variant={statusInfo.variant}>
                    {statusInfo.label}
                  </Badge>
                </div>

                {/* Analysis Summary */}
                {recording.status === 'completed' && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">AI Analysis:</span>
                        <span className="ml-2 text-gray-600">
                          {recording.ai_summary ? 'Complete' : 'Pending'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Coaching:</span>
                        <span className="ml-2 text-gray-600">
                          {recording.coaching_evaluation ? 'Available' : 'Not available'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Insights:</span>
                        <span className="ml-2 text-gray-600">
                          {recording.ai_insights ? 'Generated' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Processing Status */}
                {recording.status === 'processing' && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm text-blue-700">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      <span>Processing audio and generating insights...</span>
                    </div>
                  </div>
                )}

                {/* Failed Status */}
                {recording.status === 'failed' && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg">
                    <div className="text-sm text-red-700">
                      Processing failed. Please try uploading again.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
