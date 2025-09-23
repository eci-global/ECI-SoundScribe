import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  GraduationCap, 
  TrendingUp, 
  Target, 
  Award, 
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Calendar,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  BDRTrainingDashboard as BDRDashboardData,
  BDRTrainingProgress,
  BDRScorecardEvaluation,
  BDR_COMPETENCY_LEVELS 
} from '@/types/bdr-training';
import type { Recording } from '@/types/recording';

interface BDRTrainingDashboardProps {
  recordings: Recording[];
  className?: string;
}

const BDRTrainingDashboard: React.FC<BDRTrainingDashboardProps> = ({ 
  recordings, 
  className 
}) => {
  const [dashboardData, setDashboardData] = useState<BDRDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, recordings]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load user's training progress
      const { data: progressData, error: progressError } = await supabase
        .from('bdr_training_progress')
        .select(`
          *,
          bdr_training_programs(*)
        `)
        .eq('user_id', user.id);

      if (progressError) {
        console.error('Error loading progress:', progressError);
        return;
      }

      // Load recent evaluations
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from('bdr_scorecard_evaluations')
        .select(`
          *,
          recordings(title, created_at),
          bdr_training_programs(name)
        `)
        .eq('user_id', user.id)
        .order('evaluated_at', { ascending: false })
        .limit(10);

      if (evaluationsError) {
        console.error('Error loading evaluations:', evaluationsError);
        return;
      }

      // Load upcoming coaching sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('bdr_coaching_sessions')
        .select('*')
        .eq('trainee_id', user.id)
        .in('status', ['scheduled'])
        .order('scheduled_at', { ascending: true })
        .limit(5);

      if (sessionsError) {
        console.error('Error loading sessions:', sessionsError);
      }

      // Build dashboard data
      const programs = progressData?.map(progress => ({
        program: progress.bdr_training_programs,
        progress: progress as BDRTrainingProgress,
        recentEvaluations: evaluationsData?.filter(e => 
          e.training_program_id === progress.training_program_id
        ).slice(0, 3) as BDRScorecardEvaluation[] || [],
        upcomingSessions: sessionsData?.filter(s => 
          s.training_program_id === progress.training_program_id
        ) || []
      })) || [];

      const totalCalls = evaluationsData?.length || 0;
      const completedPrograms = progressData?.filter(p => p.status === 'completed').length || 0;
      const inProgressPrograms = progressData?.filter(p => p.status === 'in_progress').length || 0;
      const averageScore = evaluationsData && evaluationsData.length > 0
        ? evaluationsData.reduce((sum, e) => sum + e.overall_score, 0) / evaluationsData.length
        : 0;

      // Calculate improvement trend
      const recentScores = evaluationsData?.slice(0, 5).map(e => e.overall_score) || [];
      const olderScores = evaluationsData?.slice(5, 10).map(e => e.overall_score) || [];
      const recentAvg = recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0;
      const olderAvg = olderScores.length > 0 ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length : 0;
      const improvementTrend = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

      const dashboard: BDRDashboardData = {
        userId: user.id,
        programs,
        overallProgress: {
          totalPrograms: progressData?.length || 0,
          completedPrograms,
          inProgressPrograms,
          totalCalls,
          averageScore,
          improvementTrend
        },
        recentActivity: evaluationsData?.slice(0, 5).map(e => ({
          type: 'evaluation' as const,
          title: `BDR Evaluation Completed`,
          description: `Scored ${e.overall_score.toFixed(1)}% on ${e.recordings?.title || 'call'}`,
          timestamp: e.evaluated_at,
          metadata: { score: e.overall_score, programId: e.training_program_id }
        })) || []
      };

      setDashboardData(dashboard);
      
      // Set default selected program
      if (programs.length > 0 && !selectedProgramId) {
        setSelectedProgramId(programs[0].program.id);
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompetencyLevel = (score: number) => {
    if (score >= BDR_COMPETENCY_LEVELS.ADVANCED.min) return BDR_COMPETENCY_LEVELS.ADVANCED;
    if (score >= BDR_COMPETENCY_LEVELS.PROFICIENT.min) return BDR_COMPETENCY_LEVELS.PROFICIENT;
    if (score >= BDR_COMPETENCY_LEVELS.DEVELOPING.min) return BDR_COMPETENCY_LEVELS.DEVELOPING;
    return BDR_COMPETENCY_LEVELS.NOVICE;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Play className="h-4 w-4 text-blue-600" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: 'Completed', variant: 'default' as const },
      in_progress: { label: 'In Progress', variant: 'secondary' as const },
      paused: { label: 'Paused', variant: 'outline' as const },
      not_started: { label: 'Not Started', variant: 'outline' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card className={cn("border-purple-200", className)}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading BDR training data...</span>
        </CardContent>
      </Card>
    );
  }

  if (!dashboardData || dashboardData.programs.length === 0) {
    return (
      <Card className={cn("border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50", className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">BDR Training</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-center py-8">
          <GraduationCap className="h-12 w-12 text-purple-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No BDR Training Programs
          </h3>
          <p className="text-gray-600 mb-4">
            You're not enrolled in any BDR training programs yet. Contact your manager to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedProgram = dashboardData.programs.find(p => p.program.id === selectedProgramId) || dashboardData.programs[0];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overall Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Overall Score</p>
                <p className="text-2xl font-bold">
                  {dashboardData.overallProgress.averageScore.toFixed(1)}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Programs Active</p>
                <p className="text-2xl font-bold text-blue-600">
                  {dashboardData.overallProgress.inProgressPrograms}
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Calls</p>
                <p className="text-2xl font-bold text-green-600">
                  {dashboardData.overallProgress.totalCalls}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Improvement</p>
                <p className={cn("text-2xl font-bold", 
                  dashboardData.overallProgress.improvementTrend >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {dashboardData.overallProgress.improvementTrend >= 0 ? '+' : ''}
                  {dashboardData.overallProgress.improvementTrend.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className={cn("h-8 w-8", 
                dashboardData.overallProgress.improvementTrend >= 0 ? "text-green-600" : "text-red-600"
              )} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Program Selection Tabs */}
      {dashboardData.programs.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {dashboardData.programs.map(programData => (
                <Button
                  key={programData.program.id}
                  variant={selectedProgramId === programData.program.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedProgramId(programData.program.id)}
                >
                  {programData.program.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Program Details */}
      {selectedProgram && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Program Progress */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  {selectedProgram.program.name}
                </CardTitle>
                {getStatusBadge(selectedProgram.progress.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{selectedProgram.progress.completionPercentage.toFixed(0)}%</span>
                </div>
                <Progress value={selectedProgram.progress.completionPercentage} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Calls Completed</p>
                  <p className="font-medium">{selectedProgram.progress.callsCompleted}</p>
                </div>
                <div>
                  <p className="text-gray-600">Target</p>
                  <p className="font-medium">{selectedProgram.program.minimumCallsRequired}</p>
                </div>
                <div>
                  <p className="text-gray-600">Best Score</p>
                  <p className="font-medium">
                    {selectedProgram.progress.bestScore?.toFixed(1) || '-'}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Threshold</p>
                  <p className="font-medium">{selectedProgram.program.targetScoreThreshold}%</p>
                </div>
              </div>

              {selectedProgram.progress.averageScore && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Current Level</p>
                      <p className="text-lg font-bold text-purple-900">
                        {getCompetencyLevel(selectedProgram.progress.averageScore).label}
                      </p>
                    </div>
                    <Award className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Evaluations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Recent Evaluations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedProgram.recentEvaluations.length > 0 ? (
                  selectedProgram.recentEvaluations.map((evaluation) => (
                    <div key={evaluation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {evaluation.recordings?.title || 'BDR Call'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(evaluation.evaluatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-bold", 
                          evaluation.overallScore >= 75 ? "text-green-600" : 
                          evaluation.overallScore >= 60 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {evaluation.overallScore.toFixed(1)}%
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {getCompetencyLevel(evaluation.overallScore).label}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No evaluations yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      {dashboardData.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-xs text-gray-600">{activity.description}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BDRTrainingDashboard;