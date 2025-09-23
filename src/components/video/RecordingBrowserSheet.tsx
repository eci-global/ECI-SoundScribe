
import React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder, Play, Clock, FileText, Upload } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Recording {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  created_at: string;
  status: string;
  content_type: string | null;
  file_size: number | null;
}

interface RecordingBrowserSheetProps {
  recordings?: Recording[];
  onSelectRecording?: (recording: Recording) => void;
  trigger?: React.ReactNode;
}

export default function RecordingBrowserSheet({ 
  recordings = [], 
  onSelectRecording,
  trigger 
}: RecordingBrowserSheetProps) {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'uploading':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const defaultTrigger = (
    <Button variant="outline" className="flex items-center gap-2">
      <Folder className="h-4 w-4" />
      Browse Recordings
    </Button>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Recording Library
          </SheetTitle>
          <SheetDescription>
            Browse and select from your uploaded recordings
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {recordings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No recordings found</h3>
              <p className="text-gray-500">Upload your first recording to get started</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4 pr-4">
                {recordings.map((recording) => (
                  <Card 
                    key={recording.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onSelectRecording?.(recording)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate flex items-center gap-2">
                            <Play className="h-4 w-4 flex-shrink-0" />
                            {recording.title}
                          </CardTitle>
                          {recording.description && (
                            <CardDescription className="mt-1 line-clamp-2">
                              {recording.description}
                            </CardDescription>
                          )}
                        </div>
                        <Badge className={getStatusColor(recording.status)}>
                          {recording.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDuration(recording.duration)}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {formatFileSize(recording.file_size)}
                        </div>
                        
                        <div className="text-xs">
                          {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
                        </div>
                      </div>
                      
                      {recording.content_type && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            {recording.content_type}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
