import React from 'react';

export function FocusStrip({ items }: { items: Array<{ title: string; description?: string }> }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((it, i) => (
        <div key={i} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-900">{it.title}</div>
          {it.description ? <div className="text-xs text-gray-600">{it.description}</div> : null}
        </div>
      ))}
    </div>
  );
}

