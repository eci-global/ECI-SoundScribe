import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  shortcut: string;
  description: string;
  isActive: boolean;
  isCollapsed: boolean;
  badge?: number;
  onClick: () => void;
}

export default function NavItem({
  icon: Icon,
  label,
  shortcut,
  description,
  isActive,
  isCollapsed,
  badge,
  onClick
}: NavItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <motion.button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'relative w-full flex items-center p-3 rounded-xl transition-all duration-200 group',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
          isActive
            ? 'bg-white/70 text-blue-600 shadow-sm'
            : 'text-slate-600 hover:text-blue-600 hover:bg-white/40',
          isCollapsed ? 'justify-center' : 'justify-start gap-3'
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Active Indicator */}
        {isActive && (
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-gradient-to-b from-[#62E7D3] to-[#CE8CFF] rounded-full"
            layoutId="activeIndicator"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}

        {/* Icon */}
        <div className="relative">
          <Icon className="w-5 h-5" strokeWidth={1.5} />
          {badge && badge > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
            >
              {badge > 99 ? '99+' : badge}
            </motion.span>
          )}
        </div>

        {/* Label */}
        {!isCollapsed && (
          <span className="font-medium">{label}</span>
        )}

        {/* Tooltip for Collapsed State */}
        {isCollapsed && showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute left-full ml-3 z-50 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg"
          >
            <div className="flex items-center gap-2">
              <span>{label}</span>
              <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono">
                {shortcut}
              </kbd>
            </div>
            <div className="text-xs text-slate-300 mt-1">{description}</div>
            
            {/* Arrow */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-900 rotate-45"></div>
          </motion.div>
        )}
      </motion.button>
    </div>
  );
}