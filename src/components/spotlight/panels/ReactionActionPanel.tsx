import React from 'react';
import { useSpotlight } from '@/contexts/SpotlightContext';

const emojis = ['👍', '🔥', '🎉', '😊'];

export default function ReactionActionPanel() {
  const { addReaction } = useSpotlight();
  return (
    <div>
      <h3 className="font-semibold mb-4">Add Reaction</h3>
      <div className="flex gap-3 text-2xl">
        {emojis.map(e => (
          <button key={e} onClick={()=>addReaction(e)}
            className="hover:scale-110 transition-transform active:scale-95">
            {e}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4">Click an emoji to react at the current time.</p>
    </div>
  );
} 