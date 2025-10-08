import React, { useState } from 'react';
import { 
  Search, 
  ChevronDown, 
  Settings, 
  HelpCircle, 
  Bell,
  LayoutDashboard,
  Upload,
  Activity,
  MessageSquare,
  FileText,
  TrendingUp,
  Users,
  Shield,
  Menu,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSupportMode } from '@/contexts/SupportContext';

export type GongNavSection = 'dashboard' | 'uploads' | 'processing' | 'assistant' | 'summaries' | 'analytics' | 'notifications' | 'help' | 'admin';

interface GongTopNavProps {
  activeSection: GongNavSection;
  onNavigate: (section: GongNavSection) => void;
  userEmail?: string;
  workspaceName?: string;
}

const navItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'uploads' as const, label: 'Uploads', icon: Upload },
  { id: 'assistant' as const, label: 'Assistant', icon: MessageSquare },
  { id: 'summaries' as const, label: 'Outreach', icon: FileText },
  { id: 'analytics' as const, label: 'Analytics', icon: TrendingUp },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  { id: 'help' as const, label: 'Help', icon: HelpCircle },
  { id: 'admin' as const, label: 'Admin', icon: Shield }
];

export default function GongTopNav({ 
  activeSection, 
  onNavigate, 
  userEmail = 'user@company.com',
  workspaceName = 'Workspace'
}: GongTopNavProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const supportMode = useSupportMode();

  return (
    <nav className="bg-eci-charcoal border-b border-eci-charcoal-light shadow-sm">
      <div className="mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Workspace */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <span className="text-xl font-bold text-white tracking-tight">eci</span>
                <div className="w-1.5 h-1.5 bg-eci-red rounded-full"></div>
              </div>
            </div>
            
            {/* Mode Toggle - Sales/Support/UX */}
            <button
              onClick={() => supportMode.toggleMode()}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-eci-charcoal-light hover:bg-eci-charcoal-light/80 transition-all duration-200 border border-eci-gray-600 hover:border-eci-gray-500"
              title={`Switch to ${supportMode.currentMode === 'sales' ? 'Support' : supportMode.currentMode === 'support' ? 'UX' : 'Sales'} Mode`}
            >
              <div className="flex items-center space-x-1.5">
                {supportMode.currentMode === 'sales' && (
                  <>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-200">Sales</span>
                  </>
                )}
                {supportMode.currentMode === 'support' && (
                  <>
                    <UserCheck className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-medium text-blue-200">Support</span>
                  </>
                )}
                {supportMode.currentMode === 'ux' && (
                  <>
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-medium text-purple-200">UX</span>
                  </>
                )}
              </div>
            </button>

            {/* Workspace Selector - Removed AI Incubator */}
            <div className="hidden md:flex items-center space-x-2 text-eci-gray-300 hover:text-white cursor-pointer transition-colors">
              <span className="text-sm font-medium whitespace-nowrap">{workspaceName}</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Center: Navigation - Desktop */}
          <div className="hidden lg:flex items-center space-x-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap",
                  activeSection === item.id
                    ? "bg-eci-charcoal-light text-white shadow-sm"
                    : "text-eci-gray-300 hover:text-white hover:bg-eci-charcoal-light/50"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                <span className="hidden xl:inline">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-eci-gray-300 hover:text-white p-2 rounded-lg hover:bg-eci-charcoal-light transition-all"
          >
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>

          {/* Right: Search + User - Desktop */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-eci-gray-400" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-eci-charcoal-light border border-eci-charcoal-light rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-eci-gray-400 focus:outline-none focus:ring-2 focus:ring-eci-red/20 focus:border-eci-red transition-all w-48"
              />
            </div>

            {/* Notifications */}
            <button 
              onClick={() => onNavigate('notifications')}
              className="text-eci-gray-300 hover:text-white p-2 rounded-lg hover:bg-eci-charcoal-light transition-all"
            >
              <Bell className="w-5 h-5" strokeWidth={1.5} />
            </button>

            {/* Help */}
            <button 
              onClick={() => onNavigate('help')}
              className="text-eci-gray-300 hover:text-white p-2 rounded-lg hover:bg-eci-charcoal-light transition-all"
            >
              <HelpCircle className="w-5 h-5" strokeWidth={1.5} />
            </button>

            {/* User Menu */}
            <div className="flex items-center space-x-2 text-eci-gray-300 hover:text-white cursor-pointer p-2 rounded-lg hover:bg-eci-charcoal-light transition-all">
              <div className="w-8 h-8 bg-eci-gray-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">{userEmail.charAt(0).toUpperCase()}</span>
              </div>
              <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-eci-charcoal-light py-4">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap",
                    activeSection === item.id
                      ? "bg-eci-charcoal-light text-white shadow-sm"
                      : "text-eci-gray-300 hover:text-white hover:bg-eci-charcoal-light/50"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
