import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSpotlight } from '@/contexts/SpotlightContext';

import type { Recording } from '@/types/recording';

interface TopBarProps {
  onClose?: () => void;
  recording?: Recording | null;
}

export default function TopBar({ onClose, recording }: TopBarProps) {
  const navigate = useNavigate();
  const { activeLeftPanel } = useSpotlight();
  const titles: Record<string, string> = {
    search: 'Search',
    moments: 'Moments',
    speakers: 'Speakers',
    analytics: 'Analytics',
    comments: 'Comments',
    attachments: 'Attachments',
    info: 'Info',
    diagnostics: 'Diagnostics',
    outreach: 'Outreach',
    sentiment: 'Sentiment Analysis',
  };
  
  // Use recording title if available, otherwise use panel title or default
  const getHeading = () => {
    if (recording?.title) {
      return recording.title;
    }
    if (activeLeftPanel && titles[activeLeftPanel]) {
      return titles[activeLeftPanel];
    }
    return 'Recording Details';
  };
  
  const heading = getHeading();

  const handleClose = () => {
    console.log('Close clicked - navigating to outreach recordings');
    // Navigate to the Outreach recordings list instead of the old Summaries route
    navigate('/outreach/recordings');
    onClose?.();
  };

  // Check if recording needs AI processing (missing speakers or AI moments)
  const needsAIProcessing = recording && (
    !recording.ai_insights || 
    !recording.transcript?.includes('Speaker') ||
    recording.transcript?.includes('Speaker 1')
  );

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <h1 className="text-title font-semibold text-eci-gray-800">{heading}</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="text-eci-gray-500 hover:text-eci-gray-700 hover:bg-eci-gray-100 focus:ring-2 focus:ring-brand-red"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
