import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, TrendingUp, MessageSquare, Lightbulb, Brain, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { CoachingService } from '@/services/coachingService';
import type { CoachingEvaluation } from '@/utils/coachingEvaluation';
import type { Recording } from '@/types/recording';

interface CoachingEvaluationProps {
  evaluation?: CoachingEvaluation | null;
  recording?: Recording;
  onEvaluationUpdate?: (evaluation: CoachingEvaluation) => void;
}

export function CoachingEvaluationDisplay({ evaluation, recording, onEvaluationUpdate }: CoachingEvaluationProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Handle coaching generation
  const handleGenerateCoaching = async () => {
    if (!recording?.id || !recording?.transcript) return;
    
    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      const result = await CoachingService.generateCoaching(recording.id);
      
      if (result.success && result.coaching_evaluation) {
        onEvaluationUpdate?.(result.coaching_evaluation);
      } else {
        setGenerationError(result.error || 'Failed to generate coaching evaluation');
      }
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  // If no evaluation, show generation interface
  if (!evaluation) {
    return (
      <div className="space-y-6">
        {/* Error display */}
        {generationError && (
          <Card>
            <CardContent className="pt-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center text-red-800 text-sm mb-2">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  <span className="font-medium">Generation Failed:</span>
                </div>
                <p className="text-red-700 text-sm mb-3">{generationError}</p>
                {recording?.transcript && !isGenerating && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateCoaching}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    disabled={isGenerating}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Generation
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generation interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6" />
              AI Coaching Evaluation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            {isGenerating ? (
              <>
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Generating Coaching Analysis...</h3>
                <p className="text-gray-600 mb-4">
                  This may take 30-60 seconds to analyze the conversation and generate detailed coaching insights.
                </p>
              </>
            ) : (
              <>
                <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Coaching Evaluation Available</h3>
                <p className="text-gray-600 mb-6">
                  Generate AI coaching analysis to get performance metrics, strengths, improvements, and actionable insights.
                </p>
                
                {recording?.transcript ? (
                  <Button
                    onClick={handleGenerateCoaching}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isGenerating}
                  >
                    <Brain className="w-5 h-5 mr-2" />
                    Generate Coaching Analysis
                  </Button>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto">
                    <div className="flex items-center text-amber-800 text-sm">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      <span>Transcript required for coaching analysis</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Coaching Evaluation</span>
            <Badge variant={getScoreBadgeVariant(evaluation.overallScore)} className="text-lg px-4 py-1">
              {evaluation.overallScore}/100
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={evaluation.overallScore} className="h-3" />
        </CardContent>
      </Card>

      {/* Detailed Criteria */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Criteria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Talk-Time Ratio</span>
                <span className={`text-sm font-semibold ${evaluation.criteria.talkTimeRatio >= 30 && evaluation.criteria.talkTimeRatio <= 40 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {evaluation.criteria.talkTimeRatio}%
                </span>
              </div>
              <Progress value={evaluation.criteria.talkTimeRatio} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Objection Handling</span>
                <span className="text-sm font-semibold">{evaluation.criteria.objectionHandling}/10</span>
              </div>
              <Progress value={evaluation.criteria.objectionHandling * 10} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Value Articulation</span>
                <span className="text-sm font-semibold">{evaluation.criteria.valueArticulation}/10</span>
              </div>
              <Progress value={evaluation.criteria.valueArticulation * 10} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Active Listening</span>
                <span className="text-sm font-semibold">{evaluation.criteria.activeListening}/10</span>
              </div>
              <Progress value={evaluation.criteria.activeListening * 10} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Rapport Building</span>
                <span className="text-sm font-semibold">{evaluation.criteria.rapport}/10</span>
              </div>
              <Progress value={evaluation.criteria.rapport * 10} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Discovery Questions</span>
                <Badge variant="outline">{evaluation.criteria.discoveryQuestions}</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Clear Next Steps</span>
              {evaluation.criteria.nextSteps ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths and Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {evaluation.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {evaluation.improvements.map((improvement, index) => (
                <li key={index} className="text-sm">{improvement}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Suggested Responses */}
      {evaluation.suggestedResponses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Suggested Responses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {evaluation.suggestedResponses.map((response, index) => (
              <div key={index} className="space-y-2 border-l-4 border-blue-500 pl-4">
                <p className="text-sm font-medium">Situation: {response.situation}</p>
                <p className="text-sm text-muted-foreground">Current: "{response.currentResponse}"</p>
                <p className="text-sm text-green-600">Improved: "{response.improvedResponse}"</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Action Items for Next Call</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {evaluation.actionItems.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="h-2 w-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}