import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Target,
  BarChart3,
  MessageCircle,
  TrendingUp,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ManagerFeedbackModal from './ManagerFeedbackModal';

// Mock data for demonstration
const mockEvaluation = {
  id: 'demo-evaluation-1',
  overall_score: 2.8,
  criteria_scores: {
    opening: {
      score: 3,
      maxScore: 4,
      feedback: 'Good introduction but could be more engaging'
    },
    objection_handling: {
      score: 2,
      maxScore: 4,
      feedback: 'Needs improvement in handling objections'
    },
    qualification: {
      score: 3,
      maxScore: 4,
      feedback: 'Adequate qualification questions'
    },
    tone_and_energy: {
      score: 3,
      maxScore: 4,
      feedback: 'Good energy level throughout the call'
    },
    business_acumen: {
      score: 2,
      maxScore: 4,
      feedback: 'Limited business knowledge demonstrated'
    },
    closing: {
      score: 3,
      maxScore: 4,
      feedback: 'Decent closing but could be stronger'
    }
  },
  coaching_notes: 'Overall solid performance with room for improvement in objection handling and business acumen. Focus on developing deeper industry knowledge and practicing objection responses.',
  strengths: ['Good energy', 'Clear communication'],
  improvement_areas: ['Objection handling', 'Business acumen'],
  evaluated_at: new Date().toISOString()
};

const FeedbackSystemDemo: React.FC = () => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [demoData, setDemoData] = useState(mockEvaluation);

  const handleFeedbackSubmitted = () => {
    // Simulate feedback submission
    console.log('Feedback submitted successfully!');
    setShowFeedbackModal(false);
    
    // Simulate updated evaluation
    setDemoData(prev => ({
      ...prev,
      overall_score: 3.2, // Simulate improved score
      coaching_notes: 'Manager Assessment:\n' + prev.coaching_notes
    }));
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
    <div className="space-y-6">
      {/* Demo Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Play className="h-5 w-5" />
            Manager Feedback System Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700 mb-4">
            This demo shows how managers can provide feedback on AI-generated BDR evaluations. 
            Click the "Provide Feedback" button below to see the feedback modal in action.
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white text-blue-600">
              <Target className="h-3 w-3 mr-1" />
              Interactive Demo
            </Badge>
            <Badge variant="outline" className="bg-white text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              No Database Required
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Mock BDR Evaluation */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">BDR Scorecard Results</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white text-purple-600">
                <BarChart3 className="h-3 w-3 mr-1" />
                AI Analysis
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFeedbackModal(true)}
                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Provide Feedback
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Overall Score */}
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
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - demoData.overall_score / 4)}`}
                        className="text-purple-600 transition-all duration-1000"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={cn("text-lg font-bold", getScoreColor(demoData.overall_score))}>
                        {demoData.overall_score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600">Overall BDR Score (0-4 Scale)</p>
            </div>

            <div className="text-center p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <Badge 
                variant={getScoreBadgeVariant(demoData.overall_score)}
                className="mb-1"
              >
                {getScoreLabel(demoData.overall_score)}
              </Badge>
              <p className="text-sm text-gray-600">Performance Level</p>
            </div>
          </div>

          {/* Criteria Breakdown */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Criteria Breakdown
            </h4>
            <div className="space-y-2">
              {Object.entries(demoData.criteria_scores).map(([criteriaId, score]) => {
                const scoreValue = score.score;
                const maxScore = score.maxScore;
                const feedback = score.feedback;
                return (
                  <div key={criteriaId} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">
                          {criteriaId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{feedback}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coaching Notes */}
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-gray-800 flex items-center gap-2 mb-2">
              <MessageCircle className="h-4 w-4" />
              Coaching Notes
              <Badge variant="outline" className="ml-2 text-xs text-purple-600">
                <BarChart3 className="h-3 w-3 mr-1" />
                AI Generated
              </Badge>
            </h4>
            <p className="text-sm text-gray-700">{demoData.coaching_notes}</p>
          </div>
        </CardContent>
      </Card>

      {/* Manager Feedback Modal */}
      {showFeedbackModal && (
        <ManagerFeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          evaluation={demoData as any}
          recordingId="demo-recording-1"
          onFeedbackSubmitted={handleFeedbackSubmitted}
        />
      )}

      {/* Demo Instructions */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Demo Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="text-green-700">
          <div className="space-y-3">
            <p><strong>Try the manager feedback system:</strong></p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Click the "Provide Feedback" button above</li>
              <li>Adjust individual criteria scores using the sliders</li>
              <li>Modify the coaching notes in the text area</li>
              <li>Select a reason for the changes from the dropdown</li>
              <li>Add any additional notes and set confidence level</li>
              <li>Submit the feedback to see the system in action</li>
            </ol>
            <p className="mt-4 text-sm">
              <strong>Note:</strong> This is a demo version. In the full system, your feedback would 
              update AI constraints in real-time and be stored in the database.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackSystemDemo;
