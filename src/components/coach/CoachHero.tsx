import React from 'react';

export interface CoachHeroData {
  title: string;
  subtitle?: string;
  metrics: Array<{ label: string; value: number | string; trend?: 'up' | 'down' | 'flat' }>;
}

export function CoachHero({ data, supportMode, onToggleMode }: { data: CoachHeroData; supportMode?: boolean; onToggleMode?: () => void }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{data.title}</h2>
          {data.subtitle ? <p className="text-sm text-gray-600">{data.subtitle}</p> : null}
        </div>
        {onToggleMode ? (
          <button className="rounded-md border px-3 py-1 text-sm" onClick={onToggleMode}>
            {supportMode ? 'Switch to Sales' : 'Switch to Support'}
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {data.metrics.map((m, i) => (
          <div key={i} className="rounded-md border bg-gray-50 p-4">
            <div className="text-xs text-gray-500">{m.label}</div>
            <div className="text-lg font-semibold text-gray-900">{m.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

