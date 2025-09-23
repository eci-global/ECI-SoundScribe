
import React from 'react';

export interface SpotlightTabsProps {
  activeTab: 'highlights' | 'outline' | 'ask';
  onTabChange: (tab: 'highlights' | 'outline' | 'ask') => void;
}

export default function SpotlightTabs({ activeTab, onTabChange }: SpotlightTabsProps) {
  const tabs = [
    { id: 'highlights' as const, label: 'Highlights' },
    { id: 'outline' as const, label: 'Outline' },
    { id: 'ask' as const, label: 'Ask' }
  ];

  return (
    <div className="flex border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
