import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
  isCompact: boolean;
  shortcut: string;
}

export default function NavItem({
  icon: Icon,
  label,
  isActive,
  onClick,
  badge,
  isCompact,
  shortcut
}: NavItemProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === shortcut.toLowerCase()) {
      e.preventDefault();
      onClick();
    }
  };

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === shortcut.toLowerCase() && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          onClick();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onClick, shortcut]);

  return (
    <button
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'nav-item relative flex items-center w-full text-left transition-all duration-200',
        'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-eci-blue/50 focus:ring-offset-1',
        'rounded-lg group',
        isCompact ? 'p-3 justify-center' : 'px-3 py-2.5 gap-3',
        isActive 
          ? 'bg-eci-blue text-white shadow-sm' 
          : 'text-gray-700 hover:text-gray-900'
      )}
    >
      <div className="relative">
        <Icon 
          strokeWidth={1.5} 
          className={cn(
            'w-5 h-5 transition-colors',
            isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-900'
          )}
        />
        {badge && badge > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      
      {!isCompact && (
        <span className={cn(
          'font-medium transition-colors',
          isActive ? 'text-white' : 'text-gray-700 group-hover:text-gray-900'
        )}>
          {label}
        </span>
      )}

      {isCompact && (
        <div className="nav-tooltip">
          {label}
          <kbd className="ml-2 px-1 py-0.5 bg-gray-700 rounded text-xs">
            {shortcut.toUpperCase()}
          </kbd>
        </div>
      )}
    </button>
  );
}