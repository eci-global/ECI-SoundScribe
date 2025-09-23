
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Users, Clock, FileAudio, FileVideo, Play, Star, Share, Sparkles, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import StatusChip from './StatusChip';
import { RecordingListItem } from '@/hooks/useRecordings';
import { cn } from '@/lib/utils';

interface RecordingCardProps {
  recording: RecordingListItem;
  onClick: (id: string) => void;
  className?: string;
}

export default function RecordingCard({ recording, onClick, className }: RecordingCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClick = () => {
    onClick(recording.id);
  };

  const handleQuickAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    console.log(`${action} clicked for recording:`, recording.id);
    
    if (action === 'favorite') {
      setIsFavorited(!isFavorited);
    }
  };

  // Generate AI insight preview
  const getAIInsightPreview = () => {
    const insights = [
      "Strong interest detected, pricing concerns raised",
      "Excellent discovery questions, follow-up needed",
      "Good rapport building, next steps defined",
      "Technical questions answered, demo requested",
      "Budget discussion, decision timeline clarified"
    ];
    return insights[Math.floor(Math.random() * insights.length)];
  };

  return (
    <Card
      className={cn(
        'group relative overflow-hidden cursor-pointer transition-all duration-300',
        'hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-2',
        'border border-gray-200 hover:border-blue-300/50',
        isHovered && 'ring-2 ring-blue-500/20',
        className
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Preview Section */}
      <div className="relative h-32 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {/* File Type Icon & Background */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            'p-4 rounded-full transition-all duration-300',
            recording.file_type === 'video' 
              ? 'bg-blue-100 group-hover:bg-blue-200' 
              : 'bg-green-100 group-hover:bg-green-200'
          )}>
            {recording.file_type === 'video' ? (
              <FileVideo className="w-8 h-8 text-blue-600" />
            ) : (
              <FileAudio className="w-8 h-8 text-green-600" />
            )}
          </div>
        </div>

        {/* Waveform visualization placeholder */}
        {recording.file_type === 'audio' && (
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-end gap-1 h-8 opacity-20">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="bg-green-500 rounded-sm flex-1 transition-all duration-300 group-hover:bg-green-600"
                  style={{ height: `${Math.random() * 100}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions Overlay */}
        <div className={cn(
          'absolute top-3 right-3 flex gap-1 transition-all duration-300',
          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        )}>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm"
            onClick={(e) => handleQuickAction(e, 'play')}
          >
            <Play className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className={cn(
              'h-8 w-8 p-0 bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm',
              isFavorited && 'text-yellow-500'
            )}
            onClick={(e) => handleQuickAction(e, 'favorite')}
          >
            <Star className={cn('w-3 h-3', isFavorited && 'fill-current')} />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm"
            onClick={(e) => handleQuickAction(e, 'share')}
          >
            <Share className="w-3 h-3" />
          </Button>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <StatusChip status={recording.status} />
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <div>
          <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-900 transition-colors">
            {recording.title}
          </h3>
        </div>

        {/* Metadata */}
        <div className="space-y-2">
          {/* Participants */}
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1 rounded bg-gray-100">
              <Users className="w-3 h-3 text-gray-600" />
            </div>
            <span className="text-gray-700 line-clamp-1 flex-1">
              {recording.participants || 'Unknown participants'}
            </span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1 rounded bg-gray-100">
              <Clock className="w-3 h-3 text-gray-600" />
            </div>
            <span className="font-mono font-medium text-gray-900">
              {formatDuration(recording.duration)}
            </span>
            {recording.duration && recording.duration > 3600 && (
              <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                Long call
              </span>
            )}
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1 rounded bg-gray-100">
              <Calendar className="w-3 h-3 text-gray-600" />
            </div>
            <span className="text-gray-700">
              {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* AI Insight Preview */}
        {recording.status === 'completed' && (
          <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-medium text-purple-700 mb-1">AI Insight</div>
                <div className="text-xs text-gray-700 italic">
                  "{getAIInsightPreview()}"
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Processing indicator */}
        {recording.status === 'processing' && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <span className="text-xs text-blue-700 font-medium">Processing...</span>
          </div>
        )}
      </CardContent>

      {/* Hover gradient overlay */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 transition-opacity duration-300 pointer-events-none',
        isHovered && 'opacity-100'
      )} />
    </Card>
  );
}
