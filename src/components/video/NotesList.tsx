
import React, { useState } from 'react';
import { Plus, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import type { Recording } from '@/types/recording';

interface Note {
  id: string;
  content: string;
  timestamp: number;
  author: string;
  createdAt: Date;
  replies?: Note[];
}

interface NotesListProps {
  currentRecording?: Recording | null;
}

export default function NotesList({ currentRecording }: NotesListProps) {
  const { state, dispatch } = useVideoPlayer();
  
  // Generate context-aware mock notes based on recording data
  const generateMockNotes = (): Note[] => {
    if (!currentRecording) return [];

    const baseNotes: Note[] = [];

    // Add notes based on recording content type
    if (currentRecording.content_type === 'sales_call') {
      baseNotes.push({
        id: '1',
        content: 'Great discovery questions around budget and timeline. Follow up on decision-making process.',
        timestamp: 120,
        author: 'Sales Manager',
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      });
      
      baseNotes.push({
        id: '2',
        content: 'Customer mentioned competitor pricing. Prepare ROI comparison for follow-up.',
        timestamp: 180,
        author: 'Account Executive',
        createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        replies: [{
          id: '2-1',
          content: 'I have the competitive analysis ready. Will send it over.',
          timestamp: 180,
          author: 'Sales Engineer',
          createdAt: new Date(Date.now() - 1000 * 60 * 10)
        }]
      });
    } else if (currentRecording.content_type === 'customer_support') {
      baseNotes.push({
        id: '1',
        content: 'Customer reported integration issues. Escalating to technical team.',
        timestamp: 60,
        author: 'Support Agent',
        createdAt: new Date(Date.now() - 1000 * 60 * 45),
      });
    } else if (currentRecording.content_type === 'team_meeting') {
      baseNotes.push({
        id: '1',
        content: 'Action item: Review Q4 goals and update project timeline.',
        timestamp: 300,
        author: 'Project Manager',
        createdAt: new Date(Date.now() - 1000 * 60 * 20),
      });
    }

    return baseNotes;
  };

  const [notes, setNotes] = useState<Note[]>(generateMockNotes());
  const [newNote, setNewNote] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    const note: Note = {
      id: Date.now().toString(),
      content: newNote.trim(),
      timestamp: state.currentTime,
      author: 'You',
      createdAt: new Date()
    };

    setNotes([note, ...notes]);
    setNewNote('');
    console.log('Added note for recording:', currentRecording?.id, 'at timestamp:', note.timestamp);
  };

  const handleAddReply = (parentId: string) => {
    if (!replyContent.trim()) return;

    const reply: Note = {
      id: `${parentId}-${Date.now()}`,
      content: replyContent.trim(),
      timestamp: state.currentTime,
      author: 'You',
      createdAt: new Date()
    };

    setNotes(notes.map(note => {
      if (note.id === parentId) {
        return {
          ...note,
          replies: [...(note.replies || []), reply]
        };
      }
      return note;
    }));

    setReplyContent('');
    setReplyTo(null);
    console.log('Added reply to note:', parentId, 'for recording:', currentRecording?.id);
  };

  const handleNoteClick = (timestamp: number) => {
    dispatch({ type: 'SET_TIME', payload: timestamp });
    console.log('Jumped to note timestamp:', timestamp);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentRecording) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-eci-gray-200">
        <h3 className="text-title-small font-semibold text-eci-gray-800 mb-4">
          Notes
        </h3>
        <div className="text-center py-8">
          <p className="text-body text-eci-gray-500">
            Select a recording to view and add notes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg border border-eci-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-title-small font-semibold text-eci-gray-800">
          Notes
        </h3>
        <span className="text-caption text-eci-gray-500">
          {notes.length} note{notes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Add Note */}
      <div className="mb-6 p-4 bg-eci-gray-50 rounded-2xl">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note at the current timestamp..."
          className="w-full h-20 p-3 bg-white border border-eci-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent text-body"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleAddNote();
            }
          }}
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-body-small text-eci-gray-500 flex items-center">
            <Clock className="w-3 h-3 mr-1" strokeWidth={1.5} />
            {formatTime(state.currentTime)}
          </span>
          <Button
            onClick={handleAddNote}
            disabled={!newNote.trim()}
            size="sm"
            className="bg-brand-red hover:bg-eci-red-dark"
          >
            <Plus className="w-4 h-4 mr-1" strokeWidth={1.5} />
            Add Note
          </Button>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {notes.map((note) => (
          <div key={note.id} className="space-y-3">
            {/* Main Note */}
            <div className="p-4 bg-eci-gray-50 rounded-2xl">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-eci-gray-500" strokeWidth={1.5} />
                  <span className="text-body-small font-medium text-eci-gray-700">
                    {note.author}
                  </span>
                  <span className="text-body-small text-eci-gray-500">
                    {formatDate(note.createdAt)}
                  </span>
                </div>
                <button
                  onClick={() => handleNoteClick(note.timestamp)}
                  className="text-body-small text-brand-red hover:text-eci-red-dark font-medium flex items-center"
                >
                  <Clock className="w-3 h-3 mr-1" strokeWidth={1.5} />
                  {formatTime(note.timestamp)}
                </button>
              </div>
              
              <p className="text-body text-eci-gray-800 mb-3">
                {note.content}
              </p>
              
              <button
                onClick={() => setReplyTo(replyTo === note.id ? null : note.id)}
                className="text-body-small text-eci-gray-500 hover:text-brand-red font-medium"
              >
                Reply
              </button>
            </div>

            {/* Replies */}
            {note.replies && note.replies.length > 0 && (
              <div className="ml-6 space-y-2">
                {note.replies.map((reply) => (
                  <div key={reply.id} className="p-3 bg-white border border-eci-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <User className="w-3 h-3 text-eci-gray-500" strokeWidth={1.5} />
                        <span className="text-caption font-medium text-eci-gray-700">
                          {reply.author}
                        </span>
                        <span className="text-caption text-eci-gray-500">
                          {formatDate(reply.createdAt)}
                        </span>
                      </div>
                    </div>
                    <p className="text-body-small text-eci-gray-800">
                      {reply.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Form */}
            {replyTo === note.id && (
              <div className="ml-6 p-3 bg-white border border-eci-gray-200 rounded-xl">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full h-16 p-2 border border-eci-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent text-body-small"
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReplyTo(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleAddReply(note.id)}
                    disabled={!replyContent.trim()}
                    size="sm"
                    className="bg-brand-red hover:bg-eci-red-dark"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {notes.length === 0 && (
        <div className="text-center py-8">
          <p className="text-body text-eci-gray-500">
            No notes for this recording yet
          </p>
          <p className="text-body-small text-eci-gray-400 mt-1">
            Add your first note using the form above
          </p>
        </div>
      )}
    </div>
  );
}
