import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Search, Bell, HelpCircle, ArrowLeft, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { adminNav, AdminNavItem } from '@/admin/routes';
import { getRoutePermissions } from '@/admin/permissions';
import { usePermissions } from '@/hooks/usePermissions';

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Navigation items now provided by central config in src/admin/routes.tsx

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(['Organization', 'Library']);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { hasPermission } = usePermissions();
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ label: string; path?: string }>>([]);

  const toggleSection = (sectionTitle: string) => {
    setOpenSections(prev => 
      prev.includes(sectionTitle) 
        ? prev.filter(s => s !== sectionTitle)
        : [...prev, sectionTitle]
    );
  };

  const isActive = (href: string) => location.pathname === href;

  React.useEffect(() => {
    // Basic breadcrumb derive from path segments under /admin
    const path = location.pathname;
    if (!path.startsWith('/admin')) {
      setBreadcrumbs([]);
      return;
    }
    const segments = path.replace(/^\/+|\/+$/g, '').split('/');
    const crumbs: Array<{ label: string; path?: string }> = [];
    let accum = '';
    segments.forEach((seg, idx) => {
      accum += '/' + seg;
      const label = seg
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      crumbs.push({ label, path: idx < segments.length - 1 ? accum : undefined });
    });
    setBreadcrumbs(crumbs);
  }, [location.pathname]);

  const renderNavItem = (item: AdminNavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openSections.includes(item.title);
    const active = item.path && isActive(item.path);

    // Permission check: hide items user cannot view
    if (item.path) {
      const req = getRoutePermissions(item.path);
      if (req.length > 0 && !req.every(hasPermission)) {
        return null;
      }
    }

    if (hasChildren) {
      return (
        <Collapsible key={item.title} open={isOpen} onOpenChange={() => toggleSection(item.title)}>
          {sidebarCollapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CollapsibleTrigger asChild>
                    <button
                      className={`w-full flex items-center justify-between px-3 py-2 text-left text-body-small text-eci-gray-700 hover:bg-eci-gray-50 rounded-md transition-colors ${
                        depth > 0 ? 'ml-4' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon && <item.icon className="w-4 h-4" strokeWidth={1.5} />}
                        <span className="sr-only">{item.title}</span>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="text-body-small font-medium">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <CollapsibleTrigger asChild>
              <button
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-body-small text-eci-gray-700 hover:bg-eci-gray-50 rounded-md transition-colors ${
                  depth > 0 ? 'ml-4' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon && <item.icon className="w-4 h-4" strokeWidth={1.5} />}
                  <span>{item.title}</span>
                </div>
                <ChevronDown 
                  className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                  strokeWidth={1.5} 
                />
              </button>
            </CollapsibleTrigger>
          )}
          {!sidebarCollapsed && (
            <CollapsibleContent className="space-y-1">
              {item.children?.map(child => renderNavItem(child, depth + 1))}
            </CollapsibleContent>
          )}
        </Collapsible>
      );
    }

    const buttonClasses = `w-full flex items-center gap-3 px-3 py-2 text-left text-body-small transition-colors rounded-md ${
      depth > 0 ? 'ml-4' : ''
    } ${
      active
        ? 'bg-lavender text-eci-gray-900 border-r-2 border-brand-red'
        : 'text-eci-gray-700 hover:bg-eci-gray-50'
    }`;

    if (sidebarCollapsed) {
      return (
        <TooltipProvider delayDuration={0} key={item.title}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => item.path && navigate(item.path)}
                className={buttonClasses}
                aria-current={active ? 'page' : undefined}
              >
                {item.icon && <item.icon className="w-4 h-4" strokeWidth={1.5} />}
                <span className="sr-only">{item.title}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="text-body-small font-medium">
              {item.title}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <button
        key={item.title}
        onClick={() => item.path && navigate(item.path)}
        className={buttonClasses}
        aria-current={active ? 'page' : undefined}
      >
        {item.icon && <item.icon className="w-4 h-4" strokeWidth={1.5} />}
        <span>{item.title}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-eci-admin-bg flex flex-col">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-eci-gray-200 px-6 py-3" role="banner">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Breadcrumb */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-eci-gray-500 hover:text-eci-gray-700 hover:bg-eci-gray-50 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-sm">Back to App</span>
            </Button>
            <div className="h-6 w-px bg-eci-gray-200"></div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-eci-gray-900 tracking-tight">eci</span>
              <div className="w-1.5 h-1.5 bg-eci-red rounded-full"></div>
              <span className="text-overline text-eci-gray-500 ml-2">ADMINISTRATION</span>
              {/* Breadcrumbs */}
              {breadcrumbs.length > 0 && (
                <div className="ml-4 flex items-center gap-2 text-sm text-eci-gray-600" aria-label="Breadcrumb">
                  {breadcrumbs.map((b, i) => (
                    <React.Fragment key={i}>
                      <span className="text-eci-gray-400">/</span>
                      {b.path ? (
                        <button
                          onClick={() => navigate(b.path!)}
                          className="hover:text-eci-gray-900"
                        >
                          {b.label}
                        </button>
                      ) : (
                        <span className="text-eci-gray-900 font-medium">{b.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Search + Notifications + User */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-eci-gray-400" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search admin..."
                className="bg-eci-gray-50 border border-eci-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm text-eci-gray-900 placeholder-eci-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all w-64"
              />
            </div>

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="text-eci-gray-500 hover:text-eci-gray-700" aria-label="Notifications">
              <Bell className="w-4 h-4" strokeWidth={1.5} />
            </Button>

            {/* Help */}
            <Button variant="ghost" size="sm" className="text-eci-gray-500 hover:text-eci-gray-700" aria-label="Help">
              <HelpCircle className="w-4 h-4" strokeWidth={1.5} />
            </Button>

            {/* User Menu */}
            <div className="flex items-center gap-2 text-eci-gray-700 cursor-pointer p-2 rounded-lg hover:bg-eci-gray-50 transition-all">
              <div className="w-8 h-8 bg-eci-red rounded-full flex items-center justify-center text-white text-body-small font-medium">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className="text-body-small font-medium hidden md:block">{user?.email || 'Admin'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className={`bg-white border-r border-eci-gray-200 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`} role="navigation" aria-label="Admin navigation">
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-eci-gray-200">
              <div className="flex items-center justify-between">
                {!sidebarCollapsed && (
                  <div>
                    <h1 className="text-overline text-eci-gray-500 mb-1">NAVIGATION</h1>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="text-eci-gray-500 hover:text-eci-gray-700"
                  aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {sidebarCollapsed ? <ChevronRight className="w-4 h-4" strokeWidth={1.5} /> : <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />}
                </Button>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-4 space-y-2 overflow-y-auto">
              {adminNav.map(item => renderNavItem(item))}
            </div>

            {/* User section */}
            <div className="p-4 border-t border-eci-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-eci-red rounded-full flex items-center justify-center text-white text-body-small font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-body-small font-medium text-eci-gray-900 truncate">
                      {user?.email || 'Admin User'}
                    </p>
                    <button
                      onClick={signOut}
                      className="text-caption text-eci-gray-500 hover:text-eci-gray-700 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
