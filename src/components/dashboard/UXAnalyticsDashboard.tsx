import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  MessageSquare, 
  Lightbulb, 
  Target, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import type { Recording } from '@/types/recording';
import { UXAnalysisService } from '@/services/uxAnalysisService';

interface UXAnalyticsDashboardProps {
  recordings: Recording[];
}

export function UXAnalyticsDashboard({ recordings }: UXAnalyticsDashboardProps) {
  const [uxRecordings, setUXRecordings] = useState<Recording[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUXAnalytics();
  }, [recordings]);

  const loadUXAnalytics = async () => {
    try {
      setLoading(true);
      
      // Filter UX recordings
      const uxRecs = recordings.filter(rec => 
        rec.content_type === 'user_experience' && 
        rec.status === 'completed'
      );
      
      setUXRecordings(uxRecs);
      
      // Load analytics data for UX recordings
      const analytics = await generateUXAnalytics(uxRecs);
      setAnalyticsData(analytics);
      
    } catch (error) {
      console.error('Error loading UX analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateUXAnalytics = async (recordings: Recording[]) => {
    // Mock analytics data - in real implementation, this would aggregate from actual UX analysis
    const totalInterviews = recordings.length;
    const totalQuestions = recordings.reduce((sum, rec) => {
      // Mock question count based on transcript length
      const questionCount = rec.transcript ? (rec.transcript.match(/\?/g) || []).length : 0;
      return sum + questionCount;
    }, 0);
    
    const avgInterviewDuration = recordings.reduce((sum, rec) => sum + (rec.duration || 0), 0) / totalInterviews;
    
    return {
      totalInterviews,
      totalQuestions,
      avgInterviewDuration,
      avgQuestionQuality: 82,
      solutionRecommendations: 15,
      painPointsIdentified: 8,
      opportunitiesFound: 12,
      actionItemsCreated: 20,
      recentInsights: [
        'Performance issues are the most common pain point',
        'Users appreciate intuitive interface design',
        'Feature requests focus on workflow integration',
        'Support documentation needs improvement'
      ],
      topPainPoints: [
        { point: 'Performance and speed issues', count: 5, severity: 'high' },
        { point: 'Usability and interface confusion', count: 3, severity: 'medium' },
        { point: 'Missing features or functionality', count: 4, severity: 'medium' },
        { point: 'Inadequate support resources', count: 2, severity: 'low' }
      ],
      topOpportunities: [
        { opportunity: 'Positive user sentiment and satisfaction', count: 8, impact: 'high' },
        { opportunity: 'Enhancement and improvement opportunities', count: 6, impact: 'medium' },
        { opportunity: 'User recommendations and suggestions', count: 4, impact: 'medium' }
      ]
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading UX Analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">UX Interview Analytics</h2>
          <p className="text-gray-600">User experience insights and interview analysis</p>
        </div>
        <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">
          <MessageSquare className="w-4 h-4 mr-1" />
          UX Mode
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Total Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.totalInterviews || 0}</div>
            <p className="text-xs text-gray-600">UX interviews conducted</p>
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
            <div className="text-2xl font-bold">{analyticsData?.totalQuestions || 0}</div>
            <p className="text-xs text-gray-600">Total questions analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Lightbulb className="w-4 h-4 mr-2" />
              Solutions Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.solutionRecommendations || 0}</div>
            <p className="text-xs text-gray-600">Actionable recommendations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.avgInterviewDuration ? Math.round(analyticsData.avgInterviewDuration / 60) : 0}m
            </div>
            <p className="text-xs text-gray-600">Average interview length</p>
          </CardContent>
        </Card>
      </div>

      {/* Quality Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Interview Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Question Effectiveness</span>
                <span>{analyticsData?.avgQuestionQuality || 0}%</span>
              </div>
              <Progress value={analyticsData?.avgQuestionQuality || 0} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Pain Points Identified</span>
                <span>{analyticsData?.painPointsIdentified || 0}</span>
              </div>
              <Progress value={(analyticsData?.painPointsIdentified || 0) * 10} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Opportunities Found</span>
                <span>{analyticsData?.opportunitiesFound || 0}</span>
              </div>
              <Progress value={(analyticsData?.opportunitiesFound || 0) * 8} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Recent Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData?.recentInsights?.map((insight: string, index: number) => (
                <div key={index} className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pain Points and Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center text-red-700">
              <AlertCircle className="w-4 h-4 mr-2" />
              Top Pain Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData?.topPainPoints?.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.point}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          item.severity === 'high' ? 'text-red-600 bg-red-100' :
                          item.severity === 'medium' ? 'text-yellow-600 bg-yellow-100' :
                          'text-gray-600 bg-gray-100'
                        }`}
                      >
                        {item.severity}
                      </Badge>
                      <span className="text-xs text-gray-600">{item.count} occurrences</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center text-green-700">
              <Target className="w-4 h-4 mr-2" />
              Top Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData?.topOpportunities?.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.opportunity}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          item.impact === 'high' ? 'text-green-600 bg-green-100' :
                          item.impact === 'medium' ? 'text-blue-600 bg-blue-100' :
                          'text-gray-600 bg-gray-100'
                        }`}
                      >
                        {item.impact} impact
                      </Badge>
                      <span className="text-xs text-gray-600">{item.count} mentions</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center">
            <Target className="w-4 h-4 mr-2" />
            Action Items Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analyticsData?.actionItemsCreated || 0}</div>
              <p className="text-sm text-gray-600">Total Action Items</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {analyticsData?.actionItemsCreated ? Math.round(analyticsData.actionItemsCreated * 0.3) : 0}
              </div>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {analyticsData?.actionItemsCreated ? Math.round(analyticsData.actionItemsCreated * 0.1) : 0}
              </div>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
