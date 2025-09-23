import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  AudioWaveform, 
  Zap, 
  MessageSquare, 
  Settings, 
  Upload,
  Menu,
  X,
  User,
  Sparkles
} from 'lucide-react';
import NavItem from '../ui/NavItem';
import { cn } from '@/lib/utils';

export type NavSection = 'dashboard' | 'recordings' | 'summaries' | 'chatbot' | 'settings' | 'assistant';

interface SidebarProps {
  active: NavSection;
  onNavigate: (section: NavSection) => void;
  onUpload: () => void;
  newSummaries?: number;
  userInitials?: string;
  onProfile?: () => void;
  onLogout?: () => void;
}

export default function Sidebar({
  active,
  onNavigate,
  onUpload,
  newSummaries = 0,
  userInitials = 'US',
  onProfile,
  onLogout
}: SidebarProps) {
  const [isCompact, setIsCompact] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsCompact(width < 1024);
      if (width > 640) {
        setIsMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleUploadShortcut = (e: KeyboardEvent) => {
      if (e.key === 'u' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          onUpload();
        }
      }
    };

    window.addEventListener('keydown', handleUploadShortcut);
    return () => window.removeEventListener('keydown', handleUploadShortcut);
  }, [onUpload]);

  const navItems = [
    { id: 'dashboard' as const, icon: LayoutDashboard, label: 'Dashboard', shortcut: 'd' },
    { id: 'recordings' as const, icon: AudioWaveform, label: 'Uploads', shortcut: 'r' },
    { id: 'summaries' as const, icon: Zap, label: 'Outreach', shortcut: 's', badge: newSummaries },
    { id: 'chatbot' as const, icon: MessageSquare, label: 'Q&A Assistant', shortcut: 'q' },
    { id: 'assistant' as const, icon: Sparkles, label: 'Assistant', shortcut: 'a' },
    { id: 'settings' as const, icon: Settings, label: 'Settings', shortcut: '?' }
  ];

  const sidebarContent = (
    <nav 
      role="navigation" 
      aria-label="Main navigation"
      className={cn(
        'flex flex-col h-full bg-white border-r border-gray-200',
        isCompact ? 'w-18' : 'w-55'
      )}
    >
      {/* Upload Button */}
      <div className={cn('p-4 border-b border-gray-100', isCompact && 'px-2')}>
        <button
          onClick={onUpload}
          className={cn(
            'w-full bg-gradient-to-r from-eci-blue to-purple-600 text-white rounded-xl shadow-md',
            'hover:shadow-lg hover:shadow-eci-blue/25 transition-all duration-200 hover:scale-[1.02]',
            'focus:outline-none focus:ring-2 focus:ring-eci-blue/50 focus:ring-offset-1',
            'flex items-center justify-center gap-2 font-medium',
            isCompact ? 'p-3' : 'px-4 py-3'
          )}
        >
          <Upload strokeWidth={1.5} className="w-5 h-5" />
          {!isCompact && 'Upload recording'}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 p-4 space-y-1">
        {navItems.map((item, index) => (
          <div key={item.id}>
            <NavItem
              icon={item.icon}
              label={item.label}
              isActive={active === item.id}
              onClick={() => onNavigate(item.id)}
              badge={item.badge}
              isCompact={isCompact}
              shortcut={item.shortcut}
            />
            {/* Add divider after recordings */}
            {index === 1 && (
              <div className="my-3 border-t border-gray-200" />
            )}
          </div>
        ))}
      </div>

      {/* User Menu */}
      <div className="p-4 border-t border-gray-100">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg',
              'hover:bg-gray-50 transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-eci-blue/50 focus:ring-offset-1',
              isCompact && 'justify-center'
            )}
          >
            <div className="w-8 h-8 bg-eci-blue text-white rounded-full flex items-center justify-center font-medium text-sm">
              {userInitials}
            </div>
            {!isCompact && (
              <span className="text-gray-700 font-medium">Profile</span>
            )}
          </button>

          {showUserMenu && (
            <div className={cn(
              'absolute bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50',
              isCompact ? 'left-16 w-48' : 'left-0 right-0'
            )}>
              {onProfile && (
                <button
                  onClick={() => {
                    onProfile();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Profile
                </button>
              )}
              {onLogout && (
                <button
                  onClick={() => {
                    onLogout();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                >
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-md"
      >
        {isMobileOpen ? (
          <X strokeWidth={1.5} className="w-5 h-5" />
        ) : (
          <Menu strokeWidth={1.5} className="w-5 h-5" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed left-0 top-0 h-full z-40 transition-transform duration-300',
        'lg:relative lg:translate-x-0',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {sidebarContent}
      </aside>
    </>
  );
}
