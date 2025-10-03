
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Clock, User, Calendar } from 'lucide-react';
import { useSupabaseLive } from '@/hooks/useSupabaseLive';

export default function RecordingTable() {
  const { data: recordings, loading } = useSupabaseLive('recordings', {
    orderBy: { column: 'created_at', ascending: false }
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800'
    };
    return <Badge className={variants[status as keyof typeof variants] || ''}>{status}</Badge>;
  };

  return (
    
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-900 mb-2">Recordings</h1>
            <p className="text-body text-eci-gray-600">Real-time view of all system recordings</p>
          </div>

          <Card className="bg-white shadow-sm">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-title font-semibold text-eci-gray-900">All Recordings</h2>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-caption text-eci-gray-600">Live Updates</span>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eci-red mx-auto"></div>
                  <p className="mt-2 text-body-small text-eci-gray-600">Loading recordings...</p>
                </div>
              ) : recordings?.length === 0 ? (
                <div className="text-center py-12">
                  <PlayCircle className="h-12 w-12 text-eci-gray-300 mx-auto mb-3" />
                  <p className="text-body text-eci-gray-600">No recordings found</p>
                  <p className="text-body-small text-eci-gray-500 mt-1">Recordings will appear here in real-time</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-eci-gray-200">
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Title</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Duration</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">User</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Status</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Size</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recordings?.map((recording) => (
                        <tr key={recording.id} className="border-b border-eci-gray-100 hover:bg-eci-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <PlayCircle className="h-4 w-4 text-eci-gray-400" />
                              <span className="text-body text-eci-gray-900">{recording.title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-body text-eci-gray-600">
                              <Clock className="h-3 w-3" />
                              {formatDuration(recording.duration || 0)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-body text-eci-gray-600">
                              <User className="h-3 w-3" />
                              {recording.user_id}
                            </div>
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(recording.status || 'unknown')}</td>
                          <td className="py-3 px-4 text-body text-eci-gray-600">{formatBytes(recording.file_size || 0)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-body text-eci-gray-600">
                              <Calendar className="h-3 w-3" />
                              {new Date(recording.created_at).toLocaleDateString()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    
  );
}
