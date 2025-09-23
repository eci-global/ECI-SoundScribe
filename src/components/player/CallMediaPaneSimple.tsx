import React, { useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import ControlToolbar from './ControlToolbar';
import MomentIconRail from './MomentIconRail';
import SpeakerTimeline from './SpeakerTimeline';
import Tabs from './Tabs';
import SpeakerTracks from './SpeakerTracks';
import TopicTracks from './TopicTracks';
import { usePlayback } from './hooks/usePlayback';
import { formatTime } from '@/utils/formatUtils';
import { RecordingProvider } from '@/context/RecordingCtx';
interface CallMediaPaneSimpleProps {
  recordingId?: string;
  recording?: any;
  videoSrc?: string;
  posterSrc?: string;
  duration?: number;
  className?: string;
}
export default function CallMediaPaneSimple({
  recordingId,
  recording,
  videoSrc,
  posterSrc,
  duration,
  className = ''
}: CallMediaPaneSimpleProps) {
  const {
    currentTime,
    duration: playbackDuration,
    setDuration,
    seek
  } = usePlayback();

  // Use real recording duration to ensure timestamp accuracy
  const actualDuration = recording?.duration || duration || 0;

  // Log duration source for debugging
  useEffect(() => {
    if (recording?.duration) {
      console.log(`📊 CallMediaPaneSimple: Using recording duration: ${recording.duration}s`);
    } else if (duration) {
      console.log(`📊 CallMediaPaneSimple: Using prop duration: ${duration}s`);
    } else {
      console.warn('⚠️ CallMediaPaneSimple: No duration available - timestamps may be inaccurate');
    }
  }, [recording?.duration, duration]);

  // Set duration when available
  useEffect(() => {
    if (actualDuration) {
      console.log('Setting duration:', actualDuration);
      setDuration(actualDuration);
    }
  }, [actualDuration, setDuration]);
  return (
    <RecordingProvider recording={recording}>
      <div className={`w-full max-w-4xl mx-auto space-y-4 ${className}`}>
        {/* Video Player - Core functionality only */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          <VideoPlayer src={videoSrc} poster={posterSrc} />
          
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
            <ControlToolbar />
          </div>
        </div>

        {/* Timeline Display */}
        <div className="px-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{actualDuration ? formatTime(actualDuration) : '0:00'}</span>
          </div>
          
          {/* Interactive Progress Bar */}
          <div 
            className="w-full h-1 bg-gray-300 rounded-full mb-4 cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickPosition = (e.clientX - rect.left) / rect.width;
              const seekTime = clickPosition * actualDuration;
              seek(seekTime);
            }}
          >
            <div 
              className="h-1 bg-blue-600 rounded-full transition-all duration-100" 
              style={{
                width: `${actualDuration > 0 ? (currentTime / actualDuration) * 100 : 0}%`
              }}
            />
          </div>
          
          {/* AI Moments Rail */}
          <MomentIconRail />

          {/* Speaker Timeline */}
          <SpeakerTimeline recording={recording} recordingId={recordingId || recording?.id} />
          
        </div>

        {/* Speaker/Topic Tabs - Moved below video and timeline */}
        <div className="px-4">
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
    </RecordingProvider>
  );
}