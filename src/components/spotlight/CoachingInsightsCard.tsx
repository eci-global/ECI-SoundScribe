import React, { useState, useEffect } from 'react';
import { BarChart3, CheckCircle, Target, AlertCircle, TrendingUp, Brain, Loader2, RefreshCw, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { FormattedText, cleanAIText } from '@/utils/textFormatter';
import { CoachingService } from '@/services/coachingService';
import { generateInstantCoaching } from '@/utils/instantAnalysis';
import BDRCoachingInsights from '@/components/coach/BDRCoachingInsights';
import type { Recording } from '@/types/recording';

interface CoachingInsightsCardProps {
  recording?: Recording | null;
  onCoachingUpdate?: (recordingId: string, coaching: any) => void;
  compact?: boolean;
}

export default function CoachingInsightsCard({ recording, onCoachingUpdate, compact = false }: CoachingInsightsCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [instantCoaching, setInstantCoaching] = useState<any>(null);
  // If the recording owner explicitly disabled coaching and no evaluation exists, hide the card.
  const rawCoaching = recording?.coaching_evaluation;
  const coachingDisabled = recording && recording.enable_coaching === false;
  if (coachingDisabled && !rawCoaching) {
    return null;
  }

  // Ensure coaching_evaluation is a parsed object regardless of how Supabase returns JSONB
  let coachingData: any = rawCoaching ?? null;
  if (typeof coachingData === 'string') {
    try {
      coachingData = JSON.parse(coachingData);
    } catch (err) {
      console.warn('Invalid coaching_evaluation JSON', err);
      coachingData = null;
    }
  }

  // Get coaching insights content
  const getCoachingContent = () => {
    // Priority 1: Full AI coaching evaluation
    if (coachingData) {
      return {
        hasRealData: true,
        isInstant: false,
        overallScore: coachingData.overallScore || 0,
        strengths: coachingData.strengths || [],
        improvements: coachingData.improvements || [],
        criteria: coachingData.criteria || {},
        summary: coachingData.summary || ''
      };
    }
    
    // Priority 2: Instant coaching analysis (immediate results)
    if (instantCoaching) {
      return {
        hasRealData: true,
        isInstant: true,
        overallScore: instantCoaching.overallScore || 0,
        strengths: instantCoaching.strengths || [],
        improvements: instantCoaching.improvements || [],
        criteria: instantCoaching.criteria || {},
        summary: instantCoaching.summary || ''
      };
    }
    
    // Fallback content based on recording data
    const fallbackContent = {
      hasRealData: false,
      isInstant: false,
      overallScore: 0,
      strengths: [] as string[],
      improvements: [] as string[],
      criteria: {},
      summary: ''
    };

    if (recording?.transcript) {
      fallbackContent.strengths = [
        "Full transcript available for analysis",
        "Recording captured successfully"
      ];
      
      if (recording.content_type === 'sales_call') {
        fallbackContent.improvements = [
          "Generate detailed sales performance analysis",
          "Identify key conversation moments and objection handling"
        ];
        fallbackContent.summary = "Sales call analysis will provide insights on customer engagement, objection handling, and closing techniques once generated.";
      } else {
        fallbackContent.improvements = [
          "Generate comprehensive coaching insights",
          "Analyze communication patterns and effectiveness"
        ];
        fallbackContent.summary = "Coaching analysis will evaluate communication effectiveness, listening skills, and areas for professional development once generated.";
      }
    } else {
      fallbackContent.summary = "AI coaching insights will appear here once processing is complete.";
    }
    
    return fallbackContent;
  };

  const { hasRealData, isInstant, overallScore, strengths, improvements, criteria, summary } = getCoachingContent();

  // Handle coaching generation
  const handleGenerateCoaching = async () => {
    if (!recording?.id) return;
    
    setIsGenerating(true);
    setGenerationError(null);
    setProgressMessage('Initializing AI coaching analysis...');
    setElapsedTime(0);
    
    // Clear instant coaching when upgrading to AI analysis
    if (isInstant) {
      console.log('🧠 Upgrading from Quick Analysis to AI Analysis...');
    }
    
    // Start timer
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);
    
    try {
      const result = await CoachingService.generateCoaching(
        recording.id,
        (message, elapsed) => {
          setProgressMessage(message);
          setElapsedTime(elapsed);
        }
      );
      
      if (result.success && result.coaching_evaluation) {
        // Update the recording with new coaching data
        if (onCoachingUpdate) {
          onCoachingUpdate(recording.id, result.coaching_evaluation);
        }
        setProgressMessage('Coaching analysis complete!');
      } else {
        setGenerationError(result.error || 'Failed to generate coaching evaluation');
      }
    } catch (error) {
      console.error('Coaching generation error:', error);
      setGenerationError(error instanceof Error ? error.message : 'Unexpected error occurred');
    } finally {
      clearInterval(timer);
      setIsGenerating(false);
      // Clear progress message after delay
      setTimeout(() => {
        setProgressMessage('');
        setGenerationError(null);
      }, 3000);
    }
  };

  // Check if we can generate coaching
  const canGenerateCoaching = recording?.transcript && !hasRealData && recording?.enable_coaching !== false;

  // Generate instant coaching analysis when transcript is available
  useEffect(() => {
    if (recording?.transcript && !coachingData && !instantCoaching) {
      console.log('⚡ Generating instant coaching analysis...');
      try {
        const instantResult = generateInstantCoaching(recording.transcript);
        setInstantCoaching(instantResult);
        console.log('⚡ Instant coaching ready in <100ms');
      } catch (error) {
        console.error('Failed to generate instant coaching:', error);
      }
    }
  }, [recording?.transcript, coachingData, instantCoaching]);

  // Auto-generate AI coaching analysis when component mounts (background enhancement)
  useEffect(() => {
    if (canGenerateCoaching && !isGenerating) {
      console.log('🧠 Auto-generating AI coaching analysis...');
      handleGenerateCoaching();
    }
  }, [recording?.id, canGenerateCoaching]); // Re-run when recording changes or conditions change

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className={`${
      compact ? 'bg-transparent border-0 shadow-none px-0 py-0' : 'bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5'
    }`}>
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-eci-gray-900 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-eci-gray-600" />
            <span>AI Coaching Score</span>
          </h3>
          <div className="flex items-center space-x-2">
            {hasRealData && (
              <>
                {isInstant ? (
                  <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    <Zap className="w-3 h-3 mr-1" />
                    Quick Analysis
                  </div>
                ) : (
                  <div className="flex items-center text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    AI Analysis Complete
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      
      {compact && hasRealData && (
        <div className="flex items-center justify-end mb-3">
          {isInstant ? (
            <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              <Zap className="w-3 h-3 mr-1" />
              Quick Analysis
            </div>
          ) : (
            <div className="flex items-center text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <CheckCircle className="w-3 h-3 mr-1" />
              AI Analysis Complete
            </div>
          )}
        </div>
      )}

      <BDRCoachingInsights recording={recording} />
    </div>
  );
}
