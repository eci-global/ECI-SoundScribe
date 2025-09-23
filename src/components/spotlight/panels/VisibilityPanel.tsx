import React, { useState } from 'react';

export default function VisibilityPanel() {
  const [visibility, setVisibility] = useState<'private'|'team'|'org'>('team');
  return (
    <div>
      <h3 className="font-semibold mb-4">Visibility</h3>
      <div className="space-y-2 text-sm">
        {['private','team','org'].map(opt => (
          <label key={opt} className="flex items-center gap-2">
            <input
              type="radio"
              checked={visibility===opt}
              onChange={()=>setVisibility(opt as any)}
            />
            {opt.charAt(0).toUpperCase()+opt.slice(1)}
          </label>
        ))}
      </div>
      <button className="mt-4 px-3 py-1 bg-eci-blue text-white rounded text-sm">Save</button>
    </div>
  );
} 