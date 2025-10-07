import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  Lightbulb, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Clock, 
  Target,
  User,
  FileText,
  Zap,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UXAnalysisService } from '@/services/uxAnalysisService';
import type { Recording } from '@/types/recording';
import type { UXAnalysis, ExtractedQuestion, SolutionRecommendation, IdentifiedEmployee } from '@/types/uxAnalysis';

interface UXCoachingInsightsProps {
  recording: Recording;
  className?: string;
}

const UXCoachingInsights: React.FC<UXCoachingInsightsProps> = ({ recording, className }) => {
  const [analysis, setAnalysis] = useState<UXAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadUXAnalysis();
  }, [recording.id]);

  const loadUXAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const existingAnalysis = await UXAnalysisService.getUXAnalysis(recording.id);
      
      if (existingAnalysis) {
        setAnalysis(existingAnalysis);
      } else {
        // No existing analysis found
        console.log('No UX analysis found for recording:', recording.id);
      }
    } catch (err) {
      console.error('Error loading UX analysis:', err);
      setError('Failed to load UX analysis');
    } finally {
      setLoading(false);
    }
  };

  const generateAnalysis = async () => {
    if (!recording.transcript) {
      setError('No transcript available for analysis');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const result = await UXAnalysisService.analyzeRecording({
        recording_id: recording.id,
        transcript: recording.transcript
      });

      if (result.success && result.data) {
        setAnalysis(result.data);
      } else {
        // Fallback to instant analysis
        const instantAnalysis = await UXAnalysisService.generateInstantUXAnalysis(
          recording.transcript,
          recording.id
        );
        setAnalysis(instantAnalysis);
      }
    } catch (err) {
      console.error('Error generating UX analysis:', err);
      setError('Failed to generate UX analysis');
    } finally {
      setIsGenerating(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading UX analysis...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900 mb-2">Analysis Error</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button onClick={generateAnalysis} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Generate Analysis
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-blue-500 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900 mb-2">No UX Analysis Available</h3>
          <p className="text-sm text-gray-600 mb-4">
            Generate a comprehensive UX analysis to identify employees, extract questions and answers, and get solution recommendations.
          </p>
          <Button onClick={generateAnalysis} disabled={isGenerating || !recording.transcript}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Generate UX Analysis
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">UX Interview Analysis</h3>
        </div>
        <Button variant="outline" size="sm" onClick={generateAnalysis} disabled={isGenerating}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Analysis Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="questions">Q&A</TabsTrigger>
          <TabsTrigger value="solutions">Solutions</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Employees Identified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analysis.employee_identification.identified_employees.length}</div>
                <p className="text-xs text-gray-600">
                  Confidence: {(analysis.employee_identification.confidence_score * 100).toFixed(0)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Questions Asked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analysis.question_analysis.questions.length}</div>
                <p className="text-xs text-gray-600">
                  Quality: {(analysis.question_analysis.overall_question_quality * 100).toFixed(0)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Solutions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analysis.solution_recommendations.length}</div>
                <p className="text-xs text-gray-600">
                  High Priority: {analysis.solution_recommendations.filter(s => s.priority === 'high').length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Overall Sentiment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={getSentimentColor(analysis.call_breakdown.overall_sentiment)}>
                  {analysis.call_breakdown.overall_sentiment}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Comprehensive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 leading-relaxed">
                {analysis.comprehensive_summary}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-4">
          {analysis.employee_identification.identified_employees.map((employee, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    {employee.name}
                  </CardTitle>
                  <Badge variant="outline">
                    {employee.role || 'Employee'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Confidence:</span>
                    <Progress value={employee.confidence * 100} className="mt-1" />
                  </div>
                  <div>
                    <span className="font-medium">Communication:</span>
                    <Progress value={(employee.characteristics.communication_effectiveness || 0.7) * 100} className="mt-1" />
                  </div>
                </div>
                
                {employee.characteristics.expertise_areas && employee.characteristics.expertise_areas.length > 0 && (
                  <div>
                    <span className="font-medium text-sm">Expertise Areas:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {employee.characteristics.expertise_areas.map((area, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <span className="font-medium text-sm">Speaking Style:</span>
                  <span className="ml-2 text-sm text-gray-600">
                    {employee.characteristics.speaking_style || 'Moderate'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-4">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Question & Answer Analysis</h4>
            <p className="text-sm text-gray-600">
              {analysis.question_analysis.questions.length} questions analyzed with effectiveness scoring
            </p>
          </div>
          
          {analysis.question_analysis.questions.map((question, index) => {
            // Try to find a related answer (simple pairing by index)
            const relatedAnswer = analysis.call_breakdown.sections
              .flatMap(section => section.customer_feedback)
              .find((_, i) => i === index);
            
            return (
              <Card key={question.id}>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {/* Question */}
                    <div className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-1">{question.question_text}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span>Asked by: {question.asked_by}</span>
                            <Badge variant="outline" className="text-xs">
                              {question.question_type.replace('_', ' ')}
                            </Badge>
                            <span>•</span>
                            <span>{Math.round(question.timestamp / 60)}m</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {(question.effectiveness_score * 100).toFixed(0)}%
                          </div>
                          <Progress value={question.effectiveness_score * 100} className="w-16 mt-1" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Answer */}
                    {relatedAnswer && (
                      <div className="border-l-4 border-green-500 pl-4">
                        <p className="font-medium text-gray-700 mb-1">Customer Response:</p>
                        <p className="text-sm text-gray-600 mb-2">{relatedAnswer}</p>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              relatedAnswer.toLowerCase().includes('good') || 
                              relatedAnswer.toLowerCase().includes('great') || 
                              relatedAnswer.toLowerCase().includes('like')
                                ? 'text-green-600 bg-green-50' 
                                : relatedAnswer.toLowerCase().includes('problem') || 
                                  relatedAnswer.toLowerCase().includes('issue') || 
                                  relatedAnswer.toLowerCase().includes('difficult')
                                ? 'text-red-600 bg-red-50'
                                : 'text-gray-600 bg-gray-50'
                            }`}
                          >
                            {relatedAnswer.toLowerCase().includes('good') || 
                             relatedAnswer.toLowerCase().includes('great') || 
                             relatedAnswer.toLowerCase().includes('like')
                              ? 'Positive' 
                              : relatedAnswer.toLowerCase().includes('problem') || 
                                relatedAnswer.toLowerCase().includes('issue') || 
                                relatedAnswer.toLowerCase().includes('difficult')
                              ? 'Negative'
                              : 'Neutral'}
                          </Badge>
                        </div>
                      </div>
                    )}
                    
                    {/* Context */}
                    {question.context && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <span className="font-medium">Context:</span> {question.context}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Solutions Tab */}
        <TabsContent value="solutions" className="space-y-4">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Solution Recommendations</h4>
            <p className="text-sm text-gray-600">
              {analysis.solution_recommendations.length} actionable solutions identified based on interview analysis
            </p>
          </div>
          
          {analysis.solution_recommendations.map((solution) => (
            <Card key={solution.id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-medium">{solution.recommended_solution}</CardTitle>
                  <div className="flex space-x-2">
                    <Badge className={getPriorityColor(solution.priority)}>
                      {solution.priority} priority
                    </Badge>
                    <Badge variant="outline">
                      {solution.solution_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700 font-medium">Rationale:</p>
                  <p className="text-sm text-gray-600 mt-1">{solution.rationale}</p>
                </div>
                
                <div>
                  <span className="font-medium text-sm flex items-center mb-2">
                    <Target className="w-4 h-4 mr-1" />
                    Implementation Steps:
                  </span>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                    {solution.implementation_steps.map((step, index) => (
                      <li key={index} className="bg-gray-50 p-2 rounded">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg">
                  <span className="font-medium text-sm text-green-800">Expected Impact:</span>
                  <p className="text-sm text-green-700 mt-1">{solution.expected_impact}</p>
                </div>
                
                {solution.question_id !== 'general' && (
                  <div className="text-xs text-gray-500">
                    Related to question: {analysis.question_analysis.questions.find(q => q.id === solution.question_id)?.question_text || 'Unknown'}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Call Breakdown & Analysis</h4>
            <p className="text-sm text-gray-600">
              Detailed analysis of {analysis.call_breakdown.sections.length} call sections with key insights
            </p>
          </div>
          
          {/* Key Topics and Sentiment Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Key Topics Discussed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {analysis.call_breakdown.key_topics.map((topic, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overall Sentiment</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={getSentimentColor(analysis.call_breakdown.overall_sentiment)}>
                  {analysis.call_breakdown.overall_sentiment}
                </Badge>
              </CardContent>
            </Card>
          </div>
          
          {/* Pain Points and Opportunities */}
          {(analysis.call_breakdown.customer_pain_points.length > 0 || analysis.call_breakdown.opportunities_identified.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {analysis.call_breakdown.customer_pain_points.length > 0 && (
                <Card className="border-l-4 border-l-red-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-red-700">Customer Pain Points</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm text-gray-600">
                      {analysis.call_breakdown.customer_pain_points.map((point, i) => (
                        <li key={i} className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              
              {analysis.call_breakdown.opportunities_identified.length > 0 && (
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-green-700">Opportunities Identified</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm text-gray-600">
                      {analysis.call_breakdown.opportunities_identified.map((opportunity, i) => (
                        <li key={i} className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {opportunity}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          {/* Call Sections */}
          {analysis.call_breakdown.sections.map((section) => (
            <Card key={section.id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  {section.title}
                </CardTitle>
                <p className="text-xs text-gray-600">
                  {Math.round(section.start_time / 60)}m - {Math.round(section.end_time / 60)}m
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="font-medium text-sm">Participants:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {section.participants.map((participant, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {participant}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {section.key_points.length > 0 && (
                  <div>
                    <span className="font-medium text-sm">Key Points:</span>
                    <ul className="list-disc list-inside space-y-1 mt-1 text-sm text-gray-600">
                      {section.key_points.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {section.questions_asked.length > 0 && (
                  <div>
                    <span className="font-medium text-sm">Questions Asked:</span>
                    <ul className="list-disc list-inside space-y-1 mt-1 text-sm text-gray-600">
                      {section.questions_asked.slice(0, 3).map((question, i) => (
                        <li key={i}>{question}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {section.customer_feedback.length > 0 && (
                  <div>
                    <span className="font-medium text-sm">Customer Feedback:</span>
                    <ul className="list-disc list-inside space-y-1 mt-1 text-sm text-gray-600">
                      {section.customer_feedback.slice(0, 2).map((feedback, i) => (
                        <li key={i}>{feedback}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {/* Next Steps */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Action Items & Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.next_steps.map((step) => (
                  <div key={step.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{step.action}</p>
                      <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600">
                        <span>Owner: {step.owner}</span>
                        <Badge className={getPriorityColor(step.priority)} variant="outline">
                          {step.priority}
                        </Badge>
                        <Badge variant="outline">
                          {step.status}
                        </Badge>
                        {step.due_date && (
                          <span>Due: {step.due_date}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UXCoachingInsights;
