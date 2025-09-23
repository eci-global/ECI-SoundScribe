
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LibraryMetric {
  totalRecordings: number;
  totalDuration: number;
  totalSize: number;
  avgDuration: number;
  recordingsWithTranscripts: number;
  recordingsWithCoaching: number;
  weeklyGrowth: number;
  popularContentTypes: Array<{ type: string; count: number }>;
  recentActivity: Array<{
    id: string;
    title: string;
    created_at: string;
    duration?: number;
  }>;
}

export function useLibraryMetrics() {
  const [metrics, setMetrics] = useState<LibraryMetric | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all recordings for the current user
      const { data: recordings, error: recordingsError } = await supabase
        .from('recordings')
        .select('*')
        .order('created_at', { ascending: false });

      if (recordingsError) throw recordingsError;

      if (!recordings) {
        setMetrics({
          totalRecordings: 0,
          totalDuration: 0,
          totalSize: 0,
          avgDuration: 0,
          recordingsWithTranscripts: 0,
          recordingsWithCoaching: 0,
          weeklyGrowth: 0,
          popularContentTypes: [],
          recentActivity: []
        });
        return;
      }

      // Calculate metrics
      const totalRecordings = recordings.length;
      const totalDuration = recordings.reduce((sum, r) => sum + (r.duration || 0), 0);
      const totalSize = recordings.reduce((sum, r) => sum + (r.file_size || 0), 0);
      const avgDuration = totalRecordings > 0 ? totalDuration / totalRecordings : 0;

      // Count recordings with transcripts and coaching
      const recordingsWithTranscripts = recordings.filter(r => r.transcript && r.transcript.length > 0).length;
      const recordingsWithCoaching = recordings.filter(r => r.coaching_evaluation).length;

      // Calculate weekly growth
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentRecordings = recordings.filter(r => new Date(r.created_at) >= oneWeekAgo);
      const weeklyGrowth = recentRecordings.length;

      // Popular content types
      const contentTypeCounts: Record<string, number> = {};
      recordings.forEach(r => {
        const type = r.content_type || 'other';
        contentTypeCounts[type] = (contentTypeCounts[type] || 0) + 1;
      });

      const popularContentTypes = Object.entries(contentTypeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Recent activity (last 10 recordings)
      const recentActivity = recordings.slice(0, 10).map(r => ({
        id: r.id,
        title: r.title,
        created_at: r.created_at,
        duration: r.duration
      }));

      setMetrics({
        totalRecordings,
        totalDuration,
        totalSize,
        avgDuration,
        recordingsWithTranscripts,
        recordingsWithCoaching,
        weeklyGrowth,
        popularContentTypes,
        recentActivity
      });

    } catch (err) {
      console.error('Error fetching library metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  return { metrics, loading, error, refreshMetrics: fetchMetrics };
}
