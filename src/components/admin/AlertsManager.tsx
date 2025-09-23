import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSystemAlerts } from '@/hooks/useSystemAlerts';
import { useSystemActivity } from '@/hooks/useSystemActivity';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Bell,
  BellOff,
  Settings,
  Mail,
  Smartphone,
  Webhook,
  RefreshCw,
  Play,
  Pause
} from 'lucide-react';

interface SystemNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  dismissed: boolean;
  alertId?: string;
}

interface AlertsManagerProps {
  className?: string;
  showConfiguration?: boolean;
}

export default function AlertsManager({ className = '', showConfiguration = true }: AlertsManagerProps) {
  const { alerts, alertRules, stats, loading, acknowledgeAlert, updateAlertRule, refreshAlerts } = useSystemAlerts();
  const { activities, summary, loading: activityLoading, refetch: refetchActivity } = useSystemActivity();
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const { toast } = useToast();

  // Activity logging function
  const logActivity = async (action: string, table: string, recordId: string, severity: string, details: any) => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          action,
          resource_type: table,
          resource_id: recordId,
          metadata: { severity, details },
          user_id: (await supabase.auth.getUser()).data.user?.id,
          created_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      // Refresh activity data
      await refetchActivity();
    } catch (error: any) {
      console.error('Failed to log activity:', error);
      toast({
        title: "Activity Logging Failed",
        description: "Failed to record system activity",
        variant: "destructive"
      });
    }
  };

  // Handle new alerts
  useEffect(() => {
    const handleNewAlerts = () => {
      const firingAlerts = alerts.filter(a => a.status === 'firing');
      const newNotifications: SystemNotification[] = [];
      
      for (const alert of firingAlerts) {
        const existingNotification = notifications.find(n => n.alertId === alert.id);
        if (!existingNotification) {
          newNotifications.push({
            id: `alert_${alert.id}_${Date.now()}`,
            type: alert.severity === 'critical' ? 'error' : 
                  alert.severity === 'warning' ? 'warning' : 
                  alert.severity === 'info' ? 'info' : 'success',
            title: `${alert.severity.toUpperCase()}: ${alert.name}`,
            message: alert.description,
            timestamp: new Date(),
            dismissed: false,
            alertId: alert.id
          });
        }
      }

      if (newNotifications.length > 0) {
        setNotifications(prev => [...prev, ...newNotifications]);

        // Show browser notifications
        if ('Notification' in window && Notification.permission === 'granted') {
          newNotifications.forEach(notification => {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico',
              badge: '/favicon.ico'
            });
          });
        }
      }
    };

    handleNewAlerts();
  }, [alerts]);

  const getSeverityIcon = (severity: string) => {
    const icons = {
      critical: { icon: XCircle, color: 'text-red-600' },
      warning: { icon: AlertTriangle, color: 'text-orange-600' },
      info: { icon: CheckCircle, color: 'text-blue-600' }
    };
    const config = icons[severity as keyof typeof icons] || icons.info;
    const Icon = config.icon;
    return <Icon className={`h-5 w-5 ${config.color}`} />;
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-orange-100 text-orange-800 border-orange-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return <Badge className={variants[severity as keyof typeof variants] || variants.info}>{severity}</Badge>;
  };

  const getNotificationIcon = (type: string) => {
    const icons = {
      email: Mail,
      in_app: Bell,
      webhook: Webhook
    };
    return icons[type as keyof typeof icons] || Bell;
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    await acknowledgeAlert(alertId);
    
    // Mark related notifications as dismissed
    setNotifications(prev => 
      prev.map(n => 
        n.alertId === alertId ? { ...n, dismissed: true } : n
      )
    );

    // Log the acknowledgment
    await logActivity(
      'alert_acknowledged',
      'alerts',
      alertId,
      'info',
      { alert_id: alertId, acknowledged_by: 'admin' }
    );
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    await updateAlertRule(ruleId, { enabled });
    await logActivity(
      'alert_rule_modified',
      'alert_rules',
      ruleId,
      'info',
      { rule_id: ruleId, enabled, action: enabled ? 'enabled' : 'disabled' }
    );
  };

  const handleToggleNotification = async (ruleId: string, notificationIndex: number, enabled: boolean) => {
    const rule = alertRules.find(r => r.id === ruleId);
    if (!rule) return;

    const updatedNotifications = [...rule.notifications];
    updatedNotifications[notificationIndex] = { ...updatedNotifications[notificationIndex], enabled };
    
    await updateAlertRule(ruleId, { notifications: updatedNotifications });
    await logActivity(
      'notification_rule_modified',
      'alert_rules',
      ruleId,
      'info',
      { 
        rule_id: ruleId, 
        notification_type: updatedNotifications[notificationIndex].type,
        enabled 
      }
    );
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Notifications Enabled', {
          body: 'You will now receive system alerts',
          icon: '/favicon.ico'
        });
      }
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'firing');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');
  const activeNotifications = notifications.filter(n => !n.dismissed);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Alert Overview */}
      <Card className="border-eci-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-body-large text-eci-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Alert Manager
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={refreshAlerts}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={requestNotificationPermission}
                variant="outline"
                size="sm"
              >
                <Bell className="h-4 w-4 mr-2" />
                Enable Notifications
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-title-large font-semibold text-red-600">{stats?.firing || 0}</div>
              <div className="text-caption text-eci-gray-600">Active Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-title-large font-semibold text-orange-600">{stats?.critical || 0}</div>
              <div className="text-caption text-eci-gray-600">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-title-large font-semibold text-blue-600">{stats?.acknowledged || 0}</div>
              <div className="text-caption text-eci-gray-600">Acknowledged</div>
            </div>
            <div className="text-center">
              <div className="text-title-large font-semibold text-green-600">{stats?.avgResolutionTime || 0}m</div>
              <div className="text-caption text-eci-gray-600">Avg Resolution</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card className="border-eci-gray-200">
        <CardHeader>
          <CardTitle className="text-body-large text-eci-gray-900">
            Active Alerts ({activeAlerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-body text-eci-gray-600">No active alerts</p>
              <p className="text-body-small text-eci-gray-500 mt-1">All systems operating normally</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((alert) => (
                <div key={alert.id} className="border border-eci-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3 flex-1">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-body font-semibold text-eci-gray-900">{alert.name}</h3>
                          {getSeverityBadge(alert.severity)}
                          <Badge variant="outline" className="text-xs">
                            {alert.metric}
                          </Badge>
                        </div>
                        <p className="text-body-small text-eci-gray-600 mb-3">{alert.description}</p>
                        <div className="flex items-center gap-4 text-caption text-eci-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Started {new Date(alert.startTime).toLocaleString()}
                          </div>
                          <div>
                            Current: <span className="font-medium text-eci-gray-900">{alert.value}</span>
                            {' / '}
                            Threshold: <span className="font-medium">{alert.threshold}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        variant="outline"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Acknowledge
                      </Button>
                      <Badge variant="destructive">Firing</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
