import React from 'react';
import { Menu, HelpCircle } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import AdminMenu from './AdminMenu';
import ProfileMenu from './ProfileMenu';

interface TopBarProps {
  userEmail?: string;
  userInitials?: string;
  isAdmin?: boolean;
  onSignOut?: () => void;
  onProfile?: () => void;
}

export default function TopBar({
  userEmail,
  userInitials = 'US',
  isAdmin = false,
  onSignOut,
  onProfile
}: TopBarProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200/50 shadow-sm">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: Hamburger + Brand */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>
          
          <div className="flex items-center lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-r from-[#62E7D3] to-[#CE8CFF] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="ml-3 text-xl font-bold text-slate-900">SoundScribe</span>
          </div>
        </div>

        {/* Right: Help + Admin + Profile */}
        <div className="flex items-center gap-2">
          {/* Help Icon */}
          <button
            onClick={() => window.open('https://docs.soundscribe.com', '_blank')}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            aria-label="Help documentation"
          >
            <HelpCircle className="w-5 h-5" strokeWidth={1.5} />
          </button>

          {/* Admin Menu */}
          {isAdmin && <AdminMenu />}

          {/* Profile Menu */}
          <ProfileMenu
            userEmail={userEmail}
            userInitials={userInitials}
            onProfile={onProfile}
            onSignOut={onSignOut}
          />
        </div>
      </div>
    </header>
  );
}