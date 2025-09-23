import React from 'react';

export default function CommentActionPanel() {
  return (
    <div>
      <h3 className="font-semibold mb-4">Add Comment</h3>
      <textarea className="w-full border rounded p-2" rows={4} placeholder="Your comment…" />
      <div className="flex justify-end mt-2">
        <button className="px-3 py-1 bg-eci-blue text-white rounded text-sm">Save</button>
      </div>
    </div>
  );
} 