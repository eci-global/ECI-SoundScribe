
import React from 'react';
import { useNavigate } from 'react-router-dom';
import GongTopNav, { GongNavSection } from '@/components/navigation/GongTopNav';

interface StandardLayoutProps {
  children: React.ReactNode;
  activeSection?: GongNavSection;
}

export default function StandardLayout({ children, activeSection = 'dashboard' }: StandardLayoutProps) {
  const navigate = useNavigate();

  const handleNavigation = (section: GongNavSection) => {
    switch (section) {
      case 'dashboard':
        navigate('/');
        break;
      case 'uploads':
        navigate('/uploads');
        break;
      case 'processing':
        navigate('/processing');
        break;
      case 'assistant':
        navigate('/AssistantCoach');
        break;
      case 'summaries':
        navigate('/recordings');
        break;
      case 'analytics':
        navigate('/analytics');
        break;
      case 'notifications':
        navigate('/notifications');
        break;
      case 'help':
        navigate('/help');
        break;
      case 'admin':
        navigate('/admin');
        break;
      default:
        navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-eci-light-gray flex flex-col">
      <GongTopNav 
        activeSection={activeSection}
        onNavigate={handleNavigation}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {children}
      </div>
    </div>
  );
}
