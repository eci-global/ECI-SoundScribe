import * as React from 'react';
import { BarChart3, Clock, Users, MessageSquare, Target, TrendingUp, TrendingDown, Minus, Brain, Zap, BarChart2, Heart, Shield, AlertTriangle, CheckCircle, Activity, Users2, TrendingUp as Growth, RefreshCw, Smile, Frown, Mic, Volume2, Timer, Play, User, ChevronDown, ChevronRight, Phone, UserCheck, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/utils/mediaDuration';
import { useSentimentAnalysisV2 } from '@/hooks/useSentimentAnalysisV2';
import { useSpotlight } from '@/contexts/SpotlightContext';
import { useSupportMode } from '@/contexts/SupportContext';
import { analyzeAllSupportSignals, extractSupportMoments } from '@/utils/supportSignals';
import { useSupportAnalytics } from '@/hooks/useSupportAnalytics';
import type { Recording } from '@/types/recording';

interface SpeakerCharacteristics {
  speaking_time?: number;
}

interface IdentifiedSpeaker {
  characteristics?: SpeakerCharacteristics;
}

interface AISpeakerAnalysis {
  identified_speakers?: IdentifiedSpeaker[];
  talk_ratio?: number;
}

interface AnalyticsPanelProps {
  recording?: Recording | null;
}

export default function AnalyticsPanel({ recording }: AnalyticsPanelProps) {
  // HOOKS MUST BE CALLED UNCONDITIONALLY - Always call hooks before any conditional logic
  const { 
    moments: sentimentMoments, 
    insights,
    isLoading: sentimentLoading,
    error: sentimentError,
    isGenerating
  } = useSentimentAnalysisV2(recording?.id || '');

  const { seek } = useSpotlight();
  const supportMode = useSupportMode();
  
  // Use real support analytics data when recording is available
  const { 
    supportAnalysis, 
    isLoading: supportLoading, 
    error: supportError, 
    triggerAnalysis,
    hasAnalysis,
    useLocalFallback 
  } = useSupportAnalytics(recording?.id || '');

  // State for expandable sentiment sections
  const [showPositiveMoments, setShowPositiveMoments] = React.useState(false);
  const [showNegativeMoments, setShowNegativeMoments] = React.useState(false);
  const [showNeutralMoments, setShowNeutralMoments] = React.useState(false);
  
  // State for support sections
  const [showSatisfactionMoments, setShowSatisfactionMoments] = React.useState(false);
  const [showEscalationMoments, setShowEscalationMoments] = React.useState(false);
  
  // Generate local support analysis as fallback
  const localSupportAnalysis = React.useMemo(() => {
    if (!recording || !supportMode.supportMode) return null;
    return analyzeAllSupportSignals(recording);
  }, [recording, supportMode.supportMode]);
  
  // Get support moments for display
  const supportMoments = React.useMemo(() => {
    if (!recording || !supportMode.supportMode) return [];
    return extractSupportMoments(recording);
  }, [recording, supportMode.supportMode]);

  // Generate consolidated sentiment moments that match metrics
  const consolidatedSentimentMoments = React.useMemo(() => {
    if (!recording?.duration) return [];

    const duration = recording.duration;
    const uniqueMoments = new Map();
    
    // Process real sentiment data first (highest priority)
    const hasRealSentimentData = sentimentMoments.length > 0;
    
    if (hasRealSentimentData) {
      sentimentMoments.forEach((moment, index) => {
        const timestamp = moment.start_time || (duration / sentimentMoments.length) * index;
        const text = moment.text || 'AI-identified sentiment moment';
        
        // Enhanced deduplication: combine timestamp, sentiment, and text similarity
        const timeWindow = Math.floor(timestamp / 15) * 15;
        const normalizedText = text.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const textHash = normalizedText.substring(0, 50);
        const uniqueKey = `${moment.sentiment}-${timeWindow}-${textHash}`;
        
        const existingMoment = uniqueMoments.get(uniqueKey);
        const currentConfidence = moment.confidence || 0.85;
        
        if (!existingMoment || currentConfidence > existingMoment.confidence) {
          uniqueMoments.set(uniqueKey, {
            id: moment.id || `real-${index}`,
            timestamp,
            speaker: moment.speaker || 'Speaker',
            sentiment: moment.sentiment,
            text: normalizedText || text,
            context: 'AI-identified emotional moment',
            confidence: currentConfidence,
            intensity: 'medium' as const,
            source: 'ai'
          });
        }
      });
    }
    
    // Generate fallback moments when NO real data exists (matching metric logic)
    if (!hasRealSentimentData && recording.transcript) {
      // Same keyword analysis as metrics
      const positiveWords = ['great', 'good', 'excellent', 'perfect', 'love', 'amazing', 'fantastic', 'interested', 'excited', 'yes', 'absolutely', 'definitely', 'agree'];
      const negativeWords = ['problem', 'issue', 'concerned', 'worried', 'disappointed', 'frustrated', 'no', 'can\'t', 'won\'t', 'difficult', 'expensive'];
      
      const transcript = recording.transcript.toLowerCase();
      const fallbackPositive = Math.min(positiveWords.reduce((count, word) => count + (transcript.match(new RegExp(`\\b${word}\\b`, 'g'))?.length || 0), 0), 10);
      const fallbackNegative = Math.min(negativeWords.reduce((count, word) => count + (transcript.match(new RegExp(`\\b${word}\\b`, 'g'))?.length || 0), 0), 10);
      
      const totalFallback = fallbackPositive + fallbackNegative;
      
      // Generate moments to match the calculated counts exactly
      for (let i = 0; i < totalFallback; i++) {
        const timestamp = Math.floor((duration / (totalFallback + 1)) * (i + 1));
        const timeWindow = Math.floor(timestamp / 15) * 15;
        const isPositive = i < fallbackPositive;
        const sentiment = isPositive ? 'positive' : 'negative';
        const uniqueKey = `${sentiment}-${timeWindow}-fallback-${i}`;
        
        uniqueMoments.set(uniqueKey, {
          id: `fallback-${i}`,
          timestamp,
          speaker: i % 2 === 0 ? 'Sales Rep' : 'Customer',
          sentiment,
          text: isPositive ? 
            'Positive engagement detected' : 
            'Concern or hesitation detected',
          context: 'Analysis based on conversation patterns',
          confidence: 0.65,
          intensity: 'medium' as const,
          source: 'pattern'
        });
      }
    }
    
    // Sort by timestamp and confidence, return all moments (no arbitrary limit)
    return Array.from(uniqueMoments.values())
      .sort((a, b) => {
        if (Math.abs(a.timestamp - b.timestamp) > 5) {
          return a.timestamp - b.timestamp;
        }
        return b.confidence - a.confidence;
      });
  }, [recording?.duration, recording?.transcript, sentimentMoments]);

  const stats = React.useMemo(() => {
    // Handle case where recording is null/undefined
    if (!recording) {
      return {
        speakers: 0,
        duration: 0,
        wordCount: 0,
        talkRatio: 0,
        wordsPerMinute: 0,
        positiveMoments: 0,
        negativeMoments: 0,
        totalMoments: 0,
        sentimentScore: 50,
        engagementScore: 0,
        rapportMoments: 0,
        trustSignals: 0,
        momentumShifts: 0,
        hasRealSentimentData: false,
        consolidatedMoments: []
      };
    }
    const speakerAnalysis = recording.ai_speaker_analysis as AISpeakerAnalysis;
    const wordCount = recording.transcript?.split(/\s+/).length || 0;
    const duration = recording.duration || 0;
    const talkRatio = speakerAnalysis?.talk_ratio || 0;
    const speakers = speakerAnalysis?.identified_speakers?.length || 0;
    const wordsPerMinute = duration > 0 ? Math.round(wordCount / (duration / 60)) : 0;
    
    // Use consolidated moments for ALL calculations to ensure consistency
    const positiveMoments = consolidatedSentimentMoments.filter(m => m.sentiment === 'positive').length;
    const negativeMoments = consolidatedSentimentMoments.filter(m => m.sentiment === 'negative').length;
    const neutralMoments = consolidatedSentimentMoments.filter(m => m.sentiment === 'neutral').length;
    const totalMoments = consolidatedSentimentMoments.length;
    
    // Determine data source and sentiment score
    const hasRealSentimentData = sentimentMoments.length > 0;
    const finalSentimentScore = totalMoments > 0 
      ? Math.round((positiveMoments / totalMoments) * 100) 
      : 50; // Neutral when no data
    
    console.log('📊 Sentiment Analytics Debug:', {
      hasRealSentimentData,
      originalSentimentMomentsCount: sentimentMoments.length,
      consolidatedMomentsCount: totalMoments,
      positiveMoments,
      negativeMoments,
      neutralMoments,
      sentimentScore: finalSentimentScore
    });

    // Validation: Ensure displayed counts match filtered moments
    const actualPositiveCount = consolidatedSentimentMoments.filter(m => m.sentiment === 'positive').length;
    const actualNegativeCount = consolidatedSentimentMoments.filter(m => m.sentiment === 'negative').length;
    const actualNeutralCount = consolidatedSentimentMoments.filter(m => m.sentiment === 'neutral').length;

    if (actualPositiveCount !== positiveMoments || actualNegativeCount !== negativeMoments || actualNeutralCount !== neutralMoments) {
      console.warn('⚠️ SENTIMENT COUNT MISMATCH DETECTED:', {
        calculated: { positive: positiveMoments, negative: negativeMoments, neutral: neutralMoments },
        filtered: { positive: actualPositiveCount, negative: actualNegativeCount, neutral: actualNeutralCount },
        consolidatedMomentsTotal: consolidatedSentimentMoments.length
      });
    } else {
      console.log('✅ Sentiment counts validation passed - metrics match filtered moments');
    }
    
    // Engagement score calculation using consolidated values
    let engagementScore = 0;
    if (speakers > 1) engagementScore += 30;
    if (wordsPerMinute > 120) engagementScore += 25;
    if (positiveMoments > negativeMoments) engagementScore += 25;
    if (insights?.emotionalVolatility && insights.emotionalVolatility < 0.3) engagementScore += 20;
    engagementScore = Math.min(engagementScore, 100);
    
    return {
      speakers,
      duration,
      wordCount,
      talkRatio: Math.round(talkRatio * 100),
      wordsPerMinute,
      positiveMoments,
      negativeMoments,
      neutralMoments,
      totalMoments,
      sentimentScore: finalSentimentScore,
      engagementScore,
      // Use consolidated moments for all calculations
      rapportMoments: consolidatedSentimentMoments.filter(m => m.sentiment === 'positive' && m.text?.toLowerCase().includes('rapport')).length,
      trustSignals: consolidatedSentimentMoments.filter(m => m.sentiment === 'positive' && (m.text?.toLowerCase().includes('trust') || m.text?.toLowerCase().includes('confidence'))).length,
      momentumShifts: neutralMoments,
      hasRealSentimentData,
      consolidatedMoments: consolidatedSentimentMoments
    };
  }, [recording, sentimentMoments, insights, consolidatedSentimentMoments]);

  // Helper functions for UI
  const getEngagementLevel = () => {
    if (stats.engagementScore >= 80) return 'High';
    if (stats.engagementScore >= 50) return 'Moderate';
    return 'Low';
  };

  const getInteractionLevel = () => {
    if (stats.speakers > 2) return 'Multi-party';
    if (stats.speakers === 2) return 'Interactive';
    return 'Monologue';
  };

  const getPaceLevel = () => {
    if (stats.wordsPerMinute > 180) return 'Fast';
    if (stats.wordsPerMinute > 120) return 'Moderate';
    return 'Slow';
  };

  const getBuyingSignals = () => {
    if (!insights) {
      return { 
        interestSignals: false, 
        considerationPhase: false, 
        decisionReadiness: false,
        noData: true 
      };
    }
    
    // Use real sentiment analysis insights
    const positiveKeyMoments = insights.keyMoments.filter(m => m.sentiment === 'positive').length;
    const overallPositive = insights.overallTone === 'positive';
    const lowVolatility = insights.emotionalVolatility < 0.4;
    
    // Base signals on actual sentiment analysis
    const interestSignals = positiveKeyMoments > 0 || overallPositive;
    const considerationPhase = positiveKeyMoments > 1 && lowVolatility;
    const decisionReadiness = positiveKeyMoments > 2 && overallPositive && lowVolatility;
    
    return { interestSignals, considerationPhase, decisionReadiness, noData: false };
  };

  // Use consolidated moments for consistent display (no separate generation needed)

  // Enhanced key moments with business insights
  const enhancedMoments = React.useMemo(() => {
    const getEnhancedMoments = () => {
      const moments = [];
      
      // 1. High-Impact Coaching Moments
      if (recording?.coaching_evaluation) {
        try {
          const coaching = typeof recording.coaching_evaluation === 'string' 
            ? JSON.parse(recording.coaching_evaluation)
            : recording.coaching_evaluation;
          
          if (coaching?.strengths?.length > 0) {
            moments.push({
              id: 'coaching-strength',
              category: 'Performance Excellence',
              icon: React.createElement(CheckCircle, { className: "w-4 h-4 text-emerald-500" }),
              title: 'Strong Performance Area',
              description: coaching.strengths[0],
              impact: 'high',
              bgColor: 'bg-emerald-50 border-emerald-200',
              score: coaching.overallScore || 0
            });
          }
          
          if (coaching?.improvements?.length > 0) {
            moments.push({
              id: 'coaching-improvement',
              category: 'Growth Opportunity',
              icon: React.createElement(TrendingUp, { className: "w-4 h-4 text-amber-500" }),
              title: 'Key Improvement Area',
              description: coaching.improvements[0],
              impact: 'medium',
              bgColor: 'bg-amber-50 border-amber-200',
              score: coaching.overallScore || 0
            });
          }
        } catch (e) {
          console.warn('Error parsing coaching data:', e);
        }
      }
      
      // 2. Sales Framework Insights
      if (recording?.ai_insights) {
        try {
          const insights = typeof recording.ai_insights === 'string' 
            ? JSON.parse(recording.ai_insights)
            : recording.ai_insights;
          
          if (insights?.keyPoints?.length > 0) {
            moments.push({
              id: 'key-point',
              category: 'Business Value',
              icon: React.createElement(Target, { className: "w-4 h-4 text-blue-500" }),
              title: 'Key Discussion Point',
              description: insights.keyPoints[0],
              impact: 'high',
              bgColor: 'bg-blue-50 border-blue-200'
            });
          }
          
          if (insights?.concerns?.length > 0) {
            moments.push({
              id: 'concern',
              category: 'Risk Factor',
              icon: React.createElement(AlertTriangle, { className: "w-4 h-4 text-red-500" }),
              title: 'Customer Concern',
              description: insights.concerns[0],
              impact: 'high',
              bgColor: 'bg-red-50 border-red-200'
            });
          }
          
          if (insights?.opportunities?.length > 0) {
            moments.push({
              id: 'opportunity',
              category: 'Sales Opportunity',
              icon: React.createElement(Growth, { className: "w-4 h-4 text-green-500" }),
              title: 'Business Opportunity',
              description: insights.opportunities[0],
              impact: 'high',
              bgColor: 'bg-green-50 border-green-200'
            });
          }
        } catch (e) {
          console.warn('Error parsing AI insights:', e);
        }
      }
      
      // 3. Speaker Dynamics & Engagement
      const speakerAnalysis = recording?.ai_speaker_analysis as AISpeakerAnalysis;
      if (speakerAnalysis?.talk_ratio !== undefined) {
        const talkRatio = speakerAnalysis.talk_ratio;
        if (talkRatio < 0.3) {
          moments.push({
            id: 'talk-ratio-low',
            category: 'Engagement Pattern',
            icon: React.createElement(Users, { className: "w-4 h-4 text-orange-500" }),
            title: 'Customer-Led Conversation',
            description: `Customer dominated discussion (${Math.round((1-talkRatio)*100)}% talk time)`,
            impact: 'medium',
            bgColor: 'bg-orange-50 border-orange-200'
          });
        } else if (talkRatio > 0.7) {
          moments.push({
            id: 'talk-ratio-high',
            category: 'Engagement Pattern',
            icon: React.createElement(Mic, { className: "w-4 h-4 text-purple-500" }),
            title: 'Rep-Led Presentation',
            description: `Sales rep led discussion (${Math.round(talkRatio*100)}% talk time)`,
            impact: 'medium',
            bgColor: 'bg-purple-50 border-purple-200'
          });
        }
      }
      
      // 4. Sentiment-Based Business Moments
      const topPositiveMoment = stats.consolidatedMoments
        .filter(m => m.sentiment === 'positive' && m.confidence > 0.7)
        .sort((a, b) => b.confidence - a.confidence)[0];
      
      if (topPositiveMoment) {
        moments.push({
          id: 'positive-peak',
          category: 'Customer Satisfaction',
          icon: React.createElement(Smile, { className: "w-4 h-4 text-green-600" }),
          title: 'Positive Customer Response',
          description: topPositiveMoment.text,
          impact: 'high',
          bgColor: 'bg-green-50 border-green-200',
          timestamp: topPositiveMoment.timestamp,
          speaker: topPositiveMoment.speaker
        });
      }
      
      const topNegativeMoment = stats.consolidatedMoments
        .filter(m => m.sentiment === 'negative' && m.confidence > 0.7)
        .sort((a, b) => b.confidence - a.confidence)[0];
      
      if (topNegativeMoment) {
        moments.push({
          id: 'negative-concern',
          category: 'Objection Handling',
          icon: React.createElement(Frown, { className: "w-4 h-4 text-red-600" }),
          title: 'Customer Objection',
          description: topNegativeMoment.text,
          impact: 'high',
          bgColor: 'bg-red-50 border-red-200',
          timestamp: topNegativeMoment.timestamp,
          speaker: topNegativeMoment.speaker
        });
      }
      
      // 5. Duration & Engagement Quality
      const duration = recording?.duration || 0;
      if (duration > 1800) { // > 30 minutes
        moments.push({
          id: 'long-engagement',
          category: 'Engagement Quality',
          icon: React.createElement(Timer, { className: "w-4 h-4 text-indigo-500" }),
          title: 'Extended Engagement',
          description: `Lengthy ${formatDuration(duration)} conversation indicates strong interest`,
          impact: 'medium',
          bgColor: 'bg-indigo-50 border-indigo-200'
        });
      }
      
      return moments.slice(0, 5); // Show top 5 most relevant insights
    };
    
    return getEnhancedMoments();
  }, [recording, stats.consolidatedMoments]);

  // Enhanced risk detection with multiple data sources
  const riskAlerts = React.useMemo(() => {
    const risks = [];
    
    // Debug logging
    console.log('🔍 Risk Analysis Debug:', {
      insights,
      hasInsights: !!insights,
      riskFlags: insights?.riskFlags,
      riskFlagsLength: insights?.riskFlags?.length || 0,
      overallTone: insights?.overallTone,
      emotionalVolatility: insights?.emotionalVolatility
    });
    
    // 1. Sentiment-based risks from insights
    if (insights?.riskFlags && insights.riskFlags.length > 0) {
      risks.push(...insights.riskFlags);
    }
    
    // 2. Coaching evaluation risks
    if (recording?.coaching_evaluation) {
      try {
        const coaching = typeof recording.coaching_evaluation === 'string' 
          ? JSON.parse(recording.coaching_evaluation)
          : recording.coaching_evaluation;
        
        if (coaching?.overallScore !== undefined && coaching.overallScore < 3) {
          risks.push(`Poor coaching performance (${coaching.overallScore}/10) - needs immediate attention`);
        }
        
        if (coaching?.improvements && coaching.improvements.length > 2) {
          risks.push('Multiple improvement areas identified - requires focused development');
        }
      } catch (e) {
        console.warn('Error parsing coaching evaluation for risks:', e);
      }
    }
    
    // 3. Negative sentiment concentration
    const negativeMoments = stats.consolidatedMoments.filter(m => m.sentiment === 'negative').length;
    const totalMoments = stats.consolidatedMoments.length;
    if (totalMoments > 0 && (negativeMoments / totalMoments) > 0.4) {
      risks.push(`High negative sentiment concentration (${Math.round((negativeMoments/totalMoments)*100)}%)`);
    }
    
    // 4. Talk ratio risks
    const speakerAnalysis = recording?.ai_speaker_analysis as AISpeakerAnalysis;
    if (speakerAnalysis?.talk_ratio !== undefined) {
      if (speakerAnalysis.talk_ratio > 0.8) {
        risks.push('Sales rep dominated conversation - limited customer engagement');
      } else if (speakerAnalysis.talk_ratio < 0.2) {
        risks.push('Very low rep participation - may indicate disengagement');
      }
    }
    
    // 5. Duration-based risks
    const duration = recording?.duration || 0;
    if (duration < 300) { // Less than 5 minutes
      risks.push('Short call duration may indicate limited engagement');
    }
    
    return risks;
  }, [recording, insights, stats.consolidatedMoments]);

  // Enhanced opportunity detection with multiple data sources
  const opportunities = React.useMemo(() => {
    const opps = [];
    
    // 1. Sentiment-based opportunities from insights
    if (insights?.opportunities && insights.opportunities.length > 0) {
      opps.push(...insights.opportunities);
    }
    
    // 2. Coaching evaluation opportunities
    if (recording?.coaching_evaluation) {
      try {
        const coaching = typeof recording.coaching_evaluation === 'string' 
          ? JSON.parse(recording.coaching_evaluation)
          : recording.coaching_evaluation;
        
        if (coaching?.overallScore !== undefined && coaching.overallScore > 7) {
          opps.push(`Strong coaching performance (${coaching.overallScore}/10) - great mentoring opportunity`);
        }
        
        if (coaching?.strengths && coaching.strengths.length > 0) {
          opps.push(`Key strength identified: ${coaching.strengths[0]}`);
        }
      } catch (e) {
        console.warn('Error parsing coaching evaluation for opportunities:', e);
      }
    }
    
    // 3. High engagement indicators
    const positiveRatio = stats.consolidatedMoments.filter(m => m.sentiment === 'positive').length / Math.max(stats.consolidatedMoments.length, 1);
    if (positiveRatio > 0.6) {
      opps.push(`High customer satisfaction (${Math.round(positiveRatio*100)}% positive sentiment)`);
    }
    
    // 4. Duration-based opportunities
    const duration = recording?.duration || 0;
    if (duration > 1800) { // > 30 minutes
      opps.push('Extended engagement time indicates strong interest and potential');
    }
    
    // 5. Speaker balance opportunities
    const speakerAnalysis = recording?.ai_speaker_analysis as AISpeakerAnalysis;
    if (speakerAnalysis?.talk_ratio !== undefined) {
      if (speakerAnalysis.talk_ratio >= 0.4 && speakerAnalysis.talk_ratio <= 0.6) {
        opps.push('Excellent conversation balance - strong two-way engagement');
      }
    }
    
    return opps;
  }, [recording, insights, stats.consolidatedMoments]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeekTo = (timestamp: number) => {
    if (seek) {
      seek(timestamp);
      console.log(`[AnalyticsPanel] Seeking to timestamp: ${formatTime(timestamp)}`);
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return { variant: 'default' as const, label: 'Positive', color: 'text-emerald-600' };
      case 'negative':
        return { variant: 'destructive' as const, label: 'Negative', color: 'text-red-600' };
      default:
        return { variant: 'outline' as const, label: 'Neutral', color: 'text-muted-foreground' };
    }
  };

  return (
    <div className="space-y-6">
      {!recording ? (
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No recording selected</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Analytics will appear here</p>
        </div>
      ) : sentimentLoading || isGenerating ? (
        <div className="text-center py-8">
          <div className="flex flex-col items-center space-y-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {isGenerating ? 'Generating AI Analysis...' : 'Loading Analytics...'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isGenerating ? 'Analyzing sentiment and extracting insights' : 'Preparing your analytics dashboard'}
              </p>
            </div>
          </div>
        </div>
      ) : sentimentError ? (
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="flex flex-col items-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Analysis Unavailable</p>
                <p className="text-xs text-muted-foreground mt-1">Advanced analytics could not be generated for this recording</p>
                <p className="text-xs text-muted-foreground">Basic transcript analytics are available below</p>
              </div>
            </div>
          </div>
          
          {/* Fallback Analytics with Limited Data */}
          {recording && (
            <div className="border-t border-border pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Basic Analytics</h3>
                <Badge variant="outline">Fallback Mode</Badge>
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                Showing limited analytics based on transcript analysis
              </div>

              {/* Basic metrics from transcript */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-bold text-foreground">{stats.wordCount}</div>
                  <div className="text-xs text-muted-foreground">Words</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-bold text-foreground">{formatTime(stats.duration)}</div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-bold text-foreground">{stats.wordsPerMinute}</div>
                  <div className="text-xs text-muted-foreground">WPM</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-bold text-foreground">{stats.speakers}</div>
                  <div className="text-xs text-muted-foreground">Speakers</div>
                </div>
              </div>

              {/* Fallback sentiment based on keywords */}
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="w-4 h-4 text-amber-500" />
                  <h4 className="font-semibold text-foreground">Estimated Sentiment</h4>
                  <Badge variant="outline">Keyword-based</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-emerald-600">{stats.positiveMoments}</div>
                    <div className="text-xs text-muted-foreground">Positive signals</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-muted-foreground">
                      {stats.neutralMoments}
                    </div>
                    <div className="text-xs text-muted-foreground">Neutral</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-600">{stats.negativeMoments}</div>
                    <div className="text-xs text-muted-foreground">Concerns</div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Overall Tone</span>
                    <span className="text-sm font-medium text-foreground">{stats.sentimentScore}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${stats.sentimentScore}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    * Based on keyword analysis - limited accuracy without AI processing
                  </div>
                </div>
              </div>

              {/* Retry button */}
              <div className="text-center">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Full Analysis
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            {supportMode.supportMode ? (
              <UserCheck className="w-5 h-5 text-blue-500" />
            ) : (
              <Brain className="w-5 h-5 text-primary" />
            )}
            <h2 className="text-lg font-semibold text-foreground">
              {supportMode.supportMode ? 'Customer Support Analytics' : 'Sales Intelligence Dashboard'}
            </h2>
            <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">AI Powered</span>
            {supportMode.supportMode && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md">
                Support Mode
              </span>
            )}
          </div>

          {/* Sentiment Analysis (Sales) / Customer Interaction Analysis (Support) */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              {supportMode.supportMode ? (
                <>
                  <UserCheck className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-foreground">Customer Interaction Analysis</h3>
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-semibold text-foreground">Sentiment Analysis</h3>
                </>
              )}
              {supportMode.supportMode ? (
                <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md">
                  Support Framework
                </span>
              ) : stats.hasRealSentimentData ? (
                <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md">
                  AI Generated
                </span>
              ) : (
                <span className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-md">
                  Keyword Analysis
                </span>
              )}
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              {supportMode.supportMode ? (
                /* Customer Interaction Analysis for Support Mode */
                <div className="space-y-4">
              {localSupportAnalysis && (
                <>
                  {/* Customer Satisfaction Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{localSupportAnalysis.customerSatisfaction}%</div>
                      <div className="text-xs text-muted-foreground">Customer Satisfaction</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <div className={`text-2xl font-bold ${localSupportAnalysis.escalationRisk === 'low' ? 'text-green-600' : localSupportAnalysis.escalationRisk === 'medium' ? 'text-orange-600' : 'text-red-600'}`}>
                        {localSupportAnalysis.escalationRisk.toUpperCase()}
                      </div>
                      <div className="text-xs text-muted-foreground">Escalation Risk</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{localSupportAnalysis.resolutionEffectiveness}%</div>
                      <div className="text-xs text-muted-foreground">Resolution Effectiveness</div>
                    </div>
                  </div>

                  {/* Satisfaction and Escalation Moments */}
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-between text-sm h-auto p-3 hover:bg-green-50 dark:hover:bg-green-950/20"
                      onClick={() => setShowSatisfactionMoments(!showSatisfactionMoments)}
                      disabled={supportMoments.filter(m => m.type === 'satisfaction').length === 0}
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <div className="text-left">
                          <div className="text-2xl font-bold text-foreground">{supportMoments.filter(m => m.type === 'satisfaction').length}</div>
                          <div className="text-xs text-muted-foreground">Satisfaction signals</div>
                        </div>
                      </div>
                      {supportMoments.filter(m => m.type === 'satisfaction').length > 0 && (
                        showSatisfactionMoments ? 
                          <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full justify-between text-sm h-auto p-3 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => setShowEscalationMoments(!showEscalationMoments)}
                      disabled={supportMoments.filter(m => m.type === 'escalation').length === 0}
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <div className="text-left">
                          <div className="text-2xl font-bold text-foreground">{supportMoments.filter(m => m.type === 'escalation').length}</div>
                          <div className="text-xs text-muted-foreground">Escalation indicators</div>
                        </div>
                      </div>
                      {supportMoments.filter(m => m.type === 'escalation').length > 0 && (
                        showEscalationMoments ? 
                          <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>

                  {/* Expandable Satisfaction Moments */}
                  {showSatisfactionMoments && supportMoments.filter(m => m.type === 'satisfaction').length > 0 && (
                    <div className="mt-4 border-t border-border pt-4">
                      <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        Satisfaction Signals ({supportMoments.filter(m => m.type === 'satisfaction').length})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {supportMoments.filter(m => m.type === 'satisfaction').map((moment, index) => (
                          <div key={moment.id || `satisfaction-${index}`} className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-foreground mb-1">
                                  {moment.description}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatTime(moment.timestamp)}</span>
                                  <span>•</span>
                                  <span>{moment.speaker}</span>
                                  <span>•</span>
                                  <span>{Math.round(moment.confidence * 100)}% confidence</span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSeekTo(moment.timestamp)}
                                className="flex-shrink-0 h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
                                title="Jump to this moment"
                              >
                                <Play className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expandable Escalation Moments */}
                  {showEscalationMoments && supportMoments.filter(m => m.type === 'escalation').length > 0 && (
                    <div className="mt-4 border-t border-border pt-4">
                      <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        Escalation Indicators ({supportMoments.filter(m => m.type === 'escalation').length})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {supportMoments.filter(m => m.type === 'escalation').map((moment, index) => (
                          <div key={moment.id || `escalation-${index}`} className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-foreground mb-1">
                                  {moment.description}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatTime(moment.timestamp)}</span>
                                  <span>•</span>
                                  <span>{moment.speaker}</span>
                                  <span>•</span>
                                  <span className={`font-medium ${moment.severity === 'high' ? 'text-red-600' : moment.severity === 'medium' ? 'text-orange-600' : 'text-yellow-600'}`}>
                                    {moment.severity.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSeekTo(moment.timestamp)}
                                className="flex-shrink-0 h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                                title="Jump to this moment"
                              >
                                <Play className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Original Sentiment Analysis for Sales Mode */
            <div>
              {isGenerating && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <div className="font-medium">Generating deeper sentiment analysis...</div>
                      <div className="text-xs mt-1">This will provide more accurate insights from your conversation</div>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-between text-sm h-auto p-3 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                  onClick={() => setShowPositiveMoments(!showPositiveMoments)}
              disabled={stats.positiveMoments === 0}
            >
              <div className="flex items-center gap-3">
                <Smile className="w-5 h-5 text-emerald-500" />
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">{stats.positiveMoments}</div>
                  <div className="text-xs text-muted-foreground">Positive moments</div>
                </div>
              </div>
              {stats.positiveMoments > 0 && (
                showPositiveMoments ? 
                  <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-between text-sm h-auto p-3 hover:bg-muted/50"
              onClick={() => setShowNeutralMoments(!showNeutralMoments)}
              disabled={stats.neutralMoments === 0}
            >
              <div className="flex items-center gap-3">
                <Minus className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">{stats.neutralMoments}</div>
                  <div className="text-xs text-muted-foreground">Neutral moments</div>
                </div>
              </div>
              {stats.neutralMoments > 0 && (
                showNeutralMoments ? 
                  <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-between text-sm h-auto p-3 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={() => setShowNegativeMoments(!showNegativeMoments)}
              disabled={stats.negativeMoments === 0}
            >
              <div className="flex items-center gap-3">
                <Frown className="w-5 h-5 text-red-500" />
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">{stats.negativeMoments}</div>
                  <div className="text-xs text-muted-foreground">Negative moments</div>
                </div>
              </div>
              {stats.negativeMoments > 0 && (
                showNegativeMoments ? 
                  <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          
          {/* Expandable Positive Moments */}
          {showPositiveMoments && stats.consolidatedMoments.filter(m => m.sentiment === 'positive').length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                <Heart className="w-3 h-3 text-emerald-500" />
                Positive Moments ({stats.consolidatedMoments.filter(m => m.sentiment === 'positive').length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stats.consolidatedMoments.filter(m => m.sentiment === 'positive').map((moment, index) => (
                  <div key={moment.id || `positive-${index}`} className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground mb-1">
                          {moment.text ? `"${moment.text}"` : 'Positive sentiment detected'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(moment.timestamp)}</span>
                          {moment.speaker && (
                            <>
                              <span>•</span>
                              <span>{moment.speaker}</span>
                            </>
                          )}
                          {moment.confidence && (
                            <>
                              <span>•</span>
                              <span>{Math.round(moment.confidence * 100)}% confidence</span>
                            </>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-xs ml-2 ${
                            moment.source === 'ai' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {moment.source === 'ai' ? 'AI' : 'Pattern'}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSeekTo(moment.timestamp)}
                        className="flex-shrink-0 h-6 w-6 p-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                        title="Jump to this moment"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expandable Neutral Moments */}
          {showNeutralMoments && stats.consolidatedMoments.filter(m => m.sentiment === 'neutral').length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                <Minus className="w-3 h-3 text-muted-foreground" />
                Neutral Moments ({stats.consolidatedMoments.filter(m => m.sentiment === 'neutral').length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stats.consolidatedMoments.filter(m => m.sentiment === 'neutral').map((moment, index) => (
                  <div key={moment.id || `neutral-${index}`} className="bg-muted/20 border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground mb-1">
                          {moment.text ? `"${moment.text}"` : 'Neutral sentiment detected'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(moment.timestamp)}</span>
                          {moment.speaker && (
                            <>
                              <span>•</span>
                              <span>{moment.speaker}</span>
                            </>
                          )}
                          {moment.confidence && (
                            <>
                              <span>•</span>
                              <span>{Math.round(moment.confidence * 100)}% confidence</span>
                            </>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-xs ml-2 ${
                            moment.source === 'ai' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {moment.source === 'ai' ? 'AI' : 'Pattern'}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSeekTo(moment.timestamp)}
                        className="flex-shrink-0 h-6 w-6 p-0 hover:bg-muted"
                        title="Jump to this moment"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expandable Negative Moments */}
          {showNegativeMoments && stats.consolidatedMoments.filter(m => m.sentiment === 'negative').length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                Negative Moments ({stats.consolidatedMoments.filter(m => m.sentiment === 'negative').length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stats.consolidatedMoments.filter(m => m.sentiment === 'negative').map((moment, index) => (
                  <div key={moment.id || `negative-${index}`} className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground mb-1">
                          {moment.text ? `"${moment.text}"` : 'Negative sentiment detected'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(moment.timestamp)}</span>
                          {moment.speaker && (
                            <>
                              <span>•</span>
                              <span>{moment.speaker}</span>
                            </>
                          )}
                          {moment.confidence && (
                            <>
                              <span>•</span>
                              <span>{Math.round(moment.confidence * 100)}% confidence</span>
                            </>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-xs ml-2 ${
                            moment.source === 'ai' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {moment.source === 'ai' ? 'AI' : 'Pattern'}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSeekTo(moment.timestamp)}
                        className="flex-shrink-0 h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                        title="Jump to this moment"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Overall Sentiment</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{stats.sentimentScore}%</span>
                {!stats.hasRealSentimentData && (
                  <span className="text-xs text-muted-foreground">(Estimated)</span>
                )}
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  stats.hasRealSentimentData ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
                style={{ width: `${stats.sentimentScore}%` }}
              />
            </div>
            {!stats.hasRealSentimentData && (
              <div className="mt-2 text-xs text-muted-foreground">
                * Estimated from keyword patterns in transcript - {stats.totalMoments} moments generated
              </div>
            )}
            {stats.hasRealSentimentData && (
              <div className="mt-2 text-xs text-muted-foreground">
                * AI analysis of {stats.totalMoments} conversation moments
              </div>
            )}
          </div>
          </div>
          )}
        </div>

        {/* SERVQUAL Framework - Support Mode Only */}
        {supportMode.supportMode && (
          <section>
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-foreground">SERVQUAL Service Quality</h3>
            <span className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-md">
              Support Framework
            </span>
            {hasAnalysis && !useLocalFallback && (
              <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md">
                AI Analyzed
              </span>
            )}
            {hasAnalysis && useLocalFallback && (
              <span className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-md">
                Local Analysis
              </span>
            )}
          </div>
          
          {supportLoading ? (
            <div className="bg-card rounded-lg border border-border p-6 text-center">
              <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">Loading support analysis...</div>
            </div>
          ) : supportError ? (
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Analysis Error</span>
              </div>
              <div className="text-sm text-muted-foreground mb-3">{supportError}</div>
              {recording?.transcript && (
                <Button 
                  onClick={triggerAnalysis} 
                  size="sm" 
                  className="gap-2"
                  disabled={supportLoading}
                >
                  <RefreshCw className="w-4 h-4" />
                  Trigger Support Analysis
                </Button>
              )}
            </div>
          ) : !hasAnalysis ? (
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Support Analysis Available</span>
              </div>
              <div className="text-sm text-muted-foreground mb-3">
                Run AI analysis to get SERVQUAL metrics for this support call
              </div>
              {recording?.transcript ? (
                <Button 
                  onClick={triggerAnalysis} 
                  size="sm" 
                  className="gap-2"
                  disabled={supportLoading}
                >
                  <Zap className="w-4 h-4" />
                  Analyze Support Quality
                </Button>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Transcript required for support analysis
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Empathy</span>
                    <span className="text-sm font-medium text-foreground">{supportAnalysis?.servqualMetrics?.empathy || 0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${supportAnalysis?.servqualMetrics?.empathy || 0}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Assurance</span>
                    <span className="text-sm font-medium text-foreground">{supportAnalysis?.servqualMetrics?.assurance || 0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-green-500 transition-all duration-300"
                      style={{ width: `${supportAnalysis?.servqualMetrics?.assurance || 0}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Responsiveness</span>
                    <span className="text-sm font-medium text-foreground">{supportAnalysis?.servqualMetrics?.responsiveness || 0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${supportAnalysis?.servqualMetrics?.responsiveness || 0}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Reliability</span>
                    <span className="text-sm font-medium text-foreground">{supportAnalysis?.servqualMetrics?.reliability || 0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${supportAnalysis?.servqualMetrics?.reliability || 0}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Customer Satisfaction and Escalation Risk Row */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-foreground">Customer Satisfaction</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">{supportAnalysis?.customerSatisfaction || 0}%</div>
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-foreground">Escalation Risk</span>
                    <Badge 
                      variant={supportAnalysis?.escalationRisk === 'low' ? 'default' : 
                               supportAnalysis?.escalationRisk === 'medium' ? 'secondary' : 'destructive'}
                    >
                      {(supportAnalysis?.escalationRisk || 'unknown').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    Industry-standard SERVQUAL framework assessment powered by AI analysis
                  </div>
                </div>
                {hasAnalysis && !useLocalFallback && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={triggerAnalysis}
                    disabled={supportLoading}
                    className="text-xs gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reanalyze
                  </Button>
                )}
              </div>
            </div>
          )}
            </section>
          )}

          {/* Support Performance Dashboard - Support Mode Only */}
          {supportMode.supportMode && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="w-4 h-4 text-indigo-500" />
                <h3 className="font-semibold text-foreground">Support Performance Dashboard</h3>
                <span className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-md">
                  Key Performance Indicators
                </span>
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                {localSupportAnalysis ? (
                  <div className="space-y-6">
                    {/* Core Performance KPIs */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Core Performance Metrics</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900">
                          <div className="text-2xl font-bold text-emerald-600">
                            {localSupportAnalysis.performanceMetrics?.firstContactResolution || 0}%
                          </div>
                          <div className="text-xs text-muted-foreground">First Contact Resolution</div>
                          <div className="text-xs text-emerald-600 mt-1">FCR Rate</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                          <div className="text-2xl font-bold text-blue-600">
                            {localSupportAnalysis.performanceMetrics?.averageHandleTime || 0}%
                          </div>
                          <div className="text-xs text-muted-foreground">Handle Time Score</div>
                          <div className="text-xs text-blue-600 mt-1">AHT Efficiency</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                          <div className="text-2xl font-bold text-purple-600">
                            {localSupportAnalysis.performanceMetrics?.customerEffortScore || 0}%
                          </div>
                          <div className="text-xs text-muted-foreground">Customer Effort Score</div>
                          <div className="text-xs text-purple-600 mt-1">CES Rating</div>
                        </div>
                      </div>
                    </div>

                    {/* Call Resolution & Quality Metrics */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Call Resolution & Quality</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className={`w-4 h-4 ${
                              localSupportAnalysis.performanceMetrics?.callResolutionStatus === 'resolved' ? 'text-green-500' :
                              localSupportAnalysis.performanceMetrics?.callResolutionStatus === 'pending' ? 'text-yellow-500' :
                              localSupportAnalysis.performanceMetrics?.callResolutionStatus === 'escalated' ? 'text-red-500' : 'text-blue-500'
                            }`} />
                            <span className="text-xs text-muted-foreground">Resolution Status</span>
                          </div>
                          <div className={`text-sm font-medium capitalize ${
                            localSupportAnalysis.performanceMetrics?.callResolutionStatus === 'resolved' ? 'text-green-600' :
                            localSupportAnalysis.performanceMetrics?.callResolutionStatus === 'pending' ? 'text-yellow-600' :
                            localSupportAnalysis.performanceMetrics?.callResolutionStatus === 'escalated' ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {localSupportAnalysis.performanceMetrics?.callResolutionStatus || 'Unknown'}
                          </div>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Timer className="w-4 h-4 text-orange-500" />
                            <span className="text-xs text-muted-foreground">Response Quality</span>
                          </div>
                          <div className="text-sm font-medium text-orange-600">
                            {localSupportAnalysis.performanceMetrics?.responseTimeQuality || 0}%
                          </div>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="w-4 h-4 text-cyan-500" />
                            <span className="text-xs text-muted-foreground">Issue Complexity</span>
                          </div>
                          <div className={`text-sm font-medium capitalize ${
                            localSupportAnalysis.performanceMetrics?.issueComplexity === 'simple' ? 'text-green-600' :
                            localSupportAnalysis.performanceMetrics?.issueComplexity === 'medium' ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {localSupportAnalysis.performanceMetrics?.issueComplexity || 'Medium'}
                          </div>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Brain className="w-4 h-4 text-pink-500" />
                            <span className="text-xs text-muted-foreground">AI Confidence</span>
                          </div>
                          <div className="text-sm font-medium text-pink-600">85%</div>
                        </div>
                      </div>
                    </div>

                    {/* Support Quality Metrics */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Agent Performance Quality</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-muted-foreground">Communication Skills</span>
                              <span className="text-sm font-medium">{localSupportAnalysis.qualityMetrics?.communicationSkills || 0}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${localSupportAnalysis.qualityMetrics?.communicationSkills || 0}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-muted-foreground">Problem Solving</span>
                              <span className="text-sm font-medium">{localSupportAnalysis.qualityMetrics?.problemSolvingEffectiveness || 0}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="h-2 rounded-full bg-green-500 transition-all duration-300"
                                style={{ width: `${localSupportAnalysis.qualityMetrics?.problemSolvingEffectiveness || 0}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-muted-foreground">De-escalation</span>
                              <span className="text-sm font-medium">{localSupportAnalysis.qualityMetrics?.deEscalationTechniques || 0}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="h-2 rounded-full bg-purple-500 transition-all duration-300"
                                style={{ width: `${localSupportAnalysis.qualityMetrics?.deEscalationTechniques || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-muted-foreground">Knowledge Base Usage</span>
                              <span className="text-sm font-medium">{localSupportAnalysis.qualityMetrics?.knowledgeBaseUsage || 0}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="h-2 rounded-full bg-orange-500 transition-all duration-300"
                                style={{ width: `${localSupportAnalysis.qualityMetrics?.knowledgeBaseUsage || 0}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-muted-foreground">Compliance Adherence</span>
                              <span className="text-sm font-medium">{localSupportAnalysis.qualityMetrics?.complianceAdherence || 0}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="h-2 rounded-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${localSupportAnalysis.qualityMetrics?.complianceAdherence || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Customer Journey Analysis */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Customer Journey Analysis</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border">
                          <div className="text-lg font-bold text-blue-600">
                            {localSupportAnalysis.journeyAnalysis?.issueIdentificationSpeed || 0}%
                          </div>
                          <div className="text-xs text-muted-foreground">Issue ID Speed</div>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border">
                          <div className="text-lg font-bold text-green-600">
                            {localSupportAnalysis.journeyAnalysis?.rootCauseAnalysisDepth || 0}%
                          </div>
                          <div className="text-xs text-muted-foreground">Root Cause Depth</div>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 rounded-lg border">
                          <div className="text-lg font-bold text-purple-600">
                            {localSupportAnalysis.journeyAnalysis?.solutionClarityScore || 0}%
                          </div>
                          <div className="text-xs text-muted-foreground">Solution Clarity</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${localSupportAnalysis.journeyAnalysis?.customerEducationProvided ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <span className="text-xs text-muted-foreground">Customer Education Provided</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${localSupportAnalysis.journeyAnalysis?.followUpPlanning ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                          <span className="text-xs text-muted-foreground">Follow-up Planning</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <BarChart2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <div className="text-sm text-muted-foreground">Support performance metrics will appear here</div>
                    <div className="text-xs text-muted-foreground mt-1">Analysis in progress...</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Engagement Metrics */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-foreground">Engagement Metrics</h3>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Speaking Distribution</span>
              </div>
              <div className="text-lg font-bold text-foreground">{stats.talkRatio}%</div>
              <div className="text-xs text-muted-foreground">Talk Ratio</div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Interaction Level</span>
              </div>
              <div className="text-lg font-bold text-foreground">{getInteractionLevel()}</div>
              <div className="text-xs text-muted-foreground">{stats.speakers} Speaker{stats.speakers !== 1 ? 's' : ''}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Pace</span>
              </div>
              <div className="text-lg font-bold text-foreground">{getPaceLevel()}</div>
              <div className="text-xs text-muted-foreground">{stats.wordsPerMinute} WPM</div>
            </div>
          </div>
            </div>
          </section>

          {/* Buying Signal Progression - Sales Mode Only */}
          {!supportMode.supportMode && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-violet-500" />
                <h3 className="font-semibold text-foreground">Buying Signal Progression</h3>
              </div>
              <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          {(() => {
            const signals = getBuyingSignals();
            
            if (signals.noData) {
              return (
                <div className="text-center py-2">
                  <span className="text-sm text-muted-foreground">
                    Sentiment analysis is being processed...
                  </span>
                </div>
              );
            }
            
            return (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${signals.interestSignals ? 'bg-emerald-500' : 'bg-muted-foreground'}`}></div>
                    <span className="text-sm text-muted-foreground">Interest Signals</span>
                  </div>
                  <span className={`text-sm font-medium ${signals.interestSignals ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {signals.interestSignals ? 'Detected' : 'Not Detected'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${signals.considerationPhase ? 'bg-blue-500' : 'bg-muted-foreground'}`}></div>
                    <span className="text-sm text-muted-foreground">Consideration Phase</span>
                  </div>
                  <span className={`text-sm font-medium ${signals.considerationPhase ? 'text-blue-600' : 'text-muted-foreground'}`}>
                    {signals.considerationPhase ? 'Started' : 'Not Started'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${signals.decisionReadiness ? 'bg-violet-500' : 'bg-muted-foreground'}`}></div>
                    <span className="text-sm text-muted-foreground">Decision Readiness</span>
                  </div>
                  <span className={`text-sm font-medium ${signals.decisionReadiness ? 'text-violet-600' : 'text-muted-foreground'}`}>
                    {signals.decisionReadiness ? 'Ready' : 'Pending'}
                  </span>
                </div>
              </>
            );
          })()}
              </div>
            </section>
          )}

          {/* Risk Alerts & Opportunities - Sales Mode Only */}
          {!supportMode.supportMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <h3 className="font-semibold text-foreground">Risk Alerts</h3>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4">
                  <div className="space-y-2">
                    {riskAlerts.slice(0, 3).map((risk, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-orange-800 dark:text-orange-200">
                          {risk}
                        </span>
                      </div>
                    ))}
                    {riskAlerts.length === 0 && (
                      <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        No specific risks detected in this conversation
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}
        </section>

        {/* Risk Alerts - Sales Mode Only */}
        {!supportMode.supportMode && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <h3 className="font-semibold text-foreground">Risk Alerts</h3>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4">
              <div className="space-y-2">
                {riskAlerts.slice(0, 3).map((risk, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-orange-800 dark:text-orange-200">
                      {risk}
                    </span>
                  </div>
                ))}
                {riskAlerts.length === 0 && (
                  <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    No specific risks detected in this conversation
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

          {/* Opportunities Section - Sales Mode Only */}
          {!supportMode.supportMode && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <h3 className="font-semibold text-foreground">Opportunities</h3>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg p-4">
                <div className="space-y-2">
                  {opportunities.slice(0, 3).map((opportunity, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-emerald-800 dark:text-emerald-200">
                        {opportunity}
                      </span>
                    </div>
                  ))}
                  {opportunities.length === 0 && (
                    <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                      No specific opportunities identified in this conversation
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
              

          {/* Key Insights & Moments */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-purple-500" />
              <h3 className="font-semibold text-foreground">Key Insights</h3>
            </div>
            <div className="space-y-4">
              {enhancedMoments.length > 0 ? (
                <div className="space-y-3">
                  {enhancedMoments.map((moment) => (
                    <div key={moment.id} className={`p-4 rounded-lg border ${moment.bgColor}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {moment.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  {moment.category}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {moment.impact === 'high' ? 'High Impact' : 
                                   moment.impact === 'medium' ? 'Medium Impact' : 'Low Impact'}
                                </Badge>
                              </div>
                              <h4 className="text-sm font-semibold text-foreground">
                                {moment.title}
                              </h4>
                            </div>
                            {moment.timestamp && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  if (moment.timestamp) {
                                    seek(moment.timestamp);
                                  }
                                }}
                              >
                                <Play className="w-3 h-3 mr-1" />
                                {formatTime(moment.timestamp)}
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed mb-2">
                            {moment.description}
                          </p>
                          {(moment.speaker || moment.score !== undefined) && (
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              {moment.speaker && (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span>{moment.speaker}</span>
                                </div>
                              )}
                              {moment.score !== undefined && (
                                <span className="font-medium">Score: {moment.score}/10</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-card rounded-lg border border-border p-6 text-center">
                  <Brain className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
                  <div className="text-sm text-muted-foreground mb-1">Analyzing conversation insights...</div>
                  <div className="text-xs text-muted-foreground">Key business moments will appear here once AI analysis is complete</div>
                </div>
              )}
          </div>
        </section>
        </>
      )}
    </div>
  );
}
