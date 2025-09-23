import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Heart, 
  AlertTriangle,
  Clock,
  User,
  Play
} from 'lucide-react';
import type { SentimentMoment } from '@/types/sentiment';

interface SentimentMomentCardProps {
  moment: SentimentMoment;
  onSeekTo?: (time: number) => void;
}

export default function SentimentMomentCard({ moment, onSeekTo }: SentimentMomentCardProps) {
  const getMomentIcon = (type: SentimentMoment['type']) => {
    switch (type) {
      case 'positive_peak':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative_dip':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'emotional_moment':
        return <Heart className="h-4 w-4 text-purple-600" />;
      case 'sentiment_shift':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMomentColor = (type: SentimentMoment['type'], sentimentScore: number) => {
    switch (type) {
      case 'positive_peak':
        return 'bg-green-50 border-green-200';
      case 'negative_dip':
        return 'bg-red-50 border-red-200';
      case 'emotional_moment':
        return sentimentScore > 0 ? 'bg-purple-50 border-purple-200' : 'bg-orange-50 border-orange-200';
      case 'sentiment_shift':
        return sentimentScore > 0 ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSentimentBadge = (score: number) => {
    if (score > 0.5) return { variant: 'default' as const, label: 'Very Positive' };
    if (score > 0.2) return { variant: 'secondary' as const, label: 'Positive' };
    if (score > -0.2) return { variant: 'outline' as const, label: 'Neutral' };
    if (score > -0.5) return { variant: 'secondary' as const, label: 'Negative' };
    return { variant: 'destructive' as const, label: 'Very Negative' };
  };

  const sentimentBadge = getSentimentBadge(moment.sentimentScore);

  return (
    <div
      className={`border rounded-lg p-4 ${getMomentColor(moment.type, moment.sentimentScore)}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getMomentIcon(moment.type)}
          <div>
            <div className="font-medium text-gray-900 capitalize">
              {moment.type.replace('_', ' ')}
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{formatTime(moment.timestamp)}</span>
              <User className="h-3 w-3 ml-2" />
              <span>{moment.speaker}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={sentimentBadge.variant}>
            {sentimentBadge.label}
          </Badge>
          {onSeekTo && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSeekTo(moment.timestamp)}
            >
              <Play className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-gray-900 italic">
          "{moment.text}"
        </div>
        <div className="text-xs text-gray-600">
          {moment.context}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Confidence: {Math.round(moment.confidence * 100)}%</span>
          <span>Intensity: {moment.intensity}</span>
        </div>
      </div>
    </div>
  );
}