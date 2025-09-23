
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdvancedAnalytics {
  totalRecordings: number;
  averageDuration: number;
  completionRate: number;
  userEngagement: number;
  topPerformers: Array<{
    userId: string;
    userName: string;
    score: number;
    recordings: number;
  }>;
  trendData: Array<{
    date: string;
    recordings: number;
    avgScore: number;
  }>;
}

export const useAdvancedAnalytics = () => {
  const [analytics, setAnalytics] = useState<AdvancedAnalytics>({
    totalRecordings: 0,
    averageDuration: 0,
    completionRate: 0,
    userEngagement: 0,
    topPerformers: [],
    trendData: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdvancedAnalytics = async () => {
    try {
      setError(null);
      
      // Fetch basic recording stats
      const { data: recordings, error: recordingsError } = await supabase
        .from('recordings')
        .select('id, duration, status, created_at, user_id');

      if (recordingsError) {
        throw recordingsError;
      }

      // Calculate analytics
      const totalRecordings = recordings?.length || 0;
      const completedRecordings = recordings?.filter(r => r.status === 'completed').length || 0;
      const totalDuration = recordings?.reduce((sum, r) => sum + (r.duration || 0), 0) || 0;
      
      const analyticsData: AdvancedAnalytics = {
        totalRecordings,
        averageDuration: totalRecordings > 0 ? totalDuration / totalRecordings : 0,
        completionRate: totalRecordings > 0 ? (completedRecordings / totalRecordings) * 100 : 0,
        userEngagement: Math.random() * 100, // Mock engagement score
        topPerformers: [], // Mock data for now
        trendData: [] // Mock data for now
      };

      setAnalytics(analyticsData);

    } catch (err) {
      console.error('Error fetching advanced analytics:', err);
      setError('Failed to fetch advanced analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvancedAnalytics();
  }, []);

  return {
    analytics,
    loading,
    error,
    refetchAnalytics: fetchAdvancedAnalytics
  };
};
