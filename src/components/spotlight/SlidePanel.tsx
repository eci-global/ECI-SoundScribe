
import React, { ComponentType } from 'react';
import SearchPanel from './panels/SearchPanel';
import MomentsPanel from './panels/MomentsPanel';
import SpeakersPanel from './panels/SpeakersPanel';
import AnalyticsPanel from './panels/AnalyticsPanel';
import CommentsPanel from './panels/CommentsPanel';
import AttachmentsPanel from './panels/AttachmentsPanel';
import InfoPanel from './panels/InfoPanel';
import DiagnosticsPanel from './panels/DiagnosticsPanel';
import SentimentMomentsPanel from './panels/SentimentMomentsPanel';
import OutreachPanel from './panels/OutreachPanel';
import { useSpotlight } from '@/contexts/SpotlightContext';

type LeftPanelType = 'search' | 'moments' | 'speakers' | 'analytics' | 'comments' | 'attachments' | 'info' | 'diagnostics' | 'sentiment' | 'outreach';

interface SlidePanelProps {
  isOpen: boolean;
  panel: LeftPanelType | null;
  onClose: () => void;
}

interface PanelProps {
  recording?: any;
}

const panelComponents: Record<LeftPanelType, ComponentType<PanelProps>> = {
  search: SearchPanel,
  moments: MomentsPanel,
  speakers: SpeakersPanel,
  analytics: AnalyticsPanel,
  comments: CommentsPanel,
  attachments: AttachmentsPanel,
  info: InfoPanel,
  diagnostics: DiagnosticsPanel,
  sentiment: SentimentMomentsPanel,
  outreach: OutreachPanel
};

export default function SlidePanel({ isOpen, panel, onClose }: SlidePanelProps) {
  const { recording } = useSpotlight();
  
  if (!isOpen || !panel) {
    return null;
  }

  const PanelComponent = panelComponents[panel];

  return (
    <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-lg z-50 transform transition-transform duration-300">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold capitalize">{panel}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PanelComponent recording={recording} />
        </div>
      </div>
    </div>
  );
}
