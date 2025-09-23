import React, { useState, useMemo } from 'react';
import { Search, Clock, MessageSquare } from 'lucide-react';
import { useSpotlight } from '@/contexts/SpotlightContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Recording } from '@/types/recording';

interface SearchPanelProps {
  recording?: Recording | null;
}

interface SearchResult {
  id: string;
  type: 'transcript' | 'summary' | 'title';
  content: string;
  context: string;
  timestamp?: number;
  speaker?: string;
}

export default function SearchPanel({ recording }: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { transcriptLines, seek } = useSpotlight();

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !recording) return [];

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search in transcript
    if (transcriptLines && transcriptLines.length > 0) {
      transcriptLines.forEach((line, index) => {
        if (line.text.toLowerCase().includes(query)) {
          // Get some context around the match
          const contextBefore = transcriptLines[index - 1]?.text || '';
          const contextAfter = transcriptLines[index + 1]?.text || '';
          const context = `${contextBefore} ${line.text} ${contextAfter}`.trim();

          results.push({
            id: `transcript-${index}`,
            type: 'transcript',
            content: line.text,
            context: (context?.length || 0) > 150 ? (context?.substring(0, 150) || '') + '...' : (context || ''),
            timestamp: line.timestamp,
            speaker: line.speaker
          });
        }
      });
    }

    // Search in title
    if (recording.title?.toLowerCase().includes(query)) {
      results.push({
        id: 'title',
        type: 'title',
        content: recording.title,
        context: 'Recording title',
      });
    }

    // Search in AI summary
    if (recording.ai_summary?.toLowerCase().includes(query)) {
      const summaryMatch = recording.ai_summary;
      const matchIndex = summaryMatch.toLowerCase().indexOf(query);
      const contextStart = Math.max(0, matchIndex - 50);
      const contextEnd = Math.min(summaryMatch.length, matchIndex + query.length + 50);
      const context = summaryMatch?.substring(contextStart, contextEnd) || '';

      results.push({
        id: 'summary',
        type: 'summary',
        content: query,
        context: contextStart > 0 ? '...' + context : context,
      });
    }

    // Search in regular summary
    if (recording.summary?.toLowerCase().includes(query) && !recording.ai_summary) {
      const summaryMatch = recording.summary;
      const matchIndex = summaryMatch.toLowerCase().indexOf(query);
      const contextStart = Math.max(0, matchIndex - 50);
      const contextEnd = Math.min(summaryMatch.length, matchIndex + query.length + 50);
      const context = summaryMatch?.substring(contextStart, contextEnd) || '';

      results.push({
        id: 'summary-regular',
        type: 'summary',
        content: query,
        context: contextStart > 0 ? '...' + context : context,
      });
    }

    return results;
  }, [searchQuery, recording, transcriptLines]);

  const handleResultClick = (result: SearchResult) => {
    if (result.timestamp !== undefined && seek) {
      seek(result.timestamp);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'transcript':
        return MessageSquare;
      case 'summary':
        return Search;
      case 'title':
        return Search;
      default:
        return Search;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'transcript':
        return 'Transcript';
      case 'summary':
        return 'Summary';
      case 'title':
        return 'Title';
      default:
        return 'Content';
    }
  };

  if (!recording) {
    return (
      <div className="text-center py-8">
        <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No recording loaded</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search in this recording..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {searchQuery.trim() && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {searchResults.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                No matches found for "{searchQuery}"
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Try searching for different keywords or phrases
              </p>
            </div>
          ) : (
            <>
              <div className="text-xs text-gray-500 mb-2">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </div>
              {searchResults.map((result) => {
                const IconComponent = getTypeIcon(result.type);
                return (
                  <Card 
                    key={result.id} 
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                      result.timestamp !== undefined ? 'hover:border-blue-300' : ''
                    }`}
                    onClick={() => handleResultClick(result)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-md bg-gray-100 mt-0.5">
                          <IconComponent className="w-3 h-3 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              {getTypeLabel(result.type)}
                            </span>
                            {result.timestamp !== undefined && (
                              <div className="flex items-center gap-1 text-xs text-blue-600">
                                <Clock className="w-3 h-3" />
                                <span>{formatTime(result.timestamp)}</span>
                              </div>
                            )}
                          </div>
                          {result.speaker && (
                            <div className="text-xs text-gray-500 mb-1">
                              {result.speaker}
                            </div>
                          )}
                          <p className="text-sm text-gray-700 line-clamp-3">
                            {result.context}
                          </p>
                          {result.timestamp !== undefined && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="mt-2 h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Jump to moment
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}

      {!searchQuery.trim() && (
        <div className="text-center py-8">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Search for moments in this recording
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Find specific words, phrases, or topics discussed
          </p>
        </div>
      )}
    </div>
  );
}
