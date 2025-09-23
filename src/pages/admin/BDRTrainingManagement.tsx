import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, TrendingUp, Target, Award, Play, Pause } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BDRTrainingProgram, BDRAdminDashboard, DEFAULT_BDR_CRITERIA } from '@/types/bdr-training';
import BDRProgramDialog from '@/components/admin/BDRProgramDialog';
import BDRUserProgressTable from '@/components/admin/BDRUserProgressTable';

const BDRTrainingManagement = () => {
  const [programs, setPrograms] = useState<BDRTrainingProgram[]>([]);
  const [dashboardData, setDashboardData] = useState<BDRAdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<BDRTrainingProgram | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'programs' | 'progress'>('overview');

  const { toast } = useToast();

  useEffect(() => {
    loadBDRData();
  }, []);

  const loadBDRData = async () => {
    try {
      setLoading(true);

      // Load training programs
      const { data: programsData, error: programsError } = await supabase
        .from('bdr_training_programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (programsError) throw programsError;

      // Load dashboard data
      const { data: progressData, error: progressError } = await supabase
        .from('bdr_user_progress_summary')
        .select('*');

      if (progressError) throw progressError;

      // Load recent evaluations
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from('bdr_scorecard_evaluations')
        .select(`
          *,
          recordings(title),
          profiles(full_name),
          bdr_training_programs(name)
        `)
        .order('evaluated_at', { ascending: false })
        .limit(10);

      if (evaluationsError) throw evaluationsError;

      setPrograms(programsData || []);

      // Build dashboard summary
      const totalUsers = new Set(progressData?.map(p => p.user_id) || []).size;
      const activeUsers = progressData?.filter(p => p.status === 'in_progress').length || 0;
      const completedUsers = progressData?.filter(p => p.status === 'completed').length || 0;

      const dashboardSummary: BDRAdminDashboard = {
        programs: {
          total: programsData?.length || 0,
          active: programsData?.filter(p => p.is_active).length || 0,
          totalParticipants: totalUsers
        },
        userProgress: {
          totalUsers,
          activeUsers,
          completedUsers,
          averageCompletionRate: totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0
        },
        recentEvaluations: evaluationsData?.map(e => ({
          evaluation: e,
          userName: e.profiles?.full_name || 'Unknown User',
          programName: e.bdr_training_programs?.name || 'Unknown Program'
        })) || [],
        trends: {
          averageScoresByProgram: {},
          completionRatesByProgram: {},
          monthlyActivity: []
        }
      };

      setDashboardData(dashboardSummary);

    } catch (error) {
      console.error('Failed to load BDR data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load BDR training data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgram = () => {
    setSelectedProgram(null);
    setDialogOpen(true);
  };

  const handleEditProgram = (program: BDRTrainingProgram) => {
    setSelectedProgram(program);
    setDialogOpen(true);
  };

  const handleDeleteProgram = async (programId: string) => {
    if (!confirm('Are you sure you want to delete this training program? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bdr_training_programs')
        .delete()
        .eq('id', programId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Training program deleted successfully',
      });

      loadBDRData();
    } catch (error) {
      console.error('Failed to delete program:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete training program',
        variant: 'destructive'
      });
    }
  };

  const handleToggleProgram = async (program: BDRTrainingProgram) => {
    try {
      const { error } = await supabase
        .from('bdr_training_programs')
        .update({ is_active: !program.isActive })
        .eq('id', program.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Training program ${program.isActive ? 'deactivated' : 'activated'} successfully`,
      });

      loadBDRData();
    } catch (error) {
      console.error('Failed to toggle program:', error);
      toast({
        title: 'Error',
        description: 'Failed to update training program',
        variant: 'destructive'
      });
    }
  };

  const handleSaveProgram = async (programData: Partial<BDRTrainingProgram>) => {
    try {
      if (selectedProgram) {
        // Update existing program
        const { error } = await supabase
          .from('bdr_training_programs')
          .update({
            name: programData.name,
            description: programData.description,
            scorecard_criteria: programData.scorecardCriteria || DEFAULT_BDR_CRITERIA,
            target_score_threshold: programData.targetScoreThreshold,
            minimum_calls_required: programData.minimumCallsRequired,
            tags: programData.tags || [],
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedProgram.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Training program updated successfully',
        });
      } else {
        // Create new program
        const { error } = await supabase
          .from('bdr_training_programs')
          .insert({
            name: programData.name!,
            description: programData.description,
            scorecard_criteria: programData.scorecardCriteria || DEFAULT_BDR_CRITERIA,
            target_score_threshold: programData.targetScoreThreshold || 70,
            minimum_calls_required: programData.minimumCallsRequired || 5,
            tags: programData.tags || [],
            is_active: true,
            version: 1
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Training program created successfully',
        });
      }

      setDialogOpen(false);
      loadBDRData();
    } catch (error) {
      console.error('Failed to save program:', error);
      toast({
        title: 'Error',
        description: 'Failed to save training program',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">BDR Training Management</h1>
          <p className="text-gray-600 mt-1">Manage Business Development Representative training programs and track progress</p>
        </div>
        <Button onClick={handleCreateProgram} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Training Program
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'programs', label: 'Training Programs', icon: Target },
            { id: 'progress', label: 'User Progress', icon: Users }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && dashboardData && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Programs</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.programs.total}</p>
                  </div>
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Programs</p>
                    <p className="text-2xl font-bold text-green-600">{dashboardData.programs.active}</p>
                  </div>
                  <Play className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Participants</p>
                    <p className="text-2xl font-bold text-purple-600">{dashboardData.userProgress.totalUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {dashboardData.userProgress.averageCompletionRate.toFixed(1)}%
                    </p>
                  </div>
                  <Award className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Evaluations */}
          <Card>
            <CardHeader>
              <CardTitle>Recent BDR Evaluations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recentEvaluations.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.userName}</p>
                      <p className="text-sm text-gray-600">{item.programName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.evaluation.evaluated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        {item.evaluation.overall_score.toFixed(1)}%
                      </p>
                      <Badge variant={item.evaluation.overall_score >= 75 ? 'default' : 'secondary'}>
                        {item.evaluation.overall_score >= 75 ? 'Proficient' : 'Developing'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Programs Tab */}
      {activeTab === 'programs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {programs.map((program) => (
              <Card key={program.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{program.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{program.description}</p>
                    </div>
                    <Badge variant={program.isActive ? 'default' : 'secondary'}>
                      {program.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Target Score</p>
                      <p className="font-medium">{program.targetScoreThreshold}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Min Calls</p>
                      <p className="font-medium">{program.minimumCallsRequired}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Criteria</p>
                      <p className="font-medium">{program.scorecardCriteria?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Version</p>
                      <p className="font-medium">v{program.version}</p>
                    </div>
                  </div>

                  {program.tags && program.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {program.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditProgram(program)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleProgram(program)}
                      >
                        {program.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteProgram(program.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Created {new Date(program.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {programs.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Training Programs</h3>
                <p className="text-gray-600 mb-4">Get started by creating your first BDR training program.</p>
                <Button onClick={handleCreateProgram}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Training Program
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <BDRUserProgressTable programs={programs} />
      )}

      {/* Program Dialog */}
      <BDRProgramDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        program={selectedProgram}
        onSave={handleSaveProgram}
      />
    </div>
  );
};

export default BDRTrainingManagement;