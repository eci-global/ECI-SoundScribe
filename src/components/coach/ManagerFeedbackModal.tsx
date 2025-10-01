import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  AlertCircle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown, 
  MessageSquare,
  Target,
  BarChart3,
  Save,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BDRScorecardEvaluation } from '@/types/bdr-training';

interface ManagerFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: BDRScorecardEvaluation;
  recordingId: string;
  onFeedbackSubmitted?: () => void;
}

interface CriteriaAdjustment {
  id: string;
  name: string;
  originalScore: number;
  correctedScore: number;
  originalFeedback: string;
  correctedFeedback: string;
}

const CHANGE_REASONS = [
  { value: 'too_lenient', label: 'AI was too lenient', description: 'AI scored too high' },
  { value: 'too_strict', label: 'AI was too strict', description: 'AI scored too low' },
  { value: 'missed_context', label: 'AI missed important context', description: 'AI didn\'t consider key factors' },
  { value: 'inaccurate_assessment', label: 'AI assessment was inaccurate', description: 'AI misunderstood the situation' },
  { value: 'bias_detected', label: 'Potential bias detected', description: 'AI may have shown bias' },
  { value: 'missing_criteria', label: 'Missing evaluation criteria', description: 'AI didn\'t assess all relevant factors' },
  { value: 'other', label: 'Other reason', description: 'Custom reason' }
];

const ManagerFeedbackModal: React.FC<ManagerFeedbackModalProps> = ({
  isOpen,
  onClose,
  evaluation,
  recordingId,
  onFeedbackSubmitted
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [criteriaAdjustments, setCriteriaAdjustments] = useState<CriteriaAdjustment[]>([]);
  const [overallScoreAdjustment, setOverallScoreAdjustment] = useState<number>(0);
  const [coachingNotesCorrection, setCoachingNotesCorrection] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState(3);

  useEffect(() => {
    if (isOpen && evaluation) {
      initializeForm();
    }
  }, [isOpen, evaluation]);

  const initializeForm = () => {
    const criteriaScores = evaluation.criteria_scores || evaluation.criteriaScores || {};
    const adjustments: CriteriaAdjustment[] = Object.entries(criteriaScores).map(([id, score]) => {
      const scoreData = score as any;
      return {
        id,
        name: getCriteriaDisplayName(id),
        originalScore: scoreData.score || 0,
        correctedScore: scoreData.score || 0,
        originalFeedback: scoreData.feedback || '',
        correctedFeedback: scoreData.feedback || ''
      };
    });
    
    setCriteriaAdjustments(adjustments);
    setOverallScoreAdjustment(evaluation.overall_score || evaluation.overallScore || 0);
    setCoachingNotesCorrection(evaluation.coaching_notes || evaluation.coachingNotes || '');
    setChangeReason('');
    setManagerNotes('');
    setConfidenceLevel(3);
  };

  const getCriteriaDisplayName = (criteriaId: string) => {
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

  const updateCriteriaScore = (id: string, score: number) => {
    setCriteriaAdjustments(prev => 
      prev.map(criteria => 
        criteria.id === id ? { ...criteria, correctedScore: score } : criteria
      )
    );
  };

  const updateCriteriaFeedback = (id: string, feedback: string) => {
    setCriteriaAdjustments(prev => 
      prev.map(criteria => 
        criteria.id === id ? { ...criteria, correctedFeedback: feedback } : criteria
      )
    );
  };

  const calculateNewOverallScore = () => {
    const scores = criteriaAdjustments.map(c => c.correctedScore);
    return scores.length > 0 ? scores.reduce((acc, score) => acc + score, 0) / scores.length : 0;
  };

  const getScoreVariance = () => {
    const originalScore = evaluation.overall_score || evaluation.overallScore || 0;
    const newScore = calculateNewOverallScore();
    return Math.abs(newScore - originalScore);
  };

  const isHighVariance = () => {
    return getScoreVariance() > 1.0;
  };

  const handleSubmit = async () => {
    if (!changeReason) {
      toast.error('Please select a reason for the changes');
      return;
    }

    setIsSubmitting(true);

    try {
      const originalScores = evaluation.criteria_scores || evaluation.criteriaScores || {};
      const correctedScores = { ...originalScores };
      
      // Update corrected scores with manager adjustments
      criteriaAdjustments.forEach(adjustment => {
        if (correctedScores[adjustment.id]) {
          correctedScores[adjustment.id] = {
            ...correctedScores[adjustment.id],
            score: adjustment.correctedScore,
            feedback: adjustment.correctedFeedback
          };
        }
      });

      const newOverallScore = calculateNewOverallScore();
      const originalOverallScore = evaluation.overall_score || evaluation.overallScore || 0;

      // Create criteria adjustments object
      const criteriaAdjustments: Record<string, { score: number; feedback: string }> = {};
      criteriaAdjustments.forEach(adjustment => {
        if (adjustment.correctedScore !== adjustment.originalScore || 
            adjustment.correctedFeedback !== adjustment.originalFeedback) {
          criteriaAdjustments[adjustment.id] = {
            score: adjustment.correctedScore,
            feedback: adjustment.correctedFeedback
          };
        }
      });

      // Submit feedback correction
      const { data, error } = await supabase
        .from('manager_feedback_corrections')
        .insert({
          evaluation_id: evaluation.id,
          manager_id: (await supabase.auth.getUser()).data.user?.id,
          recording_id: recordingId,
          original_ai_scores: originalScores,
          original_overall_score: originalOverallScore,
          corrected_scores: correctedScores,
          corrected_overall_score: newOverallScore,
          criteria_adjustments: criteriaAdjustments,
          original_coaching_notes: evaluation.coaching_notes || evaluation.coachingNotes || '',
          corrected_coaching_notes: coachingNotesCorrection,
          change_reason: changeReason,
          manager_notes: managerNotes,
          confidence_level: confidenceLevel,
          status: 'applied'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Manager feedback submitted successfully!');
      onFeedbackSubmitted?.();
      onClose();

    } catch (error) {
      console.error('Error submitting manager feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-blue-600';
    if (score >= 2) return 'text-yellow-600';
    if (score >= 1) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 4) return 'default';
    if (score >= 3) return 'secondary';
    if (score >= 2) return 'outline';
    return 'destructive';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 4) return 'Best-in-Class';
    if (score >= 3) return 'Strong Performance';
    if (score >= 2) return 'Meets Expectations';
    if (score >= 1) return 'Needs Improvement';
    return 'Not Demonstrated';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Manager Feedback & Corrections
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Score Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Score Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">
                    {evaluation.overall_score || evaluation.overallScore || 0}
                  </div>
                  <div className="text-sm text-gray-500">Original AI Score</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {calculateNewOverallScore().toFixed(1)}
                  </div>
                  <div className="text-sm text-blue-500">Corrected Score</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {getScoreVariance().toFixed(1)}
                  </div>
                  <div className="text-sm text-orange-500">Variance</div>
                  {isHighVariance() && (
                    <Badge variant="destructive" className="mt-1">
                      High Variance
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Criteria Adjustments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criteria Adjustments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {criteriaAdjustments.map((criteria) => (
                <div key={criteria.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{criteria.name}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant={getScoreBadgeVariant(criteria.originalScore)}>
                        {criteria.originalScore}/4
                      </Badge>
                      <span className="text-gray-400">→</span>
                      <Badge variant={getScoreBadgeVariant(criteria.correctedScore)}>
                        {criteria.correctedScore}/4
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`score-${criteria.id}`}>Score (0-4)</Label>
                      <Input
                        id={`score-${criteria.id}`}
                        type="number"
                        min="0"
                        max="4"
                        step="0.1"
                        value={criteria.correctedScore}
                        onChange={(e) => updateCriteriaScore(criteria.id, parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`feedback-${criteria.id}`}>Feedback</Label>
                      <Textarea
                        id={`feedback-${criteria.id}`}
                        value={criteria.correctedFeedback}
                        onChange={(e) => updateCriteriaFeedback(criteria.id, e.target.value)}
                        placeholder="Enter corrected feedback..."
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Coaching Notes Correction */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Coaching Notes Correction</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={coachingNotesCorrection}
                onChange={(e) => setCoachingNotesCorrection(e.target.value)}
                placeholder="Enter corrected coaching notes..."
                rows={4}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Change Reason and Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reason for Changes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="change-reason">Reason for Changes *</Label>
                <Select value={changeReason} onValueChange={setChangeReason}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANGE_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        <div>
                          <div className="font-medium">{reason.label}</div>
                          <div className="text-sm text-gray-500">{reason.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="manager-notes">Additional Notes</Label>
                <Textarea
                  id="manager-notes"
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  placeholder="Add any additional context or explanation..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confidence-level">Confidence Level (1-5)</Label>
                <Input
                  id="confidence-level"
                  type="number"
                  min="1"
                  max="5"
                  value={confidenceLevel}
                  onChange={(e) => setConfidenceLevel(parseInt(e.target.value) || 3)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !changeReason}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManagerFeedbackModal;
