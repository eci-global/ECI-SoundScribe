import React from 'react';

export function ServicePulse({ summary }: { summary: any }) {
  const metrics = summary?.metrics || [];
  return (
    <div className="rounded-md border bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-medium text-gray-900">Service health</div>
      {metrics.length === 0 ? (
        <div className="text-sm text-gray-500">No service metrics available.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((m: any, i: number) => (
            <div key={i} className="rounded border bg-gray-50 p-3">
              <div className="text-xs text-gray-500">{m.label}</div>
              <div className="text-base font-semibold text-gray-900">{m.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

