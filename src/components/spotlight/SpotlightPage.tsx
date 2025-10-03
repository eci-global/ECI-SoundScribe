import React, { useState, useMemo, useCallback, useEffect } from 'react';
import TopBar from './TopBar';
import SpotlightTabs from './SpotlightTabs';
import CallBriefCard from './CallBriefCard';
import NextStepsCard from './NextStepsCard';
import CoachingInsightsCard from './CoachingInsightsCard';
import BDRCoachingInsights from '@/components/coach/BDRCoachingInsights';
import ECICoachingInsights from '@/components/coach/ECICoachingInsights';
import CallMediaPaneSimple from '@/components/player/CallMediaPaneSimple';
import SpeakerTrack from './SpeakerTrack';
import { parseSpotlightSpeakers } from '@/utils/spotlightSpeakerParser';
import { SpeakerResolver } from '@/utils/speakerResolution';
import type { Recording } from '@/types/recording';
import { usePlayback } from '@/components/player/hooks/usePlayback';
import { SpotlightProvider, useSpotlight } from '@/contexts/SpotlightContext';
import SlidePanel from './SlidePanel';
import SearchPanel from './panels/SearchPanel';
import MomentsPanel from './panels/MomentsPanel';
import SpeakersPanel from './panels/SpeakersPanel';
import OutreachPanel from './panels/OutreachPanel';
import AnalyticsPanel from './panels/AnalyticsPanel';
import CommentsPanel from './panels/CommentsPanel';
import AttachmentsPanel from './panels/AttachmentsPanel';
import InfoPanel from './panels/InfoPanel';
import DiagnosticsPanel from './panels/DiagnosticsPanel';
import { OutlinePanel } from './panels/OutlinePanel';
import { AskAnythingPanel } from './panels/AskAnythingPanel';
import SentimentMomentsPanel from './panels/SentimentMomentsPanel';
import BookmarkActionPanel from './panels/BookmarkActionPanel';
import CommentActionPanel from './panels/CommentActionPanel';
import ReactionActionPanel from './panels/ReactionActionPanel';
import VisibilityPanel from './panels/VisibilityPanel';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AzureConnectivityTest } from '@/components/debug/AzureConnectivityTest';
import { useSupportMode } from '@/contexts/SupportContext';
import { hasECIAnalysis } from '@/utils/eciAnalysis';

interface SpotlightPageProps {
  recording?: Recording | null;
  startTime?: number;
  onRecordingUpdate?: () => void;
}

interface TranscriptLine {
  timestamp: number;
  speaker: string;
  text: string;
}

// Sub-component that uses the context (must be inside provider)
interface LeftColumnContentProps {
  activeTab: string;
  recording?: Recording | null;
  onRecordingUpdate?: () => void;
  compact?: boolean;
}

const LeftColumnContent: React.FC<LeftColumnContentProps> = ({ activeTab, recording, onRecordingUpdate, compact = false }) => {
  const { activeLeftPanel } = useSpotlight();
  
  const leftPanelMap = {
    search: SearchPanel,
    moments: MomentsPanel,
    speakers: SpeakersPanel,
    outreach: OutreachPanel,
    analytics: AnalyticsPanel,
    comments: CommentsPanel,
    attachments: AttachmentsPanel,
    info: InfoPanel,
    diagnostics: DiagnosticsPanel,
    sentiment: SentimentMomentsPanel,
  } as const;

  const SelectedPanel = activeLeftPanel ? leftPanelMap[activeLeftPanel] : null;
  
  if (SelectedPanel) {
    return <SelectedPanel recording={recording} />;
  }

  return (
    <>
      {activeTab === 'highlights' && (
        <div className="space-y-3">
          <CallBriefCard recording={recording} compact={compact} />
          <NextStepsCard recording={recording} compact={compact} />
        </div>
      )}

      {activeTab === 'outline' && (
        <OutlinePanel recordingId={recording?.id || ''} transcript={recording?.transcript} aiInsights={recording?.ai_insights} />
      )}

      {activeTab === 'ask' && (
        <AskAnythingPanel recordingId={recording?.id || ''} transcript={recording?.transcript} aiInsights={recording?.ai_insights} />
      )}
    </>
  );
};

const TabsOrSearchHint: React.FC<{activeTab: string; onTabChange: (t: string)=>void}> = ({activeTab,onTabChange}) => {
  const { activeLeftPanel } = useSpotlight();

  if (!activeLeftPanel) {
    return (
      <SpotlightTabs
        activeTab={activeTab as 'outline' | 'highlights' | 'ask'}
        onTabChange={onTabChange}
      />
    );
  }

  if (activeLeftPanel === 'search') {
    return (
      <p className="mb-6 text-base font-medium border-b border-eci-gray-200 pb-2">
        Search for moments across all your calls
      </p>
    );
  }

  return null;
};

export default function SpotlightPage({ recording, startTime, onRecordingUpdate }: SpotlightPageProps) {
  const [activeTab, setActiveTab] = useState('highlights');
  const [rightPanelView, setRightPanelView] = useState<'insights' | 'analytics'>('insights');
  const [retrying, setRetrying] = useState(false);
  const { seek: mediaSeek, setCurrentTime, currentTime: playbackCurrentTime } = usePlayback();
  const { toast } = useToast();

  // Use actual recording duration - no hardcoded fallbacks to ensure accuracy
  const duration = useMemo(() => {
    // Always use the actual recording duration to match real audio time
    if (recording?.duration && recording.duration > 0) {
      console.log(`📊 Using actual recording duration: ${recording.duration}s`);
      return recording.duration;
    }
    
    // For failed recordings or missing duration, try to extract from video element
    console.warn('⚠️ No duration available from recording. This may cause timestamp mismatches.');
    return null; // Don't use fallback values that don't match actual media
  }, [recording?.duration]);

  // Simplified speaker tracks - disable heavy parsing to prevent memory crashes
  const speakerTracks = useMemo(() => {
    // Temporarily disable heavy speaker track parsing
    console.log('Speaker track parsing disabled to prevent memory crashes');
    return [];
  }, []);

  const transcriptLines: TranscriptLine[] = useMemo(() => {
    if (!recording?.transcript) return [];
    
    // Simplified transcript parsing - disable heavy speaker resolution to prevent memory crashes
    console.log('📝 SpotlightPage: Using simplified transcript parsing');
    
    const transcript = recording.transcript;
    const lines = transcript.split('\n').filter(l => l.trim());
    const parsed: TranscriptLine[] = [];
    
    lines.forEach((line, idx) => {
      const timeMatch = line.match(/\[(\d{1,2}):(\d{2})\]|\((\d{1,2}):(\d{2})\)|(\d{1,2}):(\d{2})/);
      const timestamp = timeMatch ?
        (parseInt(timeMatch[1] || timeMatch[3] || timeMatch[5]) * 60 + parseInt(timeMatch[2] || timeMatch[4] || timeMatch[6]))
        : Math.round((idx / lines.length) * duration);
      
      const speakerMatch = line.match(/^([A-Za-z\s]+):/);
      const speaker = speakerMatch ? speakerMatch[1].trim() : `Speaker ${Math.floor(idx/3)+1}`;
      
      const text = line.replace(/^([A-Za-z\s]+):/, '').replace(/\[[\d:]+\]|\([\d:]+\)|[\d:]+/, '').trim();
      
      if (text) {
        parsed.push({ timestamp, speaker, text });
      }
    });
    
    return parsed;
  }, [recording?.transcript, duration]);

  const handleSeek = useCallback((time: number) => {
    console.log('Seek to:', time);
    mediaSeek(time);
  }, [mediaSeek]);

  const handleClose = useCallback(() => {
    window.history.back();
  }, []);

  const handleRetryProcessing = useCallback(async () => {
    if (!recording?.id) return;
    
    setRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke('recover-stuck-recordings', {
        body: { 
          recording_id: recording.id,
          force_retry: true 
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Processing Retry Started",
        description: `Started retry processing for ${recording.title}. This may take several minutes.`,
      });

      // Refresh the recording data after a short delay
      if (onRecordingUpdate) {
        setTimeout(() => {
          onRecordingUpdate();
        }, 2000);
      }
    } catch (error) {
      console.error('Error retrying processing:', error);
      toast({
        title: "Retry Failed", 
        description: "Failed to start retry processing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRetrying(false);
    }
  }, [recording?.id, recording?.title, onRecordingUpdate, toast]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  // Simplified media sources processing
  const videoSrc = recording?.file_url || undefined;
  const posterSrc = recording?.thumbnail_url || undefined;

  // Set initial time when startTime is provided
  useEffect(() => {
    if (startTime !== undefined) {
      console.log('Setting initial time to:', startTime);
      mediaSeek(startTime);
    }
  }, [startTime, mediaSeek]);

  return (
    <SpotlightProvider transcriptLines={transcriptLines} currentTime={playbackCurrentTime} seek={handleSeek} recording={recording}>
      <div className="h-screen bg-brand-light-gray flex flex-col">
        {/* Fixed top bar */}
        <div className="px-6 pt-6 flex-shrink-0 bg-white border-b border-gray-200 z-50">
          <TopBar onClose={handleClose} recording={recording} />
          
          {/* Retry button for failed recordings */}
          {recording?.status === 'failed' && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Processing Failed</h3>
                    <p className="text-sm text-red-600 mt-1">
                      This {recording.file_size && recording.file_size > 50 * 1024 * 1024 ? 'large file' : 'recording'} failed to process. 
                      Click retry to attempt processing again using the Azure backend.
                    </p>
                  </div>
                  <Button
                    onClick={handleRetryProcessing}
                    disabled={retrying}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
                    {retrying ? 'Retrying...' : 'Retry Processing'}
                  </Button>
                </div>
              </div>
              
              {/* Azure Connectivity Test */}
              <AzureConnectivityTest />
            </div>
          )}
        </div>
        
        {/* Main dashboard grid - no scrolling */}
        <div className="flex-1 grid grid-cols-12 gap-4 p-6 pt-3 min-h-0 overflow-hidden">
          {/* Left Column - Call Brief & Next Steps */}
          <div className="col-span-3 flex flex-col gap-4 min-h-0">
            <TabsOrSearchHint
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
            
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-2">
              {activeTab === 'highlights' && (
                <div className="space-y-3">
                  <CallBriefCard recording={recording} compact={false} />
                  <NextStepsCard recording={recording} compact={false} />
                  
                </div>
              )}

              {activeTab === 'outline' && (
                <div className="space-y-3">
                  <OutlinePanel recordingId={recording?.id || ''} transcript={recording?.transcript} aiInsights={recording?.ai_insights} />
                  
                </div>
              )}

              {activeTab === 'ask' && (
                <div className="space-y-3">
                  <AskAnythingPanel recordingId={recording?.id || ''} transcript={recording?.transcript} aiInsights={recording?.ai_insights} />
                  
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Video Player and Sentiment Timeline */}
          <div className="col-span-6 flex flex-col gap-4 min-h-0">
            {/* Video player - simplified version to prevent memory crashes */}
            <div className="flex-1">
              <CallMediaPaneSimple
                recording={recording}
                recordingId={recording?.id}
                videoSrc={videoSrc}
                posterSrc={posterSrc}
              />
            </div>
          </div>

          {/* Right Column - Key Insights & Analytics */}
          <div className="col-span-3 flex flex-col gap-4 min-h-0">
            {/* Panel Toggle Buttons */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setRightPanelView('insights')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  rightPanelView === 'insights'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Key Insights
              </button>
              <button
                onClick={() => setRightPanelView('analytics')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  rightPanelView === 'analytics'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Analytics
              </button>
            </div>
            
            {/* Content Panel */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 overflow-y-auto flex-1">
              {rightPanelView === 'insights' ? (
                <>
                  <h3 className="font-semibold text-gray-900 mb-3">Key Insights</h3>
                  <div className="space-y-4">
                    <CoachingInsightsCard 
                      recording={recording} 
                      onCoachingUpdate={onRecordingUpdate ? async (recordingId: string, coaching: any) => {
                        onRecordingUpdate();
                      } : undefined}
                      compact={true}
                    />
                    
                    {/* Note: CoachingInsightsCard above already handles BDR and ECI analysis based on recording type */}
                    {/* No additional coaching components needed here to avoid duplication */}
                  </div>
                </>
              ) : (
                <>
                  <AnalyticsPanel recording={recording} />
                  
                </>
              )}
            </div>
          </div>
        </div>


        {/* Slide Panels for Left Rail */}
        <SlidePanel 
          isOpen={false} 
          panel={null} 
          onClose={() => {}} 
        />

        {/* Right Panel Action Components */}
        <RightPanelComponents />
      </div>
    </SpotlightProvider>
  );
}

// Component to handle right panel actions
const RightPanelComponents: React.FC = () => {
  const { activeRightPanel } = useSpotlight();

  const rightPanelMap = {
    comment: CommentActionPanel,
    bookmark: BookmarkActionPanel,
    reaction: ReactionActionPanel,
    visibility: VisibilityPanel,
  } as const;

  const SelectedRightPanel = activeRightPanel ? rightPanelMap[activeRightPanel] : null;
  
  if (!SelectedRightPanel) return null;

  return (
    <div className="fixed right-16 top-24 z-40 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
      <SelectedRightPanel />
    </div>
  );
};