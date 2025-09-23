import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bell, 
  Webhook, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Settings,
  ExternalLink,
  Zap,
  Mail,
  Slack
} from 'lucide-react';
import { useServiceMonitoring } from '@/hooks/useServiceMonitoring';
import { useIntegrationStatus } from '@/hooks/useIntegrationStatus';
import { useToast } from '@/hooks/use-toast';
import type { ServiceHealth } from '@/hooks/useIntegrationStatus';
import type { AlertRule, MonitoringAlert } from '@/hooks/useServiceMonitoring';

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  events: string[];
  lastTriggered?: string;
  failureCount: number;
}

interface ServiceMonitoringWidgetProps {
  onConfigChange?: (config: any) => void;
}

export default function ServiceMonitoringWidget({ onConfigChange }: ServiceMonitoringWidgetProps) {
  const { toast } = useToast();
  
  // Get integration status and monitoring data
  const { services, isMonitoring, startMonitoring, stopMonitoring } = useIntegrationStatus();
  const {
    alerts,
    alertRules,
    calculateSLACompliance,
    acknowledgeAlert,
    resolveAlert,
    addAlertRule,
    updateAlertRule,
    deleteAlertRule
  } = useServiceMonitoring();

  // Local state
  const [webhookEndpoints, setWebhookEndpoints] = useState<WebhookEndpoint[]>([]);
  
  // Load webhook endpoints from configuration
  useEffect(() => {
    const loadWebhookEndpoints = async () => {
      try {
        const response = await fetch('/api/admin/webhooks');
        if (response.ok) {
          const endpoints = await response.json();
          setWebhookEndpoints(endpoints);
        } else {
          console.error('Failed to load webhook endpoints');
          toast({
            title: "Error",
            description: "Failed to load webhook configuration",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error loading webhook endpoints:', error);
        toast({
          title: "Error",
          description: "Failed to load webhook configuration",
          variant: "destructive"
        });
      }
    };
    
    loadWebhookEndpoints();
  }, []);

  // Save webhook endpoints
  const saveWebhookEndpoints = async (endpoints: WebhookEndpoint[]) => {
    try {
      const response = await fetch('/api/admin/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(endpoints),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save webhook configuration');
      }
      
      setWebhookEndpoints(endpoints);
      toast({
        title: "Success",
        description: "Webhook configuration saved successfully",
      });
    } catch (error) {
      console.error('Error saving webhook endpoints:', error);
      toast({
        title: "Error",
        description: "Failed to save webhook configuration",
        variant: "destructive"
      });
    }
  };
  
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookName, setNewWebhookName] = useState('');
  const [selectedWebhook, setSelectedWebhook] = useState<string>('');
  const [showAlertRuleForm, setShowAlertRuleForm] = useState(false);
  const [newAlertRule, setNewAlertRule] = useState({
    name: '',
    serviceId: '',
    condition: 'response_time' as const,
    threshold: 5000,
    operator: 'gt' as const,
    duration: 5,
    severity: 'medium' as const,
    actions: ['log'] as Array<'email' | 'webhook' | 'slack' | 'log'>
  });

  // Real-time alert notifications
  useEffect(() => {
    if (alerts.length > 0) {
      const criticalAlerts = alerts.filter(alert => 
        alert.severity === 'critical' && !alert.acknowledged
      );
      
      if (criticalAlerts.length > 0) {
        // Trigger webhook notifications
        triggerWebhookNotifications(criticalAlerts);
      }
    }
  }, [alerts]);

  // Constants for retry logic
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;
  const MAX_CONCURRENT_NOTIFICATIONS = 5;

  // Trigger webhook notifications with rate limiting
  const triggerWebhookNotifications = async (alertsToSend: MonitoringAlert[]) => {
    const enabledWebhooks = webhookEndpoints.filter(w => w.enabled);
    const notificationQueue = [];
    
    for (const webhook of enabledWebhooks) {
      for (const alert of alertsToSend) {
        if (webhook.events.includes(alert.severity)) {
          notificationQueue.push({ webhook, alert });
        }
      }
    }

    // Process notifications in batches to avoid overwhelming the system
    for (let i = 0; i < notificationQueue.length; i += MAX_CONCURRENT_NOTIFICATIONS) {
      const batch = notificationQueue.slice(i, i + MAX_CONCURRENT_NOTIFICATIONS);
      await Promise.all(batch.map(({ webhook, alert }) => 
        sendWebhookNotificationWithRetry(webhook, alert)
      ));
    }
  };

  // Send webhook notification with retry logic
  const sendWebhookNotificationWithRetry = async (webhook: WebhookEndpoint, alert: MonitoringAlert, retryCount = 0) => {
    try {
      await sendWebhookNotification(webhook, alert);
      // Update last triggered time and reset failure count
      setWebhookEndpoints(prev => prev.map(w => 
        w.id === webhook.id 
          ? { ...w, lastTriggered: new Date().toISOString(), failureCount: 0 }
          : w
      ));
    } catch (error) {
      console.error(`Webhook notification failed (attempt ${retryCount + 1}):`, error);
      
      // Increment failure count
      setWebhookEndpoints(prev => prev.map(w => 
        w.id === webhook.id 
          ? { ...w, failureCount: w.failureCount + 1 }
          : w
      ));

      // Check if we should retry
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retryCount)));
        return sendWebhookNotificationWithRetry(webhook, alert, retryCount + 1);
      } else {
        // Log the final failure
        console.error(`Webhook notification failed after ${MAX_RETRIES} retries:`, {
          webhookId: webhook.id,
          webhookName: webhook.name,
          alertId: alert.id,
          error
        });
        
        // Notify admin about the failure
        toast({
          title: "Webhook Notification Failed",
          description: `Failed to send notification to "${webhook.name}" after ${MAX_RETRIES} retries`,
          variant: "destructive"
        });

        // If webhook has failed too many times, disable it
        if (webhook.failureCount >= 10) {
          setWebhookEndpoints(prev => prev.map(w => 
            w.id === webhook.id 
              ? { ...w, enabled: false }
              : w
          ));
          
          toast({
            title: "Webhook Disabled",
            description: `Webhook "${webhook.name}" has been disabled due to repeated failures`,
            variant: "destructive"
          });
        }
      }
    }
  };

  // Send webhook notification with improved error handling
  const sendWebhookNotification = async (webhook: WebhookEndpoint, alert: MonitoringAlert) => {
    const payload = {
      event: 'service_alert',
      timestamp: new Date().toISOString(),
      alert: {
        id: alert.id,
        serviceName: alert.serviceName,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp,
        triggeredAt: alert.triggeredAt
      },
      source: 'echo-ai-scribe-monitoring'
    };

    let response;
    try {
      // Detect webhook type and format accordingly
      if (webhook.url.includes('slack.com')) {
        // Slack webhook format
        const slackPayload = {
          text: `🚨 Service Alert: ${alert.serviceName}`,
          attachments: [{
            color: {
              critical: 'danger',
              high: 'warning',
              medium: 'warning',
              low: 'good'
            }[alert.severity] || 'warning',
            fields: [
              { title: 'Service', value: alert.serviceName, short: true },
              { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
              { title: 'Time', value: new Date(alert.timestamp).toLocaleString(), short: true },
              { title: 'Message', value: alert.message, short: false }
            ]
          }]
        };
        
        response = await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload)
        });
      } else {
        // Generic webhook format
        response = await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error(`Network error: Could not reach ${webhook.url}`);
      }
      throw error;
    }
  };

  // Add new webhook
  const handleAddWebhook = async () => {
    if (!newWebhookUrl || !newWebhookName) {
      toast({
        title: "Validation Error",
        description: "Please enter both webhook name and URL",
        variant: "destructive"
      });
      return;
    }

    // Validate webhook URL
    try {
      const url = new URL(newWebhookUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid HTTPS webhook URL",
        variant: "destructive"
      });
      return;
    }

    const newWebhook: WebhookEndpoint = {
      id: `webhook-${Date.now()}`,
      name: newWebhookName,
      url: newWebhookUrl,
      enabled: true,
      events: ['service_down', 'slow_response', 'error_rate'],
      failureCount: 0
    };

    const updatedEndpoints = [...webhookEndpoints, newWebhook];
    await saveWebhookEndpoints(updatedEndpoints);
    
    setNewWebhookUrl('');
    setNewWebhookName('');
  };

  // Test webhook
  const handleTestWebhook = async (webhookId: string) => {
    const webhook = webhookEndpoints.find(w => w.id === webhookId);
    if (!webhook) return;

    const testAlert: MonitoringAlert = {
      id: 'test-alert',
      serviceId: 'test-service',
      serviceName: 'Test Service',
      ruleId: 'test-rule',
      severity: 'medium',
      status: 'active',
      message: 'This is a test alert from Echo AI Scribe monitoring system',
      timestamp: new Date(),
      triggeredAt: new Date(),
      acknowledged: false
    };

    try {
      await sendWebhookNotification(webhook, testAlert);
      toast({
        title: "Test Successful",
        description: `Test notification sent to ${webhook.name}`
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: `Failed to send test notification to ${webhook.name}`,
        variant: "destructive"
      });
    }
  };

  // Add new alert rule
  const handleAddAlertRule = () => {
    if (!newAlertRule.name || !newAlertRule.serviceId) {
      toast({
        title: "Validation Error",
        description: "Please enter rule name and select a service",
        variant: "destructive"
      });
      return;
    }

    addAlertRule({
      ...newAlertRule,
      enabled: true
    });

    setNewAlertRule({
      name: '',
      serviceId: '',
      condition: 'response_time',
      threshold: 5000,
      operator: 'gt',
      duration: 5,
      severity: 'medium',
      actions: ['log']
    });
    
    setShowAlertRuleForm(false);
    
    toast({
      title: "Alert Rule Added",
      description: `Alert rule "${newAlertRule.name}" has been created`
    });
  };

  // Calculate SLA compliance
  const slaCompliance = calculateSLACompliance() || [];

  return (
    <div className="space-y-6">
      {/* Monitoring Status */}
      <Card className="bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-gray-400'}`} />
            <h3 className="text-body font-semibold text-eci-gray-900">
              Real-time Monitoring {isMonitoring ? 'Active' : 'Inactive'}
            </h3>
          </div>
          <Button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
            size="sm"
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{services.length}</div>
            <p className="text-caption text-eci-gray-600">Services</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{alerts.length}</div>
            <p className="text-caption text-eci-gray-600">Active Alerts</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{alertRules.filter(r => r.enabled).length}</div>
            <p className="text-caption text-eci-gray-600">Alert Rules</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{webhookEndpoints.filter(w => w.enabled).length}</div>
            <p className="text-caption text-eci-gray-600">Webhooks</p>
          </div>
        </div>
      </Card>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-eci-gray-400" />
            <h3 className="text-body font-semibold text-eci-gray-900">Active Alerts</h3>
            <Badge variant="outline">{alerts.length}</Badge>
          </div>

          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-start justify-between p-3 border border-eci-gray-200 rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`${ 
                      alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.severity}
                    </Badge>
                    <span className="text-body-small font-medium">{alert.serviceName}</span>
                    <span className="text-caption text-eci-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-body-small text-eci-gray-700">{alert.message}</p>
                </div>
                <div className="flex gap-1 ml-4">
                  {!alert.acknowledged && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="h-7 px-2"
                    >
                      Ack
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resolveAlert(alert.id)}
                    className="h-7 px-2"
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            ))}
            {alerts.length > 5 && (
              <p className="text-caption text-eci-gray-600 text-center">
                ... and {alerts.length - 5} more alerts
              </p>
            )}
          </div>
        </Card>
      )}

      {/* SLA Compliance */}
      {Array.isArray(slaCompliance) && slaCompliance.length > 0 && (
        <Card className="bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-eci-gray-400" />
            <h3 className="text-body font-semibold text-eci-gray-900">SLA Compliance</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {Array.isArray(slaCompliance) && slaCompliance.map((sla) => (
              <div key={sla.serviceId} className="p-3 border border-eci-gray-200 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-body-small font-medium">{sla.serviceName}</span>
                  <span className={`text-body-small font-semibold ${
                    sla.compliance >= 95 ? 'text-green-600' :
                    sla.compliance >= 90 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {sla.compliance.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-eci-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      sla.compliance >= 95 ? 'bg-green-500' :
                      sla.compliance >= 90 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(sla.compliance, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Webhook Configuration */}
      <Card className="bg-white shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Webhook className="h-5 w-5 text-eci-gray-400" />
          <h3 className="text-body font-semibold text-eci-gray-900">Webhook Endpoints</h3>
        </div>

        {/* Add New Webhook */}
        <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-eci-gray-50 rounded">
          <Input
            placeholder="Webhook name"
            value={newWebhookName}
            onChange={(e) => setNewWebhookName(e.target.value)}
          />
          <Input
            placeholder="Webhook URL"
            value={newWebhookUrl}
            onChange={(e) => setNewWebhookUrl(e.target.value)}
          />
          <Button onClick={handleAddWebhook} className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Add Webhook
          </Button>
        </div>

        {/* Existing Webhooks */}
        <div className="space-y-3">
          {webhookEndpoints.map((webhook) => (
            <div key={webhook.id} className="flex items-center justify-between p-3 border border-eci-gray-200 rounded">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-body-small font-medium">{webhook.name}</span>
                  <Badge variant={webhook.enabled ? "default" : "secondary"}>
                    {webhook.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  {webhook.url.includes('slack.com') && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Slack className="h-3 w-3" />
                      Slack
                    </Badge>
                  )}
                </div>
                <p className="text-caption text-eci-gray-600 truncate">{webhook.url}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-caption text-eci-gray-500">
                    Events: {webhook.events.join(', ')}
                  </span>
                  {webhook.lastTriggered && (
                    <span className="text-caption text-eci-gray-500">
                      Last: {new Date(webhook.lastTriggered).toLocaleTimeString()}
                    </span>
                  )}
                  {webhook.failureCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {webhook.failureCount} failures
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Switch
                  checked={webhook.enabled}
                  onCheckedChange={(checked) => {
                    setWebhookEndpoints(prev => prev.map(w =>
                      w.id === webhook.id ? { ...w, enabled: checked } : w
                    ));
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTestWebhook(webhook.id)}
                  className="h-7 px-2"
                >
                  Test
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setWebhookEndpoints(prev => prev.filter(w => w.id !== webhook.id));
                  }}
                  className="h-7 px-2 text-red-600"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Alert Rules Configuration */}
      <Card className="bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-eci-gray-400" />
            <h3 className="text-body font-semibold text-eci-gray-900">Alert Rules</h3>
          </div>
          <Button
            onClick={() => setShowAlertRuleForm(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            Add Rule
          </Button>
        </div>

        {/* Add New Alert Rule Form */}
        {showAlertRuleForm && (
          <div className="mb-4 p-4 border border-eci-gray-200 rounded bg-eci-gray-50">
            <h4 className="text-body-small font-semibold mb-3">Create Alert Rule</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-caption">Rule Name</Label>
                <Input
                  value={newAlertRule.name}
                  onChange={(e) => setNewAlertRule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Alert rule name"
                />
              </div>
              <div>
                <Label className="text-caption">Service</Label>
                <Select 
                  value={newAlertRule.serviceId} 
                  onValueChange={(value) => setNewAlertRule(prev => ({ ...prev, serviceId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-caption">Condition</Label>
                <Select 
                  value={newAlertRule.condition} 
                  onValueChange={(value: any) => setNewAlertRule(prev => ({ ...prev, condition: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="response_time">Response Time</SelectItem>
                    <SelectItem value="error_rate">Error Rate</SelectItem>
                    <SelectItem value="uptime">Uptime</SelectItem>
                    <SelectItem value="status_change">Status Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-caption">Threshold</Label>
                <Input
                  type="number"
                  value={newAlertRule.threshold}
                  onChange={(e) => setNewAlertRule(prev => ({ ...prev, threshold: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label className="text-caption">Severity</Label>
                <Select 
                  value={newAlertRule.severity} 
                  onValueChange={(value: any) => setNewAlertRule(prev => ({ ...prev, severity: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-caption">Duration (minutes)</Label>
                <Input
                  type="number"
                  value={newAlertRule.duration}
                  onChange={(e) => setNewAlertRule(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddAlertRule} size="sm">
                Create Rule
              </Button>
              <Button 
                onClick={() => setShowAlertRuleForm(false)} 
                variant="ghost" 
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Existing Alert Rules */}
        <div className="space-y-3">
          {alertRules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between p-3 border border-eci-gray-200 rounded">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-body-small font-medium">{rule.name}</span>
                  <Badge variant={rule.enabled ? "default" : "secondary"}>
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <Badge variant="outline">{rule.severity}</Badge>
                </div>
                <p className="text-caption text-eci-gray-600">
                  {rule.condition.replace('_', ' ')} {rule.operator} {rule.threshold}
                  {rule.condition === 'response_time' ? 'ms' : 
                   rule.condition === 'uptime' ? '%' : ''}
                  for {rule.duration} minutes
                </p>
                <p className="text-caption text-eci-gray-500">
                  Actions: {rule.actions.join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(checked) => updateAlertRule(rule.id, { enabled: checked })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAlertRule(rule.id)}
                  className="h-7 px-2 text-red-600"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}