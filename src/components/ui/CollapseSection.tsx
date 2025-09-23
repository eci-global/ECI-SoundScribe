import React, { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapseSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  headerIcon?: ReactNode;
  headerActions?: ReactNode;
  className?: string;
  contentClassName?: string;
  collapsible?: boolean;
}

export default function CollapseSection({
  title,
  children,
  defaultExpanded = true,
  headerIcon,
  headerActions,
  className = '',
  contentClassName = '',
  collapsible = true
}: CollapseSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div 
        className={`flex items-center justify-between p-4 ${
          collapsible ? 'cursor-pointer hover:bg-gray-50' : ''
        }`}
        onClick={toggleExpanded}
      >
        <div className="flex items-center gap-2">
          {headerIcon}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {headerActions}
          {collapsible && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded();
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content with smooth animation */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className={`px-4 pb-4 ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}