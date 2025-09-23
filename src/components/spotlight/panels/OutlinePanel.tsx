
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, FileText, User, MessageSquare } from 'lucide-react';

interface OutlinePanelProps {
  recordingId: string;
  transcript?: string;
  aiInsights?: any;
  onSeekTo?: (timestamp: number) => void;
}

export function OutlinePanel({ recordingId, transcript, aiInsights, onSeekTo }: OutlinePanelProps) {
  const outline = useMemo(() => {
    if (!transcript) return [];
    
    // Generate a basic outline from transcript
    const sections = transcript.split('\n').filter(line => line.trim().length > 0);
    return sections.slice(0, 10).map((section, index) => ({
      id: `section-${index}`,
      title: (section?.substring(0, 50) || '') + ((section?.length || 0) > 50 ? '...' : ''),
      timestamp: index * 30, // Mock timestamp
      duration: 30,
      type: 'discussion'
    }));
  }, [transcript]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Call Outline</h3>
        <Badge variant="outline">
          {outline.length} sections
        </Badge>
      </div>

      <div className="space-y-3">
        {outline.map((section, index) => (
          <Card key={section.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Section {index + 1}</span>
                  <Badge variant="secondary">
                    {section.type}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {section.title}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.floor(section.timestamp / 60)}:{(section.timestamp % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {section.duration}s
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSeekTo?.(section.timestamp)}
              >
                Jump to
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {outline.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No outline available</p>
          <p className="text-sm">Transcript processing in progress...</p>
        </div>
      )}
    </div>
  );
}
