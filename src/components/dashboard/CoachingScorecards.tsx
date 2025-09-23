import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  MessageCircle, 
  Users, 
  Calendar,
  Clock,
  BarChart3,
  PieChart,
  Download,
  Filter,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  FileText
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, RadialBarChart, RadialBar, PieChart as RechartsPieChart, Pie } from 'recharts';
import type { Recording } from '@/types/recording';
import type { CoachingEvaluation } from '@/utils/coachingEvaluation';
import { useSupportMode } from '@/contexts/SupportContext';
import { analyzeAllSupportSignals } from '@/utils/supportSignals';

interface CoachingScorecardsProps {
  recordings?: Recording[];
}

interface ScorecardData {
  id: string;
  title: string;
  date: string;
  duration: number;
  score: number;
  evaluation: CoachingEvaluation;
  contentType: string;
  status: string;
}

export function CoachingScorecards({ recordings = [] }: CoachingScorecardsProps) {
  const supportMode = useSupportMode();
  
  // Return appropriate component based on mode
  if (supportMode.supportMode) {
    return <SupportQualityScorecards recordings={recordings} />;
  } else {
    return <SalesCoachingScorecards recordings={recordings} />;
  }
}

// Sales Coaching Scorecards Component (existing functionality)
function SalesCoachingScorecards({ recordings = [] }: CoachingScorecardsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [filterScore, setFilterScore] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'title'>('date');
  const [selectedScorecard, setSelectedScorecard] = useState<string | null>(null);

  // Early return for loading state when recordings is undefined or null
  if (recordings === undefined || recordings === null) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-eci-red" />
              <span>Coaching Scorecards</span>
            </CardTitle>
            <CardDescription>
              Loading coaching evaluation data...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eci-red mx-auto mb-4"></div>
              <p className="text-eci-gray-600">Loading coaching scorecards...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Process recordings to extract coaching scorecards
  const scorecards = useMemo(() => {
    // Early return if recordings is not a valid array
    if (!recordings || !Array.isArray(recordings) || recordings.length === 0) {
      return [];
    }

    try {
      const cutoffDate = subDays(new Date(), 
        timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      );

      return recordings
        .filter(r => {
          // Additional safety checks for each recording
          if (!r || typeof r !== 'object') return false;
          
          const recordingDate = new Date(r.created_at);
          return recordingDate >= cutoffDate && 
                 r.coaching_evaluation && 
                 typeof r.coaching_evaluation === 'object' &&
                 'overallScore' in r.coaching_evaluation;
        })
      .map(r => ({
        id: r.id,
        title: r.title || 'Untitled Recording',
        date: r.created_at,
        duration: r.duration || 0,
        score: r.coaching_evaluation!.overallScore,
        evaluation: r.coaching_evaluation as CoachingEvaluation,
        contentType: r.content_type || 'general',
        status: r.status
      }))
      .filter(s => {
        if (filterScore === 'all') return true;
        if (filterScore === 'high') return s.score >= 80;
        if (filterScore === 'medium') return s.score >= 60 && s.score < 80;
        if (filterScore === 'low') return s.score < 60;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'score') return b.score - a.score;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    } catch (error) {
      console.error('Error processing coaching scorecards:', error);
      return [];
    }
  }, [recordings, timeRange, filterScore, sortBy]);

  // Calculate overall statistics
  const stats = useMemo(() => {
    if (!scorecards || scorecards.length === 0) return null;

    try {
      const scores = scorecards.map(s => s.score).filter(score => typeof score === 'number' && !isNaN(score));
      if (scores.length === 0) return null;
      
      const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    
    const scoreDistribution = {
      high: scores.filter(s => s >= 80).length,
      medium: scores.filter(s => s >= 60 && s < 80).length,
      low: scores.filter(s => s < 60).length
    };

      // Calculate criteria averages with safety checks
      const validScorecards = scorecards.filter(s => 
        s && s.evaluation && s.evaluation.criteria && typeof s.evaluation.criteria === 'object'
      );
      
      if (validScorecards.length === 0) return null;
      
      const criteriaStats = {
        talkTimeRatio: Math.round(validScorecards.reduce((sum, s) => {
          const ratio = s.evaluation.criteria.talkTimeRatio;
          return sum + (typeof ratio === 'number' && !isNaN(ratio) ? ratio : 0);
        }, 0) / validScorecards.length),
        objectionHandling: Math.round((validScorecards.reduce((sum, s) => {
          const handling = s.evaluation.criteria.objectionHandling;
          return sum + (typeof handling === 'number' && !isNaN(handling) ? handling : 0);
        }, 0) / validScorecards.length) * 10) / 10,
        discoveryQuestions: Math.round(validScorecards.reduce((sum, s) => {
          const questions = s.evaluation.criteria.discoveryQuestions;
          return sum + (typeof questions === 'number' && !isNaN(questions) ? questions : 0);
        }, 0) / validScorecards.length),
        valueArticulation: Math.round((validScorecards.reduce((sum, s) => {
          const articulation = s.evaluation.criteria.valueArticulation;
          return sum + (typeof articulation === 'number' && !isNaN(articulation) ? articulation : 0);
        }, 0) / validScorecards.length) * 10) / 10,
        activeListening: Math.round((validScorecards.reduce((sum, s) => {
          const listening = s.evaluation.criteria.activeListening;
          return sum + (typeof listening === 'number' && !isNaN(listening) ? listening : 0);
        }, 0) / validScorecards.length) * 10) / 10,
        rapport: Math.round((validScorecards.reduce((sum, s) => {
          const rapport = s.evaluation.criteria.rapport;
          return sum + (typeof rapport === 'number' && !isNaN(rapport) ? rapport : 0);
        }, 0) / validScorecards.length) * 10) / 10
      };

    // Trend data for charts
    const trendData = scorecards
      .slice(-10) // Last 10 recordings
      .map(s => ({
        date: format(new Date(s.date), 'MM/dd'),
        score: s.score,
        name: s.title.length > 20 ? s.title.substring(0, 20) + '...' : s.title
      }));

      return {
        averageScore,
        totalCalls: scorecards.length,
        scoreDistribution,
        criteriaStats,
        trendData
      };
    } catch (error) {
      console.error('Error calculating coaching stats:', error);
      return null;
    }
  }, [scorecards]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins % 60}m`;
    }
    return `${mins}m`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return AlertCircle;
    return AlertCircle;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const exportScorecard = (scorecard: ScorecardData) => {
    const content = `Coaching Scorecard - ${scorecard.title}
Date: ${format(new Date(scorecard.date), 'MMMM d, yyyy')}
Duration: ${formatDuration(scorecard.duration)}
Overall Score: ${scorecard.score}/100

=== CRITERIA BREAKDOWN ===
Talk-Time Ratio: ${scorecard.evaluation.criteria.talkTimeRatio}%
Objection Handling: ${scorecard.evaluation.criteria.objectionHandling}/10
Discovery Questions: ${scorecard.evaluation.criteria.discoveryQuestions}
Value Articulation: ${scorecard.evaluation.criteria.valueArticulation}/10
Active Listening: ${scorecard.evaluation.criteria.activeListening}/10
Next Steps Established: ${scorecard.evaluation.criteria.nextSteps ? 'Yes' : 'No'}
Rapport Building: ${scorecard.evaluation.criteria.rapport}/10

=== STRENGTHS ===
${scorecard.evaluation.strengths.map(s => `• ${s}`).join('\n')}

=== AREAS FOR IMPROVEMENT ===
${scorecard.evaluation.improvements.map(i => `• ${i}`).join('\n')}

=== ACTION ITEMS ===
${scorecard.evaluation.actionItems.map(a => `• ${a}`).join('\n')}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coaching-scorecard-${scorecard.title.replace(/[^a-z0-9]/gi, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (scorecards.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-eci-red" />
              <span>Coaching Scorecards</span>
            </CardTitle>
            <CardDescription>
              Detailed coaching evaluation breakdowns for your sales calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <PieChart className="w-16 h-16 mx-auto mb-4 text-eci-gray-300" />
              <h3 className="text-xl font-semibold text-eci-gray-800 mb-2">No Coaching Data Available</h3>
              <p className="text-eci-gray-600 mb-4">
                Enable coaching analysis on your recordings to see detailed scorecards here
              </p>
              <p className="text-sm text-eci-gray-500">
                Upload sales call recordings with coaching enabled to start seeing performance insights
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedScorecardData = selectedScorecard ? scorecards.find(s => s.id === selectedScorecard) : null;

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-eci-red" />
            Coaching Scorecards
          </h2>
          <p className="text-eci-gray-600">Detailed performance analysis for {stats?.totalCalls} calls</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterScore} onValueChange={(value: any) => setFilterScore(value)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scores</SelectItem>
              <SelectItem value="high">High (80+)</SelectItem>
              <SelectItem value="medium">Medium (60-79)</SelectItem>
              <SelectItem value="low">Low (&lt;60)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="score">Sort by Score</SelectItem>
              <SelectItem value="title">Sort by Title</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overall Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                  <p className={`text-3xl font-bold ${stats.averageScore >= 80 ? 'text-green-600' : stats.averageScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {stats.averageScore}
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">High Performers</p>
                  <p className="text-3xl font-bold text-green-600">{stats.scoreDistribution.high}</p>
                  <p className="text-xs text-muted-foreground">80+ score</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Need Coaching</p>
                  <p className="text-3xl font-bold text-red-600">{stats.scoreDistribution.low}</p>
                  <p className="text-xs text-muted-foreground">&lt;60 score</p>
                </div>
                <Target className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalCalls}</p>
                </div>
                <MessageCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scorecards List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Individual Scorecards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {scorecards.map((scorecard) => {
                  const ScoreIcon = getScoreIcon(scorecard.score);
                  return (
                    <div
                      key={scorecard.id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                        selectedScorecard === scorecard.id ? 'border-eci-blue bg-eci-blue/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedScorecard(selectedScorecard === scorecard.id ? null : scorecard.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900 truncate">{scorecard.title}</h4>
                            <Badge className={`${getScoreColor(scorecard.score)} border`}>
                              {scorecard.score}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(scorecard.date), 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(scorecard.duration)}
                            </span>
                            <span className="capitalize">{scorecard.contentType.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportScorecard(scorecard);
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                            selectedScorecard === scorecard.id ? 'rotate-90' : ''
                          }`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Charts */}
        <div className="space-y-6">
          {/* Score Trend Chart */}
          {stats && stats.trendData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Score Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stats.trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis domain={[0, 100]} fontSize={12} />
                    <Tooltip 
                      formatter={(value) => [`${value} score`, 'Score']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Criteria Breakdown */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Average Criteria Scores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Talk-Time Ratio</span>
                    <span className={stats.criteriaStats.talkTimeRatio >= 30 && stats.criteriaStats.talkTimeRatio <= 40 ? 'text-green-600' : 'text-yellow-600'}>
                      {stats.criteriaStats.talkTimeRatio}%
                    </span>
                  </div>
                  <Progress value={stats.criteriaStats.talkTimeRatio} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Objection Handling</span>
                    <span>{stats.criteriaStats.objectionHandling}/10</span>
                  </div>
                  <Progress value={stats.criteriaStats.objectionHandling * 10} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Value Articulation</span>
                    <span>{stats.criteriaStats.valueArticulation}/10</span>
                  </div>
                  <Progress value={stats.criteriaStats.valueArticulation * 10} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Active Listening</span>
                    <span>{stats.criteriaStats.activeListening}/10</span>
                  </div>
                  <Progress value={stats.criteriaStats.activeListening * 10} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Discovery Questions</span>
                    <span>{stats.criteriaStats.discoveryQuestions} avg</span>
                  </div>
                  <Progress value={Math.min(stats.criteriaStats.discoveryQuestions * 10, 100)} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Rapport Building</span>
                    <span>{stats.criteriaStats.rapport}/10</span>
                  </div>
                  <Progress value={stats.criteriaStats.rapport * 10} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Detailed Scorecard View */}
      {selectedScorecardData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Detailed Analysis: {selectedScorecardData.title}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportScorecard(selectedScorecardData)}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Criteria Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-600 mb-1">Talk-Time Ratio</h4>
                <p className="text-2xl font-bold">{selectedScorecardData.evaluation.criteria.talkTimeRatio}%</p>
                <p className="text-xs text-gray-500">
                  {selectedScorecardData.evaluation.criteria.talkTimeRatio >= 30 && selectedScorecardData.evaluation.criteria.talkTimeRatio <= 40 
                    ? 'Optimal range' : 'Needs adjustment'}
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-600 mb-1">Objection Handling</h4>
                <p className="text-2xl font-bold">{selectedScorecardData.evaluation.criteria.objectionHandling}/10</p>
                <Progress value={selectedScorecardData.evaluation.criteria.objectionHandling * 10} className="h-1 mt-1" />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-600 mb-1">Value Articulation</h4>
                <p className="text-2xl font-bold">{selectedScorecardData.evaluation.criteria.valueArticulation}/10</p>
                <Progress value={selectedScorecardData.evaluation.criteria.valueArticulation * 10} className="h-1 mt-1" />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-600 mb-1">Discovery Questions</h4>
                <p className="text-2xl font-bold">{selectedScorecardData.evaluation.criteria.discoveryQuestions}</p>
                <p className="text-xs text-gray-500">Questions asked</p>
              </div>
            </div>

            {/* Strengths and Improvements */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Strengths
                </h4>
                <div className="space-y-2">
                  {selectedScorecardData.evaluation.strengths.map((strength, index) => (
                    <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-800">{strength}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-orange-600 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Areas for Improvement
                </h4>
                <div className="space-y-2">
                  {selectedScorecardData.evaluation.improvements.map((improvement, index) => (
                    <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-sm text-orange-800">{improvement}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Items */}
            {selectedScorecardData.evaluation.actionItems.length > 0 && (
              <div>
                <h4 className="font-semibold text-blue-600 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Action Items for Next Call
                </h4>
                <div className="space-y-2">
                  {selectedScorecardData.evaluation.actionItems.map((item, index) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Responses */}
            {selectedScorecardData.evaluation.suggestedResponses.length > 0 && (
              <div>
                <h4 className="font-semibold text-purple-600 mb-3">Suggested Response Improvements</h4>
                <div className="space-y-4">
                  {selectedScorecardData.evaluation.suggestedResponses.map((response, index) => (
                    <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h5 className="font-medium text-purple-800 mb-2">Situation: {response.situation}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="p-2 bg-red-50 rounded border border-red-200">
                          <p className="font-medium text-red-700 mb-1">Current Response:</p>
                          <p className="text-red-600">{response.currentResponse}</p>
                        </div>
                        <div className="p-2 bg-green-50 rounded border border-green-200">
                          <p className="font-medium text-green-700 mb-1">Improved Response:</p>
                          <p className="text-green-600">{response.improvedResponse}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Support Quality Scorecards Component
function SupportQualityScorecards({ recordings = [] }: CoachingScorecardsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [filterQuality, setFilterQuality] = useState<'all' | 'excellent' | 'good' | 'needs_improvement'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'satisfaction' | 'title'>('date');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Early return for loading state when recordings is undefined or null
  if (recordings === undefined || recordings === null) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>Support Quality Scorecards</span>
            </CardTitle>
            <CardDescription>
              Loading support quality evaluation data...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Filter recordings for support analysis
  const supportRecordings = recordings.filter(r => 
    r.status === 'completed' && (r.support_analysis || r.transcript)
  );

  // Generate support scorecards data
  const supportScorecards = React.useMemo(() => {
    return supportRecordings.map(recording => {
      // Get or generate support analysis
      let analysis;
      if (recording.support_analysis) {
        analysis = typeof recording.support_analysis === 'string' 
          ? JSON.parse(recording.support_analysis)
          : recording.support_analysis;
      } else if (recording.transcript) {
        analysis = analyzeAllSupportSignals(recording);
      }

      const satisfaction = analysis?.customerSatisfaction || 0;
      const escalationRisk = analysis?.escalationRisk || 'low';
      
      return {
        id: recording.id,
        title: recording.title || 'Untitled Support Call',
        date: recording.created_at,
        duration: recording.duration || 0,
        satisfaction,
        escalationRisk,
        analysis,
        agent: 'Support Agent', // Could be extracted from metadata
        resolutionStatus: analysis?.performanceMetrics?.callResolutionStatus || 'resolved'
      };
    });
  }, [supportRecordings]);

  // Filter data based on time range
  const cutoffDate = subDays(new Date(), timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90);
  const filteredScorecards = supportScorecards.filter(scorecard => {
    const recordingDate = new Date(scorecard.date);
    return recordingDate >= cutoffDate;
  });

  // Calculate aggregate metrics
  const aggregateMetrics = React.useMemo(() => {
    if (filteredScorecards.length === 0) {
      return {
        avgSatisfaction: 0,
        avgFCR: 0,
        avgCES: 0,
        escalationDistribution: { low: 0, medium: 0, high: 0 },
        resolutionDistribution: { resolved: 0, pending: 0, escalated: 0, follow_up: 0 },
        qualityTrend: []
      };
    }

    const totalSatisfaction = filteredScorecards.reduce((sum, s) => sum + s.satisfaction, 0);
    const totalFCR = filteredScorecards.reduce((sum, s) => sum + (s.analysis?.performanceMetrics?.firstContactResolution || 0), 0);
    const totalCES = filteredScorecards.reduce((sum, s) => sum + (s.analysis?.performanceMetrics?.customerEffortScore || 0), 0);
    
    const escalationCounts = { low: 0, medium: 0, high: 0 };
    const resolutionCounts = { resolved: 0, pending: 0, escalated: 0, follow_up: 0 };
    
    filteredScorecards.forEach(scorecard => {
      escalationCounts[scorecard.escalationRisk]++;
      resolutionCounts[scorecard.resolutionStatus]++;
    });

    // Generate trend data for the last 7 days
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayRecordings = filteredScorecards.filter(s => 
        new Date(s.date).toDateString() === date.toDateString()
      );
      
      const avgSatisfactionForDay = dayRecordings.length > 0 
        ? dayRecordings.reduce((sum, s) => sum + s.satisfaction, 0) / dayRecordings.length
        : 0;

      trendData.push({
        date: format(date, 'MMM dd'),
        satisfaction: Math.round(avgSatisfactionForDay),
        calls: dayRecordings.length
      });
    }

    return {
      avgSatisfaction: Math.round(totalSatisfaction / filteredScorecards.length),
      avgFCR: Math.round(totalFCR / filteredScorecards.length),
      avgCES: Math.round(totalCES / filteredScorecards.length),
      escalationDistribution: escalationCounts,
      resolutionDistribution: resolutionCounts,
      qualityTrend: trendData
    };
  }, [filteredScorecards]);

  // Sort scorecards
  const sortedScorecards = React.useMemo(() => {
    return [...filteredScorecards].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'satisfaction':
          return b.satisfaction - a.satisfaction;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }, [filteredScorecards, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Support Quality Scorecards</span>
          </CardTitle>
          <CardDescription>
            Individual support agent performance and customer service quality analysis
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Select value={timeRange} onValueChange={(value: '7d' | '30d' | '90d') => setTimeRange(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={filterQuality} onValueChange={(value: any) => setFilterQuality(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quality Levels</SelectItem>
                    <SelectItem value="excellent">Excellent (90%+)</SelectItem>
                    <SelectItem value="good">Good (70-89%)</SelectItem>
                    <SelectItem value="needs_improvement">Needs Improvement (&lt;70%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="satisfaction">Satisfaction</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Satisfaction</p>
                <p className="text-2xl font-bold text-blue-600">{aggregateMetrics.avgSatisfaction}%</p>
              </div>
              <Star className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg FCR Rate</p>
                <p className="text-2xl font-bold text-emerald-600">{aggregateMetrics.avgFCR}%</p>
              </div>
              <Target className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg CES Score</p>
                <p className="text-2xl font-bold text-purple-600">{aggregateMetrics.avgCES}%</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Calls</p>
                <p className="text-2xl font-bold text-gray-700">{filteredScorecards.length}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Support Quality Trend</CardTitle>
          <CardDescription>Customer satisfaction trends over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aggregateMetrics.qualityTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'satisfaction' ? `${value}%` : value,
                    name === 'satisfaction' ? 'Satisfaction' : 'Calls'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="satisfaction" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Individual Scorecards */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Support Call Scorecards</CardTitle>
          <CardDescription>
            Detailed quality analysis for each support interaction ({sortedScorecards.length} calls)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedScorecards.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Support Calls Found</h3>
              <p className="text-gray-500">No support calls found for the selected time period and filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedScorecards.map((scorecard) => (
                <div
                  key={scorecard.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedAgent(selectedAgent === scorecard.id ? null : scorecard.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900">{scorecard.title}</h4>
                        <Badge variant={
                          scorecard.satisfaction >= 90 ? 'default' :
                          scorecard.satisfaction >= 70 ? 'secondary' : 'destructive'
                        }>
                          {scorecard.satisfaction >= 90 ? 'Excellent' :
                           scorecard.satisfaction >= 70 ? 'Good' : 'Needs Improvement'}
                        </Badge>
                        <Badge variant={
                          scorecard.escalationRisk === 'low' ? 'default' :
                          scorecard.escalationRisk === 'medium' ? 'secondary' : 'destructive'
                        }>
                          {scorecard.escalationRisk.toUpperCase()} Risk
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>{format(new Date(scorecard.date), 'MMM dd, yyyy')}</span>
                        <span>•</span>
                        <span>{Math.floor(scorecard.duration / 60)}:{(scorecard.duration % 60).toString().padStart(2, '0')}</span>
                        <span>•</span>
                        <span>{scorecard.agent}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{scorecard.satisfaction}%</div>
                        <div className="text-xs text-gray-500">Satisfaction</div>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                        selectedAgent === scorecard.id ? 'rotate-90' : ''
                      }`} />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedAgent === scorecard.id && scorecard.analysis && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* SERVQUAL Metrics */}
                        <div>
                          <h5 className="font-medium mb-2">SERVQUAL Metrics</h5>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Empathy</span>
                              <span className="font-medium">{scorecard.analysis.servqualMetrics?.empathy || 0}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Assurance</span>
                              <span className="font-medium">{scorecard.analysis.servqualMetrics?.assurance || 0}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Responsiveness</span>
                              <span className="font-medium">{scorecard.analysis.servqualMetrics?.responsiveness || 0}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Performance Metrics */}
                        <div>
                          <h5 className="font-medium mb-2">Performance</h5>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">FCR Rate</span>
                              <span className="font-medium">{scorecard.analysis.performanceMetrics?.firstContactResolution || 0}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">CES Score</span>
                              <span className="font-medium">{scorecard.analysis.performanceMetrics?.customerEffortScore || 0}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Resolution</span>
                              <span className={`font-medium capitalize ${
                                scorecard.resolutionStatus === 'resolved' ? 'text-green-600' :
                                scorecard.resolutionStatus === 'pending' ? 'text-yellow-600' :
                                scorecard.resolutionStatus === 'escalated' ? 'text-red-600' : 'text-blue-600'
                              }`}>
                                {scorecard.resolutionStatus}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quality Indicators */}
                        <div>
                          <h5 className="font-medium mb-2">Quality Indicators</h5>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${
                                scorecard.analysis.journeyAnalysis?.customerEducationProvided ? 'bg-green-500' : 'bg-gray-300'
                              }`}></div>
                              <span className="text-sm">Customer Education</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${
                                scorecard.analysis.journeyAnalysis?.followUpPlanning ? 'bg-blue-500' : 'bg-gray-300'
                              }`}></div>
                              <span className="text-sm">Follow-up Planned</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Solution Clarity</span>
                              <span className="font-medium">{scorecard.analysis.journeyAnalysis?.solutionClarityScore || 0}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}