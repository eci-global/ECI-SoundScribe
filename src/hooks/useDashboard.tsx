
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DashboardStats {
  totalRecordings: number;
  totalDuration: number;
  averageCoachingScore: number;
  recentActivity: number;
  topPerformingAreas: string[];
  improvementAreas: string[];
}

interface CoachingEvaluation {
  overallScore: number;
  criteria: Array<{ name: string; score: number }>;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  confidence: number;
}

export const useDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalRecordings: 0,
    totalDuration: 0,
    averageCoachingScore: 0,
    recentActivity: 0,
    topPerformingAreas: [],
    improvementAreas: []
  });
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    try {
      setError('');
      
      // Fetch user's recordings
      const { data: recordings, error: recordingsError } = await supabase
        .from('recordings')
        .select('*')
        .eq('user_id', user.id);

      if (recordingsError) {
        throw recordingsError;
      }

      // Store recordings data
      setRecordings(recordings || []);

      // Calculate stats
      const totalRecordings = recordings?.length || 0;
      const totalDuration = recordings?.reduce((sum, recording) => sum + (recording.duration || 0), 0) || 0;
      
      // Calculate recent activity (recordings in last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentActivity = recordings?.filter(
        recording => new Date(recording.created_at) > weekAgo
      ).length || 0;

      // Process coaching evaluations
      let totalCoachingScore = 0;
      let coachingCount = 0;
      const strengthsMap: Record<string, number> = {};
      const improvementsMap: Record<string, number> = {};

      recordings?.forEach(recording => {
        if (recording.coaching_evaluation) {
          try {
            const evaluation = typeof recording.coaching_evaluation === 'string' 
              ? JSON.parse(recording.coaching_evaluation)
              : recording.coaching_evaluation as unknown as CoachingEvaluation;

            if (evaluation && typeof evaluation.overallScore === 'number') {
              totalCoachingScore += evaluation.overallScore;
              coachingCount++;

              // Count strengths and improvements
              evaluation.strengths?.forEach(strength => {
                strengthsMap[strength] = (strengthsMap[strength] || 0) + 1;
              });

              evaluation.improvements?.forEach(improvement => {
                improvementsMap[improvement] = (improvementsMap[improvement] || 0) + 1;
              });
            }
          } catch (err) {
            console.warn('Failed to parse coaching evaluation:', err);
          }
        }
      });

      const averageCoachingScore = coachingCount > 0 ? totalCoachingScore / coachingCount : 0;

      // Get top performing areas and improvement areas
      const topPerformingAreas = Object.entries(strengthsMap)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([strength]) => strength);

      const improvementAreas = Object.entries(improvementsMap)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([improvement]) => improvement);

      setStats({
        totalRecordings,
        totalDuration,
        averageCoachingScore,
        recentActivity,
        topPerformingAreas,
        improvementAreas
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id]);

  return {
    stats,
    recordings,
    loading,
    error,
    refetch: fetchDashboardData
  };
};
