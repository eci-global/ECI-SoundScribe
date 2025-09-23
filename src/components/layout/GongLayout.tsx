import React, { useState, useEffect } from 'react';
import GongTopNav, { GongNavSection } from '@/components/navigation/GongTopNav';
import ProcessingQueue from '@/pages/ProcessingQueue';
import UploadsImport from '@/pages/UploadsImport';
import NotificationsInbox from '@/pages/NotificationsInbox';
import HelpDocs from '@/pages/HelpDocs';
import TrendAnalytics from '@/pages/TrendAnalytics';
import Summaries from '@/pages/Summaries';
import AdminDashboard from '@/pages/AdminDashboard';
import FloatingChat from '@/components/chat/FloatingChat';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface GongLayoutProps {
  children: React.ReactNode;
  activeSection?: GongNavSection;
  onNavigate?: (section: GongNavSection) => void;
}

export default function GongLayout({
  children,
  activeSection = 'dashboard',
  onNavigate = () => {}
}: GongLayoutProps) {
  const [currentSection, setCurrentSection] = useState<GongNavSection>(activeSection);
  const [showQAChat, setShowQAChat] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const { user } = useAuth();

  // Update current section when prop changes
  useEffect(() => {
    setCurrentSection(activeSection);
  }, [activeSection]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const shortcuts: Record<string, GongNavSection> = {
        'd': 'dashboard',
        'u': 'uploads',
        's': 'summaries',
        'q': 'assistant',
        'a': 'analytics',
        'n': 'notifications',
        'h': 'help'
      };

      const section = shortcuts[e.key.toLowerCase()];
      if (section && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleNavigation(section);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigation = (section: GongNavSection) => {
    setCurrentSection(section);
    onNavigate(section);

    // Special handling for Q&A Assistant
    if (section === 'assistant') {
      setShowQAChat(true);
    }
  };

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'processing':
        return <ProcessingQueue />;
      case 'uploads':
        return <UploadsImport />;
      case 'notifications':
        return <NotificationsInbox />;
      case 'help':
        return <HelpDocs />;
      case 'analytics':
        return <TrendAnalytics />;
      case 'summaries':
        return children;
      case 'admin':
        return <AdminDashboard />;
      case 'assistant':
        // Show empty state and floating chat
        return (
          <div className="min-h-screen bg-eci-light-gray flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-eci-red/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h2 className="text-title text-eci-gray-800 mb-2">Q&A Assistant</h2>
              <p className="text-body text-eci-gray-600 mb-4">
                Ask questions about any of your recordings using the chat interface
              </p>
              <p className="text-body-small text-eci-gray-500">
                The Q&A assistant is now available in the bottom-left corner
              </p>
            </div>
          </div>
        );
      default:
        return children;
    }
  };

  return (
    <div className="min-h-screen bg-eci-light-gray flex flex-col">
      {/* Top Navigation - Always visible */}
      <GongTopNav 
        activeSection={currentSection}
        onNavigate={handleNavigation}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Icon Sidebar - Removed */}
        
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {renderCurrentSection()}
        </div>
      </div>

      {/* Global Q&A Assistant */}
      {showQAChat && (
        <FloatingChat
          recording={selectedRecording}
          onClose={() => setShowQAChat(false)}
          userId={user?.id || ''}
        />
      )}
    </div>
  );
}
