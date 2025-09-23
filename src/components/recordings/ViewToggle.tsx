import React from 'react';
import { Table, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ViewMode = 'table' | 'cards';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

export default function ViewToggle({ viewMode, onViewModeChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center bg-gray-100 rounded-lg p-1', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewModeChange('table')}
        className={cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
          viewMode === 'table'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
        )}
      >
        <Table className="w-4 h-4" />
        <span className="hidden sm:inline">Table</span>
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewModeChange('cards')}
        className={cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
          viewMode === 'cards'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
        )}
      >
        <Grid3X3 className="w-4 h-4" />
        <span className="hidden sm:inline">Cards</span>
      </Button>
    </div>
  );
}