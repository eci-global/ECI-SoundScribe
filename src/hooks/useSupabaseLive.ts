import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createSafeChannel, removeChannel } from '@/utils/realtimeUtils';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseSupabaseLiveOptions {
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  filter?: { column: string; value: any; operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' };
  enableRealtime?: boolean;
  refreshInterval?: number; // milliseconds, for periodic refresh
  onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void;
}

type TableName = keyof Database['public']['Tables'];
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

interface LiveConnectionStatus {
  connected: boolean;
  lastUpdated: Date | null;
  error?: string;
}

export function useSupabaseLive<T extends TableName>(
  tableName: T, 
  options: UseSupabaseLiveOptions = {}
) {
  const [data, setData] = useState<TableRow<T>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<LiveConnectionStatus>({
    connected: false,
    lastUpdated: null
  });
  
  const { user } = useAuth();
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef(options);
  
  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Fetch data function with enhanced error handling
  const fetchData = useCallback(async (showLoadingState = false) => {
    try {
      if (showLoadingState) {
        setLoading(true);
      }
      setError(null);
        
      let query = supabase.from(tableName).select('*');
        
      // Apply filters
      if (optionsRef.current.filter) {
        const { column, value, operator = 'eq' } = optionsRef.current.filter;
        query = query.filter(column, operator, value);
      }
        
      // Apply ordering
      if (optionsRef.current.orderBy) {
        query = query.order(optionsRef.current.orderBy.column, { 
          ascending: optionsRef.current.orderBy.ascending ?? true 
        });
      }
        
      // Apply limit
      if (optionsRef.current.limit) {
        query = query.limit(optionsRef.current.limit);
      }
        
      const { data: queryData, error: queryError } = await query;
        
      if (queryError) {
        throw queryError;
      }
        
      setData(queryData as unknown as TableRow<T>[]);
      setConnectionStatus(prev => ({
        ...prev,
        lastUpdated: new Date(),
        error: undefined
      }));
    } catch (err: any) {
      console.error(`Error fetching ${tableName}:`, err);
      setError(err.message || 'Failed to fetch data');
      setConnectionStatus(prev => ({
        ...prev,
        error: err.message || 'Failed to fetch data'
      }));
        
      // Fallback to mock data on error - cast through unknown to avoid type issues
      setData(getMockData(tableName) as unknown as TableRow<T>[]);
    } finally {
      if (showLoadingState) {
        setLoading(false);
      }
    }
  }, [tableName]);

  // Setup real-time subscription with proper authentication
  const setupRealtimeSubscription = useCallback(() => {
    if (!optionsRef.current.enableRealtime) {
      return;
    }

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    try {
      const channelName = `${tableName}_changes_${user?.id || 'anonymous'}`;
      
      // Use safe channel creation to handle environment variable and failures
      subscriptionRef.current = createSafeChannel(channelName, {
          config: {
            broadcast: { self: true },
            presence: { key: user?.id || 'anonymous' }
          }
        });
      
      if (!subscriptionRef.current) {
        console.warn(`Could not create safe channel for ${tableName}`);
        return;
      }
      
      subscriptionRef.current
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: tableName
        }, (payload: RealtimePostgresChangesPayload<any>) => {
          console.log(`Real-time ${payload.eventType} received for ${tableName}:`, payload);
          
          // Call specific event handlers if provided
          switch (payload.eventType) {
            case 'INSERT':
              optionsRef.current.onInsert?.(payload);
              break;
            case 'UPDATE':
              optionsRef.current.onUpdate?.(payload);
              break;
            case 'DELETE':
              optionsRef.current.onDelete?.(payload);
              break;
          }
          
          // Refetch data after any change
          fetchData(false);
        })
        .subscribe((status) => {
          console.log(`Subscription status for ${tableName}:`, status);
          setConnectionStatus(prev => ({
            ...prev,
            connected: status === 'SUBSCRIBED',
            error: status === 'CLOSED' || status === 'CHANNEL_ERROR' ? 
              `Connection ${status.toLowerCase()}` : undefined
          }));
        });

    } catch (err: any) {
      console.error(`Error setting up real-time subscription for ${tableName}:`, err);
      setConnectionStatus(prev => ({
        ...prev,
        connected: false,
        error: err.message || 'Failed to setup real-time subscription'
      }));
    }
  }, [tableName, user?.id, fetchData]);

  // Setup periodic refresh interval
  const setupRefreshInterval = useCallback(() => {
    if (optionsRef.current.refreshInterval && optionsRef.current.refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        fetchData(false);
      }, optionsRef.current.refreshInterval);
    }
  }, [fetchData]);

  // Main effect for initialization
  useEffect(() => {
    // Initial fetch
    fetchData(true);
    
    // Set up real-time subscription if enabled
    if (optionsRef.current.enableRealtime !== false) {
      setupRealtimeSubscription();
    }
    
    // Setup refresh interval if specified
    setupRefreshInterval();
    
    return () => {
      // Clean up subscription using connection manager
      if (subscriptionRef.current) {
        const channelName = `${tableName}_changes_${user?.id || 'anonymous'}`;
        removeChannel(channelName);
        subscriptionRef.current = null;
      }
      
      // Clean up interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [tableName, user?.id, fetchData, setupRealtimeSubscription, setupRefreshInterval]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);
  
  // Force reconnect function
  const reconnect = useCallback(() => {
    setupRealtimeSubscription();
  }, [setupRealtimeSubscription]);

  return { 
    data, 
    loading, 
    error, 
    connectionStatus,
    refresh,
    reconnect,
    isConnected: connectionStatus.connected,
    lastUpdated: connectionStatus.lastUpdated
  };
}

// Mock data fallback for development/testing
function getMockData(tableName: string): any[] {
  const mockData: Record<string, any[]> = {
    'recordings': [
      {
        id: '1',
        title: 'Sales Call - John Smith',
        duration: 1234,
        created_at: '2025-01-20T10:30:00Z',
        user_id: 'sarah.johnson@ecisolutions.com',
        status: 'completed',
        file_size: 5242880
      },
      {
        id: '2',
        title: 'Customer Support - ABC Corp',
        duration: 890,
        created_at: '2025-01-20T09:15:00Z',
        user_id: 'mike.chen@ecisolutions.com',
        status: 'processing',
        file_size: 3145728
      }
    ],
    'audit_logs': [
      {
        id: '1',
        timestamp: '2025-01-20T12:30:00Z',
        user: 'admin@ecisolutions.com',
        action: 'user.create',
        resource: 'users/john.smith',
        details: 'Created new user account',
        ip_address: '192.168.1.100',
        severity: 'info'
      }
    ],
    'access_policies': [
      {
        id: '1',
        name: 'Admin Full Access',
        description: 'Complete system access for administrators',
        resource: '*',
        permissions: ['read', 'write', 'delete', 'admin'],
        groups: ['Administrators'],
        enabled: true,
        last_modified: '2025-01-15T10:00:00Z'
      }
    ]
  };
  
  return mockData[tableName] || [];
}
