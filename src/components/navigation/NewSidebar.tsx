import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AudioWaveform, 
  Zap, 
  MessageSquare, 
  LayoutDashboard,
  Settings,
  User,
  TrendingUp
} from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import NavItem from './NavItem';
import UploadFAB from './UploadFAB';

export type NavSection = 'recordings' | 'summaries' | 'chatbot' | 'dashboard' | 'analytics' | 'settings' | 'profile';

interface SidebarProps {
  active: NavSection;
  onNavigate: (section: NavSection) => void;
  onUpload: () => void;
  newSummaries?: number;
  userInitials?: string;
  onProfile?: () => void;
  onLogout?: () => void;
}

const navItems = [
  { 
    id: 'dashboard' as const, 
    icon: LayoutDashboard, 
    label: 'Dashboard', 
    shortcut: 'D',
    description: 'Overview of your activity'
  },
  { 
    id: 'recordings' as const, 
    icon: AudioWaveform, 
    label: 'Uploads', 
    shortcut: 'U',
    description: 'Upload and manage your audio files'
  },
  { 
    id: 'summaries' as const, 
    icon: Zap, 
    label: 'Outreach', 
    shortcut: 'S',
    description: 'AI-generated outreach material for your recordings'
  },
  { 
    id: 'chatbot' as const, 
    icon: MessageSquare, 
    label: 'Q&A Assistant', 
    shortcut: 'Q',
    description: 'Ask questions about your recordings'
  },
  { 
    id: 'analytics' as const, 
    icon: TrendingUp, 
    label: 'Analytics', 
    shortcut: 'A',
    description: 'Sales performance and coaching insights'
  }
];

const bottomNavItems = [
  { 
    id: 'settings' as const, 
    icon: Settings, 
    label: 'Settings', 
    shortcut: ',',
    description: 'Application settings and preferences'
  }
];

export default function NewSidebar({
  active,
  onNavigate,
  onUpload,
  newSummaries = 0,
  userInitials = 'US',
  onProfile,
  onLogout
}: SidebarProps) {
  const { isCollapsed } = useSidebar();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const shortcutMap: Record<string, NavSection> = {
        'u': 'recordings',
        's': 'summaries', 
        'q': 'chatbot',
        'd': 'dashboard',
        'a': 'analytics',
        ',': 'settings'
      };

      const section = shortcutMap[e.key.toLowerCase()];
      if (section && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onNavigate(section);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate]);

  const handleSummariesClick = () => {
    onNavigate('summaries');
    // Clear badge count logic would go here
  };

  const handleProfileClick = () => {
    if (onProfile) {
      onProfile();
    } else {
      onNavigate('settings');
    }
  };

  return (
    <motion.aside
      className="fixed left-0 top-0 h-full z-40 bg-white/90 backdrop-blur-lg border-r border-slate-200/50 shadow-xl rounded-r-3xl"
      animate={{ width: isCollapsed ? 72 : 270 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="flex flex-col h-full">
        {/* Brand Section */}
        <div className="p-6 border-b border-slate-200/50">
          <AnimatePresence mode="wait">
            {!isCollapsed ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-[#62E7D3] to-[#CE8CFF] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <span className="ml-3 text-xl font-bold text-slate-900">SoundScribe</span>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="flex justify-center"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-[#62E7D3] to-[#CE8CFF] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              shortcut={item.shortcut}
              description={item.description}
              isActive={active === item.id}
              isCollapsed={isCollapsed}
              badge={item.id === 'summaries' ? newSummaries : undefined}
              onClick={item.id === 'summaries' ? handleSummariesClick : () => onNavigate(item.id)}
            />
          ))}
        </nav>

        {/* Divider */}
        <div className="border-t border-slate-200/50 mx-6"></div>

        {/* Bottom Navigation */}
        <nav className="p-6 pt-6 space-y-2">
          {bottomNavItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              shortcut={item.shortcut}
              description={item.description}
              isActive={active === item.id}
              isCollapsed={isCollapsed}
              onClick={() => onNavigate(item.id)}
            />
          ))}
          
          {/* Profile Item */}
          <NavItem
            icon={User}
            label="Profile"
            shortcut="P"
            description="Your profile and account settings"
            isActive={active === 'profile'}
            isCollapsed={isCollapsed}
            onClick={handleProfileClick}
          />
        </nav>

        {/* Upload FAB */}
        <UploadFAB onUpload={onUpload} isCollapsed={isCollapsed} />
      </div>
    </motion.aside>
  );
}