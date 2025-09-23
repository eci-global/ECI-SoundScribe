
import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Phone, 
  Video, 
  Mic, 
  MoreVertical,
  Star,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recording } from '@/types/recording';

interface ConversationsSidebarProps {
  recordings: Recording[];
  selectedRecording?: Recording | null;
  onSelectRecording: (recording: Recording) => void;
  onUpload: () => void;
}

export default function ConversationsSidebar({
  recordings,
  selectedRecording,
  onSelectRecording,
  onUpload
}: ConversationsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'completed' | 'processing'>('all');

  const filteredRecordings = recordings.filter(recording => {
    const matchesSearch = recording.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterBy === 'all' || recording.status === filterBy;
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-eci-teal" strokeWidth={1.5} />;
      case 'processing':
        return <AlertCircle className="w-4 h-4 text-yellow-500" strokeWidth={1.5} />;
      default:
        return <Clock className="w-4 h-4 text-eci-gray-400" strokeWidth={1.5} />;
    }
  };

  const getContentTypeIcon = (contentType?: string) => {
    switch (contentType) {
      case 'sales_call':
        return <Phone className="w-4 h-4 text-eci-blue" strokeWidth={1.5} />;
      case 'video_call':
        return <Video className="w-4 h-4 text-eci-red" strokeWidth={1.5} />;
      default:
        return <Mic className="w-4 h-4 text-eci-slate" strokeWidth={1.5} />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
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

  return (
    <div className="h-full flex flex-col bg-white border-r border-eci-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-eci-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-title-large text-eci-gray-800">Conversations</h2>
          <button
            onClick={onUpload}
            className="btn-primary"
          >
            Upload
          </button>
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-eci-gray-400" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-eci-gray-200 rounded-lg bg-eci-gray-50 focus:outline-none focus:ring-2 focus:ring-eci-red/20 focus:border-eci-red focus:bg-white transition-all text-body-small"
          />
        </div>
        
        {/* Filters */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterBy('all')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-body-small font-medium transition-all duration-150",
              filterBy === 'all' 
                ? "bg-eci-red text-white shadow-sm" 
                : "bg-eci-gray-100 text-eci-gray-600 hover:bg-eci-gray-200 hover:text-eci-gray-800"
            )}
          >
            All ({recordings.length})
          </button>
          <button
            onClick={() => setFilterBy('completed')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-body-small font-medium transition-all duration-150",
              filterBy === 'completed' 
                ? "bg-eci-red text-white shadow-sm" 
                : "bg-eci-gray-100 text-eci-gray-600 hover:bg-eci-gray-200 hover:text-eci-gray-800"
            )}
          >
            Completed ({recordings.filter(r => r.status === 'completed').length})
          </button>
        </div>
      </div>
      
      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredRecordings.length === 0 ? (
          <div className="p-6 text-center text-eci-gray-500">
            <Mic className="w-12 h-12 mx-auto mb-4 text-eci-gray-300" strokeWidth={1.5} />
            <p className="text-title-small mb-2 text-eci-gray-700">No conversations found</p>
            <p className="text-body-small">Upload your first recording to get started</p>
          </div>
        ) : (
          <div className="space-y-1 p-4">
            {filteredRecordings.map((recording) => (
              <div
                key={recording.id}
                onClick={() => onSelectRecording(recording)}
                className={cn(
                  "p-4 rounded-lg cursor-pointer transition-all duration-150 border",
                  selectedRecording?.id === recording.id
                    ? "bg-eci-red/5 border-eci-red/20 shadow-sm"
                    : "hover:bg-eci-gray-50 border-transparent hover:shadow-sm"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getContentTypeIcon(recording.content_type)}
                    <h3 className="text-body font-medium text-eci-gray-800 line-clamp-1">
                      {recording.title}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(recording.status)}
                    <button className="p-1 hover:bg-eci-gray-200 rounded transition-colors">
                      <MoreVertical className="w-3 h-3 text-eci-gray-400" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-body-small text-eci-gray-500">
                  <span>{formatDate(recording.created_at)}</span>
                  <span>{formatDuration(recording.duration)}</span>
                </div>
                
                {recording.summary && (
                  <p className="text-body-small text-eci-gray-600 mt-2 line-clamp-2">
                    {recording.summary.substring(0, 100)}...
                  </p>
                )}
                
                {recording.coaching_evaluation && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="w-2 h-2 bg-eci-red rounded-full"></div>
                    <span className="text-caption text-eci-red">
                      Coaching Score: {recording.coaching_evaluation.overallScore}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
