import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import {
  TrendingUp,
  Target,
  Award,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Heart,
  Shield,
  Users,
  Clock,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Star,
  HelpCircle,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  parseECIAnalysis,
  getECIOverallScore,
  getECIEscalationRisk,
  getECIPrimaryStrength,
  getECIPrimaryImprovement,
  getBehaviorRatingColor,
  formatTimestamp,
  type ECIAnalysisResult,
  type ECIBehaviorEvaluation
} from '@/utils/eciAnalysis';
import type { Recording } from '@/types/recording';
import { useSpotlight } from '@/contexts/SpotlightContext';
import { useSupportModeShowScores } from '@/hooks/useOrganizationSettings';

interface ECICoachingInsightsProps {
  recording: Recording;
  className?: string;
}

const ECICoachingInsights: React.FC<ECICoachingInsightsProps> = ({
  recording,
  className
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [autoAnalysisTrigger, setAutoAnalysisTrigger] = useState(false);
  const [developmentModeError, setDevelopmentModeError] = useState<string | null>(null);

  // Access spotlight context for media player seeking
  const { seek } = useSpotlight();

  // Get organization setting for score visibility
  const { showScores } = useSupportModeShowScores();

  // Parse ECI analysis from recording
  const analysis: ECIAnalysisResult | null = useMemo(() => {
    return parseECIAnalysis(recording);
  }, [recording]);

  // Auto-trigger ECI analysis when component loads
  useEffect(() => {
    if (shouldAutoTriggerAnalysis()) {
      console.log('🎯 Auto-triggering ECI analysis on page load...');
      setAutoAnalysisTrigger(true);
      // Use setTimeout to prevent blocking the initial render
      setTimeout(() => {
        requestECIAnalysis();
      }, 100);
    }
  }, [recording.id]);

  // Smart logic to determine if we should auto-trigger ECI analysis
  const shouldAutoTriggerAnalysis = (): boolean => {
    // Don't auto-trigger if already requesting or if we've already tried auto-analysis
    if (requesting || autoAnalysisTrigger) {
      return false;
    }

    // Skip if ECI analysis already exists
    if (analysis) {
      console.log('⏭️ Skipping auto-analysis: ECI analysis already exists');
      return false;
    }

    // Must have a transcript to analyze
    if (!recording.transcript) {
      console.log('⏭️ Skipping auto-analysis: No transcript available');
      return false;
    }

    // Don't auto-trigger if recording is still processing
    if (recording.status === 'processing' || recording.status === 'queued') {
      console.log('⏭️ Skipping auto-analysis: Recording still processing');
      return false;
    }

    // Don't auto-trigger on failed recordings
    if (recording.status === 'failed' || recording.status === 'error') {
      console.log('⏭️ Skipping auto-analysis: Recording in error state');
      return false;
    }

    // Only auto-trigger for support recordings
    if (recording.content_type !== 'customer_support' && recording.content_type !== 'support_call') {
      console.log('⏭️ Skipping auto-analysis: Not a support recording');
      return false;
    }

    // All conditions met for auto-analysis
    console.log('✅ ECI auto-analysis conditions met for recording:', recording.id);
    return true;
  };

  const requestECIAnalysis = async () => {
    if (!recording.transcript) {
      console.error('No transcript available for ECI analysis');
      return;
    }

    try {
      setRequesting(true);
      console.log('🔄 Triggering ECI analysis for recording:', recording.id);

      // Request ECI evaluation via Edge Function
      const response = await supabase.functions.invoke('analyze-support-call', {
        body: {
          recording_id: recording.id,
          transcript: recording.transcript,
          duration: recording.duration || 0,
          whisper_segments: recording.whisper_segments || []
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      console.log('✅ ECI analysis completed successfully');

      // Clear auto-analysis state
      setAutoAnalysisTrigger(false);

      // The component will re-render automatically when the recording data updates
      // via real-time subscriptions or the next page refresh

    } catch (error) {
      console.error('Failed to request ECI analysis:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to analyze recording with ECI Quality Framework. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('Failed to send a request to the Edge Function') ||
            error.message.includes('fetch')) {
          errorMessage = 'Docker Desktop Required';
          setDevelopmentModeError('To test ECI analysis locally, please start Docker Desktop and run "npx supabase start" in the terminal. Alternatively, test in production environment.');
        } else if (error.message.includes('Recording not found')) {
          errorMessage = 'Recording not found. Please ensure the recording exists and has been fully processed.';
        } else if (error.message.includes('No transcript available')) {
          errorMessage = 'Recording transcript not available. Please wait for processing to complete.';
        } else if (error.message.includes('OpenAI') || error.message.includes('AI service')) {
          errorMessage = 'AI analysis service temporarily unavailable. Please try again in a few moments.';
        } else if (error.message.includes('rate limit') || error.message.includes('429')) {
          errorMessage = 'Too many analysis requests. Please wait a moment before trying again.';
        } else if (error.message) {
          errorMessage = `ECI analysis failed: ${error.message}`;
        }
      }

      // Log for debugging and provide user feedback
      console.error('ECI Analysis Error:', errorMessage);

    } finally {
      setRequesting(false);
    }
  };

  if (!analysis) {
    return (
      <div className={cn('space-y-4', className)}>
        {/* ECI Generation Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="flex flex-col items-center space-y-4">
                {requesting ? (
                  <>
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/20 rounded-full flex items-center justify-center">
                      <HelpCircle className="w-8 h-8 text-blue-500 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Generating ECI Analysis...</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        AI is analyzing this support recording with the ECI Quality Framework. This may take 1-2 minutes.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <HelpCircle className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Processing 12 ECI behaviors...</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/20 rounded-full flex items-center justify-center">
                      <Star className="w-8 h-8 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">ECI Quality Framework Analysis</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {autoAnalysisTrigger ?
                          'Starting ECI analysis automatically...' :
                          'Generate comprehensive ECI quality assessment for this support recording.'
                        }
                      </p>
                      {recording?.transcript ? (
                        <div className="space-y-3">
                          <Button
                            onClick={requestECIAnalysis}
                            disabled={requesting || autoAnalysisTrigger}
                            className="gap-2"
                          >
                            <Star className="w-4 h-4" />
                            {autoAnalysisTrigger ? 'Starting Analysis...' : 'Generate ECI Analysis'}
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            This will analyze 12 ECI behaviors across Care for Customer, Call Resolution, and Call Flow
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Transcript required for ECI analysis
                          </p>
                          <Badge variant="outline">Processing Required</Badge>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Mode Error Alert */}
        {developmentModeError && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-1">
                    Local Development Setup Required
                  </h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                    {developmentModeError}
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg">
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
                        Quick Setup Steps:
                      </p>
                      <ol className="text-sm text-orange-700 dark:text-orange-300 list-decimal list-inside space-y-1">
                        <li>Start Docker Desktop application</li>
                        <li>Run <code className="bg-orange-200 dark:bg-orange-800 px-1 rounded">npx supabase start</code> in terminal</li>
                        <li>Refresh this page and try again</li>
                      </ol>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDevelopmentModeError(null)}
                      className="w-fit"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Temporary Fallback Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              What is ECI Quality Framework?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                <Heart className="mx-auto mb-2 h-6 w-6 text-green-600" />
                <div className="font-semibold text-green-800">Care for Customer</div>
                <div className="text-xs text-green-600">60% Weight</div>
                <div className="text-xs text-muted-foreground mt-1">6 Behaviors</div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                <CheckCircle className="mx-auto mb-2 h-6 w-6 text-blue-600" />
                <div className="font-semibold text-blue-800">Call Resolution</div>
                <div className="text-xs text-blue-600">30% Weight</div>
                <div className="text-xs text-muted-foreground mt-1">2 Behaviors</div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200">
                <Clock className="mx-auto mb-2 h-6 w-6 text-purple-600" />
                <div className="font-semibold text-purple-800">Call Flow</div>
                <div className="text-xs text-purple-600">10% Weight</div>
                <div className="text-xs text-muted-foreground mt-1">4 Behaviors</div>
              </div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                The ECI Quality Framework evaluates customer support interactions across 12 specific behaviors,
                providing detailed coaching insights, escalation risk assessment, and manager review requirements.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overallScore = getECIOverallScore(analysis);
  const escalationRisk = getECIEscalationRisk(analysis);
  const primaryStrength = getECIPrimaryStrength(analysis);
  const primaryImprovement = getECIPrimaryImprovement(analysis);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
    }
  };

  const getRatingIcon = (rating: 'YES' | 'NO' | 'UNCERTAIN') => {
    switch (rating) {
      case 'YES': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'NO': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'UNCERTAIN': return <Eye className="w-4 h-4 text-purple-600" />;
    }
  };

  const renderBehaviorEvaluation = (
    name: string,
    evaluation: ECIBehaviorEvaluation,
    sectionId: string
  ) => {
    const isExpanded = expandedSections.has(`${sectionId}-${name}`);
    const hasEvidence = evaluation.evidence && evaluation.evidence.length > 0;
    const needsReview = evaluation.rating === 'UNCERTAIN';

    return (
      <div key={name} className="border border-gray-200 rounded-lg p-3 bg-white">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection(`${sectionId}-${name}`)}
        >
          <div className="flex items-center gap-3">
            {getRatingIcon(evaluation.rating)}
            <div>
              <h4 className="font-medium text-gray-900">{name.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}</h4>
              {needsReview && (
                <Badge variant="secondary" className="text-xs mt-1 bg-purple-100 text-purple-700">
                  <Eye className="w-3 h-3 mr-1" />
                  Manager Review Required
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={evaluation.rating === 'YES' ? 'default' : evaluation.rating === 'NO' ? 'destructive' : 'secondary'}>
              {evaluation.rating}
            </Badge>
            {hasEvidence && (
              <span className="text-xs text-gray-500">{evaluation.evidence.length} evidence</span>
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-3 border-t pt-3">
            {/* Brief Tip */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <h5 className="text-sm font-medium text-blue-800">Quick Tip</h5>
                  <p className="text-sm text-blue-700">{evaluation.briefTip}</p>
                </div>
              </div>
            </div>

            {/* Detailed Recommendation */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <h5 className="text-sm font-medium text-gray-800 mb-2">Detailed Coaching</h5>
              <p className="text-sm text-gray-700">{evaluation.detailedRecommendation}</p>
            </div>

            {/* Evidence */}
            {hasEvidence && (
              <div>
                <h5 className="text-sm font-medium text-gray-800 mb-2">Evidence & Timestamps</h5>
                <div className="space-y-2">
                  {evaluation.evidence.slice(0, showAllEvidence ? evaluation.evidence.length : 2).map((evidence, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'p-2 rounded border text-sm',
                        evidence.type === 'positive' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (seek && evidence.timestamp !== undefined) {
                              seek(evidence.timestamp);
                            }
                          }}
                          className="font-medium text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors flex items-center gap-1"
                          title="Click to jump to this moment"
                        >
                          <Play className="w-3 h-3" />
                          {formatTimestamp(evidence.timestamp)}
                        </button>
                        <Badge
                          variant={evidence.type === 'positive' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {evidence.type}
                        </Badge>
                      </div>
                      <p className="text-gray-800 italic">"{evidence.quote}"</p>
                      {evidence.context && (
                        <p className="text-gray-600 text-xs mt-1">{evidence.context}</p>
                      )}
                    </div>
                  ))}

                  {evaluation.evidence.length > 2 && !showAllEvidence && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAllEvidence(true);
                      }}
                      className="text-xs"
                    >
                      Show {evaluation.evidence.length - 2} more evidence
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Confidence Score */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Confidence: {Math.round(evaluation.confidence * 100)}%</span>
              <span>Definition: {evaluation.definition}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSection = (
    title: string,
    behaviors: Record<string, ECIBehaviorEvaluation>,
    weight: number,
    icon: React.ReactNode,
    sectionId: string
  ) => {
    const sectionBehaviors = Object.entries(behaviors);
    const yesCount = sectionBehaviors.filter(([_, b]) => b.rating === 'YES').length;
    const noCount = sectionBehaviors.filter(([_, b]) => b.rating === 'NO').length;
    const uncertainCount = sectionBehaviors.filter(([_, b]) => b.rating === 'UNCERTAIN').length;
    const sectionScore = Math.round((yesCount / sectionBehaviors.length) * 100);

    return (
      <div key={sectionId} className="border border-gray-200 rounded-lg bg-white">
        <div
          className="p-4 cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection(sectionId)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                {showScores && (
                  <p className="text-sm text-gray-600">Weight: {weight}% of overall ECI score</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {showScores ? (
                // Scores visible: Show percentage and Y/N/U counts
                <div className="text-right">
                  <div className={cn('text-lg font-bold px-2 py-1 rounded border', getScoreColor(sectionScore))}>
                    {sectionScore}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {yesCount}Y / {noCount}N / {uncertainCount}U
                  </div>
                </div>
              ) : (
                // Scores hidden: Show qualitative indicator
                <div className="text-right">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-sm font-medium',
                      sectionScore >= 80
                        ? 'text-green-700 border-green-300'
                        : sectionScore >= 60
                        ? 'text-yellow-700 border-yellow-300'
                        : 'text-orange-700 border-orange-300'
                    )}
                  >
                    {sectionScore >= 80
                      ? 'Strong Performance'
                      : sectionScore >= 60
                      ? 'Good Progress'
                      : 'Needs Improvement'}
                  </Badge>
                </div>
              )}
              {expandedSections.has(sectionId) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </div>

        {expandedSections.has(sectionId) && (
          <div className="border-t p-4 space-y-3 bg-gray-50">
            {sectionBehaviors.map(([name, evaluation]) =>
              renderBehaviorEvaluation(name, evaluation, sectionId)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Coaching Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
            Coaching Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.summary.briefOverallCoaching && (
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <h4 className="font-medium text-indigo-800 mb-1">Brief Overview</h4>
              <p className="text-sm text-indigo-700">{analysis.summary.briefOverallCoaching}</p>
            </div>
          )}

          {analysis.summary.detailedOverallCoaching && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-800 mb-2">Detailed Analysis</h4>
              <p className="text-sm text-gray-700">{analysis.summary.detailedOverallCoaching}</p>
            </div>
          )}

          {/* Strengths and Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.summary.strengths.length > 0 && (
              <div>
                <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Demonstrated Strengths
                </h4>
                <ul className="space-y-1">
                  {analysis.summary.strengths.map((strength, idx) => (
                    <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-600 mt-1 flex-shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.summary.improvementAreas.length > 0 && (
              <div>
                <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Improvement Opportunities
                </h4>
                <ul className="space-y-1">
                  {analysis.summary.improvementAreas.map((area, idx) => (
                    <li key={idx} className="text-sm text-orange-700 flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 text-orange-600 mt-1 flex-shrink-0" />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ECI Overview Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-blue-600" />
              ECI Quality Framework Analysis
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {analysis.metadata.model}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {Math.round(analysis.metadata.processingTime / 1000)}s analysis
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Escalation Risk */}
            <div className={cn('text-center p-3 rounded-lg border', getRiskColor(escalationRisk))}>
              <Shield className="mx-auto mb-1 h-5 w-5" />
              <div className="font-semibold capitalize">{escalationRisk} Risk</div>
              <div className="text-xs opacity-80">Escalation Level</div>
            </div>

            {/* Manager Review Status */}
            <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
              <Eye className="mx-auto mb-1 h-5 w-5 text-purple-600" />
              <div className="font-semibold text-purple-600">
                {analysis.summary.managerReviewRequired ? 'Required' : 'Not Needed'}
              </div>
              <div className="text-xs text-purple-600">Manager Review</div>
            </div>

            {/* Behavior Counts */}
            <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Users className="mx-auto mb-1 h-5 w-5 text-gray-600" />
              <div className="font-semibold">
                {analysis.summary.behaviorCounts.yes}/{analysis.summary.behaviorCounts.yes + analysis.summary.behaviorCounts.no + analysis.summary.behaviorCounts.uncertain}
              </div>
              <div className="text-xs text-gray-600">Behaviors Met</div>
            </div>
          </div>

          {/* Key Insights */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {primaryStrength && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-1 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Primary Strength
                </h4>
                <p className="text-sm text-green-700">{primaryStrength}</p>
              </div>
            )}

            {primaryImprovement && (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-medium text-orange-800 mb-1 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Focus Area
                </h4>
                <p className="text-sm text-orange-700">{primaryImprovement}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ECI Behavior Sections */}
      <div className="space-y-4">
        {renderSection(
          'Care for Customer',
          analysis.careForCustomer,
          60,
          <Heart className="w-5 h-5 text-green-600" />,
          'care'
        )}

        {renderSection(
          'Call Resolution',
          analysis.callResolution,
          30,
          <CheckCircle className="w-5 h-5 text-blue-600" />,
          'resolution'
        )}

        {renderSection(
          'Call Flow',
          analysis.callFlow,
          10,
          <Clock className="w-5 h-5 text-purple-600" />,
          'flow'
        )}
      </div>
    </div>
  );
};

export default ECICoachingInsights;