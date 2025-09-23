
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { 
  SalesFrameworkType, 
  FrameworkPerformanceTrend, 
  FrameworkComparisonData,
  FrameworkAnalysis
} from '@/types/salesFrameworks';

export function useFrameworkAnalytics() {
  const { user } = useAuth();
  const [trends, setTrends] = useState<FrameworkPerformanceTrend[]>([]);
  const [comparisons, setComparisons] = useState<FrameworkComparisonData[]>([]);
  const [analyses, setAnalyses] = useState<FrameworkAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFrameworkAnalytics = async () => {
    if (!user?.id) return;

    try {
      setError(null);
      
      // Generate mock data for now - in a real implementation this would come from the database
      const mockTrends: FrameworkPerformanceTrend[] = [
        {
          frameworkType: 'BANT',
          date: '2024-01-01',
          score: 85,
          callCount: 12,
          improvementRate: 0.15
        },
        {
          frameworkType: 'MEDDIC',
          date: '2024-01-01',
          score: 78,
          callCount: 8,
          improvementRate: 0.12
        }
      ];

      const mockComparisons: FrameworkComparisonData[] = [
        {
          framework: 'BANT',
          score: 85,
          callCount: 45,
          successRate: 0.73,
          averageImprovement: 0.18
        },
        {
          framework: 'MEDDIC',
          score: 78,
          callCount: 32,
          successRate: 0.68,
          averageImprovement: 0.15
        }
      ];

      const mockAnalyses: FrameworkAnalysis[] = [
        {
          frameworkType: 'BANT',
          overallScore: 85,
          confidence: 0.92,
          componentScores: {
            budget: 90,
            authority: 85,
            need: 88,
            timeline: 75
          },
          insights: [
            {
              type: 'strength',
              description: 'Strong budget qualification',
              confidence: 0.9,
              category: 'Budget'
            }
          ],
          evidence: ['Clear budget discussion', 'Decision maker identified'],
          strengths: ['Budget qualification', 'Need identification'],
          improvements: ['Timeline clarification', 'Authority confirmation'],
          coachingActions: ['Focus on timeline discovery', 'Validate decision authority'],
          benchmarkComparison: {
            industryAverage: 72,
            userScore: 85,
            percentile: 78
          },
          analysisTimestamp: new Date().toISOString(),
          aiModelVersion: '1.0',
          callType: 'Discovery',
          callOutcome: 'Qualified'
        }
      ];

      setTrends(mockTrends);
      setComparisons(mockComparisons);
      setAnalyses(mockAnalyses);

    } catch (err) {
      console.error('Error fetching framework analytics:', err);
      setError('Failed to load framework analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrameworkAnalytics();
  }, [user?.id]);

  const getFrameworkAnalysis = (type: SalesFrameworkType): FrameworkAnalysis | null => {
    return analyses.find(analysis => analysis.frameworkType === type) || null;
  };

  const getFrameworkTrends = (type: SalesFrameworkType): FrameworkPerformanceTrend[] => {
    return trends.filter(trend => trend.frameworkType === type);
  };

  return {
    trends,
    comparisons,
    analyses,
    loading,
    error,
    getFrameworkAnalysis,
    getFrameworkTrends,
    refetch: fetchFrameworkAnalytics
  };
}
