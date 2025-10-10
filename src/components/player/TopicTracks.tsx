import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePlayback } from './hooks/usePlayback';
import { useSpotlight } from '@/contexts/SpotlightContext';
import { useTopicSegments } from '@/hooks/useTopicSegments';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface TopicTracksProps {
  recordingId?: string;
}

export default function TopicTracks({ recordingId }: TopicTracksProps) {
  const { seek } = usePlayback();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const invokedRef = useRef<string | null>(null);
  
  // Get recording ID from props or SpotlightContext
  const { recording } = useSpotlight();
  const actualRecordingId = recordingId || recording?.id;
  
  // Use the same hook as AnalyticsPanel for consistency
  const { 
    data: topicSegments, 
    isLoading, 
    error 
  } = useTopicSegments(actualRecordingId || '');
  
  console.log('🎯 TopicTracks: Component state:', {
    recordingId: actualRecordingId,
    topicSegmentsCount: topicSegments?.length || 0,
    isLoading,
    error: error?.message || null,
    sampleSegment: topicSegments?.[0]
  });
  
  const topics = useMemo(() => {
    if (!topicSegments || topicSegments.length === 0) return [];
    
    const topicMap = new Map<string, { count: number; firstTime: number; confidence: number; color: string }>();
    const colors = ['bg-indigo-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
    
    topicSegments.forEach((segment) => {
      const existing = topicMap.get(segment.topic);
      if (existing) {
        existing.count++;
        existing.confidence = (existing.confidence + segment.confidence) / 2;
        existing.firstTime = Math.min(existing.firstTime, segment.start_time);
      } else {
        topicMap.set(segment.topic, {
          count: 1,
          firstTime: segment.start_time,
          confidence: segment.confidence,
          color: colors[topicMap.size % colors.length]
        });
      }
    });
    
    return Array.from(topicMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.confidence - a.confidence);
  }, [topicSegments]);

  // Auto-trigger topic analysis once when recording is completed and no topics exist
  useEffect(() => {
    const canGenerate = (
      !!actualRecordingId &&
      !isLoading &&
      !error &&
      (topics.length === 0) &&
      (recording?.status === 'completed' || !!recording?.transcript)
    );

    if (!canGenerate) return;

    // Prevent repeated invocations for the same recording
    if (invokedRef.current === actualRecordingId) return;

    let cancelled = false;
    (async () => {
      try {
        setGenerating(true);
        invokedRef.current = actualRecordingId!;
        const payload: any = { recording_id: actualRecordingId };
        if (recording?.transcript) payload.transcript = recording.transcript;

        const { error: fnError } = await supabase.functions.invoke('analyze-speakers-topics', {
          body: payload,
        });
        if (fnError) {
          // Allow retry on next render
          invokedRef.current = null;
          return;
        }
        // Invalidate topic segments to refetch
        if (!cancelled) {
          queryClient.invalidateQueries({ queryKey: ['topic-segments', actualRecordingId] });
        }
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [actualRecordingId, isLoading, error, topics.length, recording?.status, recording?.transcript, queryClient]);

  const handleTopicClick = (firstTime: number) => {
    seek(firstTime);
  };

  if (!actualRecordingId) {
    return (
      <div className="p-4 text-center text-gray-500">
        No recording selected
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        <div className="mb-2">Error loading topics</div>
        <div className="text-sm">{error.message}</div>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="mb-2">{generating ? 'Generating topics…' : 'No topic data available'}</div>
        {!generating && (
          <div className="text-sm">
            Topic analysis will begin once transcript processing is complete
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {/* Data source indicator */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Topics</h3>
        <div className="flex items-center space-x-2 text-xs">
          {topicSegments && topicSegments.length > 0 && (
            <div className="flex items-center space-x-1 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>AI Generated</span>
            </div>
          )}
          <span className="text-gray-500">{topics.length} topics</span>
        </div>
      </div>
      
      {topics.map((topic) => (
        <div
          key={topic.name}
          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => handleTopicClick(topic.firstTime)}
        >
          <div className={`w-3 h-3 rounded-full ${topic.color}`}></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {topic.name}
            </div>
            <div className="text-xs text-gray-500">
              {topic.count} segments • {Math.round(topic.confidence * 100)}% confidence
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {Math.floor(topic.firstTime / 60)}:{String(Math.floor(topic.firstTime % 60)).padStart(2, '0')}
          </div>
        </div>
      ))}
    </div>
  );
} 
