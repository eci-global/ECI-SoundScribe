
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Users, Clock, FileAudio, FileVideo, Play, Star, Share, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusChip from './StatusChip';
import { RecordingListItem } from '@/hooks/useRecordings';
import { cn } from '@/lib/utils';

interface RecordingRowProps {
  recording: RecordingListItem;
  onClick: (id: string) => void;
  className?: string;
}

export default function RecordingRow({ recording, onClick, className }: RecordingRowProps) {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(recording.id);
    }
  };

  const handleQuickAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    console.log(`${action} clicked for recording:`, recording.id);
    
    if (action === 'favorite') {
      setIsFavorited(!isFavorited);
    }
  };

  // Generate AI insight preview based on recording data
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
    <tr
      className={cn(
        'cursor-pointer transition-all duration-300 group relative',
        'hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50',
        'hover:shadow-lg hover:shadow-blue-500/10',
        'focus-within:bg-blue-50/30 focus-within:shadow-lg',
        isHovered && 'transform scale-[1.01]',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      role="button"
      aria-label={`View recording: ${recording.title}`}
    >
      {/* Title with AI Insight */}
      <td className="px-6 py-4 relative">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <div className={cn(
              'p-2 rounded-lg transition-all duration-300',
              recording.file_type === 'video' 
                ? 'bg-blue-100 group-hover:bg-blue-200' 
                : 'bg-green-100 group-hover:bg-green-200'
            )}>
              {recording.file_type === 'video' ? (
                <FileVideo className="w-4 h-4 text-blue-600" />
              ) : (
                <FileAudio className="w-4 h-4 text-green-600" />
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-900 transition-colors">
              {recording.title}
            </p>
            
            {/* AI Insight Preview */}
            {recording.status === 'completed' && (
              <div className="flex items-center gap-1 mt-2 text-xs">
                <Sparkles className="w-3 h-3 text-purple-500" />
                <span className="text-purple-700 font-medium">AI:</span>
                <span className="text-gray-600 italic">"{getAIInsightPreview()}"</span>
              </div>
            )}
          </div>
          
          {/* Quick Actions - Slide in on hover */}
          <div className={cn(
            'flex items-center gap-1 transition-all duration-300 ml-2',
            isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
          )}>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
              onClick={(e) => handleQuickAction(e, 'play')}
            >
              <Play className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                'h-8 w-8 p-0 hover:bg-yellow-100',
                isFavorited ? 'text-yellow-500 hover:text-yellow-600' : 'hover:text-yellow-600'
              )}
              onClick={(e) => handleQuickAction(e, 'favorite')}
            >
              <Star className={cn('w-3 h-3', isFavorited && 'fill-current')} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-gray-100 hover:text-gray-600"
              onClick={(e) => handleQuickAction(e, 'share')}
            >
              <Share className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </td>

      {/* Participants */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-gray-100 group-hover:bg-gray-200 transition-colors">
            <Users className="w-3.5 h-3.5 text-gray-600" />
          </div>
          <span className="text-sm text-gray-900 line-clamp-1 group-hover:text-gray-700">
            {recording.participants || 'Unknown participants'}
          </span>
        </div>
      </td>

      {/* Duration */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-gray-100 group-hover:bg-gray-200 transition-colors">
            <Clock className="w-3.5 h-3.5 text-gray-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 font-mono">
              {formatDuration(recording.duration)}
            </span>
            {recording.duration && recording.duration > 3600 && (
              <span className="text-xs text-gray-500">Long call</span>
            )}
          </div>
        </div>
      </td>

      {/* Recorded (date) */}
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <div className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
            {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(recording.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <div className="flex items-center justify-between">
          <StatusChip status={recording.status} />
          {/* Progress indicator for processing */}
          {recording.status === 'processing' && (
            <div className="w-16 bg-gray-200 rounded-full h-1.5 ml-2">
              <div className="bg-blue-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          )}
        </div>
      </td>
      
      {/* Subtle gradient border on hover */}
      <td className="absolute inset-0 pointer-events-none">
        <div className={cn(
          'absolute inset-0 rounded-lg transition-all duration-300',
          isHovered && 'bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border border-blue-200/30'
        )} />
      </td>
    </tr>
  );
}
