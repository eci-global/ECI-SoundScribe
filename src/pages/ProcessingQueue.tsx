import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle, FileText, Activity, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { createSafeChannel, removeChannel } from '@/utils/realtimeUtils';
import { useToast } from '@/hooks/use-toast';
import StandardLayout from '@/components/layout/StandardLayout';
import type { Recording } from '@/types/recording';

export default function ProcessingQueue() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProcessingRecordings();
    
    // Set up real-time subscription
    const channelName = 'recordings-processing';
    const channel = createSafeChannel(channelName);
    
    if (channel) {
      channel
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'recordings' },
          () => fetchProcessingRecordings()
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        removeChannel(channelName);
      }
    };
  }, []);

  const fetchProcessingRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .in('status', ['uploading', 'processing', 'failed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Properly type the data to match Recording interface
      const typedRecordings: Recording[] = (data || []).map(record => ({
        ...record,
        file_type: record.file_type as 'audio' | 'video',
        status: record.status as 'uploading' | 'processing' | 'completed' | 'failed',
        coaching_evaluation: record.coaching_evaluation 
          ? (typeof record.coaching_evaluation === 'string' 
              ? JSON.parse(record.coaching_evaluation) 
              : record.coaching_evaluation) as any
          : undefined
      }));
      
      setRecordings(typedRecordings);
    } catch (error) {
      console.error('Error fetching processing recordings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch processing queue",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <Activity className="w-5 h-5 text-eci-blue animate-spin" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-eci-teal animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-eci-red" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-eci-teal" />;
      default:
        return <FileText className="w-5 h-5 text-eci-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading': return 'Uploading...';
      case 'processing': return 'Processing...';
      case 'failed': return 'Failed';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleRowClick = (recording: Recording) => {
    if (recording.status === 'completed') {
      // Navigate to conversation view - would need navigation context
      console.log('Navigate to recording:', recording.id);
    }
  };

  if (loading) {
    return (
      <StandardLayout activeSection="processing">
        <div className="min-h-screen bg-eci-light-gray flex items-center justify-center">
          <div className="text-center">
            <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-eci-blue" />
            <p className="text-eci-gray-600">Loading processing queue...</p>
          </div>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout activeSection="processing">
      <div className="min-h-screen bg-eci-light-gray">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-800 mb-2">Processing Queue</h1>
            <p className="text-body-large text-eci-gray-600">
              Monitor real-time processing status of your recordings
            </p>
          </div>

          {recordings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-eci-gray-200 p-12 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-eci-teal" />
              <h3 className="text-title text-eci-gray-800 mb-2">All Caught Up!</h3>
              <p className="text-body text-eci-gray-600">
                No recordings are currently being processed
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-eci-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-eci-gray-50 border-b border-eci-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-caption text-eci-gray-600">Status</th>
                      <th className="px-6 py-4 text-left text-caption text-eci-gray-600">Recording</th>
                      <th className="px-6 py-4 text-left text-caption text-eci-gray-600">Started</th>
                      <th className="px-6 py-4 text-left text-caption text-eci-gray-600">Duration</th>
                      <th className="px-6 py-4 text-left text-caption text-eci-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-eci-gray-200">
                    {recordings.map((recording) => (
                      <tr 
                        key={recording.id}
                        onClick={() => handleRowClick(recording)}
                        className={cn(
                          "transition-all duration-150",
                          recording.status === 'completed' 
                            ? "hover:bg-eci-gray-50 cursor-pointer" 
                            : "cursor-default"
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(recording.status)}
                            <span className={cn(
                              "text-body-small font-medium",
                              recording.status === 'failed' && "text-eci-red",
                              recording.status === 'completed' && "text-eci-teal",
                              recording.status === 'processing' && "text-eci-blue"
                            )}>
                              {getStatusText(recording.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-4 h-4 text-eci-gray-400" />
                            <div>
                              <p className="text-body font-medium text-eci-gray-800 line-clamp-1">
                                {recording.title}
                              </p>
                              {recording.description && (
                                <p className="text-body-small text-eci-gray-500 line-clamp-1">
                                  {recording.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-body-small text-eci-gray-600">
                          {formatDate(recording.created_at)}
                        </td>
                        <td className="px-6 py-4 text-body-small text-eci-gray-600">
                          {recording.duration ? `${Math.floor(recording.duration / 60)}:${(recording.duration % 60).toString().padStart(2, '0')}` : '-'}
                        </td>
                        <td className="px-6 py-4">
                          {recording.status === 'completed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(recording);
                              }}
                              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-eci-red text-white rounded-lg hover:bg-eci-red-dark transition-colors text-body-small"
                            >
                              <Play className="w-3 h-3" />
                              <span>View</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </StandardLayout>
  );
}
