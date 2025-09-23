
import React, { useMemo, useEffect } from 'react';
import { MessageSquare, Clock, Users, TrendingUp, CheckCircle, AlertTriangle, Star, FileText, Target, Sparkles, BarChart3, Calendar } from 'lucide-react';
import { FormattedText, cleanAIText } from '@/utils/textFormatter';
import { debugTextFormatting } from '@/utils/debugFormatting';
import { SpeakerResolver } from '@/utils/speakerResolution';
import { formatDuration } from '@/utils/mediaDuration';
import { getCoachingActionItems } from '@/types/recording';
import type { Recording } from '@/types/recording';

interface CallBriefCardProps {
  recording?: Recording | null;
  compact?: boolean;
}

export default function CallBriefCard({ recording, compact = false }: CallBriefCardProps) {
  // Enhanced insights calculation
  const callInsights = useMemo(() => {
    if (!recording) return null;

    const duration = recording.duration || 0;
    const hasTranscript = !!recording.transcript;
    // Enhanced AI analysis detection - handle both string and object formats
    const hasAIAnalysis = !!(
      recording.ai_summary || 
      (recording.ai_insights && (
        typeof recording.ai_insights === 'string' ||
        (typeof recording.ai_insights === 'object' && recording.ai_insights !== null)
      ))
    );
    const hasCoaching = !!recording.coaching_evaluation;
    
    // Extract key metrics from transcript using centralized speaker resolution
    const transcriptMetrics = hasTranscript ? {
      wordCount: recording.transcript!.split(/\s+/).length,
      speakerCount: SpeakerResolver.getSpeakerCount(recording),
      questionCount: (recording.transcript!.match(/\?/g) || []).length,
      hasActionItems: /\b(action|next step|follow up|task|meeting)\b/i.test(recording.transcript!) || getCoachingActionItems(recording).length > 0
    } : null;

    // Calculate engagement score
    let engagementScore = 0;
    if (duration > 0) engagementScore += 20;
    if (hasTranscript) engagementScore += 25;
    if (hasAIAnalysis) engagementScore += 25;
    if (transcriptMetrics?.questionCount && transcriptMetrics.questionCount > 3) engagementScore += 15;
    if (transcriptMetrics?.hasActionItems) engagementScore += 15;

    // Determine call quality
    const callQuality = duration > 300 && hasTranscript ? 'high' : 
                       duration > 120 && hasTranscript ? 'medium' : 'basic';

    return {
      duration,
      hasTranscript,
      hasAIAnalysis,
      hasCoaching,
      transcriptMetrics,
      engagementScore: Math.min(100, engagementScore),
      callQuality
    };
  }, [recording]);

  // Use AI-generated summary first, then fallback to regular summary, then contextual information
  const getSummaryContent = () => {
    // Debug: Log what fields are available to help troubleshooting
    console.log('🔍 CallBriefCard debug:', {
      hasAiSummary: !!recording?.ai_summary,
      hasAiInsights: !!recording?.ai_insights,
      hasSummary: !!recording?.summary,
      aiSummaryType: typeof recording?.ai_summary,
      aiInsightsType: typeof recording?.ai_insights
    });
    
    // Enhanced AI analysis detection - handle both string and object formats
    const hasAIAnalysis = !!(
      recording?.ai_summary || 
      (recording?.ai_insights && (
        typeof recording.ai_insights === 'string' ||
        (typeof recording.ai_insights === 'object' && recording.ai_insights !== null)
      ))
    );
    
    // Prioritize AI-generated summary field (this is the correct field)
    if (recording?.ai_summary && typeof recording.ai_summary === 'string') {
      return recording.ai_summary;
    }
    
    // Check ai_insights field for backward compatibility, but avoid raw transcript data
    if (recording?.ai_insights) {
      if (typeof recording.ai_insights === 'string') {
        return recording.ai_insights;
      } else if (typeof recording.ai_insights === 'object' && recording.ai_insights !== null) {
        const insightsObj = recording.ai_insights as any;
        
        // Check if this looks like raw transcript data (avoid displaying it)
        if (insightsObj.text && typeof insightsObj.text === 'string' && !insightsObj.summary && !insightsObj.ai_summary) {
          console.warn('⚠️ CallBriefCard: Detected raw transcript data in ai_insights, skipping to prevent JSON display');
          // Skip this and fall through to regular summary or contextual info
        } else {
          // Try to extract meaningful summary fields
          return insightsObj.summary || insightsObj.ai_summary || insightsObj.description;
        }
      }
    }
    
    // Fallback to regular summary field
    if (recording?.summary) {
      return recording.summary;
    }
    
    // Generate more meaningful content based on what we know about the recording
    const contentType = recording?.content_type?.replace('_', ' ') || 'conversation';
    const duration = recording?.duration 
      ? formatDuration(recording.duration)
      : 'unknown duration';
    
    const contextParts = [
      `This ${contentType} recording`,
      recording?.title ? `titled "${recording.title}"` : null,
      `has a duration of ${duration}`,
      recording?.transcript ? 'and includes a full transcript' : null,
      recording?.enable_coaching ? 'with AI coaching analysis enabled' : null
    ].filter(Boolean);
    
    return `${contextParts.join(' ')}. ${
      recording?.transcript 
        ? 'Key insights and analysis are being generated automatically.' 
        : 'Full analysis will be available once transcript processing is complete.'
    }`;
  };

  const summary = getSummaryContent();
  const isAiGenerated = !!recording?.ai_summary;
  
  // Debug formatting when we have AI summary
  useEffect(() => {
    if (recording?.ai_summary) {
      debugTextFormatting(recording.ai_summary);
    }
  }, [recording?.ai_summary]);
  
  // Check if the summary contains formatting markers (markdown-style or structured text)
  const hasFormatting = summary.includes('**') || summary.includes('•') || summary.includes('\n-') || summary.includes('\n*') || summary.match(/\d+\./);
  
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'medium': return 'text-amber-700 bg-amber-50 border-amber-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-eci-blue';
    if (score >= 40) return 'text-amber-600';
    return 'text-slate-500';
  };

  if (!recording) {
    return (
      <div className="bg-white rounded-xl px-6 py-4 border border-slate-200 shadow-sm">
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No recording selected</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${
      compact ? 'px-4 py-3' : 'px-6 py-4'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-eci-red" />
          <span>Call Brief</span>
        </h3>
        {isAiGenerated && (
          <span className="text-xs text-eci-blue bg-eci-blue/10 rounded-full px-3 py-1 font-medium">
            AI Generated
          </span>
        )}
      </div>

      {/* Call Overview Metrics - Exact layout from image */}
      {callInsights && (
        <div className={`grid gap-3 mb-4 ${
          compact ? 'grid-cols-1' : 'grid-cols-2'
        }`}>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600">Duration:</span>
            <span className="font-medium text-slate-900">
              {formatDuration(callInsights.duration)}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600">Participants:</span>
            <span className="font-medium text-slate-900">
              {callInsights.transcriptMetrics?.speakerCount !== undefined 
                ? `${callInsights.transcriptMetrics.speakerCount} speaker${callInsights.transcriptMetrics.speakerCount !== 1 ? 's' : ''}`
                : (recording?.transcript ? 'Analyzing...' : 'Processing...')
              }
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600">Engagement:</span>
            <span className={`font-medium ${getEngagementColor(callInsights.engagementScore)}`}>
              {callInsights.engagementScore}%
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Star className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600">Quality:</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${getQualityColor(callInsights.callQuality)}`}>
              {callInsights.callQuality}
            </span>
          </div>
        </div>
      )}

      {/* Content Type and Status Badges - Exact styling from image */}
      <div className="flex items-center gap-2 mb-4">
        {recording.content_type && (
          <span className="bg-eci-red/10 text-eci-red text-xs font-medium px-2.5 py-1 rounded-full border border-eci-red/20">
            {recording.content_type.replace('_', ' ').toUpperCase()}
          </span>
        )}
        
        {callInsights?.hasAIAnalysis && (
          <span className="bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full border border-green-200 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            AI Analysis Complete
          </span>
        )}

        {callInsights?.transcriptMetrics?.hasActionItems && (
          <span className="bg-eci-blue/10 text-eci-blue text-xs font-medium px-2.5 py-1 rounded-full border border-eci-blue/20 flex items-center gap-1">
            <Target className="w-3 h-3" />
            Action Items
          </span>
        )}
      </div>

      {/* Main Summary Content - Exact formatting from image */}
      <div className="mb-4">
        {hasFormatting ? (
          <FormattedText
            text={cleanAIText(summary)}
            className="call-brief-content"
          />
        ) : (
          <p className="text-sm text-slate-700 leading-relaxed">
            {summary}
          </p>
        )}
      </div>

      {/* Quick Insights - Exact layout from image */}
      {callInsights?.transcriptMetrics && !compact && (
        <div className="border-t border-slate-200 pt-4">
          <h4 className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Quick Insights
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Word Count:</span>
              <span className="font-medium text-slate-700">
                {callInsights.transcriptMetrics.wordCount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Questions:</span>
              <span className="font-medium text-slate-700">
                {callInsights.transcriptMetrics.questionCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {recording.status !== 'completed' && (
        <div className="border-t border-slate-200 pt-3 mt-3">
          <div className="flex items-center gap-2 text-xs">
            {recording.status === 'processing' ? (
              <>
                <div className="w-2 h-2 bg-eci-blue rounded-full animate-pulse"></div>
                <span className="text-slate-600">Processing analysis...</span>
              </>
            ) : recording.status === 'uploading' ? (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-slate-600">Uploading...</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span className="text-red-600">Processing failed</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
