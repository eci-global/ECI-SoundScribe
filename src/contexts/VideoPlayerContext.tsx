
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackSpeed: number;
  isMuted: boolean;
  activeTab: 'highlights' | 'everything';
  searchQuery: string;
  selectedSpeaker: string | null;
  selectedTopic: string | null;
}

type VideoPlayerAction =
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SET_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_SPEED'; payload: number }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'SET_TAB'; payload: 'highlights' | 'everything' }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SELECT_SPEAKER'; payload: string | null }
  | { type: 'SELECT_TOPIC'; payload: string | null };

const initialState: VideoPlayerState = {
  isPlaying: false,
  currentTime: 0,
  duration: 240, // 4 minutes for demo
  volume: 1,
  playbackSpeed: 1,
  isMuted: false,
  activeTab: 'everything',
  searchQuery: '',
  selectedSpeaker: null,
  selectedTopic: null
};

function videoPlayerReducer(state: VideoPlayerState, action: VideoPlayerAction): VideoPlayerState {
  switch (action.type) {
    case 'PLAY':
      return { ...state, isPlaying: true };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'SET_TIME':
      return { ...state, currentTime: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'SET_SPEED':
      return { ...state, playbackSpeed: action.payload };
    case 'TOGGLE_MUTE':
      return { ...state, isMuted: !state.isMuted };
    case 'SET_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SELECT_SPEAKER':
      return { ...state, selectedSpeaker: action.payload };
    case 'SELECT_TOPIC':
      return { ...state, selectedTopic: action.payload };
    default:
      return state;
  }
}

const VideoPlayerContext = createContext<{
  state: VideoPlayerState;
  dispatch: React.Dispatch<VideoPlayerAction>;
} | null>(null);

export function VideoPlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(videoPlayerReducer, initialState);

  return (
    <VideoPlayerContext.Provider value={{ state, dispatch }}>
      {children}
    </VideoPlayerContext.Provider>
  );
}

export function useVideoPlayer() {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayer must be used within VideoPlayerProvider');
  }
  return context;
}
