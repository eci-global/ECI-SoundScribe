import React, { useContext } from 'react';
import { RecordingContext } from '@/context/RecordingCtx';
import { useRecordingDetail } from '@/hooks/useRecordingDetail';
import { usePlayback } from './hooks/usePlayback';

interface AIMoment {
  id: string;
  type: 'chapter' | 'objection' | 'sentiment_neg' | 'bookmark' | 'action';
  start_time: number;
  label?: string;
  tooltip: string;
}

export default function MomentIconRail() {
  const context = useContext(RecordingContext);
  const recordingId = context?.recording?.id;
  const { data: recordingDetail, isLoading } = useRecordingDetail(recordingId || '');
  const { seek, currentTime, duration } = usePlayback();

  // Check for AI moments data with better debugging
  const aiMoments = recordingDetail?.ai_moments || [];
  const hasAIMoments = Array.isArray(aiMoments) && aiMoments.length > 0;
  
  console.log('🎯 MomentIconRail - Complete Debug:', {
    recordingId,
    recordingDetail: !!recordingDetail,
    aiMomentsRaw: recordingDetail?.ai_moments,
    aiMomentsCount: aiMoments.length,
    hasAIMoments,
    duration,
    currentTime,
    isLoading,
    sampleMoment: aiMoments[0]
  });

  if (isLoading) {
    return (
      <div className="relative h-6 bg-gray-100 rounded animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-gray-500">Loading AI moments...</p>
        </div>
      </div>
    );
  }

  if (!hasAIMoments) {
    return (
      <div className="space-y-2">
        {recordingDetail?.isUsingInstantAnalysis && (
          <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded text-xs text-blue-700">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
            Instant Analysis
          </div>
        )}
        
        <div className="relative h-6 bg-gray-100 rounded">
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-gray-500">AI moments will appear here once processing is complete</p>
          </div>
        </div>
      </div>
    );
  }

  const getIconForType = (type: AIMoment['type']) => {
    switch (type) {
      case 'chapter':
        return '📖';
      case 'objection':
        return '⚠️';
      case 'sentiment_neg':
        return '😞';
      case 'bookmark':
        return '🔖';
      case 'action':
        return '⚡';
      default:
        return '💡';
    }
  };

  const getColorForType = (type: AIMoment['type']) => {
    switch (type) {
      case 'chapter':
        return 'bg-blue-500';
      case 'objection':
        return 'bg-red-500';
      case 'sentiment_neg':
        return 'bg-orange-500';
      case 'bookmark':
        return 'bg-purple-500';
      case 'action':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleMomentClick = (startTime: number) => {
    seek(startTime);
  };

  return (
    <div className="space-y-2">
      {/* Data source indicator */}
      {recordingDetail?.isUsingInstantAnalysis && (
        <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded text-xs text-blue-700">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
          Instant Analysis • AI processing in background
        </div>
      )}
      
      {recordingDetail?.hasAIData && !recordingDetail?.isUsingInstantAnalysis && (
        <div className="flex items-center gap-2 px-2 py-1 bg-green-50 rounded text-xs text-green-700">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          AI Processed • High accuracy data
        </div>
      )}

      <div className="relative h-6 bg-gray-100 rounded overflow-hidden">
        {/* Progress bar background */}
        <div className="absolute inset-0 bg-gray-200 rounded"></div>
        
        {/* Current time indicator */}
        {currentTime && duration && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-blue-600 z-20"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        )}

        {/* AI Moment Icons */}
        {aiMoments.map((moment, index) => {
          const position = duration ? (moment.start_time / duration) * 100 : 0;
          
          console.log(`📍 Rendering moment ${index + 1}:`, {
            id: moment.id,
            type: moment.type,
            start_time: moment.start_time,
            position: `${position}%`,
            tooltip: moment.tooltip
          });
          
          return (
            <div
              key={moment.id || `moment-${index}`}
              className={`absolute top-1 w-4 h-4 rounded-full ${getColorForType(moment.type)} 
                         cursor-pointer hover:scale-110 transition-transform z-10 
                         flex items-center justify-center text-xs shadow-sm`}
              style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              onClick={() => handleMomentClick(moment.start_time)}
              title={moment.tooltip || moment.label}
            >
              <span className="text-white text-xs leading-none">
                {getIconForType(moment.type)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}