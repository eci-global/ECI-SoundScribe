
import React, { createContext, useContext, ReactNode } from 'react';
import type { RecordingDetail, SpeakerSegment, TopicSegment, AIMoment } from '@/types/recording-detail';

interface RecordingContextType {
  recording: RecordingDetail | null;
  speakers: SpeakerSegment[];
  topics: TopicSegment[];
  moments: AIMoment[];
  currentTime: number;
  isPlaying: boolean;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  seekTo: (time: number) => void;
}

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

interface RecordingProviderProps {
  children: ReactNode;
  recording: RecordingDetail | null;
  speakers?: SpeakerSegment[];
  topics?: TopicSegment[];
  moments?: AIMoment[];
}

export function RecordingProvider({
  children,
  recording,
  speakers = [],
  topics = [],
  moments = []
}: RecordingProviderProps) {
  const [currentTime, setCurrentTime] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const seekTo = (time: number) => {
    setCurrentTime(time);
  };

  const value: RecordingContextType = {
    recording,
    speakers,
    topics,
    moments,
    currentTime,
    isPlaying,
    setCurrentTime,
    setIsPlaying,
    seekTo
  };

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (context === undefined) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
}

// Export the context for components that need it
export { RecordingContext };
