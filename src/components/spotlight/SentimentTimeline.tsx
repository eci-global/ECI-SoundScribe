import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Brain, RefreshCw } from 'lucide-react';
import { useSentimentAnalysis } from '@/hooks/useSentimentAnalysis';
interface SentimentTimelineProps {
  transcriptLines: Array<{
    timestamp: number;
    speaker: string;
    text: string;
  }>;
  currentTime: number;
  duration: number;
  recordingId?: string;
  onSeek?: (time: number) => void;
}
interface SentimentSegment {
  startTime: number;
  endTime: number;
  speaker: string;
  sentimentScore: number;
  text: string;
}
export default function SentimentTimeline({
  transcriptLines,
  currentTime,
  duration,
  recordingId,
  onSeek
}: SentimentTimelineProps) {
  // Get real-time AI sentiment data
  const {
    moments: aiMoments,
    insights: sentimentInsights,
    isLoading: aiLoading,
    error: aiError
  } = useSentimentAnalysis(recordingId);

  // Debug logging with null safety
  console.log('SentimentTimeline Debug:', {
    recordingId,
    aiMomentsCount: aiMoments?.length || 0,
    aiMomentsType: typeof aiMoments,
    isArray: Array.isArray(aiMoments),
    transcriptLinesCount: transcriptLines?.length || 0,
    aiLoading,
    aiError,
    duration
  });

  // Fallback keyword-based sentiment analysis
  const keywordBasedSegments = useMemo(() => {
    if (!transcriptLines || transcriptLines.length === 0) return [];
    const segments: SentimentSegment[] = [];
    const positiveWords = ['great', 'excellent', 'perfect', 'amazing', 'love', 'excited', 'good', 'fantastic', 'wonderful', 'awesome', 'brilliant'];
    const negativeWords = ['problem', 'issue', 'concern', 'worried', 'difficult', 'trouble', 'bad', 'disappointed', 'frustrated', 'terrible', 'awful'];
    transcriptLines.forEach((line, index) => {
      const words = line.text.toLowerCase().split(/\s+/);
      let positiveCount = 0;
      let negativeCount = 0;
      words.forEach(word => {
        if (positiveWords.includes(word)) positiveCount++;
        if (negativeWords.includes(word)) negativeCount++;
      });

      // Calculate sentiment score (-1 to 1)
      const totalEmotionalWords = positiveCount + negativeCount;
      let sentimentScore = 0;
      if (totalEmotionalWords > 0) {
        sentimentScore = (positiveCount - negativeCount) / totalEmotionalWords;
      }

      // Remove artificial randomness - use actual calculated score
      sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
      const nextLine = transcriptLines[index + 1];
      const endTime = nextLine ? nextLine.timestamp : duration;
      segments.push({
        startTime: line.timestamp,
        endTime,
        speaker: line.speaker,
        sentimentScore,
        text: line.text
      });
    });
    return segments;
  }, [transcriptLines, duration]);

  // Choose which sentiment data to use - prioritize AI moments
  const sentimentSegments = useMemo(() => {
    // Ensure aiMoments is an array and has data
    if (Array.isArray(aiMoments) && aiMoments.length > 0) {
      // Convert AI moments to timeline format with null safety
      return aiMoments.map(moment => ({
        startTime: moment?.start_time || 0,
        endTime: moment?.end_time || 0,
        speaker: moment?.speaker || 'Unknown',
        sentimentScore: moment?.confidence || 0,
        text: moment?.text || 'No text available'
      }));
    }
    return keywordBasedSegments;
  }, [aiMoments, keywordBasedSegments]);
  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'bg-green-500';
    if (score > 0.1) return 'bg-green-300';
    if (score > -0.1) return 'bg-gray-300';
    if (score > -0.3) return 'bg-orange-400';
    return 'bg-red-500';
  };
  const getSentimentIcon = (score: number) => {
    if (score > 0.1) return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (score < -0.1) return <TrendingDown className="w-3 h-3 text-red-600" />;
    return <Minus className="w-3 h-3 text-gray-600" />;
  };
  const handleSegmentClick = (startTime: number) => {
    if (onSeek) {
      onSeek(startTime);
    }
  };
  if (aiLoading) {
    return;
  }
  if (!sentimentSegments.length) {
    return <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          Sentiment Timeline
          {aiError && <span className="text-xs text-red-600 ml-2">AI analysis failed</span>}
        </h3>
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">
            {!recordingId ? 'No recording selected' : !transcriptLines.length ? 'No transcript data available for sentiment analysis' : aiError ? `AI analysis error: ${aiError}` : 'Processing sentiment analysis...'}
          </p>
          {process.env.NODE_ENV === 'development' && <p className="text-xs text-gray-400 mt-1">
              Debug: recordingId={recordingId}, transcriptLines={transcriptLines.length}, aiError={aiError}
            </p>}
        </div>
      </div>;
  }

  // Calculate overall sentiment statistics
  const avgSentiment = sentimentSegments.length > 0 
    ? sentimentSegments.reduce((sum, seg) => sum + seg.sentimentScore, 0) / sentimentSegments.length 
    : 0;
  const positiveSegments = sentimentSegments.filter(seg => seg.sentimentScore > 0.1).length;
  const negativeSegments = sentimentSegments.filter(seg => seg.sentimentScore < -0.1).length;
  const neutralSegments = sentimentSegments.length - positiveSegments - negativeSegments;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-blue-500" />
        Sentiment Timeline
        {aiError && <span className="text-xs text-red-600 ml-2">AI analysis failed</span>}
      </h3>
      
      {/* Sentiment Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-4 text-center">
        <div className="bg-gray-50 rounded p-2">
          <div className="text-lg font-semibold text-gray-900">{avgSentiment.toFixed(2)}</div>
          <div className="text-xs text-gray-600">Avg Sentiment</div>
        </div>
        <div className="bg-green-50 rounded p-2">
          <div className="text-lg font-semibold text-green-700">{positiveSegments}</div>
          <div className="text-xs text-gray-600">Positive</div>
        </div>
        <div className="bg-red-50 rounded p-2">
          <div className="text-lg font-semibold text-red-700">{negativeSegments}</div>
          <div className="text-xs text-gray-600">Negative</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-lg font-semibold text-gray-700">{neutralSegments}</div>
          <div className="text-xs text-gray-600">Neutral</div>
        </div>
      </div>

      {/* Sentiment Timeline */}
      <div className="space-y-1">
        {sentimentSegments.map((segment, index) => {
          const widthPercent = duration > 0 ? ((segment.endTime - segment.startTime) / duration) * 100 : 0;
          const leftPercent = duration > 0 ? (segment.startTime / duration) * 100 : 0;
          
          return (
            <div 
              key={index}
              className="relative flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors"
              onClick={() => handleSegmentClick(segment.startTime)}
              title={`${segment.speaker}: ${segment.text.slice(0, 100)}${segment.text.length > 100 ? '...' : ''}`}
            >
              <div className="w-12 text-xs text-gray-600 flex items-center">
                {getSentimentIcon(segment.sentimentScore)}
              </div>
              <div className="flex-1 relative">
                <div 
                  className={`h-4 rounded ${getSentimentColor(segment.sentimentScore)} opacity-80`}
                  style={{ 
                    width: `${Math.max(widthPercent, 2)}%`,
                    marginLeft: `${leftPercent}%`
                  }}
                />
                {currentTime >= segment.startTime && currentTime <= segment.endTime && (
                  <div 
                    className="absolute top-0 w-0.5 h-4 bg-blue-600"
                    style={{ left: `${leftPercent + (currentTime - segment.startTime) / duration * 100}%` }}
                  />
                )}
              </div>
              <div className="w-16 text-xs text-gray-600 text-right">
                {segment.sentimentScore.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
          <div>Debug: {Array.isArray(aiMoments) ? 'Array' : typeof aiMoments} with {aiMoments?.length || 0} items</div>
        </div>
      )}
    </div>
  );
}