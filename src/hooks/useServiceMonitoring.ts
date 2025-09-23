
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ServiceStatus {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  responseTime: number;
  uptime: number;
  errorRate: number;
}

export interface AlertRule {
  id: string;
  name: string;
  serviceId: string;
  condition: 'uptime' | 'error_rate' | 'response_time' | 'status_change';
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  actions: string[];
}

export interface Alert {
  id: string;
  ruleId: string;
  serviceId: string;
  serviceName: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledged: boolean;
  timestamp: Date;
}

export interface MonitoringAlert extends Alert {}

export function useServiceMonitoring() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mock data for service monitoring
    const mockServices: ServiceStatus[] = [
      {
        id: '1',
        name: 'Recording Upload Service',
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 120,
        uptime: 99.9,
        errorRate: 0.1
      },
      {
        id: '2',
        name: 'AI Processing Service',
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 350,
        uptime: 99.5,
        errorRate: 0.5
      },
      {
        id: '3',
        name: 'Database',
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 45,
        uptime: 99.99,
        errorRate: 0.01
      }
    ];

    const mockAlertRules: AlertRule[] = [
      {
        id: '1',
        name: 'High Error Rate',
        serviceId: '1',
        condition: 'error_rate' as const,
        threshold: 5,
        operator: 'gt' as const,
        duration: 300,
        severity: 'high' as const,
        enabled: true,
        actions: ['email', 'slack']
      },
      {
        id: '2',
        name: 'Service Down',
        serviceId: '2',
        condition: 'uptime' as const,
        threshold: 95,
        operator: 'lt' as const,
        duration: 60,
        severity: 'critical' as const,
        enabled: true,
        actions: ['email', 'slack', 'pagerduty']
      }
    ];

    const mockAlerts: Alert[] = [
      {
        id: '1',
        ruleId: '1',
        serviceId: '2',
        serviceName: 'AI Processing Service',
        message: 'Response time above threshold',
        severity: 'medium',
        status: 'active',
        triggeredAt: new Date(Date.now() - 3600000), // 1 hour ago
        acknowledged: false,
        timestamp: new Date(Date.now() - 3600000)
      }
    ];

    setServices(mockServices);
    setAlertRules(mockAlertRules);
    setAlerts(mockAlerts);
    setLoading(false);
  }, []);

  const acknowledgeAlert = async (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'acknowledged' as const }
          : alert
      )
    );
  };

  const resolveAlert = async (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { 
              ...alert, 
              status: 'resolved' as const,
              resolvedAt: new Date()
            }
          : alert
      )
    );
  };

  const createAlertRule = async (rule: Omit<AlertRule, 'id'>) => {
    const newRule: AlertRule = {
      ...rule,
      id: Date.now().toString()
    };
    setAlertRules(prev => [...prev, newRule]);
    return newRule;
  };

  const updateAlertRule = async (ruleId: string, updates: Partial<AlertRule>) => {
    setAlertRules(prev => 
      prev.map(rule => 
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    );
  };

  const deleteAlertRule = async (ruleId: string) => {
    setAlertRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  const refreshServices = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const calculateSLACompliance = () => {
    return services.reduce((acc, service) => acc + service.uptime, 0) / services.length;
  };

  const addAlertRule = createAlertRule;

  return {
    services,
    alerts,
    alertRules,
    loading,
    error,
    acknowledgeAlert,
    resolveAlert,
    createAlertRule,
    updateAlertRule,
    deleteAlertRule,
    refreshServices,
    calculateSLACompliance,
    addAlertRule
  };
}
