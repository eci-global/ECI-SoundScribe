
import React, { useState } from 'react';
import { Play, Clock, FileText, MoreVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Recording } from '@/types/recording';

interface RecordingCanvasProps {
  recordings: Recording[];
  onClose: () => void;
  userId: string;
  onRegenerateSummary: (recordingId: string, newSummary: string) => void;
}

export default function RecordingCanvas({ 
  recordings, 
  onClose, 
  userId, 
  onRegenerateSummary 
}: RecordingCanvasProps) {
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);

  const handlePlayRecording = (recording: Recording) => {
    setSelectedRecording(recording);
    console.log('Playing recording:', recording.title);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Your Recordings</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Recordings Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {recordings.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recordings yet</p>
              <p className="text-sm text-gray-400">Upload your first recording to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recordings.map((recording) => (
                <div key={recording.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-sm truncate">{recording.title}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handlePlayRecording(recording)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => recording.summary && onRegenerateSummary(recording.id, recording.summary)}
                        >
                          Regenerate Summary
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{recording.duration ? formatDuration(recording.duration) : 'Unknown'}</span>
                    </div>
                    <div>
                      <span>{formatDate(recording.created_at)}</span>
                    </div>
                    <div>
                      <span className="capitalize">{recording.status}</span>
                    </div>
                  </div>

                  {recording.summary && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                      {recording.summary}
                    </p>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => handlePlayRecording(recording)}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Play
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
