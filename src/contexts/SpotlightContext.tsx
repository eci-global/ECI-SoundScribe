import React, { createContext, useContext, useState, ReactNode } from 'react';

export type LeftPanelType =
  | 'search'
  | 'moments'
  | 'speakers'
  | 'analytics'
  | 'comments'
  | 'attachments'
  | 'info'
  | 'diagnostics'
  | 'sentiment';

export type RightPanelType =
  | 'comment'
  | 'bookmark'
  | 'reaction'
  | 'visibility';

interface SpotlightContextValue {
  activeLeftPanel: LeftPanelType | null;
  activeRightPanel: RightPanelType | null;
  setLeftPanel: (panel: LeftPanelType | null) => void;
  setRightPanel: (panel: RightPanelType | null) => void;
  transcriptLines?: {
    timestamp: number;
    speaker: string;
    text: string;
  }[];
  currentTime?: number;
  seek?: (time: number) => void;
  recording?: {
    id: string;
    [key: string]: any;
  } | null;
  comments: CommentItem[];
  addComment: (text: string, visibility: 'private' | 'team' | 'org') => void;
  bookmarks: BookmarkItem[];
  addBookmark: (label: string, color: string) => void;
  reactions: ReactionItem[];
  addReaction: (emoji: string) => void;
}

const SpotlightContext = createContext<SpotlightContextValue | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
  transcriptLines?: SpotlightContextValue['transcriptLines'];
  currentTime?: number;
  seek?: (time: number) => void;
  recording?: SpotlightContextValue['recording'];
}

export const SpotlightProvider = ({ children, transcriptLines, currentTime, seek, recording }: ProviderProps) => {
  const [activeLeftPanel, setActiveLeftPanel] = useState<LeftPanelType | null>(null);
  const [activeRightPanel, setActiveRightPanel] = useState<RightPanelType | null>(null);

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [reactions, setReactions] = useState<ReactionItem[]>([]);

  const toggleLeft = (panel: LeftPanelType | null) => {
    setActiveLeftPanel(prev => (prev === panel ? null : panel));
    // Close right when opening left
    if (panel) setActiveRightPanel(null);
  };

  const toggleRight = (panel: RightPanelType | null) => {
    setActiveRightPanel(prev => (prev === panel ? null : panel));
    // Close left when opening right
    if (panel) setActiveLeftPanel(null);
  };

  const addComment = (text: string, visibility: 'private'|'team'|'org') => {
    if (!currentTime) return;
    setComments(prev => [...prev, { id: Date.now().toString(), timestamp: currentTime!, user: 'You', text, visibility }]);
  };

  const addBookmark = (label: string, color: string) => {
    if (!currentTime) return;
    setBookmarks(prev => [...prev, { id: Date.now().toString(), timestamp: currentTime!, label, color }]);
  };

  const addReaction = (emoji: string) => {
    if (!currentTime) return;
    setReactions(prev => [...prev, { id: Date.now().toString(), timestamp: currentTime!, emoji, user: 'You' }]);
  };

  return (
    <SpotlightContext.Provider
      value={{
        activeLeftPanel,
        activeRightPanel,
        setLeftPanel: toggleLeft,
        setRightPanel: toggleRight,
        transcriptLines,
        currentTime,
        seek,
        recording,
        comments,
        addComment,
        bookmarks,
        addBookmark,
        reactions,
        addReaction,
      }}
    >
      {children}
    </SpotlightContext.Provider>
  );
};

export const useSpotlight = () => {
  const ctx = useContext(SpotlightContext);
  if (!ctx) throw new Error('useSpotlight must be used within SpotlightProvider');
  return ctx;
};

interface CommentItem {
  id: string;
  timestamp: number;
  user: string;
  text: string;
  visibility: 'private' | 'team' | 'org';
}

interface BookmarkItem {
  id: string;
  timestamp: number;
  label: string;
  color: string;
}

interface ReactionItem {
  id: string;
  timestamp: number;
  emoji: string;
  user: string;
} 