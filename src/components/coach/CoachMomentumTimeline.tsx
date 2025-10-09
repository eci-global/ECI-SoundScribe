import React from 'react';

export function CoachMomentumTimeline({ items }: { items: Array<{ date: string; metric: string; value: number }> }) {
  if (!items || items.length === 0) return <div className="text-sm text-gray-500">No momentum data.</div>;
  return (
    <div className="rounded-md border bg-white p-4 shadow-sm">
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{new Date(it.date).toLocaleDateString()}</span>
            <span className="text-gray-900">{it.metric}: {it.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

