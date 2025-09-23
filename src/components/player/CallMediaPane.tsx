
import React, { useEffect, useContext } from 'react';
import VideoPlayer from './VideoPlayer';
import ControlToolbar from './ControlToolbar';
import Scrubber from './Scrubber';
import MomentIconRail from './MomentIconRail';
import SpeakerTimeline from './SpeakerTimeline';
import Tabs from './Tabs';
import SpeakerTracks from './SpeakerTracks';
import TopicTracks from './TopicTracks';
import { usePlayback } from './hooks/usePlayback';
import { RecordingContext } from '@/context/RecordingCtx';

interface CallMediaPaneProps {
  recordingId?: string;
  recording?: any; // Add recording prop like CallBrief uses
  videoSrc?: string;
  posterSrc?: string;
  duration?: number;
  className?: string;
}

export default function CallMediaPane({ 
  recordingId,
  recording: recordingProp,
  videoSrc, 
  posterSrc,
  duration,
  className = '' 
}: CallMediaPaneProps) {
  const { setDuration } = usePlayback();
  
  // Try to use context if available, otherwise work without it
  const context = useContext(RecordingContext);
  const recording = recordingProp || context?.recording;

  // Use real recording duration if available, otherwise use prop duration
  const actualDuration = recording?.duration || duration || 0;

  // Set duration when available
  useEffect(() => {
    if (actualDuration) {
      console.log('Setting duration:', actualDuration);
      setDuration(actualDuration);
    }
  }, [actualDuration, setDuration]);

  return (
    <div className={`w-full max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Video Player */}
      <div className="relative">
        <VideoPlayer 
          src={videoSrc}
          poster={posterSrc}
        />
        
        {/* Overlay Controls (positioned over video) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
          <ControlToolbar />
        </div>
      </div>

      {/* Scrubber and Timeline Controls */}
      <div className="space-y-4 px-4">
        {/* Scrubber */}
        <Scrubber />
        
        {/* AI Moment Icons */}
        <MomentIconRail />

        {/* Speaker Timeline */}
        <SpeakerTimeline recording={recording} recordingId={recordingId || recording?.id} />

        {/* Speaker/Topic Tabs */}
        <Tabs defaultIndex={0}>
          <Tabs.List>
            <Tabs.Button>Speakers</Tabs.Button>
            <Tabs.Button>Topics</Tabs.Button>
          </Tabs.List>
          
          <Tabs.Panels>
            <Tabs.Panel>
              <SpeakerTracks recording={recording} recordingId={recordingId || recording?.id} />
            </Tabs.Panel>
            <Tabs.Panel>
              <TopicTracks recordingId={recordingId || recording?.id} />
            </Tabs.Panel>
          </Tabs.Panels>
        </Tabs>
      </div>
    </div>
  );
}
