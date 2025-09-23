
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart } from 'lucide-react';
import type { Recording } from '@/types/recording';
import { useMockSentimentMoments } from './sentiment/useMockSentimentMoments';
import SentimentMomentCard from './sentiment/SentimentMomentCard';
import EmptyState from './sentiment/EmptyState';

interface SentimentMomentsPanelProps {
  recording: Recording;
  onSeekTo?: (time: number) => void;
}

export default function SentimentMomentsPanel({ recording, onSeekTo }: SentimentMomentsPanelProps) {
  const sentimentMoments = useMockSentimentMoments(recording);

  if (sentimentMoments.length === 0) {
    return <EmptyState />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Heart className="h-5 w-5" />
          <span>Sentiment Moments ({sentimentMoments.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sentimentMoments.map((moment) => (
            <SentimentMomentCard
              key={moment.id}
              moment={moment}
              onSeekTo={onSeekTo}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
