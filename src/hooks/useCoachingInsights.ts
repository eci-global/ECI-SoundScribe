
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CoachingInsight {
  id: string;
  type: 'strength' | 'improvement' | 'observation';
  description: string;
  confidence: number;
  category: string;
  recordingId: string;
  recordingTitle: string;
  createdAt: string;
}

export interface CoachingTrend {
  date: string;
  overallScore: number;
  strengthsCount: number;
  improvementsCount: number;
  recordingsAnalyzed: number;
}

export interface CoachingStats {
  totalInsights: number;
  averageScore: number;
  topStrengths: string[];
  topImprovements: string[];
  recentTrends: CoachingTrend[];
}

interface CoachingEvaluation {
  overallScore: number;
  criteria: Array<{ name: string; score: number }>;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  confidence: number;
}

export function useCoachingInsights() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<CoachingInsight[]>([]);
  const [stats, setStats] = useState<CoachingStats>({
    totalInsights: 0,
    averageScore: 0,
    topStrengths: [],
    topImprovements: [],
    recentTrends: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoachingInsights = async () => {
    if (!user?.id) return;

    try {
      setError(null);
      
      // Fetch recordings with coaching evaluations
      const { data: recordings, error: recordingsError } = await supabase
        .from('recordings')
        .select('id, title, coaching_evaluation, created_at')
        .eq('user_id', user.id)
        .not('coaching_evaluation', 'is', null)
        .order('created_at', { ascending: false });

      if (recordingsError) {
        throw recordingsError;
      }

      // Process coaching evaluations into insights
      const allInsights: CoachingInsight[] = [];
      const trends: Record<string, CoachingTrend> = {};
      let totalScore = 0;
      let scoredCount = 0;

      recordings?.forEach(recording => {
        if (recording.coaching_evaluation) {
          try {
            const evaluation = typeof recording.coaching_evaluation === 'string' 
              ? JSON.parse(recording.coaching_evaluation)
              : recording.coaching_evaluation as unknown as CoachingEvaluation;

            if (evaluation && typeof evaluation.overallScore === 'number') {
              totalScore += evaluation.overallScore;
              scoredCount++;

              // Create insights from strengths and improvements
              evaluation.strengths?.forEach((strength, index) => {
                allInsights.push({
                  id: `${recording.id}-strength-${index}`,
                  type: 'strength',
                  description: strength,
                  confidence: 0.8,
                  category: 'Performance',
                  recordingId: recording.id,
                  recordingTitle: recording.title,
                  createdAt: recording.created_at
                });
              });

              evaluation.improvements?.forEach((improvement, index) => {
                allInsights.push({
                  id: `${recording.id}-improvement-${index}`,
                  type: 'improvement',
                  description: improvement,
                  confidence: 0.8,
                  category: 'Development',
                  recordingId: recording.id,
                  recordingTitle: recording.title,
                  createdAt: recording.created_at
                });
              });

              // Build trend data
              const date = new Date(recording.created_at).toISOString().split('T')[0];
              if (!trends[date]) {
                trends[date] = {
                  date,
                  overallScore: 0,
                  strengthsCount: 0,
                  improvementsCount: 0,
                  recordingsAnalyzed: 0
                };
              }

              trends[date].overallScore += evaluation.overallScore;
              trends[date].strengthsCount += evaluation.strengths?.length || 0;
              trends[date].improvementsCount += evaluation.improvements?.length || 0;
              trends[date].recordingsAnalyzed += 1;
            }
          } catch (err) {
            console.warn('Failed to parse coaching evaluation:', err);
          }
        }
      });

      // Calculate averages for trends
      const recentTrends = Object.values(trends)
        .map(trend => ({
          ...trend,
          overallScore: trend.overallScore / trend.recordingsAnalyzed
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 30);

      // Get top categories
      const strengthCounts: Record<string, number> = {};
      const improvementCounts: Record<string, number> = {};

      allInsights.forEach(insight => {
        if (insight.type === 'strength') {
          strengthCounts[insight.description] = (strengthCounts[insight.description] || 0) + 1;
        } else if (insight.type === 'improvement') {
          improvementCounts[insight.description] = (improvementCounts[insight.description] || 0) + 1;
        }
      });

      const topStrengths = Object.entries(strengthCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([strength]) => strength);

      const topImprovements = Object.entries(improvementCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([improvement]) => improvement);

      setInsights(allInsights);
      setStats({
        totalInsights: allInsights.length,
        averageScore: scoredCount > 0 ? totalScore / scoredCount : 0,
        topStrengths,
        topImprovements,
        recentTrends
      });

    } catch (err) {
      console.error('Error fetching coaching insights:', err);
      setError('Failed to load coaching insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoachingInsights();
  }, [user?.id]);

  return {
    insights,
    stats,
    loading,
    error,
    refetch: fetchCoachingInsights
  };
}
