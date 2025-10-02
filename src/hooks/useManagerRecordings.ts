import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FilterState {
  search: string;
  employeeName: string;
  teamId: string;
  contentType: string;
  status: string;
  bdrScoreRange: [number, number];
  dateRange: {
    from: string;
    to: string;
  };
}

interface Recording {
  id: string;
  title: string;
  employee_name: string;
  customer_name: string;
  content_type: 'sales_call' | 'customer_support' | 'team_meeting';
  status: 'completed' | 'processing' | 'failed' | 'uploading';
  duration: number;
  file_size: number;
  created_at: string;
  team_name: string;
  team_department: string;
  bdr_overall_score: number | null;
  bdr_opening_score: number | null;
  bdr_tone_energy_score: number | null;
  uploader_name: string;
  uploader_email: string;
}

interface Team {
  id: string;
  name: string;
  department: string;
  is_active: boolean;
}

interface UseManagerRecordingsParams {
  filters: FilterState;
  page: number;
  limit: number;
}

interface UseManagerRecordingsResult {
  recordings: Recording[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  teams: Team[];
  refetch: () => Promise<void>;
}

export const useManagerRecordings = ({
  filters,
  page,
  limit
}: UseManagerRecordingsParams): UseManagerRecordingsResult => {
  const queryClient = useQueryClient();
  const [totalCount, setTotalCount] = useState(0);

  // Fetch teams data
  const {
    data: teams = [],
    error: teamsError
  } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, department, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Team[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch recordings data
  const {
    data: recordings = [],
    isLoading: recordingsLoading,
    error: recordingsError,
    refetch: refetchRecordings
  } = useQuery({
    queryKey: ['manager-recordings', filters, page, limit],
    queryFn: async () => {
      try {
        // Build the query for manager_accessible_recordings view
        let query = supabase
          .from('manager_accessible_recordings')
          .select('*', { count: 'exact' });

        // Apply filters
        if (filters.search) {
          // Full-text search across multiple fields
          query = query.or([
            `employee_name.ilike.%${filters.search}%`,
            `customer_name.ilike.%${filters.search}%`,
            `title.ilike.%${filters.search}%`,
            `transcript.ilike.%${filters.search}%`
          ].join(','));
        }

        if (filters.employeeName) {
          query = query.ilike('employee_name', `%${filters.employeeName}%`);
        }

        if (filters.teamId && filters.teamId !== 'all_teams') {
          query = query.eq('team_id', filters.teamId);
        }

        if (filters.contentType && filters.contentType !== 'all_types') {
          query = query.eq('content_type', filters.contentType);
        }

        if (filters.status && filters.status !== 'all_statuses') {
          query = query.eq('status', filters.status);
        }

        // BDR Score range filter
        if (filters.bdrScoreRange[0] > 0 || filters.bdrScoreRange[1] < 4) {
          query = query
            .gte('bdr_overall_score', filters.bdrScoreRange[0])
            .lte('bdr_overall_score', filters.bdrScoreRange[1]);
        }

        // Date range filter
        if (filters.dateRange.from) {
          query = query.gte('created_at', filters.dateRange.from);
        }

        if (filters.dateRange.to) {
          // Add one day to include the end date
          const toDate = new Date(filters.dateRange.to);
          toDate.setDate(toDate.getDate() + 1);
          query = query.lt('created_at', toDate.toISOString().split('T')[0]);
        }

        // Pagination
        const offset = (page - 1) * limit;
        query = query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        // Update total count
        setTotalCount(count || 0);

        return data as Recording[];
      } catch (error) {
        console.error('Error fetching recordings:', error);
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute for live updates
  });

  // Set up real-time subscription for recordings updates
  useEffect(() => {
    const channel = supabase
      .channel('recordings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recordings'
        },
        (payload) => {
          console.log('Recordings change detected:', payload);
          // Invalidate and refetch recordings
          queryClient.invalidateQueries({ queryKey: ['manager-recordings'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bdr_scorecard_evaluations'
        },
        (payload) => {
          console.log('BDR evaluations change detected:', payload);
          // Invalidate and refetch recordings (for BDR score updates)
          queryClient.invalidateQueries({ queryKey: ['manager-recordings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['manager-recordings'] }),
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    ]);
    await refetchRecordings();
  }, [queryClient, refetchRecordings]);

  // Combine loading states and errors
  const loading = recordingsLoading;
  const error = recordingsError?.message || teamsError?.message || null;

  return {
    recordings,
    loading,
    error,
    totalCount,
    teams,
    refetch
  };
};

// Additional hook for getting current user's team info
export const useCurrentUserTeam = () => {
  return useQuery({
    queryKey: ['current-user-team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_user_team_info');

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for managing team assignments
export const useTeamManagement = () => {
  const queryClient = useQueryClient();

  const assignUserToTeam = useCallback(async (
    userId: string,
    teamId: string,
    employeeName: string,
    role: 'manager' | 'member' = 'member'
  ) => {
    const { data, error } = await supabase
      .rpc('assign_user_to_team', {
        p_user_id: userId,
        p_team_id: teamId,
        p_employee_name: employeeName,
        p_role: role
      });

    if (error) throw error;

    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['manager-recordings'] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });

    return data;
  }, [queryClient]);

  return {
    assignUserToTeam
  };
};

// Hook for bulk operations
export const useBulkOperations = () => {
  const [operations, setOperations] = useState<Map<string, any>>(new Map());

  const startOperation = useCallback((operationId: string, operationData: any) => {
    setOperations(prev => new Map(prev.set(operationId, operationData)));
  }, []);

  const updateOperation = useCallback((operationId: string, updates: Partial<any>) => {
    setOperations(prev => {
      const current = prev.get(operationId);
      if (current) {
        return new Map(prev.set(operationId, { ...current, ...updates }));
      }
      return prev;
    });
  }, []);

  const completeOperation = useCallback((operationId: string) => {
    setOperations(prev => {
      const newMap = new Map(prev);
      newMap.delete(operationId);
      return newMap;
    });
  }, []);

  return {
    operations: Array.from(operations.values()),
    startOperation,
    updateOperation,
    completeOperation
  };
};