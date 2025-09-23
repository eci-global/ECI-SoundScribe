import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, CreditCard, LogOut, ChevronDown } from 'lucide-react';

interface ProfileMenuProps {
  userEmail?: string;
  userInitials?: string;
  onProfile?: () => void;
  onSignOut?: () => void;
}

export default function ProfileMenu({
  userEmail,
  userInitials = 'US',
  onProfile,
  onSignOut
}: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const profileItems = [
    { icon: User, label: 'Profile', action: onProfile },
    { icon: CreditCard, label: 'Billing', action: () => console.log('Billing') },
    { icon: LogOut, label: 'Sign Out', action: onSignOut, destructive: true }
  ];

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        aria-label="Profile menu"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-[#62E7D3] to-[#CE8CFF] rounded-full flex items-center justify-center text-white font-medium text-sm">
          {userInitials}
        </div>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 bg-white/95 backdrop-blur-lg border border-slate-200/50 rounded-xl shadow-lg py-2"
          >
            {/* User Info */}
            {userEmail && (
              <div className="px-4 py-3 border-b border-slate-200/50">
                <p className="text-sm font-medium text-slate-900 truncate">{userEmail}</p>
              </div>
            )}

            {/* Menu Items */}
            {profileItems.map((item, index) => (
              <button
                key={item.label}
                onClick={() => {
                  item.action?.();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                  item.destructive
                    ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                } ${index === profileItems.length - 1 && item.destructive ? 'border-t border-slate-200/50 mt-1 pt-3' : ''}`}
              >
                <item.icon className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}