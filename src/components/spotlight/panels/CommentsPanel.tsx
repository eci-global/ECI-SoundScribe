import React, { useState } from 'react';
import { useSpotlight } from '@/contexts/SpotlightContext';

export default function CommentsPanel() {
  const { comments, addComment, seek } = useSpotlight();
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<'private'|'team'|'org'>('team');

  const formatTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div className="flex flex-col h-full">
      <h3 className="font-semibold mb-4">Comments</h3>
      <ul className="space-y-3 flex-1 overflow-y-auto pr-2">
        {comments.map(c => (
          <li key={c.id} className="border p-2 rounded cursor-pointer hover:bg-gray-50"
              onClick={()=>seek && seek(c.timestamp)}>
            <div className="text-xs text-gray-400 flex justify-between">
              <span>{c.user}</span><span>{formatTime(c.timestamp)}</span>
            </div>
            <p className="text-sm mt-1">{c.text}</p>
          </li>
        ))}
        {comments.length===0 && <p className="text-sm text-gray-500">No comments yet.</p>}
      </ul>
      <div className="mt-4">
        <textarea value={text} onChange={e=>setText(e.target.value)}
          className="w-full border rounded p-2" rows={3} placeholder="Add a note…" />
        <div className="flex items-center justify-between mt-2">
          <select value={visibility} onChange={e=>setVisibility(e.target.value as any)}
            className="border rounded p-1 text-sm">
            <option value="private">Private</option>
            <option value="team">Team</option>
            <option value="org">Org</option>
          </select>
          <button disabled={!text.trim()} onClick={()=>{addComment(text.trim(), visibility); setText('');}}
            className="px-3 py-1 bg-eci-blue text-white rounded text-sm disabled:opacity-40">Save</button>
        </div>
      </div>
    </div>
  );
} 