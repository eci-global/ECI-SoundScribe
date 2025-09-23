
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface Alert {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'firing' | 'acknowledged' | 'resolved';
  metric: string;
  value: number;
  threshold: number;
  startTime: string;
  rule: AlertRule;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: string;
  threshold: number;
  duration: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  notifications: {
    type: string;
    enabled: boolean;
    config: any;
  }[];
}

export interface AlertStats {
  firing: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  warning: number;
  info: number;
  avgResolutionTime: number;
}

export function useSystemAlerts() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [stats, setStats] = useState<AlertStats>({
    firing: 0,
    acknowledged: 0,
    resolved: 0,
    critical: 0,
    warning: 0,
    info: 0,
    avgResolutionTime: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAlerts();
    fetchAlertRules();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      // Mock alerts data - in real implementation, fetch from database
      const mockAlerts: Alert[] = [
        {
          id: 'alert-1',
          name: 'High CPU Usage',
          description: 'CPU usage has exceeded 90% for more than 5 minutes',
          severity: 'critical',
          status: 'firing',
          metric: 'cpu_usage',
          value: 95.2,
          threshold: 90,
          startTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          rule: {
            id: 'rule-1',
            name: 'CPU Alert Rule',
            description: 'Alert when CPU usage is high',
            metric: 'cpu_usage',
            condition: 'greater_than',
            threshold: 90,
            duration: 300,
            severity: 'critical',
            enabled: true,
            notifications: [
              { type: 'email', enabled: true, config: { recipients: ['admin@company.com'] } },
              { type: 'in_app', enabled: true, config: {} }
            ]
          }
        }
      ];

      setAlerts(mockAlerts);
      
      // Calculate stats
      const newStats = mockAlerts.reduce((acc, alert) => {
        acc[alert.status]++;
        acc[alert.severity]++;
        return acc;
      }, {
        firing: 0,
        acknowledged: 0,
        resolved: 0,
        critical: 0,
        warning: 0,
        info: 0,
        avgResolutionTime: 15
      });

      setStats(newStats);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch alerts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertRules = async () => {
    try {
      // Mock alert rules - in real implementation, fetch from database
      const mockRules: AlertRule[] = [
        {
          id: 'rule-1',
          name: 'CPU Alert Rule',
          description: 'Alert when CPU usage is high',
          metric: 'cpu_usage',
          condition: 'greater_than',
          threshold: 90,
          duration: 300,
          severity: 'critical',
          enabled: true,
          notifications: [
            { type: 'email', enabled: true, config: { recipients: ['admin@company.com'] } },
            { type: 'in_app', enabled: true, config: {} }
          ]
        },
        {
          id: 'rule-2',
          name: 'Memory Alert Rule',
          description: 'Alert when memory usage is high',
          metric: 'memory_usage',
          condition: 'greater_than',
          threshold: 85,
          duration: 600,
          severity: 'warning',
          enabled: true,
          notifications: [
            { type: 'email', enabled: false, config: { recipients: ['admin@company.com'] } },
            { type: 'in_app', enabled: true, config: {} }
          ]
        }
      ];

      setAlertRules(mockRules);
    } catch (error) {
      console.error('Error fetching alert rules:', error);
      toast({
        title: "Error",
        description: "Failed to fetch alert rules",
        variant: "destructive"
      });
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, status: 'acknowledged' as const } : alert
      ));

      toast({
        title: "Alert Acknowledged",
        description: "Alert has been acknowledged successfully",
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive"
      });
    }
  };

  const updateAlertRule = async (ruleId: string, updates: Partial<AlertRule>) => {
    try {
      setAlertRules(prev => prev.map(rule => 
        rule.id === ruleId ? { ...rule, ...updates } : rule
      ));

      toast({
        title: "Alert Rule Updated",
        description: "Alert rule has been updated successfully",
      });
    } catch (error) {
      console.error('Error updating alert rule:', error);
      toast({
        title: "Error",
        description: "Failed to update alert rule",
        variant: "destructive"
      });
    }
  };

  const refreshAlerts = async () => {
    await fetchAlerts();
    await fetchAlertRules();
  };

  return {
    alerts,
    alertRules,
    stats,
    loading,
    acknowledgeAlert,
    updateAlertRule,
    refreshAlerts
  };
}
