
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface OutreachConnection {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  outreach_user_id: string | null;
  outreach_user_email: string | null;
  outreach_org_id: string | null;
  scope: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachProspect {
  id: string;
  outreach_prospect_id: string;
  recording_id: string;
  user_id: string;
  created_at: string;
}

export interface OutreachSyncLog {
  id: string;
  user_id: string;
  recording_id: string | null;
  sync_type: string;
  status: string;
  outreach_activity_id: string | null;
  error_message: string | null;
  created_at: string;
}

export const useOrganizationOutreach = () => {
  const { user } = useAuth();
  const [connection, setConnection] = useState<OutreachConnection | null>(null);
  const [prospects, setProspects] = useState<OutreachProspect[]>([]);
  const [syncLogs, setSyncLogs] = useState<OutreachSyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOutreachData = async () => {
    if (!user?.id) return;

    try {
      setError(null);
      
      // Fetch connection
      const { data: connectionData, error: connectionError } = await supabase
        .from('outreach_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (connectionError && connectionError.code !== 'PGRST116') {
        throw connectionError;
      }

      setConnection({
        ...connectionData,
        outreach_org_id: null,
        scope: null
      });

      // Fetch prospects
      const { data: prospectsData, error: prospectsError } = await supabase
        .from('outreach_prospect_mappings')
        .select('*')
        .eq('user_id', user.id);

      if (prospectsError) {
        throw prospectsError;
      }

      setProspects(prospectsData || []);

      // Fetch sync logs
      const { data: logsData, error: logsError } = await supabase
        .from('outreach_sync_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) {
        throw logsError;
      }

      setSyncLogs(logsData || []);

    } catch (err) {
      console.error('Error fetching outreach data:', err);
      setError('Failed to load outreach data');
    } finally {
      setLoading(false);
    }
  };

  const createConnection = async (connectionData: Partial<OutreachConnection>) => {
    if (!user?.id) return false;

    try {
      // Ensure required fields are present
      if (!connectionData.access_token || !connectionData.refresh_token || !connectionData.token_expires_at) {
        throw new Error('Missing required connection fields');
      }

      const { error } = await supabase
        .from('outreach_connections')
        .insert({
          user_id: user.id,
          access_token: connectionData.access_token,
          refresh_token: connectionData.refresh_token,
          token_expires_at: connectionData.token_expires_at,
          outreach_user_id: connectionData.outreach_user_id || null,
          outreach_user_email: connectionData.outreach_user_email || null,
          outreach_org_id: connectionData.outreach_org_id || null,
          scope: connectionData.scope || null
        });

      if (error) throw error;

      await fetchOutreachData();
      return true;
    } catch (err) {
      console.error('Error creating outreach connection:', err);
      setError('Failed to create outreach connection');
      return false;
    }
  };

  const updateConnection = async (updates: Partial<OutreachConnection>) => {
    if (!user?.id || !connection) return false;

    try {
      const { error } = await supabase
        .from('outreach_connections')
        .update(updates)
        .eq('id', connection.id);

      if (error) throw error;

      await fetchOutreachData();
      return true;
    } catch (err) {
      console.error('Error updating outreach connection:', err);
      setError('Failed to update outreach connection');
      return false;
    }
  };

  const deleteConnection = async () => {
    if (!user?.id || !connection) return false;

    try {
      const { error } = await supabase
        .from('outreach_connections')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;

      await fetchOutreachData();
      return true;
    } catch (err) {
      console.error('Error deleting outreach connection:', err);
      setError('Failed to delete outreach connection');
      return false;
    }
  };

  const createProspectMapping = async (recordingId: string, outreachProspectId: string) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('outreach_prospect_mappings')
        .insert({
          user_id: user.id,
          recording_id: recordingId,
          outreach_prospect_id: outreachProspectId
        });

      if (error) throw error;

      await fetchOutreachData();
      return true;
    } catch (err) {
      console.error('Error creating prospect mapping:', err);
      setError('Failed to create prospect mapping');
      return false;
    }
  };

  const logSyncAction = async (syncData: Partial<OutreachSyncLog>) => {
    if (!user?.id) return;

    try {
      // Ensure required fields are present
      if (!syncData.sync_type || !syncData.status) {
        throw new Error('Missing required sync log fields');
      }

      await supabase
        .from('outreach_sync_logs')
        .insert({
          user_id: user.id,
          sync_type: syncData.sync_type,
          status: syncData.status,
          recording_id: syncData.recording_id || null,
          outreach_activity_id: syncData.outreach_activity_id || null,
          error_message: syncData.error_message || null
        });

      await fetchOutreachData();
    } catch (err) {
      console.error('Error logging sync action:', err);
    }
  };

  useEffect(() => {
    fetchOutreachData();
  }, [user?.id]);

  return {
    connection,
    prospects,
    syncLogs,
    loading,
    error,
    createConnection,
    updateConnection,
    deleteConnection,
    createProspectMapping,
    logSyncAction,
    refetch: fetchOutreachData
  };
};
