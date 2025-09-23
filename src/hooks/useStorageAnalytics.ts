
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StorageUsage {
  totalStorageBytes: number;
  storageGrowthPercent: number;
  averageFileSizeBytes: number;
  totalFiles: number;
}

interface FileDistribution {
  audio: number;
  video: number;
  other: number;
}

export function useStorageAnalytics() {
  const { toast } = useToast();
  const [storageUsage, setStorageUsage] = useState<StorageUsage>({
    totalStorageBytes: 0,
    storageGrowthPercent: 0,
    averageFileSizeBytes: 0,
    totalFiles: 0
  });
  const [fileDistribution, setFileDistribution] = useState<FileDistribution>({
    audio: 0,
    video: 0,
    other: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStorageMetrics();
  }, []);

  const fetchStorageMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use only existing database functions - calculate_admin_kpis
      const { data: adminKpis, error: kpiError } = await supabase.rpc('calculate_admin_kpis');

      if (kpiError) {
        console.warn('Error fetching admin KPIs:', kpiError);
      }

      // Fetch recordings data to calculate storage metrics
      const { data: recordings, error: recordingsError } = await supabase
        .from('recordings')
        .select('file_size, file_type');

      if (recordingsError) {
        throw recordingsError;
      }

      if (recordings) {
        // Calculate storage usage
        const totalBytes = recordings.reduce((sum, r) => sum + (r.file_size || 0), 0);
        const totalFiles = recordings.length;
        const averageBytes = totalFiles > 0 ? totalBytes / totalFiles : 0;

        // Calculate file distribution
        const distribution = recordings.reduce((acc, r) => {
          const type = r.file_type;
          if (type === 'audio') acc.audio++;
          else if (type === 'video') acc.video++;
          else acc.other++;
          return acc;
        }, { audio: 0, video: 0, other: 0 });

        // Mock growth percentage calculation
        const mockGrowthPercent = Math.random() * 20;

        setStorageUsage({
          totalStorageBytes: totalBytes,
          storageGrowthPercent: mockGrowthPercent,
          averageFileSizeBytes: averageBytes,
          totalFiles: totalFiles
        });

        setFileDistribution(distribution);
      }

    } catch (error) {
      console.error('Error fetching storage analytics:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch storage analytics');
      toast({
        title: "Error",
        description: "Failed to fetch storage analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    storageUsage,
    fileDistribution,
    loading,
    error,
    refetch: fetchStorageMetrics
  };
}
