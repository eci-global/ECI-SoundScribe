import React from 'react';
import { CHIP_STYLES } from './coachingTheme';
import type { FocusChip } from '@/utils/coachingInsights';

interface FocusStripProps {
  items: FocusChip[];
}

export function FocusStrip({ items }: FocusStripProps) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
        Coach insights will highlight focus areas after your next coaching session.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <div key={item.label} className={CHIP_STYLES.base}>
          <span className="font-semibold text-gray-800">{item.label}</span>
          {item.detail ? <span className="text-gray-500">{item.detail}</span> : null}
        </div>
      ))}
    </div>
  );
}
