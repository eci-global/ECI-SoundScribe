import React from 'react';
import { CheckSquare, CheckCircle } from 'lucide-react';
import { getCoachingActionItems, getAINextSteps } from '@/types/recording';
import type { Recording } from '@/types/recording';

interface NextStepsCardProps {
  recording?: Recording | null;
  compact?: boolean;
}

export default function NextStepsCard({ recording, compact = false }: NextStepsCardProps) {
  const getActionItemsContent = () => {
    // Check for AI-generated next steps first
    const aiSteps = getAINextSteps(recording!);
    if (aiSteps.length > 0) {
      return {
        hasRealData: true,
        items: aiSteps,
        source: 'AI-generated'
      };
    }

    // Check coaching evaluation for action items
    const coachingItems = getCoachingActionItems(recording!);
    if (coachingItems.length > 0) {
      return {
        hasRealData: true,
        items: coachingItems,
        source: 'Coaching analysis'
      };
    }

    // Parse from summary text if available
    if (recording?.summary && typeof recording.summary === 'string') {
      const summary = recording.summary;
      
      // Look for action items section
      const actionItemsMatch = summary.match(/\*\*Action Items:\*\*(.*?)(?=\*\*|$)/s);
      if (actionItemsMatch) {
        const items = actionItemsMatch[1]
          .split('•')
          .map(item => item.trim())
          .filter(item => item.length > 0)
          .map(item => item.replace(/^[-•]\s*/, ''));
        
        if (items.length > 0) {
          return {
            hasRealData: true,
            items,
            source: 'Summary extraction'
          };
        }
      }
      
      // Look for next steps section
      const nextStepsMatch = summary.match(/\*\*Next Steps:\*\*(.*?)(?=\*\*|$)/s);
      if (nextStepsMatch) {
        const items = nextStepsMatch[1]
          .split('•')
          .map(item => item.trim())
          .filter(item => item.length > 0)
          .map(item => item.replace(/^[-•]\s*/, ''));
        
        if (items.length > 0) {
          return {
            hasRealData: true,
            items,
            source: 'Summary extraction'
          };
        }
      }
    }

    return {
      hasRealData: false,
      items: [],
      source: 'No data'
    };
  };

  const { hasRealData, items, source } = recording ? getActionItemsContent() : { hasRealData: false, items: [], source: 'No data' };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${
      compact ? 'px-4 py-3' : 'px-6 py-5'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-eci-gray-900 flex items-center space-x-2">
          <CheckSquare className="w-5 h-5 text-eci-gray-600" />
          <span>Action Items</span>
        </h3>
        {hasRealData && (
          <div className="flex items-center text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <CheckCircle className="w-3 h-3 mr-1" />
            {source}
          </div>
        )}
      </div>

      {items.length > 0 ? (
        <div className="space-y-3">
          {hasRealData && (
            <p className="text-xs text-eci-gray-600 mb-3">
              {source === 'AI-generated' ? 'AI-powered action items based on conversation analysis' :
               source === 'Coaching analysis' ? 'Action items from coaching evaluation' :
               'Action items extracted from call summary'}
        </p>
      )}
      
        <div className="space-y-2">
            {items.slice(0, compact ? 3 : items.length).map((item: string, index: number) => (
              <div key={index} className={`flex items-start space-x-3 bg-gray-50 rounded-lg ${
                compact ? 'p-2' : 'p-3'
              }`}>
                <span className={`bg-eci-blue text-white text-xs font-medium rounded-full flex items-center justify-center ${
                  compact ? 'px-1.5 py-0.5 min-w-[20px] h-5' : 'px-2 py-1 min-w-[24px] h-6'
                }`}>
                {index + 1}
                </span>
                <div className="flex-1">
                  <p className={`text-eci-gray-700 leading-relaxed ${
                    compact ? 'text-xs' : 'text-sm'
                  }`}>{item}</p>
                </div>
              </div>
            ))}
            {compact && items.length > 3 && (
              <p className="text-xs text-eci-gray-500 text-center mt-2">
                +{items.length - 3} more items
              </p>
            )}
            </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckSquare className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm text-eci-gray-700 mb-2 leading-relaxed">
            Action items will appear here once processing is complete.
          </p>
          <p className="text-xs text-eci-gray-500">
            AI will automatically analyze the conversation to identify key follow-up tasks and next steps.
          </p>
        </div>
      )}
    </div>
  );
}
