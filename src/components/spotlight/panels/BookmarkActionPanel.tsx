import React, { useState } from 'react';
import { useSpotlight } from '@/contexts/SpotlightContext';

export default function BookmarkActionPanel() {
  const { addBookmark } = useSpotlight();
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#facc15');

  return (
    <div>
      <h3 className="font-semibold mb-4">Bookmark Moment</h3>
      <label className="block text-sm mb-1">Label</label>
      <input value={label} onChange={e=>setLabel(e.target.value)}
        className="w-full border rounded p-2 mb-3" placeholder="e.g., Budget discussion" />
      <label className="block text-sm mb-1">Color</label>
      <input type="color" value={color} onChange={e=>setColor(e.target.value)}
        className="w-full border rounded h-10 mb-4" />
      <button disabled={!label.trim()}
        onClick={()=>{addBookmark(label.trim(), color); setLabel('');}}
        className="px-3 py-1 bg-eci-blue text-white rounded text-sm disabled:opacity-40">Save Bookmark</button>
    </div>
  );
} 