import React from 'react';

export function CoachMetricsBar({ metrics, mode }: { metrics: Array<{ label: string; value: number | string }>; mode?: 'sales' | 'support' }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((m, i) => (
        <div key={i} className="rounded-md border border-gray-200 bg-white p-3 text-center shadow-sm">
          <div className="text-xs text-gray-500">{m.label}</div>
          <div className="text-base font-semibold text-gray-900">{m.value}</div>
        </div>
      ))}
    </div>
  );
}

