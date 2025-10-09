import React from 'react';

export function CoachWinsPanel({ wins, mode }: { wins: Array<{ title: string; description?: string; date: string }>; mode?: 'sales' | 'support' }) {
  if (!wins || wins.length === 0) {
    return <div className="rounded-md border border-dashed p-4 text-sm text-gray-500">No recent wins yet.</div>;
  }
  return (
    <div className="rounded-md border bg-white p-4 shadow-sm">
      <ul className="space-y-2">
        {wins.map((w, i) => (
          <li key={i} className="text-sm">
            <div className="font-medium text-gray-900">{w.title}</div>
            {w.description ? <div className="text-gray-600">{w.description}</div> : null}
            <div className="text-xs text-gray-500">{new Date(w.date).toLocaleDateString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

