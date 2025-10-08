import React, { useState, useEffect } from 'react';
import { 
  Bookmark, 
  Share2, 
  Download, 
  MoreHorizontal,
  Clock,
  Calendar,
  User,
  MessageSquare,
  TrendingUp,
  Target,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import EnhancedMediaPlayer from './EnhancedMediaPlayer';
import type { Recording } from '@/types/recording';
import { SpotlightProvider } from '@/contexts/SpotlightContext';
import { OutlinePanel } from '@/components/spotlight/panels/OutlinePanel';
import { AskAnythingPanel } from '@/components/spotlight/panels/AskAnythingPanel';
import { getTalkTimeRatio, getActionItems } from '@/utils/coachingAccessors';
import SpeakerConfirmationDialog from '@/components/dialogs/SpeakerConfirmationDialog';
import { useSpeakerConfirmation } from '@/hooks/useSpeakerConfirmation';

interface ConversationViewProps {
  recording: Recording;
  onPlay?: () => void;
}

export default function ConversationView({ recording, onPlay }: ConversationViewProps) {
  const [activeTab, setActiveTab] = useState<'highlights' | 'outline' | 'ask'>('highlights');
  const { 
    showConfirmationDialog, 
    showDialog, 
    hideDialog, 
    confirmSpeakers, 
    shouldShowConfirmation 
  } = useSpeakerConfirmation();

  // Check if we should show speaker confirmation when recording loads
  useEffect(() => {
    if (recording && shouldShowConfirmation(recording)) {
      // Small delay to let the UI settle before showing the dialog
      const timer = setTimeout(() => {
        showDialog(recording);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [recording, shouldShowConfirmation, showDialog]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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
    <div className="h-full bg-white flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gong-border bg-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gong-gray mb-2">{recording.title}</h1>
            <div className="flex items-center space-x-6 text-sm text-gong-gray-lighter">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(recording.created_at)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(recording.duration)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <User className="w-4 h-4" />
                <span>Sales Call</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bookmark className="w-5 h-5 text-gong-gray-lighter" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Share2 className="w-5 h-5 text-gong-gray-lighter" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Download className="w-5 h-5 text-gong-gray-lighter" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreHorizontal className="w-5 h-5 text-gong-gray-lighter" />
            </button>
          </div>
        </div>
        
        {/* Enhanced Media Player */}
        <EnhancedMediaPlayer recording={recording} onPlay={onPlay} />
      </div>
      
      {/* Content Tabs */}
      <div className="border-b border-gong-border bg-white">
        <div className="px-6">
          <div className="flex space-x-8">
            {[{ id: 'highlights', label: 'Highlights', icon: Star },
              { id: 'outline', label: 'Outline', icon: MessageSquare },
              { id: 'ask', label: 'Ask anything', icon: MessageSquare }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center space-x-2 py-4 border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-gong-purple text-gong-purple"
                    : "border-transparent text-gong-gray-lighter hover:text-gong-gray"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'highlights' && (
          <div className="p-6 space-y-6">
            {/* Call Brief */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-gong-gray mb-3 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <span>Call brief</span>
              </h3>
              <p className="text-gong-gray-lighter">
                {recording.summary || "This sales call covered the prospect's current challenges with their existing solution and explored how our platform could address their specific needs around conversation intelligence and coaching."}
              </p>
            </div>
            
            {/* Coaching Insights */}
            {recording.coaching_evaluation && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="font-semibold text-gong-gray mb-3 flex items-center space-x-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  <span>Coaching insights</span>
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {recording.coaching_evaluation.overallScore}
                    </div>
                    <div className="text-sm text-gong-gray-lighter">Overall Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {getTalkTimeRatio(recording.coaching_evaluation)}%
                    </div>
                    <div className="text-sm text-gong-gray-lighter">Talk Time</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gong-gray">Key Strengths:</h4>
                  <ul className="text-sm text-gong-gray-lighter space-y-1">
                    {recording.coaching_evaluation.strengths?.slice(0, 3).map((strength, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <div className="w-1 h-1 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Next Steps */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h3 className="font-semibold text-gong-gray mb-3 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span>Next steps</span>
              </h3>
              <div className="space-y-2">
                {getActionItems(recording.coaching_evaluation)?.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <span className="text-gong-gray-lighter text-sm">{item}</span>
                  </div>
                )) || (
                  <p className="text-gong-gray-lighter text-sm">No specific action items identified for this conversation.</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'outline' && (
          <div className="p-6">
            <SpotlightProvider>
              <OutlinePanel 
                recordingId={recording.id}
                transcript={recording.transcript}
                aiInsights={recording.ai_insights}
              />
            </SpotlightProvider>
          </div>
        )}
        
        {activeTab === 'ask' && (
          <div className="p-6">
            <SpotlightProvider>
              <AskAnythingPanel 
                recordingId={recording.id}
                transcript={recording.transcript}
                aiInsights={recording.ai_insights}
              />
            </SpotlightProvider>
          </div>
        )}
      </div>

      {/* Speaker Confirmation Dialog */}
      <SpeakerConfirmationDialog
        recording={recording}
        isOpen={showConfirmationDialog}
        onClose={hideDialog}
        onConfirm={confirmSpeakers}
      />
    </div>
  );
}
