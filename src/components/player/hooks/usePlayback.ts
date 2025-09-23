import { create } from 'zustand';

interface PlaybackState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  playbackSpeed: number;
  isFullscreen: boolean;
  showCaptions: boolean;
}

interface PlaybackActions {
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsFullscreen: (fullscreen: boolean) => void;
  setShowCaptions: (show: boolean) => void;
  seek: (time: number) => void;
  togglePlay: () => void;
  toggleMute: () => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  nextSpeed: () => void;
}

type PlaybackStore = PlaybackState & PlaybackActions;

const SPEED_OPTIONS = [0.5, 1, 1.25, 1.5, 2];

export const usePlayback = create<PlaybackStore>((set, get) => ({
  // State
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  isMuted: false,
  volume: 1,
  playbackSpeed: 1,
  isFullscreen: false,
  showCaptions: false,

  // Actions
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsMuted: (muted) => set({ isMuted: muted }),
  setVolume: (volume) => set({ volume }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setIsFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
  setShowCaptions: (show) => set({ showCaptions: show }),

  seek: (time) => {
    const { duration } = get();
    const clampedTime = Math.max(0, Math.min(time, duration));
    set({ currentTime: clampedTime });
  },

  togglePlay: () => {
    const { isPlaying } = get();
    set({ isPlaying: !isPlaying });
  },

  toggleMute: () => {
    const { isMuted } = get();
    set({ isMuted: !isMuted });
  },

  skipForward: (seconds = 15) => {
    const { currentTime, duration } = get();
    const newTime = Math.min(currentTime + seconds, duration);
    set({ currentTime: newTime });
  },

  skipBackward: (seconds = 15) => {
    const { currentTime } = get();
    const newTime = Math.max(currentTime - seconds, 0);
    set({ currentTime: newTime });
  },

  nextSpeed: () => {
    const { playbackSpeed } = get();
    const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    set({ playbackSpeed: SPEED_OPTIONS[nextIndex] });
  }
}));