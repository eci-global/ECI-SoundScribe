
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  MessageSquare, 
  Clock, 
  TrendingUp, 
  CheckCircle,
  X,
  Edit,
  Save,
  AlertCircle,
  Star,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recording } from '@/types/recording';
import { 
  getTalkTimeRatio, 
  getObjectionHandling, 
  getDiscoveryQuestions, 
  getValueArticulation, 
  getActiveListening, 
  getRapport, 
  getNextSteps, 
  getActionItems, 
  getSuggestedResponses 
} from '@/utils/coachingAccessors';

interface CoachingCanvasProps {
  recordings: Recording[];
  onClose: () => void;
  userId: string;
  onRegenerateSummary?: (recordingId: string, newSummary: string) => void;
}

export default function CoachingCanvas({ recordings, onClose, userId, onRegenerateSummary }: CoachingCanvasProps) {
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(
    recordings.length > 0 ? recordings[0] : null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');

  useEffect(() => {
    if (selectedRecording && selectedRecording.summary) {
      setEditedSummary(selectedRecording.summary);
    }
  }, [selectedRecording]);

  const handleSaveSummary = () => {
    if (selectedRecording && onRegenerateSummary) {
      onRegenerateSummary(selectedRecording.id, editedSummary);
      setIsEditing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return 'bg-green-600';
    if (value >= 60) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  if (!selectedRecording) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl mx-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Coaching Canvas</CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No recordings available for coaching analysis</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const evaluation = selectedRecording.coaching_evaluation;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Coaching Canvas</h1>
            <p className="text-gray-600">Detailed coaching analysis and insights</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar - Recording List */}
          <div className="w-80 border-r bg-gray-50 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Recordings</h3>
              <div className="space-y-2">
                {recordings.map((recording) => (
                  <button
                    key={recording.id}
                    onClick={() => setSelectedRecording(recording)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      selectedRecording?.id === recording.id
                        ? "bg-white border-gong-purple shadow-sm"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm truncate">{recording.title}</h4>
                      {recording.coaching_evaluation && (
                        <div className={cn(
                          "text-xs font-bold",
                          getScoreColor(recording.coaching_evaluation.overallScore)
                        )}>
                          {recording.coaching_evaluation.overallScore}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatDate(recording.created_at)}</span>
                      <span>{formatDuration(recording.duration)}</span>
                    </div>
                    {recording.coaching_evaluation && (
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-3 w-3" />
                          <span className="text-xs">
                            {getTalkTimeRatio(recording.coaching_evaluation)}%
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">
                            {formatDuration(recording.duration)}
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Recording Header */}
              <div className="bg-white border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedRecording.title}</h2>
                    <p className="text-gray-600 mt-1">{selectedRecording.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>{formatDate(selectedRecording.created_at)}</span>
                      <span>{formatDuration(selectedRecording.duration)}</span>
                      <Badge variant={selectedRecording.status === 'completed' ? 'default' : 'secondary'}>
                        {selectedRecording.status}
                      </Badge>
                    </div>
                  </div>
                  {evaluation && (
                    <div className="text-center">
                      <div className={cn(
                        "text-3xl font-bold",
                        getScoreColor(evaluation.overallScore)
                      )}>
                        {evaluation.overallScore}
                      </div>
                      <div className="text-sm text-gray-500">Overall Score</div>
                    </div>
                  )}
                </div>

                {/* Summary Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Call Summary</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                    </Button>
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedSummary}
                        onChange={(e) => setEditedSummary(e.target.value)}
                        className="w-full p-3 border rounded-lg resize-none"
                        rows={4}
                        placeholder="Enter call summary..."
                      />
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={handleSaveSummary}>
                          Save Changes
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setIsEditing(false);
                            setEditedSummary(selectedRecording.summary || '');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700">
                      {selectedRecording.summary || 'No summary available for this recording.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Coaching Analysis */}
              {evaluation ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Performance Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart3 className="h-5 w-5" />
                        <span>Performance Metrics</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Talk Time Ratio</span>
                          <span>{getTalkTimeRatio(evaluation)}%</span>
                        </div>
                        <Progress 
                          value={getTalkTimeRatio(evaluation)} 
                          className="h-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Optimal range: 30-70%
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Objection Handling</span>
                          <span>{getObjectionHandling(evaluation)}/10</span>
                        </div>
                        <Progress 
                          value={getObjectionHandling(evaluation) * 10} 
                          className="h-2"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Discovery Questions</span>
                          <span>{getDiscoveryQuestions(evaluation)}/10</span>
                        </div>
                        <Progress 
                          value={getDiscoveryQuestions(evaluation) * 10} 
                          className="h-2"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Value Articulation</span>
                          <span>{getValueArticulation(evaluation)}/10</span>
                        </div>
                        <Progress 
                          value={getValueArticulation(evaluation) * 10} 
                          className="h-2"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Active Listening</span>
                          <span>{getActiveListening(evaluation)}/10</span>
                        </div>
                        <Progress 
                          value={getActiveListening(evaluation) * 10} 
                          className="h-2"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Rapport Building</span>
                          <span>{getRapport(evaluation)}/10</span>
                        </div>
                        <Progress 
                          value={getRapport(evaluation) * 10} 
                          className="h-2"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium">Next Steps Defined</span>
                        {getNextSteps(evaluation) ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <X className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Strengths & Improvements */}
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Star className="h-5 w-5 text-green-600" />
                          <span>Key Strengths</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {evaluation.strengths?.map((strength, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          <span>Areas for Improvement</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {evaluation.improvements?.map((improvement, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{improvement}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Action Items */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Target className="h-5 w-5 text-purple-600" />
                        <span>Action Items</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-3">Immediate Actions</h4>
                          <ul className="space-y-2">
                            {getActionItems(evaluation)?.slice(0, 3).map((item, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <div className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                                  {index + 1}
                                </div>
                                <span className="text-sm">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium mb-3">Suggested Responses</h4>
                          <div className="space-y-3">
                            {getSuggestedResponses(evaluation)?.slice(0, 2).map((response, index) => (
                              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                <div className="text-xs font-medium text-gray-600 mb-1">
                                  {response.situation}
                                </div>
                                <div className="text-sm">
                                  <div className="mb-2">
                                    <span className="text-red-600">Instead of:</span> "{response.currentResponse}"
                                  </div>
                                  <div>
                                    <span className="text-green-600">Try:</span> "{response.improvedResponse}"
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Coaching Analysis Available</h3>
                    <p className="text-gray-600 mb-4">
                      This recording hasn't been analyzed yet or coaching is disabled.
                    </p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <p>• Ensure coaching evaluation is enabled for new recordings</p>
                      <p>• Analysis may take a few minutes to complete</p>
                      <p>• Check back later for coaching insights</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
