import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface OutreachConnection {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  outreach_user_id?: string;
  outreach_org_id?: string;
  outreach_user_email?: string;
  scope?: string;
  created_at: string;
  updated_at: string;
}

export interface OutreachProspect {
  id: string;
  attributes: {
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
    title?: string;
    phone?: string;
  };
}

export interface OutreachActivity {
  id: string;
  type: string;
  attributes: {
    subject: string;
    body: string;
    callDisposition?: string;
    callDurationSeconds?: number;
    occurredAt: string;
  };
  relationships: {
    prospect?: {
      data: {
        id: string;
        type: string;
      };
    };
  };
}

export interface UseOutreachIntegrationReturn {
  connection: OutreachConnection | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // OAuth methods
  disconnect: () => Promise<void>;
  refreshToken: () => Promise<void>;
  
  // API methods
  searchProspects: (email: string) => Promise<OutreachProspect[]>;
  createCallActivity: (data: {
    prospectId: string;
    subject: string;
    body: string;
    duration: number;
    occurredAt: Date;
  }) => Promise<OutreachActivity>;
  
  // Sync methods
  syncRecording: (recordingId: string) => Promise<void>;
  getSyncStatus: (recordingId: string) => Promise<any>;
}

export function useOutreachIntegration(): UseOutreachIntegrationReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connection, setConnection] = useState<OutreachConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load connection details
  useEffect(() => {
    async function loadConnection() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('outreach_connections')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        setConnection(data);
      } catch (err: any) {
        console.error('Error loading Outreach connection:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadConnection();
  }, [user]);

  // Check if token needs refresh
  const needsTokenRefresh = useCallback(() => {
    if (!connection) return false;
    
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const bufferMinutes = 5; // Refresh 5 minutes before expiry
    
    return expiresAt.getTime() - now.getTime() < bufferMinutes * 60 * 1000;
  }, [connection]);

  // Refresh access token
  const refreshToken = useCallback(async () => {
    if (!connection) return;

    try {
      const { data, error } = await supabase.functions.invoke('outreach-refresh-token', {
        body: {
          refreshToken: connection.refresh_token,
          userId: user?.id
        }
      });

      if (error) throw error;

      if (data?.success && data?.connection) {
        setConnection(data.connection);
      } else {
        throw new Error(data?.error || 'Failed to refresh token');
      }
    } catch (err: any) {
      console.error('Error refreshing token:', err);
      setError(err.message);
      
      // If refresh fails, connection might be invalid
      if (err.message.includes('invalid_grant')) {
        setConnection(null);
        toast({
          title: "Authentication Required",
          description: "Please reconnect your Outreach account.",
          variant: "destructive"
        });
      }
    }
  }, [connection, user, toast]);

  // Make authenticated API request
  const makeApiRequest = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> => {
    if (!connection) {
      throw new Error('No Outreach connection found');
    }

    // Check if token needs refresh
    if (needsTokenRefresh()) {
      await refreshToken();
    }

    const response = await fetch(`https://api.outreach.io/api/v2${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.detail || `API error: ${response.status}`);
    }

    return response.json();
  }, [connection, needsTokenRefresh, refreshToken]);

  // Search prospects by email
  const searchProspects = useCallback(async (email: string): Promise<OutreachProspect[]> => {
    try {
      const response = await makeApiRequest(
        `/prospects?filter[emails]=${encodeURIComponent(email)}`
      );
      
      return response.data || [];
    } catch (err: any) {
      console.error('Error searching prospects:', err);
      throw err;
    }
  }, [makeApiRequest]);

  // Create call activity
  const createCallActivity = useCallback(async (data: {
    prospectId: string;
    subject: string;
    body: string;
    duration: number;
    occurredAt: Date;
  }): Promise<OutreachActivity> => {
    try {
      const payload = {
        data: {
          type: 'call',
          attributes: {
            subject: data.subject,
            body: data.body,
            callDisposition: 'completed',
            callDurationSeconds: data.duration,
            occurredAt: data.occurredAt.toISOString()
          },
          relationships: {
            prospect: {
              data: {
                type: 'prospect',
                id: data.prospectId
              }
            }
          }
        }
      };

      const response = await makeApiRequest('/calls', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      return response.data;
    } catch (err: any) {
      console.error('Error creating call activity:', err);
      throw err;
    }
  }, [makeApiRequest]);

  // Sync recording to Outreach
  const syncRecording = useCallback(async (recordingId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase.functions.invoke('sync-to-outreach', {
        body: {
          recordingId,
          userId: user.id
        }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Sync failed');
      }

      toast({
        title: "Sync Successful",
        description: "Recording synced to Outreach successfully"
      });

      return data;
    } catch (err: any) {
      console.error('Error syncing recording:', err);
      toast({
        title: "Sync Failed",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  }, [user, toast]);

  // Get sync status for recording
  const getSyncStatus = useCallback(async (recordingId: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('outreach_sync_logs')
        .select('*')
        .eq('recording_id', recordingId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (err: any) {
      console.error('Error getting sync status:', err);
      return null;
    }
  }, [user]);

  // Disconnect Outreach
  const disconnect = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('outreach_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setConnection(null);
      
      toast({
        title: "Disconnected",
        description: "Your Outreach account has been disconnected"
      });
    } catch (err: any) {
      console.error('Error disconnecting:', err);
      toast({
        title: "Disconnection Failed",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  }, [user, toast]);

  return {
    connection,
    isConnected: !!connection,
    isLoading,
    error,
    disconnect,
    refreshToken,
    searchProspects,
    createCallActivity,
    syncRecording,
    getSyncStatus
  };
}