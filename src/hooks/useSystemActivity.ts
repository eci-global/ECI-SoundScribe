
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ActivityItem {
  id: string;
  timestamp: string;
  user_email: string;
  action: string;
  details: string;
  table_name: string;
}

interface ActivitySummary {
  totalActivities: number;
  userActivities: number;
  systemActivities: number;
  errorCount: number;
}

export function useSystemActivity() {
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [summary, setSummary] = useState<ActivitySummary>({
    totalActivities: 0,
    userActivities: 0,
    systemActivities: 0,
    errorCount: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSystemActivity();
  }, []);

  const fetchSystemActivity = async () => {
    setLoading(true);
    try {
      // Since audit_logs table doesn't exist, we'll generate activity from existing tables
      // Fetch recent recordings as activity
      const { data: recordings, error: recordingsError } = await supabase
        .from('recordings')
        .select('id, created_at, user_id, title, status')
        .order('created_at', { ascending: false })
        .limit(50);

      if (recordingsError) {
        throw recordingsError;
      }

      // Fetch profiles to get user emails
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email');

      if (profilesError) {
        console.warn('Error fetching profiles:', profilesError);
      }

      // Create a map of user_id to email
      const userEmailMap = new Map();
      if (profiles) {
        profiles.forEach(profile => {
          userEmailMap.set(profile.id, profile.email || 'Unknown User');
        });
      }

      // Transform recordings into activity items
      const recordingActivities: ActivityItem[] = (recordings || []).map(recording => ({
        id: recording.id,
        timestamp: recording.created_at,
        user_email: userEmailMap.get(recording.user_id) || 'Unknown User',
        action: 'Recording Upload',
        details: `${recording.title} - Status: ${recording.status}`,
        table_name: 'recordings'
      }));

      // Calculate summary
      const activitySummary: ActivitySummary = {
        totalActivities: recordingActivities.length,
        userActivities: recordingActivities.filter(a => a.action === 'Recording Upload').length,
        systemActivities: recordingActivities.filter(a => a.action.includes('System')).length,
        errorCount: recordingActivities.filter(a => a.details.includes('failed')).length
      };

      setActivities(recordingActivities);
      setSummary(activitySummary);

    } catch (error) {
      console.error('Error fetching system activity:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system activity",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    activities,
    summary,
    loading,
    refetch: fetchSystemActivity
  };
}
