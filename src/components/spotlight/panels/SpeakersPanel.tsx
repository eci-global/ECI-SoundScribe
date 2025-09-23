import React, { useMemo } from 'react';
import { useSpotlight } from '@/contexts/SpotlightContext';

export default function SpeakersPanel() {
  const { transcriptLines, seek } = useSpotlight();

  const speakers = useMemo(() => {
    if (!transcriptLines) return [];
    const totals = new Map<string, number>();
    transcriptLines.forEach(l => {
      totals.set(l.speaker, (totals.get(l.speaker) || 0) + 1);
    });
    const totalLines = transcriptLines.length;
    return Array.from(totals.entries()).map(([name, count]) => ({
      name,
      percent: Math.round((count / totalLines) * 100),
      firstTime: transcriptLines.find(l=>l.speaker===name)?.timestamp || 0,
    }));
  }, [transcriptLines]);

  const formatTime = (s:number)=>`${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div>
      <h3 className="font-semibold mb-4">Speaker Stats</h3>
      <ul className="space-y-2 text-sm">
        {speakers.map(s => (
          <li key={s.name} className="flex justify-between cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded"
              onClick={()=>seek && seek(s.firstTime)}>
            <span>{s.name}</span>
            <span>{s.percent}%</span>
          </li>
        ))}
      </ul>
      {speakers.length===0 && <p className="text-sm text-gray-500">No speaker data.</p>}
      <p className="text-xs text-gray-500 mt-4">Click speaker to jump to their first appearance.</p>
    </div>
  );
} 