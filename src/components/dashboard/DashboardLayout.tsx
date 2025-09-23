
import React, { useState } from 'react';
import GongLayout from '@/components/layout/GongLayout';
import { GongNavSection } from '@/components/navigation/GongTopNav';
import ConversationsSidebar from '@/components/conversations/ConversationsSidebar';
import ConversationView from '@/components/conversations/ConversationView';
import UploadModal from '@/components/dashboard/UploadModal';
import ImportModal from '@/components/dashboard/ImportModal';
import FloatingPlayer from '@/components/dashboard/FloatingPlayer';
import FloatingChat from '@/components/chat/FloatingChat';
import RecordingCanvas from '@/components/dashboard/RecordingCanvas';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { GlobalDragOverlay } from '@/components/ui/global-drag-overlay';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useToast } from '@/hooks/use-toast';
import Settings from '@/pages/Settings';
import Chatbot from '@/pages/Chatbot';
import Summaries from '@/pages/Summaries';
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';

import type { Recording } from '@/types/recording';
import type { ContentType } from './UploadModal';

interface DashboardLayoutProps {
  recordings: Recording[];
  onUpload: (file: File, title: string, description: string, contentType?: ContentType, enableCoaching?: boolean) => Promise<void>;
  onImport: (type: 'outreach' | 'vonage', credentials: any) => Promise<void>;
  onPlayRecording: (recording: Recording) => void;
  onDeleteRecording: (recordingId: string, fileUrl?: string) => void;
  onRegenerateSummary?: (recordingId: string, newSummary: string) => void;
  onGlobalFileDrop: (file: File) => Promise<void>;
  activeSection?: GongNavSection;
  onNavigate?: (section: GongNavSection) => void;
  userId: string;
  adminMode?: boolean;
  adminContent?: React.ReactNode;
}

export default function DashboardLayout({
  recordings,
  onUpload,
  onImport,
  onPlayRecording,
  onDeleteRecording,
  onRegenerateSummary,
  onGlobalFileDrop,
  activeSection = 'dashboard',
  onNavigate,
  userId,
  adminMode = false,
  adminContent
}: DashboardLayoutProps) {
  const { toast } = useToast();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(
    recordings.length > 0 ? recordings[0] : null
  );
  const [playingRecording, setPlayingRecording] = useState<Recording | null>(null);
  const [showFloatingPlayer, setShowFloatingPlayer] = useState(false);
  const [chatRecording, setChatRecording] = useState<Recording | null>(null);
  const [showFloatingChat, setShowFloatingChat] = useState(false);
  const [canvasRecording, setCanvasRecording] = useState<Recording | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const { isDragActive, getRootProps } = useDragAndDrop({
    onFileDrop: (files) => {
      if (files.length > 0) {
        onGlobalFileDrop(files[0]);
      }
    },
    accept: ['audio/*', 'video/*'],
    multiple: false
  });

  const handleNavigate = (section: GongNavSection) => {
    if (onNavigate) {
      onNavigate(section);
    }
  };

  const handleUploadClick = () => {
    setUploadModalOpen(true);
  };

  const handleSelectRecording = (recording: Recording) => {
    setSelectedRecording(recording);
  };

  const handleChatWithRecording = (recording: Recording) => {
    if (recording.status !== 'completed') {
      toast({
        title: "Processing required",
        description: "Please wait for the recording to be processed before chatting",
        variant: "destructive"
      });
      return;
    }
    
    setChatRecording(recording);
    setShowFloatingChat(true);
  };

  const handleFloatingPlay = (recording: Recording) => {
    if (playingRecording?.id === recording.id) {
      setPlayingRecording(null);
      setShowFloatingPlayer(false);
    } else {
      setPlayingRecording(recording);
      setShowFloatingPlayer(true);
    }
  };

  const closeFloatingPlayer = () => {
    setShowFloatingPlayer(false);
    setPlayingRecording(null);
  };

  const handleOpenCanvas = (recording: Recording) => {
    setCanvasRecording(recording);
  };

  const handleCloseCanvas = () => {
    setCanvasRecording(null);
  };

  const renderMainContent = () => {
    if (adminMode && adminContent) {
      return adminContent;
    }

    if (chatOpen && selectedRecording) {
      return (
        <div className="h-full">
          <ChatInterface
            recordingId={selectedRecording.id}
            onClose={() => {
              setChatOpen(false);
              setSelectedRecording(null);
            }}
          />
        </div>
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return selectedRecording ? (
          <ConversationView
            recording={selectedRecording}
            onPlay={() => handleFloatingPlay(selectedRecording)}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gong-gray mb-2">Welcome to SoundScribe</h3>
              <p className="text-gong-gray-lighter">Upload a conversation to get started</p>
              <button
                onClick={handleUploadClick}
                className="mt-4 bg-gong-purple text-white px-6 py-3 rounded-lg font-medium hover:bg-gong-purple-dark transition-colors"
              >
                Upload Conversation
              </button>
            </div>
          </div>
        );
      case 'assistant':
        return <Chatbot userId={userId} recordings={recordings.filter(r => r.status === 'completed')} />;
      case 'summaries':
        return <Summaries />;
      case 'analytics':
        return <AnalyticsDashboard recordings={recordings} />;
      default:
        return selectedRecording ? (
          <ConversationView
            recording={selectedRecording}
            onPlay={() => handleFloatingPlay(selectedRecording)}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gong-gray mb-2">Select a conversation</h3>
              <p className="text-gong-gray-lighter">Choose a conversation from the sidebar to view details</p>
            </div>
          </div>
        );
    }
  };


  return (
    <div {...getRootProps()}>
      <GongLayout
        activeSection={activeSection}
        onNavigate={handleNavigate}
      >
        {renderMainContent()}
      </GongLayout>

      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={onUpload}
      />

      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={onImport}
      />

      <GlobalDragOverlay
        isActive={isDragActive}
        onDrop={(files) => {
          if (files.length > 0) {
            onGlobalFileDrop(files[0]);
          }
        }}
      />

      <FloatingPlayer
        recording={playingRecording}
        onClose={closeFloatingPlayer}
      />

      <FloatingChat
        recording={chatRecording}
        onClose={() => {
          setChatRecording(null);
          setShowFloatingChat(false);
        }}
        userId={userId}
      />

      {canvasRecording && (
        <RecordingCanvas
          recordings={[canvasRecording]}
          onClose={handleCloseCanvas}
          userId={userId}
          onRegenerateSummary={onRegenerateSummary}
        />
      )}
    </div>
  );
}
