
import React, { useState, useEffect } from 'react';
import { Clock, User, FileText, MessageSquare, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';

interface ActivityEvent {
  id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: any;
  created_at: string;
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      // Fetch recent recordings as activity
      const { data: recordings } = await supabase
        .from('recordings')
        .select('id, title, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recordings && recordings.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(recordings.map(r => r.user_id))];
        
        // Fetch profiles separately using the correct table name
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        // Create a map for quick lookup
        const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

        const activityEvents: ActivityEvent[] = recordings.map(recording => ({
          id: recording.id,
          user_email: profileMap.get(recording.user_id) || 'Unknown User',
          action: 'uploaded',
          resource_type: 'recording',
          resource_id: recording.id,
          details: { title: recording.title },
          created_at: recording.created_at
        }));

        setActivities(activityEvents);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'recording':
        return <FileText className="h-4 w-4" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent activity</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                {getActivityIcon(activity.resource_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.user_email}</span>{' '}
                  {activity.action} a {activity.resource_type}
                  {activity.details?.title && (
                    <span className="font-medium"> "{activity.details.title}"</span>
                  )}
                </p>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(activity.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
