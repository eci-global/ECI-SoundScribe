
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Building, Package, DollarSign, Clock, TrendingUp, MessageSquare, Target } from 'lucide-react';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import type { Recording } from '@/types/recording';
import type { CoachingEvaluation } from '@/utils/coachingEvaluation';

interface KeyMoment {
  id: string;
  type: 'improvement' | 'strength' | 'objection' | 'value' | 'discovery' | 'rapport';
  title: string;
  timestamp: number;
  description: string;
}

interface KeyMomentsCardProps {
  currentRecording?: Recording | null;
}

export default function KeyMomentsCard({ currentRecording }: KeyMomentsCardProps) {
  const { dispatch } = useVideoPlayer();

  const generateKeyMomentsFromCoaching = (evaluation: CoachingEvaluation): KeyMoment[] => {
    const moments: KeyMoment[] = [];

    // Add improvement areas as key moments
    evaluation.improvements?.forEach((improvement, index) => {
      moments.push({
        id: `improvement-${index}`,
        type: 'improvement',
        title: 'Improvement Opportunity',
        timestamp: 30 + (index * 60), // Spread across the call
        description: improvement
      });
    });

    // Add strengths as key moments
    evaluation.strengths?.forEach((strength, index) => {
      moments.push({
        id: `strength-${index}`,
        type: 'strength',
        title: 'Key Strength',
        timestamp: 15 + (index * 45), // Spread across the call
        description: strength
      });
    });

    // Add suggested responses as objection handling moments
    evaluation.suggestedResponses?.forEach((response, index) => {
      moments.push({
        id: `objection-${index}`,
        type: 'objection',
        title: 'Objection Handling',
        timestamp: 60 + (index * 90), // Spread across the call
        description: response.situation
      });
    });

    // Add value articulation moment if score is notable
    if (evaluation.criteria?.valueArticulation >= 7) {
      moments.push({
        id: 'value-high',
        type: 'value',
        title: 'Strong Value Articulation',
        timestamp: 120,
        description: 'Excellent value proposition delivery'
      });
    } else if (evaluation.criteria?.valueArticulation <= 5) {
      moments.push({
        id: 'value-low',
        type: 'value',
        title: 'Value Articulation Gap',
        timestamp: 120,
        description: 'Opportunity to better communicate value'
      });
    }

    return moments.slice(0, 6); // Limit to 6 moments
  };

  const getKeyMoments = (): KeyMoment[] => {
    if (!currentRecording?.coaching_evaluation) {
      return [{
        id: 'no-data',
        type: 'improvement',
        title: 'No AI Analysis Available',
        timestamp: 0,
        description: 'Complete AI processing to see key moments from your call'
      }];
    }

    return generateKeyMomentsFromCoaching(currentRecording.coaching_evaluation as CoachingEvaluation);
  };

  const getTypeIcon = (type: KeyMoment['type']) => {
    switch (type) {
      case 'improvement':
        return AlertTriangle;
      case 'strength':
        return TrendingUp;
      case 'objection':
        return MessageSquare;
      case 'value':
        return DollarSign;
      case 'discovery':
        return Target;
      case 'rapport':
        return Building;
      default:
        return Package;
    }
  };

  const getTypeColor = (type: KeyMoment['type']) => {
    switch (type) {
      case 'improvement':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'strength':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'objection':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'value':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'discovery':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'rapport':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleMomentClick = (moment: KeyMoment) => {
    dispatch({ type: 'SET_TIME', payload: moment.timestamp });
    console.log('Jumped to key moment:', moment.title, 'at', moment.timestamp);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const keyMoments = getKeyMoments();
  const overallScore = (currentRecording?.coaching_evaluation as CoachingEvaluation)?.overallScore;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg border border-eci-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-title-small font-semibold text-eci-gray-800">
          Key Moments
        </h3>
        {overallScore && (
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-red" />
            <span className="text-sm font-medium text-brand-red">
              {overallScore}% Score
            </span>
          </div>
        )}
      </div>
      
      {currentRecording?.status === 'processing' && (
        <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-700">AI analysis in progress...</span>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {keyMoments.map((moment) => {
          const Icon = getTypeIcon(moment.type);
          
          return (
            <button
              key={moment.id}
              onClick={() => handleMomentClick(moment)}
              className="w-full text-left p-4 rounded-2xl border border-eci-gray-200 hover:border-brand-red hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-red group"
              disabled={moment.id === 'no-data'}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 p-2 bg-eci-gray-100 rounded-lg group-hover:bg-brand-red/10 transition-colors">
                  <Icon className="w-4 h-4 text-eci-gray-600 group-hover:text-brand-red transition-colors" strokeWidth={1.5} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-body font-medium text-eci-gray-800 group-hover:text-brand-red transition-colors">
                      {moment.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <Badge className={getTypeColor(moment.type)}>
                        {moment.type}
                      </Badge>
                      {moment.timestamp > 0 && (
                        <span className="text-body-small text-eci-gray-500 flex items-center">
                          <Clock className="w-3 h-3 mr-1" strokeWidth={1.5} />
                          {formatTime(moment.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-body-small text-eci-gray-600 line-clamp-2">
                    {moment.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
