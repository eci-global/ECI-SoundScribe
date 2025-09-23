
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';

interface DatabaseStats {
  recordings: number;
  users: number;
  storage_used: number;
  processing_queue: number;
}

interface SystemHealth {
  database: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
  processing: 'healthy' | 'warning' | 'error';
  overall: 'healthy' | 'warning' | 'error';
}

export const useAdminTools = () => {
  const [stats, setStats] = useState<DatabaseStats>({
    recordings: 0,
    users: 0,
    storage_used: 0,
    processing_queue: 0
  });
  const [health, setHealth] = useState<SystemHealth>({
    database: 'healthy',
    storage: 'healthy',
    processing: 'healthy',
    overall: 'healthy'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isAdmin } = useUserRole();

  const fetchDatabaseStats = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Get recordings count
      const { count: recordingsCount, error: recordingsError } = await supabase
        .from('recordings')
        .select('*', { count: 'exact', head: true });

      if (recordingsError) throw recordingsError;

      // Get users count from profiles table
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) {
        console.warn('Could not fetch users count:', usersError);
        // Don't throw error, just continue with 0 count
      }

      // Get processing queue (recordings with status != 'completed')
      const { count: queueCount, error: queueError } = await supabase
        .from('recordings')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'completed');

      if (queueError) throw queueError;

      // Calculate storage used (sum of file_size where not null)
      const { data: storageData, error: storageError } = await supabase
        .from('recordings')
        .select('file_size')
        .not('file_size', 'is', null);

      if (storageError) throw storageError;

      const totalStorage = storageData?.reduce((sum, record) => {
        return sum + (record.file_size || 0);
      }, 0) || 0;

      setStats({
        recordings: recordingsCount || 0,
        users: usersCount || 0,
        storage_used: totalStorage,
        processing_queue: queueCount || 0
      });

      // Update health based on stats
      const newHealth: SystemHealth = {
        database: recordingsCount !== null ? 'healthy' : 'error',
        storage: totalStorage < 10 * 1024 * 1024 * 1024 ? 'healthy' : 'warning', // 10GB threshold
        processing: (queueCount || 0) < 50 ? 'healthy' : 'warning', // 50 items threshold
        overall: 'healthy'
      };

      // Set overall health to worst individual health
      const healthValues = Object.values(newHealth).filter(v => v !== 'healthy');
      if (healthValues.includes('error')) {
        newHealth.overall = 'error';
      } else if (healthValues.includes('warning')) {
        newHealth.overall = 'warning';
      }

      setHealth(newHealth);

    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError('Failed to fetch database statistics');
      setHealth(prev => ({ ...prev, database: 'error', overall: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const reprocessRecording = async (recordingId: string) => {
    if (!isAdmin) {
      throw new Error('Insufficient permissions');
    }

    try {
      const { error } = await supabase
        .from('recordings')
        .update({ 
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', recordingId);

      if (error) throw error;

      // Refresh stats after update
      await fetchDatabaseStats();

      return true;
    } catch (err) {
      console.error('Error reprocessing recording:', err);
      throw new Error('Failed to reprocess recording');
    }
  };

  const deleteRecording = async (recordingId: string) => {
    if (!isAdmin) {
      throw new Error('Insufficient permissions');
    }

    try {
      // Delete related data first
      await supabase.from('speaker_segments').delete().eq('recording_id', recordingId);
      await supabase.from('topic_segments').delete().eq('recording_id', recordingId);
      await supabase.from('ai_moments').delete().eq('recording_id', recordingId);
      await supabase.from('recording_chunks').delete().eq('recording_id', recordingId);

      // Delete the recording
      const { error } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recordingId);

      if (error) throw error;

      // Refresh stats after deletion
      await fetchDatabaseStats();

      return true;
    } catch (err) {
      console.error('Error deleting recording:', err);
      throw new Error('Failed to delete recording');
    }
  };

  const getUsersData = async () => {
    if (!isAdmin) {
      throw new Error('Insufficient permissions');
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles (
            id,
            role,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching users data:', err);
      throw new Error('Failed to fetch users data');
    }
  };

  const getSystemLogs = async (limit = 100) => {
    if (!isAdmin) {
      throw new Error('Insufficient permissions');
    }

    try {
      // Since we don't have a logs table, return recent recordings as a proxy for system activity
      const { data, error } = await supabase
        .from('recordings')
        .select('id, title, status, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(record => ({
        id: record.id,
        timestamp: record.updated_at,
        level: record.status === 'failed' ? 'error' : 'info',
        message: `Recording "${record.title}" status: ${record.status}`,
        source: 'recordings'
      }));
    } catch (err) {
      console.error('Error fetching system logs:', err);
      throw new Error('Failed to fetch system logs');
    }
  };

  useEffect(() => {
    fetchDatabaseStats();
  }, [isAdmin]);

  return {
    stats,
    health,
    loading,
    error,
    fetchDatabaseStats,
    reprocessRecording,
    deleteRecording,
    getUsersData,
    getSystemLogs,
    isRunning: loading,
    createDatabaseBackup: async () => {
      console.log('Database backup functionality not implemented');
      return Promise.resolve();
    },
    runHealthCheck: async () => {
      await fetchDatabaseStats();
      return Promise.resolve();
    },
    getDatabaseStats: fetchDatabaseStats,
    clearCache: async () => {
      console.log('Cache clear functionality not implemented');
      return Promise.resolve();
    },
    runDatabaseMaintenance: async () => {
      console.log('Database maintenance functionality not implemented');
      return Promise.resolve();
    },
    runSecurityAudit: async () => {
      console.log('Security audit functionality not implemented');
      return Promise.resolve();
    },
    exportSystemLogs: async () => {
      console.log('System logs export functionality not implemented');
      return Promise.resolve();
    },
    reindexSearch: async () => {
      console.log('Search reindex functionality not implemented');
      return Promise.resolve();
    }
  };
};
