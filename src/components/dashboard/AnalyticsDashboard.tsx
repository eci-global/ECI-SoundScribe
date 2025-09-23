
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Users, Clock, Target, Star } from 'lucide-react';
import type { Recording } from '@/types/recording';
import { 
  getTalkTimeRatio, 
  getObjectionHandling, 
  getDiscoveryQuestions, 
  getValueArticulation, 
  getActiveListening, 
  getNextSteps, 
  getRapport 
} from '@/utils/coachingAccessors';
import { useSupportMode } from '@/contexts/SupportContext';
import { analyzeAllSupportSignals } from '@/utils/supportSignals';

interface AnalyticsDashboardProps {
  recordings: Recording[];
}

export function AnalyticsDashboard({ recordings }: AnalyticsDashboardProps) {
  const supportMode = useSupportMode();
  
  // Return appropriate component based on mode
  if (supportMode.supportMode) {
    return <SupportAnalyticsOverview recordings={recordings} />;
  } else {
    return <SalesAnalyticsOverview recordings={recordings} />;
  }
}

// Sales Analytics Overview Component
function SalesAnalyticsOverview({ recordings }: AnalyticsDashboardProps) {
  // Filter completed recordings with coaching evaluations
  const completedRecordings = recordings.filter(
    r => r.status === 'completed' && r.coaching_evaluation
  );

  // Calculate overall statistics
  const totalCalls = recordings.length;
  const completedCalls = completedRecordings.length;
  const avgScore = completedRecordings.length > 0 
    ? Math.round(completedRecordings.reduce((sum, r) => sum + (r.coaching_evaluation?.overallScore || 0), 0) / completedRecordings.length)
    : 0;

  // Calculate skill averages
  const skillAverages = React.useMemo(() => {
    if (completedRecordings.length === 0) {
      return {
        talkTime: 0,
        objectionHandling: 0,
        discovery: 0,
        valueArticulation: 0,
        activeListening: 0,
        rapport: 0
      };
    }

    return {
      talkTime: Math.round(completedRecordings.reduce((sum, r) => 
        sum + getTalkTimeRatio(r.coaching_evaluation), 0) / completedRecordings.length),
      objectionHandling: Math.round(completedRecordings.reduce((sum, r) => 
        sum + getObjectionHandling(r.coaching_evaluation), 0) / completedRecordings.length),
      discovery: Math.round(completedRecordings.reduce((sum, r) => 
        sum + getDiscoveryQuestions(r.coaching_evaluation), 0) / completedRecordings.length),
      valueArticulation: Math.round(completedRecordings.reduce((sum, r) => 
        sum + getValueArticulation(r.coaching_evaluation), 0) / completedRecordings.length),
      activeListening: Math.round(completedRecordings.reduce((sum, r) => 
        sum + getActiveListening(r.coaching_evaluation), 0) / completedRecordings.length),
      rapport: Math.round(completedRecordings.reduce((sum, r) => 
        sum + getRapport(r.coaching_evaluation), 0) / completedRecordings.length)
    };
  }, [completedRecordings]);

  // Recent performance trend (last 5 recordings vs previous 5)
  const recentTrend = React.useMemo(() => {
    if (completedRecordings.length < 2) return 0;
    
    const sorted = [...completedRecordings].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    const recent = sorted.slice(0, Math.min(5, sorted.length));
    const previous = sorted.slice(5, Math.min(10, sorted.length));
    
    if (previous.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, r) => sum + (r.coaching_evaluation?.overallScore || 0), 0) / recent.length;
    const previousAvg = previous.reduce((sum, r) => sum + (r.coaching_evaluation?.overallScore || 0), 0) / previous.length;
    
    return Math.round(((recentAvg - previousAvg) / previousAvg) * 100);
  }, [completedRecordings]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gong-gray">Analytics Dashboard</h1>
        <p className="text-gong-gray-lighter mt-2">Performance insights and coaching analytics</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              {completedCalls} analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {recentTrend > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">+{recentTrend}%</span>
                </>
              ) : recentTrend < 0 ? (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                  <span className="text-red-600">{recentTrend}%</span>
                </>
              ) : (
                <span>No change</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recordings.filter(r => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(r.created_at) > weekAgo;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              calls recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedRecordings.length > 0 
                ? Math.max(...completedRecordings.map(r => r.coaching_evaluation?.overallScore || 0))
                : 0
              }
            </div>
            <p className="text-xs text-muted-foreground">
              best score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Skills Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Skills Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Talk Time Ratio</span>
                  <span>{skillAverages.talkTime}%</span>
                </div>
                <Progress value={skillAverages.talkTime} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Objection Handling</span>
                  <span>{skillAverages.objectionHandling}/10</span>
                </div>
                <Progress value={skillAverages.objectionHandling * 10} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Discovery Questions</span>
                  <span>{skillAverages.discovery}/10</span>
                </div>
                <Progress value={skillAverages.discovery * 10} className="h-2" />
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Value Articulation</span>
                  <span>{skillAverages.valueArticulation}/10</span>
                </div>
                <Progress value={skillAverages.valueArticulation * 10} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Active Listening</span>
                  <span>{skillAverages.activeListening}/10</span>
                </div>
                <Progress value={skillAverages.activeListening * 10} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Rapport Building</span>
                  <span>{skillAverages.rapport}/10</span>
                </div>
                <Progress value={skillAverages.rapport * 10} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {completedRecordings.length === 0 ? (
            <div className="text-center py-8 text-gong-gray-lighter">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No analyzed calls yet</p>
              <p className="text-sm">Upload and analyze some calls to see performance insights</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedRecordings
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5)
                .map((recording) => (
                  <div key={recording.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{recording.title}</h3>
                      <p className="text-sm text-gong-gray-lighter">
                        {new Date(recording.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gong-purple">
                        {recording.coaching_evaluation?.overallScore || 0}
                      </div>
                      <div className="text-xs text-gong-gray-lighter">
                        Talk: {getTalkTimeRatio(recording.coaching_evaluation)}%
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Support Analytics Overview Component
function SupportAnalyticsOverview({ recordings }: AnalyticsDashboardProps) {
  // Filter completed recordings with support analysis or transcript
  const supportRecordings = recordings.filter(
    r => r.status === 'completed' && (r.support_analysis || r.transcript)
  );

  // Calculate support analytics across all recordings
  const supportMetrics = React.useMemo(() => {
    if (supportRecordings.length === 0) {
      return {
        totalCalls: 0,
        avgSatisfaction: 0,
        avgFCR: 0,
        avgAHT: 0,
        avgCES: 0,
        escalationRiskDistribution: { low: 0, medium: 0, high: 0 },
        qualityMetrics: {
          communication: 0,
          problemSolving: 0,
          deEscalation: 0,
          knowledge: 0,
          compliance: 0
        },
        journeyMetrics: {
          issueIdentificationSpeed: 0,
          rootCauseDepth: 0,
          solutionClarity: 0,
          customerEducation: 0,
          followUpPlanning: 0
        }
      };
    }

    let totalSatisfaction = 0;
    let totalFCR = 0;
    let totalAHT = 0;
    let totalCES = 0;
    let escalationCounts = { low: 0, medium: 0, high: 0 };
    let qualityTotals = { communication: 0, problemSolving: 0, deEscalation: 0, knowledge: 0, compliance: 0 };
    let journeyTotals = { issueIdentificationSpeed: 0, rootCauseDepth: 0, solutionClarity: 0, customerEducation: 0, followUpPlanning: 0 };

    supportRecordings.forEach(recording => {
      // Get or generate support analysis
      let analysis;
      if (recording.support_analysis) {
        analysis = typeof recording.support_analysis === 'string' 
          ? JSON.parse(recording.support_analysis)
          : recording.support_analysis;
      } else if (recording.transcript) {
        // Generate analysis from transcript
        analysis = analyzeAllSupportSignals(recording);
      }

      if (analysis) {
        totalSatisfaction += analysis.customerSatisfaction || 0;
        totalFCR += analysis.performanceMetrics?.firstContactResolution || 0;
        totalAHT += analysis.performanceMetrics?.averageHandleTime || 0;
        totalCES += analysis.performanceMetrics?.customerEffortScore || 0;
        escalationCounts[analysis.escalationRisk || 'low']++;

        // Quality metrics
        if (analysis.qualityMetrics) {
          qualityTotals.communication += analysis.qualityMetrics.communicationSkills || 0;
          qualityTotals.problemSolving += analysis.qualityMetrics.problemSolvingEffectiveness || 0;
          qualityTotals.deEscalation += analysis.qualityMetrics.deEscalationTechniques || 0;
          qualityTotals.knowledge += analysis.qualityMetrics.knowledgeBaseUsage || 0;
          qualityTotals.compliance += analysis.qualityMetrics.complianceAdherence || 0;
        }

        // Journey metrics
        if (analysis.journeyAnalysis) {
          journeyTotals.issueIdentificationSpeed += analysis.journeyAnalysis.issueIdentificationSpeed || 0;
          journeyTotals.rootCauseDepth += analysis.journeyAnalysis.rootCauseAnalysisDepth || 0;
          journeyTotals.solutionClarity += analysis.journeyAnalysis.solutionClarityScore || 0;
          journeyTotals.customerEducation += analysis.journeyAnalysis.customerEducationProvided ? 100 : 0;
          journeyTotals.followUpPlanning += analysis.journeyAnalysis.followUpPlanning ? 100 : 0;
        }
      }
    });

    const recordingCount = supportRecordings.length;
    return {
      totalCalls: recordings.length,
      avgSatisfaction: Math.round(totalSatisfaction / recordingCount),
      avgFCR: Math.round(totalFCR / recordingCount),
      avgAHT: Math.round(totalAHT / recordingCount),
      avgCES: Math.round(totalCES / recordingCount),
      escalationRiskDistribution: escalationCounts,
      qualityMetrics: {
        communication: Math.round(qualityTotals.communication / recordingCount),
        problemSolving: Math.round(qualityTotals.problemSolving / recordingCount),
        deEscalation: Math.round(qualityTotals.deEscalation / recordingCount),
        knowledge: Math.round(qualityTotals.knowledge / recordingCount),
        compliance: Math.round(qualityTotals.compliance / recordingCount)
      },
      journeyMetrics: {
        issueIdentificationSpeed: Math.round(journeyTotals.issueIdentificationSpeed / recordingCount),
        rootCauseDepth: Math.round(journeyTotals.rootCauseDepth / recordingCount),
        solutionClarity: Math.round(journeyTotals.solutionClarity / recordingCount),
        customerEducation: Math.round(journeyTotals.customerEducation / recordingCount),
        followUpPlanning: Math.round(journeyTotals.followUpPlanning / recordingCount)
      }
    };
  }, [supportRecordings]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-eci-gray-800 mb-2">Support Performance Overview</h2>
        <p className="text-gong-gray-lighter mt-2">Customer service insights and quality analytics</p>
      </div>

      {/* Core Performance KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Support Calls</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supportMetrics.totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              {supportRecordings.length} analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Customer Satisfaction</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{supportMetrics.avgSatisfaction}%</div>
            <p className="text-xs text-muted-foreground">
              Customer satisfaction score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">First Contact Resolution</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{supportMetrics.avgFCR}%</div>
            <p className="text-xs text-muted-foreground">
              FCR Rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Effort Score</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{supportMetrics.avgCES}%</div>
            <p className="text-xs text-muted-foreground">
              CES Rating
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quality Metrics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Support Quality Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Communication Skills</span>
                  <span className="text-sm font-medium">{supportMetrics.qualityMetrics.communication}%</span>
                </div>
                <Progress value={supportMetrics.qualityMetrics.communication} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Problem Solving</span>
                  <span className="text-sm font-medium">{supportMetrics.qualityMetrics.problemSolving}%</span>
                </div>
                <Progress value={supportMetrics.qualityMetrics.problemSolving} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">De-escalation</span>
                  <span className="text-sm font-medium">{supportMetrics.qualityMetrics.deEscalation}%</span>
                </div>
                <Progress value={supportMetrics.qualityMetrics.deEscalation} className="h-2" />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Knowledge Usage</span>
                  <span className="text-sm font-medium">{supportMetrics.qualityMetrics.knowledge}%</span>
                </div>
                <Progress value={supportMetrics.qualityMetrics.knowledge} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Compliance</span>
                  <span className="text-sm font-medium">{supportMetrics.qualityMetrics.compliance}%</span>
                </div>
                <Progress value={supportMetrics.qualityMetrics.compliance} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Journey Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-500" />
            Customer Journey Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{supportMetrics.journeyMetrics.issueIdentificationSpeed}%</div>
              <div className="text-xs text-muted-foreground mt-1">Issue ID Speed</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{supportMetrics.journeyMetrics.rootCauseDepth}%</div>
              <div className="text-xs text-muted-foreground mt-1">Root Cause Analysis</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">{supportMetrics.journeyMetrics.solutionClarity}%</div>
              <div className="text-xs text-muted-foreground mt-1">Solution Clarity</div>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <div className="text-lg font-bold text-emerald-600">{supportMetrics.journeyMetrics.customerEducation}%</div>
              <div className="text-xs text-muted-foreground mt-1">Customer Education</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-lg font-bold text-orange-600">{supportMetrics.journeyMetrics.followUpPlanning}%</div>
              <div className="text-xs text-muted-foreground mt-1">Follow-up Planning</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Escalation Risk Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Escalation Risk Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{supportMetrics.escalationRiskDistribution.low}</div>
              <div className="text-sm text-muted-foreground">Low Risk</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{supportMetrics.escalationRiskDistribution.medium}</div>
              <div className="text-sm text-muted-foreground">Medium Risk</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">{supportMetrics.escalationRiskDistribution.high}</div>
              <div className="text-sm text-muted-foreground">High Risk</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
