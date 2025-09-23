/**
 * Coaching Impact Component
 * 
 * Analytics for measuring the effectiveness of BDR training and coaching interventions,
 * tracking improvement rates, ROI, and coaching program success metrics.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BookOpen, 
  TrendingUp, 
  Users, 
  Target, 
  Award, 
  Calendar,
  Clock,
  DollarSign,
  BarChart3,
  LineChart,
  RefreshCw,
  Download,
  ArrowUp,
  ArrowDown,
  Lightbulb,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Star,
  Zap
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { BDRTrainingProgram } from '@/types/bdr-training';
import { toast } from 'sonner';

interface CoachingImpactComponentProps {
  trainingProgram: BDRTrainingProgram;
}

interface CoachingMetrics {
  totalCoachingSessions: number;
  activeCoaches: number;
  averageImprovementRate: number;
  coachingROI: number;
  programCompletionRate: number;
  satisfactionScore: number;
  skillsRetentionRate: number;
  timeToCompetency: number;
}

interface CoachingIntervention {
  id: string;
  type: 'individual' | 'group' | 'peer' | 'automated';
  coach: string;
  participants: number;
  focusArea: string;
  startDate: string;
  duration: number;
  status: 'active' | 'completed' | 'planned';
  preScore: number;
  postScore: number;
  improvement: number;
  feedback: {
    participantSatisfaction: number;
    coachEffectiveness: number;
    contentRelevance: number;
  };
}

interface ImpactTrend {
  period: string;
  interventions: number;
  totalParticipants: number;
  averageImprovement: number;
  retentionRate: number;
  coachingHours: number;
  costPerParticipant: number;
}

interface CoachPerformance {
  coachId: string;
  coachName: string;
  sessionsCount: number;
  participantsCoached: number;
  averageImprovement: number;
  satisfactionRating: number;
  specializations: string[];
  successStories: number;
  methodology: string;
}

interface SkillImpactArea {
  skill: string;
  baselineScore: number;
  currentScore: number;
  improvement: number;
  coachingIntensity: 'low' | 'medium' | 'high';
  interventionsCount: number;
  participantsAffected: number;
  retentionRate: number;
  businessImpact: 'high' | 'medium' | 'low';
}

// Mock coaching metrics removed - using real data

// Mock data removed - using real data from API

// Mock data removed - using real data from API

// Mock data removed - using real data from API

// Mock data removed - using real data from API

export function CoachingImpactComponent({ trainingProgram }: CoachingImpactComponentProps) {
  const [coachingMetrics, setCoachingMetrics] = useState<CoachingMetrics | null>(null);
  const [interventions, setInterventions] = useState<CoachingIntervention[]>([]);
  const [impactTrends, setImpactTrends] = useState<ImpactTrend[]>([]);
  const [coachPerformance, setCoachPerformance] = useState<CoachPerformance[]>([]);
  const [skillImpact, setSkillImpact] = useState<SkillImpactArea[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('improvement');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCoachingImpact();
  }, [trainingProgram.id, selectedTimeframe]);

  const loadCoachingImpact = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('get-training-analytics', {
        body: {
          type: 'coaching_impact',
          trainingProgramId: trainingProgram.id,
          options: {
            timeframe: selectedTimeframe,
            includeROI: true,
            includeCoachPerformance: true,
            includeSkillImpact: true
          }
        }
      });

      if (error) throw error;

      // Set real data from API response
      setCoachingMetrics(data?.coachingMetrics || null);
      setInterventions(data?.interventions || []);
      setImpactTrends(data?.impactTrends || []);
      setCoachPerformance(data?.coachPerformance || []);
      setSkillImpact(data?.skillImpact || []);
      
    } catch (error) {
      console.error('Error loading coaching impact:', error);
      toast.error('Failed to load coaching impact analytics');
      
      // Reset to empty states on error
      setCoachingMetrics(null);
      setInterventions([]);
      setImpactTrends([]);
      setCoachPerformance([]);
      setSkillImpact([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getInterventionStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'planned': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInterventionTypeIcon = (type: string) => {
    switch (type) {
      case 'individual': return <User className="h-4 w-4" />;
      case 'group': return <Users className="h-4 w-4" />;
      case 'peer': return <MessageSquare className="h-4 w-4" />;
      case 'automated': return <Zap className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const exportCoachingData = async () => {
    try {
      const exportData = {
        metrics: coachingMetrics,
        interventions,
        trends: impactTrends,
        coachPerformance,
        skillImpact,
        generatedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `coaching-impact-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Coaching impact data exported successfully');
    } catch (error) {
      console.error('Error exporting coaching data:', error);
      toast.error('Failed to export coaching impact data');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Coaching Impact Analytics</h3>
          <p className="text-gray-600">Measure and optimize coaching effectiveness and ROI</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCoachingData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={loadCoachingImpact} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Coaching Metrics */}
      {coachingMetrics ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Improvement</p>
                  <p className="text-2xl font-bold text-green-600">{coachingMetrics.averageImprovementRate}%</p>
                  <p className="text-sm text-gray-600">Per intervention</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Coaching ROI</p>
                  <p className="text-2xl font-bold text-blue-600">{coachingMetrics.coachingROI}%</p>
                  <p className="text-sm text-gray-600">Return on investment</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Satisfaction Score</p>
                  <p className="text-2xl font-bold text-purple-600">{coachingMetrics.satisfactionScore}/5.0</p>
                  <p className="text-sm text-gray-600">Participant rating</p>
                </div>
                <Star className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Retention Rate</p>
                  <p className="text-2xl font-bold text-orange-600">{coachingMetrics.skillsRetentionRate}%</p>
                  <p className="text-sm text-gray-600">Skills retention</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Coaching Impact Data Available</h3>
            <p className="text-gray-600 mb-4">Coaching impact metrics will appear here once training interventions are completed and analyzed.</p>
          </CardContent>
        </Card>
      )}

      {/* Additional Metrics */}
      {coachingMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{coachingMetrics.totalCoachingSessions}</div>
              <div className="text-sm text-gray-600">Total Sessions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{coachingMetrics.activeCoaches}</div>
              <div className="text-sm text-gray-600">Active Coaches</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{coachingMetrics.programCompletionRate}%</div>
              <div className="text-sm text-gray-600">Completion Rate</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{coachingMetrics.timeToCompetency}wks</div>
              <div className="text-sm text-gray-600">Time to Competency</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Interventions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <span>Recent Coaching Interventions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {interventions.map((intervention) => (
            <div key={intervention.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {getInterventionTypeIcon(intervention.type)}
                <div>
                  <div className="font-medium text-gray-900">{intervention.focusArea}</div>
                  <div className="text-sm text-gray-600">
                    {intervention.coach} • {intervention.participants} participants • {intervention.duration} weeks
                  </div>
                  <div className="text-sm text-gray-500">
                    Started {new Date(intervention.startDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className={getInterventionStatusColor(intervention.status)}>
                  {intervention.status}
                </Badge>
                {intervention.improvement > 0 && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">+{intervention.improvement}%</div>
                    <div className="text-xs text-gray-600">Improvement</div>
                  </div>
                )}
                {intervention.status === 'completed' && intervention.feedback.participantSatisfaction > 0 && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{intervention.feedback.participantSatisfaction}</div>
                    <div className="text-xs text-gray-600">Satisfaction</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Coach Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Coach Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {coachPerformance.map((coach) => (
            <div key={coach.coachId} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{coach.coachName}</h4>
                  <p className="text-sm text-gray-600">{coach.methodology}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{coach.satisfactionRating}/5.0</div>
                  <div className="text-sm text-gray-600">Rating</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{coach.sessionsCount}</div>
                  <div className="text-sm text-gray-600">Sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{coach.participantsCoached}</div>
                  <div className="text-sm text-gray-600">Participants</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{coach.averageImprovement}%</div>
                  <div className="text-sm text-gray-600">Avg Improvement</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">{coach.successStories}</div>
                  <div className="text-sm text-gray-600">Success Stories</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">Specializations:</span>
                {coach.specializations.map((spec, index) => (
                  <Badge key={index} variant="outline" className="text-blue-700 border-blue-300">
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Skill Impact Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span>Skill Impact Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {skillImpact.map((skill, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h4 className="font-medium text-gray-900">{skill.skill}</h4>
                  <Badge 
                    className={`${skill.coachingIntensity === 'high' ? 'bg-red-100 text-red-800' : 
                                skill.coachingIntensity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-green-100 text-green-800'}`}
                  >
                    {skill.coachingIntensity} intensity
                  </Badge>
                  <Badge className={getImpactColor(skill.businessImpact)}>
                    {skill.businessImpact} business impact
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">+{skill.improvement}%</div>
                  <div className="text-sm text-gray-600">Improvement</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Baseline</div>
                  <div className="font-medium">{skill.baselineScore}</div>
                </div>
                <div>
                  <div className="text-gray-600">Current</div>
                  <div className="font-medium text-blue-600">{skill.currentScore}</div>
                </div>
                <div>
                  <div className="text-gray-600">Participants</div>
                  <div className="font-medium">{skill.participantsAffected}</div>
                </div>
                <div>
                  <div className="text-gray-600">Retention</div>
                  <div className="font-medium text-green-600">{skill.retentionRate}%</div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progress to target (85)</span>
                  <span>{Math.round((skill.currentScore / 85) * 100)}%</span>
                </div>
                <Progress value={(skill.currentScore / 85) * 100} className="w-full" />
              </div>

              <div className="text-sm text-gray-600">
                {skill.interventionsCount} coaching interventions completed
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Impact Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <LineChart className="h-5 w-5 text-blue-600" />
            <span>Coaching Impact Trends</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {impactTrends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-medium text-gray-900">
                    Week of {new Date(trend.period).toLocaleDateString()}
                  </div>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm text-center">
                  <div>
                    <div className="text-gray-600">Interventions</div>
                    <div className="font-medium">{trend.interventions}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Participants</div>
                    <div className="font-medium">{trend.totalParticipants}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Avg Improvement</div>
                    <div className="font-medium text-green-600">{trend.averageImprovement}%</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Retention</div>
                    <div className="font-medium text-blue-600">{trend.retentionRate}%</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Hours</div>
                    <div className="font-medium">{trend.coachingHours}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Cost/Participant</div>
                    <div className="font-medium text-purple-600">${trend.costPerParticipant}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}