import * as React from 'react';
import { BarChart3, Clock, Users, MessageSquare, Target, TrendingUp, TrendingDown, Minus, Brain, Zap, BarChart2, Heart, Shield, AlertTriangle, CheckCircle, Activity, Users2, TrendingUp as Growth, RefreshCw, Smile, Frown, Mic, Volume2, Timer, Play, User, ChevronDown, ChevronRight, Phone, UserCheck, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/utils/mediaDuration';
import { useSentimentAnalysisV2 } from '@/hooks/useSentimentAnalysisV2';
import { useSpotlight } from '@/contexts/SpotlightContext';
import { useSupportMode } from '@/contexts/SupportContext';
import { analyzeAllSupportSignals } from '@/utils/supportSignals';
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

  // State for expandable sentiment sections
  const [showPositiveMoments, setShowPositiveMoments] = React.useState(false);
  const [showNegativeMoments, setShowNegativeMoments] = React.useState(false);
  const [showNeutralMoments, setShowNeutralMoments] = React.useState(false);

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
        hasRealSentimentData: false
      };
    }
    const speakerAnalysis = recording.ai_speaker_analysis as AISpeakerAnalysis;
    const wordCount = recording.transcript?.split(/\s+/).length || 0;
    const duration = recording.duration || 0;
    const talkRatio = speakerAnalysis?.talk_ratio || 0;
    const speakers = speakerAnalysis?.identified_speakers?.length || 0;
    const wordsPerMinute = duration > 0 ? Math.round(wordCount / (duration / 60)) : 0;
    
    // Sentiment calculations with fallback analysis
    // CRITICAL: Ensure sentimentMoments is an array before using array methods
    const safeSentimentMoments = Array.isArray(sentimentMoments) ? sentimentMoments : [];
    const positiveMoments = safeSentimentMoments.filter(m => m.sentiment === 'positive').length;
    const negativeMoments = safeSentimentMoments.filter(m => m.sentiment === 'negative').length;
    const totalMoments = safeSentimentMoments.length;
    
    // Fallback sentiment analysis from transcript and coaching data
    let fallbackSentimentScore = 50;
    let fallbackPositive = 0;
    let fallbackNegative = 0;
    
    if (totalMoments === 0 && recording.transcript) {
      // Analyze transcript for positive/negative keywords when no AI sentiment available
      const positiveWords = ['great', 'good', 'excellent', 'perfect', 'love', 'amazing', 'fantastic', 'interested', 'excited', 'yes', 'absolutely', 'definitely', 'agree'];
      const negativeWords = ['problem', 'issue', 'concerned', 'worried', 'disappointed', 'frustrated', 'no', 'can\'t', 'won\'t', 'difficult', 'expensive'];
      
      const transcript = recording.transcript.toLowerCase();
      fallbackPositive = positiveWords.reduce((count, word) => count + (transcript.match(new RegExp(`\\b${word}\\b`, 'g'))?.length || 0), 0);
      fallbackNegative = negativeWords.reduce((count, word) => count + (transcript.match(new RegExp(`\\b${word}\\b`, 'g'))?.length || 0), 0);
      
      const totalWords = fallbackPositive + fallbackNegative;
      if (totalWords > 0) {
        fallbackSentimentScore = Math.round((fallbackPositive / totalWords) * 100);
      }
      
      // Use coaching evaluation score as additional sentiment indicator
      if (recording.coaching_evaluation) {
        try {
          const evaluation = typeof recording.coaching_evaluation === 'string' 
            ? JSON.parse(recording.coaching_evaluation)
            : recording.coaching_evaluation;
          
          if (evaluation && typeof evaluation === 'object' && 'overallScore' in evaluation) {
            const coachingScore = evaluation.overallScore;
            if (typeof coachingScore === 'number') {
              // Blend coaching score with keyword analysis
              fallbackSentimentScore = Math.round((fallbackSentimentScore + coachingScore) / 2);
            }
          }
        } catch (e) {
          console.warn('Could not parse coaching evaluation for sentiment fallback:', e);
        }
      }
    }
    
    // Prevent double-counting: use real data OR fallback, never both
    const hasRealSentimentData = totalMoments > 0;
    const finalPositive = hasRealSentimentData ? positiveMoments : Math.min(fallbackPositive, 10); // Cap fallback
    const finalNegative = hasRealSentimentData ? negativeMoments : Math.min(fallbackNegative, 10); // Cap fallback
    const finalSentimentScore = hasRealSentimentData 
      ? Math.round((positiveMoments / totalMoments) * 100) 
      : Math.max(0, Math.min(100, fallbackSentimentScore)); // Ensure valid range
    
    // Engagement score calculation using local variables
    let engagementScore = 0;
    if (speakers > 1) engagementScore += 30;
    if (wordsPerMinute > 120) engagementScore += 25;
    if (finalPositive > finalNegative) engagementScore += 25;
    if (insights?.emotionalVolatility && insights.emotionalVolatility < 0.3) engagementScore += 20;
    engagementScore = Math.min(engagementScore, 100);
    
    return {
      speakers,
      duration,
      wordCount,
      talkRatio: Math.round(talkRatio * 100),
      wordsPerMinute,
      positiveMoments: finalPositive,
      negativeMoments: finalNegative,
      totalMoments: Math.max(totalMoments, finalPositive + finalNegative),
      sentimentScore: finalSentimentScore,
      engagementScore,
      // Use consistent data source to avoid duplicates
      rapportMoments: hasRealSentimentData 
        ? safeSentimentMoments.filter(m => m.sentiment === 'positive' && m.text?.toLowerCase().includes('rapport')).length
        : Math.floor(finalPositive * 0.2), // Estimate if no real data
      trustSignals: hasRealSentimentData 
        ? safeSentimentMoments.filter(m => m.sentiment === 'positive' && (m.text?.toLowerCase().includes('trust') || m.text?.toLowerCase().includes('confidence'))).length
        : Math.floor(finalPositive * 0.15), // Estimate if no real data  
      momentumShifts: hasRealSentimentData 
        ? safeSentimentMoments.filter(m => m.sentiment === 'neutral').length
        : Math.max(0, Math.floor((finalPositive + finalNegative) * 0.1)), // Conservative estimate
      hasRealSentimentData
    };
  }, [recording, sentimentMoments, insights]);

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
    const positiveSignals = stats.positiveMoments;
    const interestSignals = positiveSignals > 0;
    const considerationPhase = positiveSignals > 2;
    const decisionReadiness = positiveSignals > 5;
    
    return { interestSignals, considerationPhase, decisionReadiness };
  };

  // Generate unique sentiment moments for detailed view
  const generateSentimentMoments = React.useMemo(() => {
    if (!recording?.duration) return [];

    const duration = recording.duration;
    const uniqueMoments = new Map();
    
    // Process real sentiment data first (highest priority)
    // CRITICAL: Ensure sentimentMoments is an array before using array methods
    const safeSentimentMoments = Array.isArray(sentimentMoments) ? sentimentMoments : [];
    if (safeSentimentMoments.length > 0) {
      safeSentimentMoments.forEach((moment, index) => {
        const timestamp = moment.start_time || (duration / safeSentimentMoments.length) * index;
        const text = moment.text || 'AI-identified sentiment moment';
        
        // Enhanced deduplication: combine timestamp, sentiment, and text similarity
        const timeWindow = Math.floor(timestamp / 15) * 15; // Smaller 15-second windows for better precision
        const normalizedText = text.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const textHash = normalizedText.substring(0, 50); // Larger text sample for better uniqueness
        const uniqueKey = `${moment.sentiment}-${timeWindow}-${textHash}`;
        
        // Only add if not seen, or if this has higher confidence
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
    
    // Only add fallback moments if we have very few real moments
    if (uniqueMoments.size < 3) {
      const fallbackCount = Math.min(3 - uniqueMoments.size, stats.positiveMoments + stats.negativeMoments);
      
      for (let i = 0; i < fallbackCount; i++) {
        const timestamp = Math.floor((duration / (fallbackCount + 1)) * (i + 1));
        const timeWindow = Math.floor(timestamp / 15) * 15;
        const isPositive = i < stats.positiveMoments;
        const sentiment = isPositive ? 'positive' : 'negative';
        const uniqueKey = `${sentiment}-${timeWindow}-fallback-${i}`;
        
        // Only add if no conflict with real data
        if (!uniqueMoments.has(uniqueKey)) {
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
    }
    
    // Convert to array, sort by timestamp and confidence, limit to top 8
    return Array.from(uniqueMoments.values())
      .sort((a, b) => {
        // Primary sort: timestamp
        if (Math.abs(a.timestamp - b.timestamp) > 5) {
          return a.timestamp - b.timestamp;
        }
        // Secondary sort: confidence (higher first)
        return b.confidence - a.confidence;
      })
      .slice(0, 8);
  }, [recording?.duration, sentimentMoments, stats.positiveMoments, stats.negativeMoments]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  // Support-specific alert detection functions
  const getSupportIssueAlerts = () => {
    if (!supportMode || !recording?.transcript || !recording?.duration) {
      return [];
    }

    const alerts = [];
    const supportSignals = analyzeAllSupportSignals(recording.transcript, recording.duration);

    // Escalation Risk Indicators
    if (supportSignals.escalationRisk.confidence > 0.6) {
      alerts.push({
        type: 'escalation',
        message: 'High escalation risk detected - customer showing frustration',
        severity: 'high'
      });
    }

    // Service Quality Concerns
    if (supportSignals.empathy.confidence < 0.4) {
      alerts.push({
        type: 'empathy',
        message: 'Low empathy scores - customer may feel unheard',
        severity: 'medium'
      });
    }

    if (supportSignals.professionalism.confidence < 0.5) {
      alerts.push({
        type: 'professionalism',
        message: 'Professional service gaps identified in interaction',
        severity: 'medium'
      });
    }

    // Communication Issues
    if (supportSignals.paceControl.confidence < 0.5) {
      alerts.push({
        type: 'communication',
        message: 'Communication clarity issues may confuse customer',
        severity: 'low'
      });
    }

    // Customer Satisfaction Risks
    if (supportSignals.sentimentTrajectory.trend === 'declining') {
      alerts.push({
        type: 'satisfaction',
        message: 'Customer satisfaction declining throughout interaction',
        severity: 'high'
      });
    }

    // Extended resolution time
    if (recording.duration > 1800) { // > 30 minutes
      alerts.push({
        type: 'duration',
        message: 'Extended resolution time may indicate complex issue',
        severity: 'low'
      });
    }

    return alerts;
  };

  const getSupportImprovementOpportunities = () => {
    if (!supportMode || !recording?.transcript || !recording?.duration) {
      return [];
    }

    const opportunities = [];
    const supportSignals = analyzeAllSupportSignals(recording.transcript, recording.duration);

    // Customer Satisfaction Enhancement
    if (supportSignals.empathy.confidence > 0.7) {
      opportunities.push({
        type: 'empathy',
        message: 'Strong empathy demonstrated - great foundation for customer loyalty',
        category: 'satisfaction'
      });
    }

    if (supportSignals.professionalism.confidence > 0.8) {
      opportunities.push({
        type: 'professionalism',
        message: 'Excellent professional service - consider for training examples',
        category: 'excellence'
      });
    }

    // Process Improvement
    if (recording.duration < 600 && supportSignals.professionalism.confidence > 0.6) { // < 10 minutes
      opportunities.push({
        type: 'efficiency',
        message: 'Quick resolution with good service - first-call resolution success',
        category: 'process'
      });
    }

    // Relationship Building
    if (supportSignals.sentimentTrajectory.trend === 'improving') {
      opportunities.push({
        type: 'relationship',
        message: 'Customer sentiment improved - excellent relationship building',
        category: 'satisfaction'
      });
    }

    if (supportSignals.escalationRisk.confidence < 0.2) {
      opportunities.push({
        type: 'deescalation',
        message: 'Successfully prevented escalation - great conflict resolution',
        category: 'excellence'
      });
    }

    // Proactive follow-up opportunity
    if (supportSignals.sentimentTrajectory.closing > 0.7) {
      opportunities.push({
        type: 'followup',
        message: 'High customer satisfaction - ideal for feedback collection',
        category: 'satisfaction'
      });
    }

    return opportunities;
  };

  return (
    <div className="space-y-4">
      {!recording ? (
        <div className="text-center py-4">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No recording selected</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Analytics will appear here</p>
        </div>
      ) : sentimentLoading || isGenerating ? (
        <div className="text-center py-4">
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
          <div className="text-center py-4">
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
              <div className="bg-card rounded-lg border border-border p-3">
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
                      {stats.totalMoments - stats.positiveMoments - stats.negativeMoments}
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
          <div className="flex items-center gap-2 mb-4">
            {supportMode ? (
              <>
                <UserCheck className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-foreground">Support Performance Dashboard</h2>
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-md">Customer Focus</span>
              </>
            ) : (
              <>
                <Brain className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Sales Intelligence Dashboard</h2>
                <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">AI Powered</span>
              </>
            )}
          </div>

      {/* Sentiment Analysis */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-4 h-4 text-emerald-500" />
          <h3 className="font-semibold text-foreground">Sentiment Analysis</h3>
          {!stats.hasRealSentimentData && (
            <span className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-md">
              AI Analysis
            </span>
          )}
        </div>
        <div className="bg-card rounded-lg border border-border p-3">
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
              className="w-full justify-between text-sm h-auto p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
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
            
            {showPositiveMoments && stats.positiveMoments > 0 && (
              <div className="ml-8 mt-2 space-y-3">
                {Array.isArray(generateSentimentMoments) ? generateSentimentMoments.filter(m => m.sentiment === 'positive').map((moment) => (
                  <div key={moment.id} className="border rounded-lg p-4 bg-emerald-50 border-emerald-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getSentimentIcon(moment.sentiment)}
                        <div>
                          <div className="font-medium text-foreground">Positive Moment</div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(moment.timestamp)}</span>
                            <User className="h-3 w-3 ml-2" />
                            <span>{moment.speaker}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="default">Positive</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-foreground italic">"{moment.text}"</div>
                      <div className="text-xs text-muted-foreground">{moment.context}</div>
                      <div className="text-xs text-muted-foreground">
                        Confidence: {Math.round(moment.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                )) : []}
                {Array.isArray(generateSentimentMoments) && generateSentimentMoments.filter(m => m.sentiment === 'positive').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Smile className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No positive moments detected yet</p>
                  </div>
                )}
              </div>
            )}
            
            <Button
              variant="ghost"
              className="w-full justify-between text-sm h-auto p-2 hover:bg-muted/50"
              onClick={() => setShowNeutralMoments(!showNeutralMoments)}
              disabled={(stats.totalMoments - stats.positiveMoments - stats.negativeMoments) === 0}
            >
              <div className="flex items-center gap-3">
                <Minus className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">{stats.totalMoments - stats.positiveMoments - stats.negativeMoments}</div>
                  <div className="text-xs text-muted-foreground">Neutral moments</div>
                </div>
              </div>
              {(stats.totalMoments - stats.positiveMoments - stats.negativeMoments) > 0 && (
                showNeutralMoments ? 
                  <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            
            {showNeutralMoments && (stats.totalMoments - stats.positiveMoments - stats.negativeMoments) > 0 && (
              <div className="ml-8 mt-2 space-y-3">
                {Array.isArray(generateSentimentMoments) ? generateSentimentMoments.filter(m => m.sentiment === 'neutral').map((moment) => (
                  <div key={moment.id} className="border rounded-lg p-4 bg-muted/30 border-muted">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getSentimentIcon(moment.sentiment)}
                        <div>
                          <div className="font-medium text-foreground">Neutral Moment</div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(moment.timestamp)}</span>
                            <User className="h-3 w-3 ml-2" />
                            <span>{moment.speaker}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">Neutral</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-foreground italic">"{moment.text}"</div>
                      <div className="text-xs text-muted-foreground">{moment.context}</div>
                      <div className="text-xs text-muted-foreground">
                        Confidence: {Math.round(moment.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                )) : []}
                {Array.isArray(generateSentimentMoments) && generateSentimentMoments.filter(m => m.sentiment === 'neutral').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Minus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No neutral moments detected yet</p>
                  </div>
                )}
              </div>
            )}
            
            <Button
              variant="ghost"
              className="w-full justify-between text-sm h-auto p-2 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={() => setShowNegativeMoments(!showNegativeMoments)}
              disabled={stats.negativeMoments === 0}
            >
              <div className="flex items-center gap-3">
                <Frown className="w-5 h-5 text-red-500" />
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">{stats.negativeMoments}</div>
                  <div className="text-xs text-muted-foreground">Negative</div>
                </div>
              </div>
              {stats.negativeMoments > 0 && (
                showNegativeMoments ? 
                  <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            
            {showNegativeMoments && stats.negativeMoments > 0 && (
              <div className="ml-8 mt-2 space-y-3">
                {Array.isArray(generateSentimentMoments) ? generateSentimentMoments.filter(m => m.sentiment === 'negative').map((moment) => (
                  <div key={moment.id} className="border rounded-lg p-4 bg-red-50 border-red-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getSentimentIcon(moment.sentiment)}
                        <div>
                          <div className="font-medium text-foreground">Negative Moment</div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(moment.timestamp)}</span>
                            <User className="h-3 w-3 ml-2" />
                            <span>{moment.speaker}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="destructive">Negative</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-foreground italic">"{moment.text}"</div>
                      <div className="text-xs text-muted-foreground">{moment.context}</div>
                      <div className="text-xs text-muted-foreground">
                        Confidence: {Math.round(moment.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                )) : []}
                {Array.isArray(generateSentimentMoments) && generateSentimentMoments.filter(m => m.sentiment === 'negative').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Frown className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No negative moments detected yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
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
                * Analysis based on transcript keywords and coaching evaluation
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SERVQUAL Framework Metrics (when available in coaching data) */}
      {supportMode && recording?.coaching_evaluation && (() => {
        try {
          const coaching = typeof recording.coaching_evaluation === 'string' 
            ? JSON.parse(recording.coaching_evaluation) 
            : recording.coaching_evaluation;
          
          // Check if coaching data contains SERVQUAL metrics
          const hasServqualMetrics = coaching?.criteria && (
            coaching.criteria.reliability !== undefined ||
            coaching.criteria.responsiveness !== undefined ||
            coaching.criteria.empathy !== undefined ||
            coaching.criteria.assurance !== undefined ||
            coaching.criteria.tangibles !== undefined
          );

          if (hasServqualMetrics) {
            return (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <h3 className="font-semibold text-foreground">SERVQUAL Service Quality Framework</h3>
                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-md">Industry Standard</span>
                </div>
                <div className="bg-card rounded-lg border border-border p-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {coaching.criteria.reliability !== undefined && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-muted-foreground">Reliability</span>
                        </div>
                        <div className="text-lg font-bold text-foreground">{Math.round(coaching.criteria.reliability)}%</div>
                        <div className="text-xs text-muted-foreground">Consistent Service</div>
                      </div>
                    )}
                    {coaching.criteria.responsiveness !== undefined && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Timer className="w-4 h-4 text-blue-500" />
                          <span className="text-xs text-muted-foreground">Responsiveness</span>
                        </div>
                        <div className="text-lg font-bold text-foreground">{Math.round(coaching.criteria.responsiveness)}%</div>
                        <div className="text-xs text-muted-foreground">Prompt Help</div>
                      </div>
                    )}
                    {coaching.criteria.empathy !== undefined && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Heart className="w-4 h-4 text-red-500" />
                          <span className="text-xs text-muted-foreground">Empathy</span>
                        </div>
                        <div className="text-lg font-bold text-foreground">{Math.round(coaching.criteria.empathy)}%</div>
                        <div className="text-xs text-muted-foreground">Understanding</div>
                      </div>
                    )}
                    {coaching.criteria.assurance !== undefined && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <UserCheck className="w-4 h-4 text-indigo-500" />
                          <span className="text-xs text-muted-foreground">Assurance</span>
                        </div>
                        <div className="text-lg font-bold text-foreground">{Math.round(coaching.criteria.assurance)}%</div>
                        <div className="text-xs text-muted-foreground">Trust & Confidence</div>
                      </div>
                    )}
                    {coaching.criteria.tangibles !== undefined && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-orange-500" />
                          <span className="text-xs text-muted-foreground">Communication</span>
                        </div>
                        <div className="text-lg font-bold text-foreground">{Math.round(coaching.criteria.tangibles)}%</div>
                        <div className="text-xs text-muted-foreground">Clarity & Quality</div>
                      </div>
                    )}
                    {coaching.criteria.customerSatisfaction !== undefined && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-xs text-muted-foreground">Customer Satisfaction</span>
                        </div>
                        <div className="text-lg font-bold text-foreground">{Math.round(coaching.criteria.customerSatisfaction)}%</div>
                        <div className="text-xs text-muted-foreground">Overall Experience</div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          }
        } catch (e) {
          console.warn('Error parsing coaching evaluation for SERVQUAL metrics:', e);
        }
        return null;
      })()}

      {/* Engagement Metrics - Support vs Sales specific */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-foreground">
            {supportMode ? 'Support Performance Metrics' : 'Engagement Metrics'}
          </h3>
        </div>
        <div className="bg-card rounded-lg border border-border p-3">
          {supportMode && recording?.transcript && recording?.duration ? (
            // Support-specific metrics
            (() => {
              const supportSignals = analyzeAllSupportSignals(recording.transcript, recording.duration);
              return supportSignals ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-muted-foreground">Customer Empathy</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">{Math.round((supportSignals.empathy?.confidence || 0) * 100)}%</div>
                    <div className="text-xs text-muted-foreground">Emotional Connection</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-muted-foreground">Issue Resolution</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">{Math.round((supportSignals.professionalism?.confidence || 0) * 100)}%</div>
                    <div className="text-xs text-muted-foreground">Problem Solving</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-muted-foreground">Patience Level</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">{Math.round((1 - (supportSignals.escalationRisk?.confidence || 0)) * 100)}%</div>
                    <div className="text-xs text-muted-foreground">Customer Focus</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-orange-500" />
                      <span className="text-xs text-muted-foreground">Communication Clarity</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">{Math.round((supportSignals.paceControl?.confidence || 0) * 100)}%</div>
                    <div className="text-xs text-muted-foreground">Clear Explanations</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <span className="text-sm text-muted-foreground">Analyzing support performance...</span>
                </div>
              );
            })()
          ) : (
            // Sales-specific metrics (original)
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
          )}
        </div>
      </section>

      {/* Buying Signal Progression / Support Resolution Progress */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-violet-500" />
          <h3 className="font-semibold text-foreground">
            {supportMode ? 'Issue Resolution Progress' : 'Buying Signal Progression'}
          </h3>
        </div>
        <div className="bg-card rounded-lg border border-border p-3 space-y-2">
          {(() => {
            if (supportMode && recording?.transcript && recording?.duration) {
              // Support-specific progression indicators
              const supportSignals = analyzeAllSupportSignals(recording.transcript, recording.duration);
              if (supportSignals) {
                // Enhanced logic for support resolution progress
                const empathyScore = supportSignals.empathy?.confidence || 0;
                const professionalismScore = supportSignals.professionalism?.confidence || 0;
                const escalationRisk = supportSignals.escalationRisk?.confidence || 0;
                const sentimentTrend = supportSignals.sentimentTrajectory?.trend || 'stable';
                const closingSentiment = supportSignals.sentimentTrajectory?.closing || 0.5;
                
                // Problem Identified: Basic professional interaction started (lowered thresholds)
                const problemIdentified = professionalismScore >= 0.1 || empathyScore >= 0.1;
                
                // Solution Provided: Good professionalism + low escalation risk OR improving sentiment (lowered thresholds)
                const solutionProvided = (professionalismScore >= 0.3 && escalationRisk < 0.6) || 
                                        sentimentTrend === 'improving' ||
                                        (professionalismScore >= 0.25 && empathyScore >= 0.25) ||
                                        closingSentiment > 0.6;
                
                // Customer Satisfied: Reasonable empathy + low escalation + good closing sentiment (lowered thresholds)
                const customerSatisfied = (empathyScore >= 0.4 && escalationRisk < 0.5 && closingSentiment > 0.55) ||
                                         (professionalismScore >= 0.6 && escalationRisk < 0.4) ||
                                         (sentimentTrend === 'improving' && closingSentiment > 0.6) ||
                                         (empathyScore >= 0.5 && professionalismScore >= 0.5);
                
                // Enhanced debug logging for support resolution progress
                console.log('🔍 Support Resolution Progress Debug:', {
                  rawScores: {
                    empathyScore: Math.round(empathyScore * 100) + '%',
                    professionalismScore: Math.round(professionalismScore * 100) + '%',
                    escalationRisk: Math.round(escalationRisk * 100) + '%',
                    sentimentTrend,
                    closingSentiment: Math.round(closingSentiment * 100) + '%'
                  },
                  thresholdEvaluation: {
                    problemIdentified: {
                      result: problemIdentified,
                      logic: `${professionalismScore.toFixed(2)} >= 0.1 OR ${empathyScore.toFixed(2)} >= 0.1`,
                      passes: `prof: ${professionalismScore >= 0.1}, emp: ${empathyScore >= 0.1}`
                    },
                    solutionProvided: {
                      result: solutionProvided,
                      conditions: [
                        { name: 'prof+escalation', passes: professionalismScore >= 0.3 && escalationRisk < 0.6 },
                        { name: 'improving_trend', passes: sentimentTrend === 'improving' },
                        { name: 'prof+emp_combo', passes: professionalismScore >= 0.25 && empathyScore >= 0.25 },
                        { name: 'closing_sentiment', passes: closingSentiment > 0.6 }
                      ].filter(c => c.passes)
                    },
                    customerSatisfied: {
                      result: customerSatisfied,
                      conditions: [
                        { name: 'emp+escalation+closing', passes: empathyScore >= 0.4 && escalationRisk < 0.5 && closingSentiment > 0.55 },
                        { name: 'high_prof+low_escalation', passes: professionalismScore >= 0.6 && escalationRisk < 0.4 },
                        { name: 'improving+closing', passes: sentimentTrend === 'improving' && closingSentiment > 0.6 },
                        { name: 'emp+prof_combo', passes: empathyScore >= 0.5 && professionalismScore >= 0.5 }
                      ].filter(c => c.passes)
                    }
                  },
                  finalResults: { problemIdentified, solutionProvided, customerSatisfied }
                });
                
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${problemIdentified ? 'bg-emerald-500' : 'bg-muted-foreground'}`}></div>
                        <span className="text-sm text-muted-foreground">Problem Identified</span>
                      </div>
                      <span className={`text-sm font-medium ${problemIdentified ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {problemIdentified ? 'Identified' : 'In Progress'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${solutionProvided ? 'bg-blue-500' : 'bg-muted-foreground'}`}></div>
                        <span className="text-sm text-muted-foreground">Solution Provided</span>
                      </div>
                      <span className={`text-sm font-medium ${solutionProvided ? 'text-blue-600' : 'text-muted-foreground'}`}>
                        {solutionProvided ? 'Provided' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${customerSatisfied ? 'bg-violet-500' : 'bg-muted-foreground'}`}></div>
                        <span className="text-sm text-muted-foreground">Customer Satisfied</span>
                      </div>
                      <span className={`text-sm font-medium ${customerSatisfied ? 'text-violet-600' : 'text-muted-foreground'}`}>
                        {customerSatisfied ? 'Satisfied' : 'Needs Follow-up'}
                      </span>
                    </div>
                  </>
                );
              } else {
                return (
                  <div className="text-center py-1">
                    <span className="text-sm text-muted-foreground">
                      Analyzing support interaction progress...
                    </span>
                  </div>
                );
              }
            } else {
              // Sales-specific signals (original logic)
              const signals = getBuyingSignals();
              
              if (signals.noData) {
                return (
                  <div className="text-center py-1">
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
            }
          })()}
        </div>
      </section>

      {/* Risk Alerts & Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <section>
          <div className="flex items-center gap-2 mb-2">
            {supportMode ? (
              <>
                <Shield className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-foreground">Support Issue Alerts</h3>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <h3 className="font-semibold text-foreground">Risk Alerts</h3>
              </>
            )}
          </div>
          <div className={`${
            supportMode 
              ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900' 
              : 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900'
          } rounded-lg p-3`}>
            {(() => {
              if (supportMode) {
                // Support-specific issue alerts
                const supportAlerts = getSupportIssueAlerts();
                
                return (
                  <div className="space-y-2">
                    {supportAlerts.slice(0, 3).map((alert, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Shield className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          alert.severity === 'high' ? 'text-red-600' :
                          alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                        }`} />
                        <span className={`text-sm ${
                          supportMode ? 'text-blue-800 dark:text-blue-200' : 'text-orange-800 dark:text-orange-200'
                        }`}>
                          {alert.message}
                        </span>
                      </div>
                    ))}
                    {supportAlerts.length === 0 && (
                      <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        No support issues detected - excellent customer service delivery
                      </div>
                    )}
                  </div>
                );
              } else {
                // Enhanced risk detection with multiple data sources (original sales logic)
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
                  
                  if (coaching?.overallScore !== undefined && coaching.overallScore < 60) {
                    risks.push(`Low coaching performance score: ${coaching.overallScore}/10`);
                  }
                  
                  if (coaching?.priority === 'high') {
                    risks.push('High priority coaching areas require immediate attention');
                  }
                } catch (e) {
                  console.warn('Error parsing coaching for risks:', e);
                }
              }
              
              // 3. AI insights risks
              if (recording?.ai_insights) {
                try {
                  const aiInsights = typeof recording.ai_insights === 'string' 
                    ? JSON.parse(recording.ai_insights)
                    : recording.ai_insights;
                  
                  if (aiInsights?.concerns && aiInsights.concerns.length > 0) {
                    risks.push(`Customer concern: ${aiInsights.concerns[0]}`);
                  }
                } catch (e) {
                  console.warn('Error parsing AI insights for risks:', e);
                }
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
              
              // 6. Negative sentiment concentration
              const negativeMoments = consolidatedSentimentMoments.filter(m => m.sentiment === 'negative').length;
              const totalMoments = consolidatedSentimentMoments.length;
              if (totalMoments > 0 && (negativeMoments / totalMoments) > 0.4) {
                risks.push('High concentration of negative sentiment detected');
              }
              
                return (
                  <div className="space-y-2">
                    {risks.slice(0, 3).map((risk, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-orange-800 dark:text-orange-200">
                          {risk}
                        </span>
                      </div>
                    ))}
                    {risks.length === 0 && (
                      <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        No specific risks detected in this conversation
                      </div>
                    )}
                  </div>
                );
              }
            })()}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-2">
            {supportMode ? (
              <>
                <TrendingUp className="w-4 h-4 text-green-500" />
                <h3 className="font-semibold text-foreground">Support Improvement Opportunities</h3>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <h3 className="font-semibold text-foreground">Opportunities</h3>
              </>
            )}
          </div>
          <div className={`${
            supportMode 
              ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900' 
              : 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900'
          } rounded-lg p-3`}>
            {(() => {
              if (supportMode) {
                // Support-specific improvement opportunities
                const supportOpportunities = getSupportImprovementOpportunities();
                
                return (
                  <div className="space-y-2">
                    {supportOpportunities.slice(0, 3).map((opportunity, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-green-800 dark:text-green-200">
                          {opportunity.message}
                        </span>
                      </div>
                    ))}
                    {supportOpportunities.length === 0 && (
                      <div className="text-sm font-medium text-green-800 dark:text-green-200">
                        Continue delivering excellent customer service - no specific improvements identified
                      </div>
                    )}
                  </div>
                );
              } else {
                // Enhanced opportunity detection with multiple data sources (original sales logic)
                const opportunities = [];
              
              // Debug logging
              console.log('🎯 Opportunity Analysis Debug:', {
                insights,
                hasInsights: !!insights,
                recommendations: insights?.recommendations,
                recommendationsLength: insights?.recommendations?.length || 0,
                overallTone: insights?.overallTone
              });
              
              // 1. Sentiment-based opportunities from insights
              if (insights?.recommendations && insights.recommendations.length > 0) {
                opportunities.push(...insights.recommendations);
              }
              
              // 2. AI insights opportunities
              if (recording?.ai_insights) {
                try {
                  const aiInsights = typeof recording.ai_insights === 'string' 
                    ? JSON.parse(recording.ai_insights)
                    : recording.ai_insights;
                  
                  if (aiInsights?.opportunities && aiInsights.opportunities.length > 0) {
                    opportunities.push(...aiInsights.opportunities);
                  }
                  
                  if (aiInsights?.nextSteps && aiInsights.nextSteps.length > 0) {
                    opportunities.push(`Next step: ${aiInsights.nextSteps[0]}`);
                  }
                } catch (e) {
                  console.warn('Error parsing AI insights for opportunities:', e);
                }
              }
              
              // 3. Coaching-based opportunities
              if (recording?.coaching_evaluation) {
                try {
                  const coaching = typeof recording.coaching_evaluation === 'string' 
                    ? JSON.parse(recording.coaching_evaluation)
                    : recording.coaching_evaluation;
                  
                  if (coaching?.strengths && coaching.strengths.length > 0) {
                    opportunities.push(`Leverage strength: ${coaching.strengths[0]}`);
                  }
                  
                  if (coaching?.actionItems && coaching.actionItems.length > 0) {
                    opportunities.push(coaching.actionItems[0]);
                  }
                } catch (e) {
                  console.warn('Error parsing coaching for opportunities:', e);
                }
              }
              
              // 4. Positive sentiment opportunities
              const positiveMoments = consolidatedSentimentMoments.filter(m => m.sentiment === 'positive').length;
              const totalMoments = consolidatedSentimentMoments.length;
              if (totalMoments > 0 && (positiveMoments / totalMoments) > 0.6) {
                opportunities.push('Strong positive sentiment - excellent follow-up opportunity');
              }
              
              // 5. Engagement quality opportunities
              const duration = recording?.duration || 0;
              if (duration > 1800) { // > 30 minutes
                opportunities.push('Extended engagement time indicates strong interest');
              }
              
              // 6. Speaker balance opportunities
              const speakerAnalysis = recording?.ai_speaker_analysis as AISpeakerAnalysis;
              if (speakerAnalysis?.talk_ratio !== undefined) {
                if (speakerAnalysis.talk_ratio >= 0.4 && speakerAnalysis.talk_ratio <= 0.6) {
                  opportunities.push('Well-balanced conversation - good rapport established');
                }
              }
              
                return (
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
                );
              }
            })()}
          </div>
        </section>
      </div>


      {/* Key Moments */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-purple-500" />
          <h3 className="font-semibold text-foreground">Key Insights</h3>
        </div>
        <div className="space-y-3">
          {(() => {
            // Enhanced key moments with business insights
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
                      icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
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
                      icon: <TrendingUp className="w-4 h-4 text-amber-500" />,
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
                      icon: <Target className="w-4 h-4 text-blue-500" />,
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
                      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
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
                      icon: <Growth className="w-4 h-4 text-green-500" />,
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
                    icon: <Users className="w-4 h-4 text-orange-500" />,
                    title: 'Customer-Led Conversation',
                    description: `Customer dominated discussion (${Math.round((1-talkRatio)*100)}% talk time)`,
                    impact: 'medium',
                    bgColor: 'bg-orange-50 border-orange-200'
                  });
                } else if (talkRatio > 0.7) {
                  moments.push({
                    id: 'talk-ratio-high',
                    category: 'Engagement Pattern',
                    icon: <Mic className="w-4 h-4 text-purple-500" />,
                    title: 'Rep-Led Presentation',
                    description: `Sales rep led discussion (${Math.round(talkRatio*100)}% talk time)`,
                    impact: 'medium',
                    bgColor: 'bg-purple-50 border-purple-200'
                  });
                }
              }
              
              // 4. Sentiment-Based Business Moments
              const topPositiveMoment = consolidatedSentimentMoments
                .filter(m => m.sentiment === 'positive' && m.confidence > 0.7)
                .sort((a, b) => b.confidence - a.confidence)[0];
              
              if (topPositiveMoment) {
                moments.push({
                  id: 'positive-peak',
                  category: 'Customer Satisfaction',
                  icon: <Smile className="w-4 h-4 text-green-600" />,
                  title: 'Positive Customer Response',
                  description: topPositiveMoment.text,
                  impact: 'high',
                  bgColor: 'bg-green-50 border-green-200',
                  timestamp: topPositiveMoment.timestamp,
                  speaker: topPositiveMoment.speaker
                });
              }
              
              const topNegativeMoment = consolidatedSentimentMoments
                .filter(m => m.sentiment === 'negative' && m.confidence > 0.7)
                .sort((a, b) => b.confidence - a.confidence)[0];
              
              if (topNegativeMoment) {
                moments.push({
                  id: 'negative-concern',
                  category: 'Objection Handling',
                  icon: <Frown className="w-4 h-4 text-red-600" />,
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
                  icon: <Timer className="w-4 h-4 text-indigo-500" />,
                  title: 'Extended Engagement',
                  description: `Lengthy ${formatDuration(duration)} conversation indicates strong interest`,
                  impact: 'medium',
                  bgColor: 'bg-indigo-50 border-indigo-200'
                });
              }
              
              return moments.slice(0, 5); // Show top 5 most relevant insights
            };
            
            const enhancedMoments = getEnhancedMoments();
            
            return enhancedMoments.length > 0 ? (
              <div className="space-y-3">
                {enhancedMoments.map((moment) => (
                  <div key={moment.id} className={`p-3 rounded-lg border ${moment.bgColor}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {moment.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
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
                        <p className="text-sm text-foreground/80 leading-relaxed mb-1">
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
              <div className="bg-card rounded-lg border border-border p-4 text-center">
                <Brain className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
                <div className="text-sm text-muted-foreground mb-1">Analyzing conversation insights...</div>
                <div className="text-xs text-muted-foreground">Key business moments will appear here once AI analysis is complete</div>
              </div>
            );
          })()}
        </div>
      </section>
        </>
      )}
    </div>
  );
}
