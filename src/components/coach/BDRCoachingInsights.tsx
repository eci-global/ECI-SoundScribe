import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  Target,
  Award,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  BarChart3,
  Lightbulb,
  Play,
  User,
  Bot,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import EditScorecardModal from './EditScorecardModal';
import {
  BDRScorecardEvaluation,
  BDRTrainingProgram,
  BDR_COMPETENCY_LEVELS,
  BDR_SCORING_THRESHOLDS
} from '@/types/bdr-training';
import type { Recording } from '@/types/recording';
import { toast } from 'sonner';

interface BDRCoachingInsightsProps {
  recording: Recording;
  className?: string;
}

interface BDRData {
  evaluation: BDRScorecardEvaluation | null;
  program: BDRTrainingProgram | null;
  loading: boolean;
}

interface EditingCriterion {
  id: string;
  score: number;
  feedback: string;
}

const BDRCoachingInsights: React.FC<BDRCoachingInsightsProps> = ({ 
  recording, 
  className 
}) => {
  const [bdrData, setBdrData] = useState<BDRData>({
    evaluation: null,
    program: null,
    loading: true
  });
  const [requesting, setRequesting] = useState(false);
  const [autoAnalysisTrigger, setAutoAnalysisTrigger] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<EditingCriterion | null>(null);
  const [isSaving, setIsSaving] = useState(false);


  useEffect(() => {
    loadBDRData();
  }, [recording.id]);

  const handleSaveScore = async (criterionId: string, newScore: number, newFeedback: string) => {
    if (!bdrData.evaluation) return;

    setIsSaving(true);

    // Create a deep copy of the criteria scores to avoid direct state mutation
    const updatedCriteriaScores = JSON.parse(JSON.stringify(bdrData.evaluation.criteria_scores || bdrData.evaluation.criteriaScores || {}));

    // Update the specific criterion being edited
    if (updatedCriteriaScores[criterionId]) {
      updatedCriteriaScores[criterionId].score = newScore;
      updatedCriteriaScores[criterionId].feedback = newFeedback;
    } else {
      // Fallback for a new criterion, though the UI only supports editing
      updatedCriteriaScores[criterionId] = { score: newScore, feedback: newFeedback, maxScore: 4 };
    }

    // Recalculate the overall score
    const scores = Object.values(updatedCriteriaScores).map((s: any) => s.score);
    const newOverallScore = scores.length > 0 ? scores.reduce((acc, score) => acc + score, 0) / scores.length : 0;

    // Prepend a note to indicate manager review
    let currentNotes = bdrData.evaluation.coaching_notes || bdrData.evaluation.coachingNotes || '';
    const managerPrefix = 'Manager Assessment:';
    if (!currentNotes.startsWith(managerPrefix)) {
      currentNotes = `${managerPrefix}\n${currentNotes}`;
    }

    try {
      const { data, error } = await supabase
        .from('bdr_scorecard_evaluations')
        .update({
          criteria_scores: updatedCriteriaScores,
          overall_score: newOverallScore,
          coaching_notes: currentNotes,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', bdrData.evaluation.id)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Scorecard updated successfully!');
    } catch (error) {
      console.error('Error updating scorecard:', error);
      toast.error('Failed to update scorecard.');
    } finally {
      setIsSaving(false);
      setEditingCriterion(null);
      loadBDRData();
    }
  };

  // Smart logic to determine if we should auto-trigger BDR analysis
  const shouldAutoTriggerAnalysis = (): boolean => {
    // Don't auto-trigger if already requesting or if we've already tried auto-analysis
    if (requesting || autoAnalysisTrigger) {
      return false;
    }

    // Must have a transcript to analyze
    if (!recording.transcript) {
      console.log('⏭️ Skipping auto-analysis: No transcript available');
      return false;
    }

    // Don't auto-trigger if recording is still processing
    if (['uploading', 'processing_large_file', 'transcribing'].includes(recording.status as any)) {
      console.log('⏭️ Skipping auto-analysis: Recording still processing');
      return false;
    }

    // Don't auto-trigger on failed recordings
    if (recording.status === 'failed' || recording.status === 'transcription_failed') {
      console.log('⏭️ Skipping auto-analysis: Recording in error state');
      return false;
    }

    // All conditions met for auto-analysis
    console.log('✅ Auto-analysis conditions met for recording:', recording.id);
    return true;
  };

  const loadBDRData = async () => {
    try {
      setBdrData(prev => ({ ...prev, loading: true }));

      // Check if this recording has existing BDR evaluations
      const { data: evaluations, error: evalError } = await supabase
        .from('bdr_scorecard_evaluations')
        .select(`
          *,
          bdr_training_programs(*)
        `)
        .eq('recording_id', recording.id)
        .order('evaluated_at', { ascending: false })
        .limit(1);

      if (evalError) {
        console.error('Error loading BDR evaluations:', evalError);
        return;
      }

      if (evaluations && evaluations.length > 0) {
        const evaluation = evaluations[0];
        setBdrData({
          evaluation: evaluation as any,
          program: evaluation.bdr_training_programs as any,
          loading: false
        });
      } else {
        // No existing evaluation - check if we should auto-trigger analysis
        setBdrData({
          evaluation: null,
          program: null,
          loading: false
        });

        // Auto-trigger analysis if conditions are met
        if (shouldAutoTriggerAnalysis()) {
          console.log('🎯 Auto-triggering BDR analysis on page load...');
          setAutoAnalysisTrigger(true);
          // Use setTimeout to prevent blocking the initial render
          setTimeout(() => {
            requestBDRAnalysis();
          }, 100);
        }
      }

    } catch (error) {
      console.error('Failed to load BDR data:', error);
      setBdrData(prev => ({ ...prev, loading: false }));
    }
  };

  const requestBDRAnalysis = async () => {
    if (!recording.transcript) {
      alert('No transcript available for BDR analysis');
      return;
    }

    try {
      setRequesting(true);

      // Get available training programs
      const { data: programs, error: programsError } = (await supabase
        .from('bdr_training_programs')
        .select('id')
        .eq('is_active', true)
        .limit(1)) as any;

      if (programsError || !programs || programs.length === 0) {
        alert('No active BDR training programs found. Please contact your administrator.');
        return;
      }

      // Request BDR evaluation
      const response = await supabase.functions.invoke('evaluate-bdr-scorecard', {
        body: {
          recordingId: recording.id,
          trainingProgramId: programs[0].id,
          forceReprocess: false
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Reload BDR data and clear auto-analysis state
      setAutoAnalysisTrigger(false);
      await loadBDRData();

    } catch (error) {
      console.error('Failed to request BDR analysis:', error);

      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to analyze recording with BDR scorecard. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('Recording not found')) {
          errorMessage = 'Recording not found. Please ensure the recording exists and has been fully processed.';
        } else if (error.message.includes('Training program not found')) {
          errorMessage = 'BDR training program not configured. Please contact your administrator to set up BDR training.';
        } else if (error.message.includes('No transcript available')) {
          errorMessage = 'Recording transcript not available. Please wait for processing to complete or re-upload the recording.';
        } else if (error.message.includes('OpenAI') || error.message.includes('AI service')) {
          errorMessage = 'AI analysis service temporarily unavailable. Please try again in a few moments.';
        } else if (error.message.includes('rate limit') || error.message.includes('429')) {
          errorMessage = 'Too many analysis requests. Please wait a moment before trying again.';
        } else if (error.message) {
          errorMessage = `Analysis failed: ${error.message}`;
        }
      }

      alert(errorMessage);
    } finally {
      setRequesting(false);
      setAutoAnalysisTrigger(false);
    }
  };

  const getCompetencyLevel = (score: number) => {
    if (score >= BDR_COMPETENCY_LEVELS.ADVANCED.min) return BDR_COMPETENCY_LEVELS.ADVANCED;
    if (score >= BDR_COMPETENCY_LEVELS.PROFICIENT.min) return BDR_COMPETENCY_LEVELS.PROFICIENT;
    if (score >= BDR_COMPETENCY_LEVELS.DEVELOPING.min) return BDR_COMPETENCY_LEVELS.DEVELOPING;
    return BDR_COMPETENCY_LEVELS.NOVICE;
  };

  const getScoreColor = (score: number) => {
    if (score >= BDR_SCORING_THRESHOLDS.EXCELLENT) return 'text-green-600';
    if (score >= BDR_SCORING_THRESHOLDS.GOOD) return 'text-blue-600';
    if (score >= BDR_SCORING_THRESHOLDS.NEEDS_IMPROVEMENT) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 4) return 'Best-in-Class';
    if (score >= 3) return 'Strong Performance';
    if (score >= 2) return 'Meets Expectations';
    if (score >= 1) return 'Needs Improvement';
    return 'Not Demonstrated';
  };

  const getCriteriaDisplayName = (criteriaId: string) => {
    // Use dynamic criteria from training program if available
    if (program?.scorecardCriteria) {
      const criterion = program.scorecardCriteria.find(c => c.id === criteriaId);
      if (criterion?.name) {
        return criterion.name;
      }
    }

    // Fallback to static names if no dynamic criteria available
    const names = {
      opening: 'Opening',
      objection_handling: 'Objection Handling',
      qualification: 'Qualification',
      tone_and_energy: 'Tone & Energy',
      assertiveness_and_control: 'Assertiveness & Control',
      business_acumen_and_relevance: 'Business Acumen & Relevance',
      closing: 'Closing',
      talk_time: 'Talk Time'
    };
    return names[criteriaId] || criteriaId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= BDR_SCORING_THRESHOLDS.EXCELLENT) return 'default';
    if (score >= BDR_SCORING_THRESHOLDS.GOOD) return 'secondary';
    if (score >= BDR_SCORING_THRESHOLDS.NEEDS_IMPROVEMENT) return 'outline';
    return 'destructive';
  };

  // Detect evaluation source based on coaching notes
  const getEvaluationSource = (evaluation: BDRScorecardEvaluation) => {
    const coachingNotes = evaluation.coaching_notes || evaluation.coachingNotes || '';
    if (coachingNotes.startsWith('Manager Assessment:')) {
      return { type: 'manager', label: 'Manager Review', icon: User, color: 'text-blue-600' };
    }
    return { type: 'ai', label: 'AI Analysis', icon: Bot, color: 'text-purple-600' };
  };

  if (bdrData.loading) {
    return (
      <Card className={cn("border-purple-200", className)}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading BDR insights...</span>
        </CardContent>
      </Card>
    );
  }

  if (!bdrData.evaluation) {
    return (
      <Card className={cn("border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50", className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">BDR Scorecard Analysis</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <GraduationCap className="h-12 w-12 text-purple-400 mx-auto mb-4" />

            {requesting || autoAnalysisTrigger ? (
              // Auto-analysis or manual analysis in progress
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {autoAnalysisTrigger ? 'Auto-Analyzing Call...' : 'Analyzing Call...'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {autoAnalysisTrigger
                    ? 'Automatically evaluating this call against BDR training criteria...'
                    : 'Evaluating this call against BDR training criteria...'
                  }
                </p>
              </>
            ) : (
              // No analysis available, manual trigger option
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No BDR Analysis Available
                </h3>
                <p className="text-gray-600 mb-4">
                  {!recording.transcript
                    ? 'Transcript not available for BDR analysis. Please wait for processing to complete.'
                    : 'Analyze this call against BDR training criteria to get detailed coaching insights.'
                  }
                </p>
                <Button
                  onClick={requestBDRAnalysis}
                  disabled={requesting || !recording.transcript}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {requesting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      {autoAnalysisTrigger ? 'Re-analyze with BDR Scorecard' : 'Analyze with BDR Scorecard'}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { evaluation, program } = bdrData;
  const overallScore = evaluation.overall_score || evaluation.overallScore || 0;
  const competencyLevel = getCompetencyLevel(overallScore);
  const evaluationSource = getEvaluationSource(evaluation);

  return (
    <Card className={cn("border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">BDR Scorecard Results</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("bg-white", evaluationSource.color)}>
              <evaluationSource.icon className="h-3 w-3 mr-1" />
              {evaluationSource.label}
            </Badge>
            <Badge variant="outline" className="bg-white">
              {program?.name || 'BDR Training'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score & Competency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center p-4 bg-white rounded-lg border">
            <div className="flex items-center justify-center mb-2">
              <div className="relative">
                <div className="w-16 h-16">
                  <svg className="transform -rotate-90 w-16 h-16">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - overallScore / 4)}`}
                      className="text-purple-600 transition-all duration-1000"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn("text-lg font-bold", getScoreColor(overallScore))}>
                      {overallScore.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600">Overall BDR Score (0-4 Scale)</p>
          </div>

          <div className="text-center p-4 bg-white rounded-lg border">
            <div className="flex items-center justify-center mb-2">
              <Award className="h-8 w-8 text-purple-600" />
            </div>
            <Badge 
              variant={getScoreBadgeVariant(overallScore)}
              className="mb-1"
            >
              {competencyLevel.label}
            </Badge>
            <p className="text-sm text-gray-600">Competency Level</p>
          </div>
        </div>

        {/* Criteria Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Criteria Breakdown
          </h4>
          <div className="space-y-2">
            {Object.entries(evaluation.criteria_scores || evaluation.criteriaScores || {}).map(([criteriaId, score]) => {
              const scoreValue = (score as any)?.score || 0;
              const maxScore = (score as any)?.maxScore || 4;
              const feedback = (score as any)?.feedback || '';
              return (
                <div key={criteriaId} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">
                        {getCriteriaDisplayName(criteriaId)}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-bold", getScoreColor(scoreValue))}>
                          {scoreValue}/{maxScore}
                        </span>
                        <span className={cn("text-xs px-2 py-1 rounded-full", 
                          scoreValue >= 4 ? 'bg-green-100 text-green-700' :
                          scoreValue >= 3 ? 'bg-blue-100 text-blue-700' :
                          scoreValue >= 2 ? 'bg-yellow-100 text-yellow-700' :
                          scoreValue >= 1 ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        )}>
                          {getScoreLabel(scoreValue)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCriterion({ id: criteriaId, score: scoreValue, feedback })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(scoreValue / maxScore) * 100} 
                        className="flex-1 h-2"
                      />
                    </div>
                    {(score as any)?.feedback && (
                      <p className="text-xs text-gray-600 mt-1">{(score as any)?.feedback}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Edit Scorecard Modal */}
        {editingCriterion && (
          <EditScorecardModal
            isOpen={!!editingCriterion}
            onClose={() => setEditingCriterion(null)}
            onSave={handleSaveScore}
            isSaving={isSaving}
            criterion={{
              id: editingCriterion.id,
              name: getCriteriaDisplayName(editingCriterion.id),
              score: editingCriterion.score,
              feedback: editingCriterion.feedback,
            }}
          />
        )}

        {/* Key Insights */}
        {(evaluation.bdr_insights || evaluation.bdrInsights) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            {(evaluation.strengths && evaluation.strengths.length > 0) && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4" />
                  Key Strengths
                </h4>
                <ul className="space-y-1">
                  {evaluation.strengths.slice(0, 3).map((strength, index) => (
                    <li key={index} className="text-sm text-green-700">
                      • {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvement Areas */}
            {(evaluation.improvement_areas || evaluation.improvementAreas) && (evaluation.improvement_areas || evaluation.improvementAreas).length > 0 && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-800 flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  Focus Areas
                </h4>
                <ul className="space-y-1">
                  {(evaluation.improvement_areas || evaluation.improvementAreas).slice(0, 3).map((area, index) => (
                    <li key={index} className="text-sm text-yellow-700">
                      • {area}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Coaching Priorities */}
        {(evaluation.bdr_insights?.coachingPriorities || evaluation.bdrInsights?.coachingPriorities) && (evaluation.bdr_insights?.coachingPriorities || evaluation.bdrInsights?.coachingPriorities).length > 0 && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4" />
              Coaching Priorities
            </h4>
            <ul className="space-y-1">
              {(evaluation.bdr_insights?.coachingPriorities || evaluation.bdrInsights?.coachingPriorities).map((priority, index) => (
                <li key={index} className="text-sm text-blue-700">
                  • {priority}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Coaching Notes */}
        {(evaluation.coaching_notes || evaluation.coachingNotes) && (
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-gray-800 flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4" />
              Coaching Notes
              <Badge variant="outline" className={cn("ml-2 text-xs", evaluationSource.color)}>
                <evaluationSource.icon className="h-3 w-3 mr-1" />
                {evaluationSource.type === 'manager' ? 'Manager Assessment' : 'AI Generated'}
              </Badge>
            </h4>
            <p className="text-sm text-gray-700">{evaluation.coaching_notes || evaluation.coachingNotes}</p>
            {evaluationSource.type === 'manager' && (
              <p className="text-xs text-blue-600 mt-2 italic">
                ✓ This feedback was provided by a manager during scorecard review
              </p>
            )}
            {evaluationSource.type === 'ai' && (
              <p className="text-xs text-purple-600 mt-2 italic">
                ⚡ This feedback was automatically generated based on call analysis
              </p>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="text-xs text-gray-500 border-t pt-4 flex items-center justify-between">
          <span>
            Analyzed {evaluation.evaluated_at ? new Date(evaluation.evaluated_at).toLocaleDateString() : evaluation.evaluatedAt ? new Date(evaluation.evaluatedAt).toLocaleDateString() : 'Unknown date'}
          </span>
          <span>
            Confidence: {((evaluation.confidence_score || evaluation.confidenceScore || 0.8) * 100).toFixed(0)}%
          </span>
        </div>

      </CardContent>
    </Card>
  );
};

export default BDRCoachingInsights;