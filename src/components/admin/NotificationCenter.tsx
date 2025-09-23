
import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface SystemNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  dismissed: boolean;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    try {
      // Get basic metrics from recordings table instead of non-existent function
      const { data: recordings, error } = await supabase
        .from('recordings')
        .select('id, file_size, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      const newNotifications: SystemNotification[] = [];

      if (recordings && !error) {
        // Calculate basic storage usage
        const totalSize = recordings.reduce((acc, rec) => acc + (rec.file_size || 0), 0);
        const failedRecordings = recordings.filter(r => r.status === 'failed').length;
        const recentRecordings = recordings.filter(r => 
          new Date(r.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length;

        // Check storage if available
        if (totalSize > 8 * 1024 * 1024 * 1024) { // 8GB
          newNotifications.push({
            id: 'storage-warning',
            type: 'warning',
            title: 'Storage Usage High',
            message: `Storage usage is approaching limits. Consider cleaning up old files.`,
            timestamp: new Date(),
            dismissed: false
          });
        }

        // Check for failed recordings
        if (failedRecordings > 5) {
          newNotifications.push({
            id: 'failed-recordings',
            type: 'error',
            title: 'High Failure Rate',
            message: `${failedRecordings} recordings have failed processing. Please investigate.`,
            timestamp: new Date(),
            dismissed: false
          });
        }

        // Check activity levels
        if (recentRecordings > 50) {
          newNotifications.push({
            id: 'high-activity',
            type: 'success',
            title: 'High Activity',
            message: `${recentRecordings} recordings uploaded in the last 24 hours. Great engagement!`,
            timestamp: new Date(),
            dismissed: false
          });
        }
      }

      // Add default system health notification if no issues
      if (newNotifications.length === 0) {
        newNotifications.push({
          id: 'system-healthy',
          type: 'success',
          title: 'System Operating Normally',
          message: 'All systems are functioning within normal parameters.',
          timestamp: new Date(),
          dismissed: false
        });
      }

      setNotifications(newNotifications);
    } catch (error) {
      console.error('Error checking system health:', error);
      
      // Add error notification
      setNotifications([{
        id: 'health-check-failed',
        type: 'error',
        title: 'Health Check Failed',
        message: 'Unable to retrieve system health metrics. Please check system status.',
        timestamp: new Date(),
        dismissed: false
      }]);
    } finally {
      setLoading(false);
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, dismissed: true }
          : notification
      )
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getNotificationBadgeVariant = (type: string) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'success':
        return 'default';
      case 'info':
      default:
        return 'outline';
    }
  };

  const activeNotifications = notifications.filter(n => !n.dismissed);
  const dismissedCount = notifications.filter(n => n.dismissed).length;

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            System Notifications
          </h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          System Notifications
        </h3>
        <div className="flex items-center gap-2">
          {activeNotifications.length > 0 && (
            <Badge variant="secondary">
              {activeNotifications.length} active
            </Badge>
          )}
          {dismissedCount > 0 && (
            <Badge variant="outline">
              {dismissedCount} dismissed
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {activeNotifications.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No active notifications</p>
          </div>
        ) : (
          activeNotifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-start space-x-3 p-3 border rounded-lg bg-gray-50"
            >
              <div className="flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {notification.title}
                  </h4>
                  <Badge variant={getNotificationBadgeVariant(notification.type) as any}>
                    {notification.type}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {notification.message}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {notification.timestamp.toLocaleString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissNotification(notification.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={checkSystemHealth}
          disabled={loading}
          className="w-full"
        >
          Refresh Notifications
        </Button>
      </div>
    </Card>
  );
}
