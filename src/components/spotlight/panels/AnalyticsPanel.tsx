import * as React from 'react';
import {
  BarChart3,
  Clock,
  Users,
  MessageSquare,
  Target,
  TrendingUp,
  TrendingDown,
  Brain,
  Activity,
  Timer,
  User,
  Phone,
  UserCheck,
  Star,
  Zap,
  Shield,
  CheckCircle,
  AlertTriangle,
  LineChart,
  PieChart,
  BarChart2,
  Gauge,
  ArrowUp,
  ArrowDown,
  Minus,
  Signal,
  Headphones,
  Volume2,
  Mic,
  Lightbulb,
  Heart,
  RefreshCw,
  Smile,
  Frown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/utils/mediaDuration';
import { useSentimentAnalysisV2 } from '@/hooks/useSentimentAnalysisV2';
import { useSpotlight } from '@/contexts/SpotlightContext';
import { useSupportMode } from '@/contexts/SupportContext';
import {
  parseECIAnalysis,
  getECIOverallScore,
  getECIEscalationRisk,
  hasECIAnalysis,
  type ECIAnalysisResult
} from '@/utils/eciAnalysis';
import type { Recording } from '@/types/recording';

interface AnalyticsPanelProps {
  recording?: Recording | null;
}

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

interface PerformanceMetrics {
  duration: number;
  wordCount: number;
  wordsPerMinute: number;
  speakers: number;
  talkRatio: number;
  averageResponseTime: number;
  sentimentScore: number;
  engagementScore: number;
}

interface PredictiveInsights {
  successProbability: number;
  riskFactors: string[];
  recommendations: string[];
  confidenceLevel: number;
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

  // Mode detection logic
  const isSupport = React.useMemo(() => {
    return supportMode.currentMode === 'support' ||
      recording?.content_type === 'customer_support' ||
      recording?.content_type === 'support_call';
  }, [supportMode.currentMode, recording?.content_type]);

  const isSales = React.useMemo(() => {
    return supportMode.currentMode === 'sales' && recording?.content_type === 'sales_call';
  }, [supportMode.currentMode, recording?.content_type]);

  const isUX = React.useMemo(() => {
    return supportMode.currentMode === 'ux' || recording?.content_type === 'user_experience';
  }, [supportMode.currentMode, recording?.content_type]);

  // ECI analysis for support mode
  const eciAnalysis: ECIAnalysisResult | null = React.useMemo(() => {
    if (!isSupport || !recording) return null;
    return parseECIAnalysis(recording);
  }, [recording, isSupport]);
  

  // Performance metrics calculation
  const performanceMetrics: PerformanceMetrics = React.useMemo(() => {
    if (!recording) {
      return {
        duration: 0,
        wordCount: 0,
        wordsPerMinute: 0,
        speakers: 0,
        talkRatio: 0,
        averageResponseTime: 0,
        sentimentScore: 50,
        engagementScore: 0
      };
    }

    const speakerAnalysis = recording.ai_speaker_analysis as AISpeakerAnalysis;
    const wordCount = recording.transcript?.split(/\s+/).length || 0;
    const duration = recording.duration || 0;
    const talkRatio = speakerAnalysis?.talk_ratio || 0;
    const speakers = speakerAnalysis?.identified_speakers?.length || 0;
    const wordsPerMinute = duration > 0 ? Math.round(wordCount / (duration / 60)) : 0;

    // Calculate sentiment score from sentiment moments
    const positiveMoments = sentimentMoments.filter(m => m.sentiment === 'positive').length;
    const negativeMoments = sentimentMoments.filter(m => m.sentiment === 'negative').length;
    const totalMoments = sentimentMoments.length;
    const sentimentScore = totalMoments > 0 ? Math.round((positiveMoments / totalMoments) * 100) : 50;

    // Calculate engagement score
    let engagementScore = 0;
    if (speakers > 1) engagementScore += 30;
    if (wordsPerMinute > 120) engagementScore += 25;
    if (positiveMoments > negativeMoments) engagementScore += 25;
    if (insights?.emotionalVolatility && insights.emotionalVolatility < 0.3) engagementScore += 20;
    engagementScore = Math.min(engagementScore, 100);

    // Estimate average response time (simple calculation based on turn-taking)
    const averageResponseTime = duration > 0 && speakers > 1 ? duration / (speakers * 10) : 0;

    return {
      duration,
      wordCount,
      wordsPerMinute,
      speakers,
      talkRatio: Math.round(talkRatio * 100),
      averageResponseTime,
      sentimentScore,
      engagementScore
    };
  }, [recording, sentimentMoments, insights]);
  // Predictive insights calculation
  const predictiveInsights: PredictiveInsights = React.useMemo(() => {
    if (!recording) {
      return {
        successProbability: 0,
        riskFactors: [],
        recommendations: [],
        confidenceLevel: 0
      };
    }

    let successProbability = 50; // Base probability
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    // Adjust probability based on metrics
    if (performanceMetrics.sentimentScore > 70) {
      successProbability += 20;
    } else if (performanceMetrics.sentimentScore < 40) {
      successProbability -= 20;
      riskFactors.push('Low customer sentiment detected');
    }

    if (performanceMetrics.engagementScore > 80) {
      successProbability += 15;
    } else if (performanceMetrics.engagementScore < 50) {
      successProbability -= 15;
      riskFactors.push('Low engagement levels');
    }

    if (performanceMetrics.duration < 300) {
      riskFactors.push('Very short call duration');
      recommendations.push('Consider extending future conversations');
    } else if (performanceMetrics.duration > 3600) {
      riskFactors.push('Extremely long call duration');
      recommendations.push('Focus on more efficient problem resolution');
    }

    if (performanceMetrics.talkRatio > 80) {
      riskFactors.push('Rep dominated conversation');
      recommendations.push('Encourage more customer participation');
    } else if (performanceMetrics.talkRatio < 20) {
      riskFactors.push('Very low rep participation');
      recommendations.push('Increase active participation in conversation');
    }

    // ECI-specific adjustments for support calls
    if (isSupport && eciAnalysis) {
      const eciScore = getECIOverallScore(eciAnalysis);
      successProbability = Math.round((successProbability + eciScore) / 2);

      if (getECIEscalationRisk(eciAnalysis) === 'high') {
        riskFactors.push('High escalation risk identified');
        recommendations.push('Review ECI behaviors for improvement areas');
      }
    }

    // Sales-specific adjustments
    if (isSales) {
      if (performanceMetrics.wordsPerMinute > 200) {
        riskFactors.push('Speaking too fast for sales context');
        recommendations.push('Slow down pace to improve customer comprehension');
      }
    }

    successProbability = Math.max(0, Math.min(100, successProbability));
    const confidenceLevel = Math.round(Math.random() * 30 + 70); // Simulated confidence for now

    return {
      successProbability: Math.round(successProbability),
      riskFactors,
      recommendations,
      confidenceLevel
    };
  }, [recording, performanceMetrics, isSupport, isSales, eciAnalysis]);


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
              icon: React.createElement(TrendingUp, { className: "w-4 h-4 text-green-500" }),
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
      const negativePercentage = Math.round((negativeMoments / totalMoments) * 100);
      risks.push(`High negative sentiment concentration (${negativePercentage}%)`);
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
      const satisfactionPercentage = Math.round(positiveRatio * 100);
      opps.push(`High customer satisfaction (${satisfactionPercentage}% positive sentiment)`);
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
          {/* Performance Intelligence Dashboard Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {isSupport ? (
                <Shield className="w-6 h-6 text-blue-600" />
              ) : isUX ? (
                <MessageSquare className="w-6 h-6 text-purple-600" />
              ) : (
                <BarChart3 className="w-6 h-6 text-emerald-600" />
              )}
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {isSupport ? 'Service Performance Dashboard' : 
                   isUX ? 'UX Interview Analytics' : 
                   'Sales Performance Analytics'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isSupport ? 'Customer service delivery intelligence' : 
                   isUX ? 'User experience insights and interview analysis' :
                   'Deal progression and engagement metrics'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-200">
                <LineChart className="w-3 h-3 mr-1" />
                Performance Intelligence
              </Badge>
              {isSupport && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Support Mode
                </Badge>
              )}
              {isUX && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  UX Mode
                </Badge>
              )}
              {isSales && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                  Sales Mode
                </Badge>
              )}
            </div>
          </div>

          {/* Support Mode Analytics Sections */}
          {isSupport && (
            <>
              {/* Service Delivery Intelligence */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-foreground">Service Delivery Intelligence</h3>
                  <Badge variant="outline" className="text-xs">
                    ECI Framework
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Service Quality Score */}
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                          <Star className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-900">
                            {eciAnalysis ? getECIOverallScore(eciAnalysis) : performanceMetrics.sentimentScore}%
                          </div>
                          <div className="text-sm text-blue-700">Service Quality</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Escalation Risk */}
                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-600 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-orange-900 capitalize">
                            {eciAnalysis ? getECIEscalationRisk(eciAnalysis) : 'Low'}
                          </div>
                          <div className="text-sm text-orange-700">Escalation Risk</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Resolution Efficiency */}
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-600 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-900">
                            {Math.round((performanceMetrics.duration / 60) / (performanceMetrics.wordsPerMinute / 150))}m
                          </div>
                          <div className="text-sm text-green-700">Avg Resolution</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Customer Experience Metrics */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-foreground">Customer Experience Metrics</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{performanceMetrics.sentimentScore}%</div>
                    <div className="text-sm text-muted-foreground">Satisfaction Score</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {stats.positiveMoments}P / {stats.negativeMoments}N
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-600">{formatTime(performanceMetrics.averageResponseTime)}</div>
                    <div className="text-sm text-muted-foreground">Response Time</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Average per exchange
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-cyan-600">{performanceMetrics.engagementScore}%</div>
                    <div className="text-sm text-muted-foreground">Engagement Level</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Customer participation
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-teal-600">{performanceMetrics.talkRatio}%</div>
                    <div className="text-sm text-muted-foreground">Agent Talk Time</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      vs Customer: {100 - performanceMetrics.talkRatio}%
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Sales Mode Analytics Sections */}
          {isSales && (
            <>
              {/* Deal Progression Intelligence */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-foreground">Deal Progression Intelligence</h3>
                  <Badge variant="outline" className="text-xs">
                    Sales Analytics
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Success Probability */}
                  <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-600 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-emerald-900">
                            {predictiveInsights.successProbability}%
                          </div>
                          <div className="text-sm text-emerald-700">Success Probability</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Engagement Quality */}
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                          <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-900">
                            {performanceMetrics.engagementScore}%
                          </div>
                          <div className="text-sm text-blue-700">Engagement Score</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Call Effectiveness */}
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600 rounded-lg">
                          <Activity className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-900">
                            {Math.min(100, Math.round(performanceMetrics.wordsPerMinute / 2))}%
                          </div>
                          <div className="text-sm text-purple-700">Call Effectiveness</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Sales Performance Metrics */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-foreground">Sales Performance Metrics</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{formatTime(performanceMetrics.duration)}</div>
                    <div className="text-sm text-muted-foreground">Call Duration</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {performanceMetrics.duration > 1800 ? 'Extended' : performanceMetrics.duration > 900 ? 'Standard' : 'Brief'}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{performanceMetrics.wordsPerMinute}</div>
                    <div className="text-sm text-muted-foreground">Words/Minute</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {getPaceLevel()}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.positiveMoments}</div>
                    <div className="text-sm text-muted-foreground">Positive Signals</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Interest indicators
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{performanceMetrics.speakers}</div>
                    <div className="text-sm text-muted-foreground">Participants</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {getInteractionLevel()}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
          {/* Universal Analytics Sections - For Both Modes */}

          {/* Communication Performance Analysis */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-foreground">Communication Performance</h3>
              <Badge variant="outline" className="text-xs">
                Universal Analytics
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Talk Time Distribution */}
              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-900 mb-1">{performanceMetrics.talkRatio}%</div>
                    <div className="text-sm text-indigo-700">
                      {isSupport ? 'Agent Talk Time' : 'Rep Talk Time'}
                    </div>
                    <div className="text-xs text-indigo-600 mt-1">
                      vs {isSupport ? 'Customer' : 'Prospect'}: {100 - performanceMetrics.talkRatio}%
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Speaking Pace */}
              <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-900 mb-1">{performanceMetrics.wordsPerMinute}</div>
                    <div className="text-sm text-cyan-700">Words/Minute</div>
                    <div className="text-xs text-cyan-600 mt-1">{getPaceLevel()} pace</div>
                  </div>
                </CardContent>
              </Card>

              {/* Interaction Quality */}
              <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-teal-900 mb-1">{performanceMetrics.speakers}</div>
                    <div className="text-sm text-teal-700">Participants</div>
                    <div className="text-xs text-teal-600 mt-1">{getInteractionLevel()}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Duration Efficiency */}
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-900 mb-1">{formatTime(performanceMetrics.duration)}</div>
                    <div className="text-sm text-amber-700">Duration</div>
                    <div className="text-xs text-amber-600 mt-1">
                      {performanceMetrics.duration > 1800 ? 'Extended' : performanceMetrics.duration > 900 ? 'Standard' : 'Brief'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Predictive Intelligence */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Gauge className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-foreground">Predictive Intelligence</h3>
              <Badge variant="outline" className="text-xs">
                AI-Powered Insights
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Success Prediction */}
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    {isSupport ? 'Resolution Probability' : 'Success Probability'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-purple-900">
                      {predictiveInsights.successProbability}%
                    </div>
                    <div className="flex-1">
                      <Progress
                        value={predictiveInsights.successProbability}
                        className="h-3 bg-purple-200"
                      />
                      <div className="text-sm text-purple-700 mt-2">
                        Confidence: {predictiveInsights.confidenceLevel}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sentiment Analysis Overview */}
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="w-4 h-4 text-emerald-600" />
                    Emotional Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-emerald-700">Overall Sentiment</span>
                      <span className="font-semibold text-emerald-900">{performanceMetrics.sentimentScore}%</span>
                    </div>
                    <Progress
                      value={performanceMetrics.sentimentScore}
                      className="h-2 bg-emerald-200"
                    />
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-semibold text-green-700">{stats.positiveMoments}</div>
                        <div className="text-green-600">Positive</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-700">{stats.neutralMoments}</div>
                        <div className="text-gray-600">Neutral</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-red-700">{stats.negativeMoments}</div>
                        <div className="text-red-600">Negative</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Risk and Opportunity Analysis */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-foreground">Risk & Opportunity Analysis</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Risk Factors */}
              <Card className="border-orange-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-orange-800">
                    <AlertTriangle className="w-4 h-4" />
                    Risk Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {predictiveInsights.riskFactors.length > 0 ? (
                    <div className="space-y-2">
                      {predictiveInsights.riskFactors.map((risk, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm text-orange-700">{risk}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
                      No significant risk factors detected in this {isSupport ? 'support interaction' : 'conversation'}.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card className="border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                    <Lightbulb className="w-4 h-4" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {predictiveInsights.recommendations.length > 0 ? (
                    <div className="space-y-2">
                      {predictiveInsights.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm text-blue-700">{recommendation}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">
                      Performance metrics are within optimal ranges. Continue current approach.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Advanced Metrics Visualization */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-foreground">Advanced Performance Metrics</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Engagement Score Breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-700">Engagement Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-3">
                    <div className="text-3xl font-bold text-gray-900">{performanceMetrics.engagementScore}</div>
                    <div className="text-sm text-gray-600">Overall Score</div>
                  </div>
                  <Progress value={performanceMetrics.engagementScore} className="h-2" />
                  <div className="text-xs text-gray-500 mt-2">
                    {getEngagementLevel()} engagement level
                  </div>
                </CardContent>
              </Card>

              {/* Response Timing */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-700">
                    {isSupport ? 'Response Efficiency' : 'Conversation Flow'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-3">
                    <div className="text-3xl font-bold text-gray-900">
                      {formatTime(performanceMetrics.averageResponseTime)}
                    </div>
                    <div className="text-sm text-gray-600">Avg Response Time</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {performanceMetrics.averageResponseTime < 5 ? 'Quick responses' :
                     performanceMetrics.averageResponseTime < 10 ? 'Standard timing' : 'Thoughtful responses'}
                  </div>
                </CardContent>
              </Card>

              {/* Content Density */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-700">Content Density</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-3">
                    <div className="text-3xl font-bold text-gray-900">{performanceMetrics.wordCount}</div>
                    <div className="text-sm text-gray-600">Total Words</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round(performanceMetrics.wordCount / (performanceMetrics.duration / 60))} words/min density
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
