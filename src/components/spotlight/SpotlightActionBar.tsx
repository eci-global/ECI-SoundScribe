import React from 'react';
import { Star, Bookmark, Share2, Eye, EyeOff } from 'lucide-react';

export default function SpotlightActionBar() {
  const actions = [
    { icon: Star, label: 'Favorite' },
    { icon: Bookmark, label: 'Bookmark' },
    { icon: Share2, label: 'Share' },
    { icon: Eye, label: 'Show captions' },
    { icon: EyeOff, label: 'Hide captions' }
  ];

  return (
    <div className="fixed right-4 top-24 z-40 flex flex-col gap-4">
      {actions.map(({ icon: Icon, label }, idx) => (
        <button
          key={idx}
          title={label}
          className="w-9 h-9 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <Icon className="w-5 h-5 text-eci-gray-700" strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
} 