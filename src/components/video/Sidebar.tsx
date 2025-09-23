
import React, { useState } from 'react';
import { Search, Menu, X } from 'lucide-react';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import { cn } from '@/lib/utils';
import KeyMomentsCard from './KeyMomentsCard';
import NotesList from './NotesList';
import TranscriptView from './TranscriptView';
import type { Recording } from '@/types/recording';

interface SidebarProps {
  className?: string;
  currentRecording?: Recording | null;
}

export default function Sidebar({ className, currentRecording }: SidebarProps) {
  const { state, dispatch } = useVideoPlayer();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_SEARCH', payload: e.target.value });
  };

  const handleTabChange = (tab: 'highlights' | 'everything') => {
    dispatch({ type: 'SET_TAB', payload: tab });
    console.log('Tab changed to:', tab);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="lg:hidden fixed top-4 right-4 z-50 p-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-red"
      >
        {isCollapsed ? (
          <Menu className="w-5 h-5 text-eci-gray-700" strokeWidth={1.5} />
        ) : (
          <X className="w-5 h-5 text-eci-gray-700" strokeWidth={1.5} />
        )}
      </button>

      {/* Sidebar */}
      <div className={cn(
        "h-full bg-white/90 backdrop-blur-md border-l border-eci-gray-200/50 transition-transform duration-300 lg:translate-x-0",
        isCollapsed ? "translate-x-full" : "translate-x-0",
        "lg:relative fixed inset-y-0 right-0 z-40 w-full lg:w-auto",
        className
      )}>
        <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-eci-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search transcript..."
              value={state.searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 bg-white border border-eci-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent text-body placeholder-eci-gray-400"
            />
          </div>

          {/* Tab Pills */}
          <div className="flex bg-eci-gray-100 rounded-2xl p-1">
            <button
              onClick={() => handleTabChange('highlights')}
              className={cn(
                "flex-1 py-2 px-4 rounded-xl text-body-small font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-red",
                state.activeTab === 'highlights'
                  ? "bg-white text-brand-red shadow-sm"
                  : "text-eci-gray-600 hover:text-eci-gray-800"
              )}
            >
              Highlights
            </button>
            <button
              onClick={() => handleTabChange('everything')}
              className={cn(
                "flex-1 py-2 px-4 rounded-xl text-body-small font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-red",
                state.activeTab === 'everything'
                  ? "bg-white text-brand-red shadow-sm"
                  : "text-eci-gray-600 hover:text-eci-gray-800"
              )}
            >
              Everything
            </button>
          </div>

          {/* Content based on active tab */}
          {state.activeTab === 'highlights' ? (
            <div className="space-y-6 flex-1">
              <KeyMomentsCard currentRecording={currentRecording} />
              <NotesList currentRecording={currentRecording} />
            </div>
          ) : (
            <div className="flex-1">
              <TranscriptView currentRecording={currentRecording} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
}
