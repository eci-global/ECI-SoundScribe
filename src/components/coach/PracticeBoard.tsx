import React from 'react';

export interface CoachPracticePreview {
  id: string;
  title: string;
  highlight?: string;
  priority?: 'low' | 'medium' | 'high';
  focusAreas?: string[];
  actionItems?: string[];
  strengths?: string[];
  mode?: 'sales' | 'support';
  supportingMetrics?: Array<{ label: string; value: number | string }>;
  recordingId: string;
}

export function PracticeBoard({ items, onSelect }: { items: CoachPracticePreview[]; onSelect: (preview: CoachPracticePreview) => void }) {
  if (!items || items.length === 0) {
    return <div className="rounded-md border border-dashed p-4 text-sm text-gray-500">No practice items yet.</div>;
  }
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <button key={it.id} onClick={() => onSelect(it)} className="w-full rounded-md border bg-white p-4 text-left shadow-sm hover:bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-900">{it.title}</div>
            {it.priority ? <span className="text-xs text-gray-500">{it.priority}</span> : null}
          </div>
          {it.highlight ? <div className="text-xs text-gray-600">{it.highlight}</div> : null}
        </button>
      ))}
    </div>
  );
}

