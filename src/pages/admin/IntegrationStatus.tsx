import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Link, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  Activity,
  Clock,
  Settings,
  Bell,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useIntegrationStatus } from '@/hooks/useIntegrationStatus';
import { useServiceMonitoring } from '@/hooks/useServiceMonitoring';
import { useToast } from '@/hooks/use-toast';

// Remove old interface since we're using the one from useIntegrationStatus

export default function IntegrationStatus() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  
  // Use real integration monitoring
  const {
    services,
    stats,
    isMonitoring,
    lastFullCheck,
    globalError,
    checkAllServices,
    checkService,
    startMonitoring,
    stopMonitoring,
    config
  } = useIntegrationStatus({
    checkInterval: 30000, // 30 seconds
    timeout: 10000, // 10 seconds
    retryAttempts: 3,
    enableRealTimeMonitoring: true
  });
  
  // Use service monitoring for alerts and metrics
  const {
    alerts,
    alertRules,
    calculateSLACompliance,
    acknowledgeAlert,
    resolveAlert
  } = useServiceMonitoring();

  // Handle alerts
  useEffect(() => {
    if (alerts.length > 0) {
      const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
      if (criticalAlerts.length > 0) {
        toast({
          title: "Critical Service Alert",
          description: `${criticalAlerts.length} critical service issue(s) detected`,
          variant: "destructive"
        });
      }
    }
  }, [alerts, toast]);

  const handleServiceCheck = (serviceId: string) => {
    checkService(serviceId);
    toast({
      title: "Service Check Initiated",
      description: "Checking service health..."
    });
  };

  const handleAllServicesCheck = () => {
    checkAllServices();
    toast({
      title: "Full Health Check Initiated",
      description: "Checking all service connections..."
    });
  };

  const handleToggleMonitoring = () => {
    if (isMonitoring) {
      stopMonitoring();
      toast({
        title: "Monitoring Stopped",
        description: "Real-time service monitoring has been disabled"
      });
    } else {
      startMonitoring();
      toast({
        title: "Monitoring Started",
        description: "Real-time service monitoring is now active"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      connected: { icon: CheckCircle, color: 'text-green-600' },
      disconnected: { icon: XCircle, color: 'text-gray-600' },
      error: { icon: AlertCircle, color: 'text-red-600' },
      checking: { icon: RefreshCw, color: 'text-blue-600 animate-spin' }
    };
    const config = icons[status as keyof typeof icons] || icons.disconnected;
    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.color}`} />;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
      checking: 'bg-blue-100 text-blue-800'
    };
    return <Badge className={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const getResponseTimeColor = (time?: number) => {
    if (!time) return 'text-gray-600';
    if (time < 100) return 'text-green-600';
    if (time < 300) return 'text-orange-600';
    return 'text-red-600';
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99.9) return 'text-green-600';
    if (uptime >= 99) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-900 mb-2">Integration Status</h1>
            <p className="text-body text-eci-gray-600">Monitor and manage external service connections</p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-5 gap-6 mb-8">
            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Connected</p>
                  <p className="text-title-large font-semibold text-green-600">
                    {stats.connected}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Errors</p>
                  <p className="text-title-large font-semibold text-red-600">
                    {stats.errors}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Avg Response</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">
                    {Math.round(stats.averageResponseTime)}ms
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Avg Uptime</p>
                  <p className="text-title-large font-semibold text-eci-gray-900">
                    {stats.averageUptime.toFixed(1)}%
                  </p>
                </div>
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600 mb-1">Active Alerts</p>
                  <p className="text-title-large font-semibold text-orange-600">
                    {alerts.length}
                  </p>
                </div>
                <Bell className="h-8 w-8 text-orange-500" />
              </div>
            </Card>
          </div>

          {/* Monitoring Status */}
          <Card className="bg-white shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-3 w-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-gray-400'}`} />
                <div>
                  <h3 className="text-body font-semibold text-eci-gray-900">
                    Real-time Monitoring {isMonitoring ? 'Active' : 'Inactive'}
                  </h3>
                  <p className="text-caption text-eci-gray-600">
                    {lastFullCheck ? `Last check: ${lastFullCheck.toLocaleTimeString()}` : 'No checks performed'}
                  </p>
                  {globalError && (
                    <p className="text-caption text-red-600 mt-1">
                      Error: {globalError}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAlerts(!showAlerts)}
                  className="flex items-center gap-2"
                >
                  <Bell className="h-4 w-4" />
                  Alerts ({alerts.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleMonitoring}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {isMonitoring ? 'Stop' : 'Start'} Monitoring
                </Button>
              </div>
            </div>
          </Card>

          {/* Active Alerts */}
          {showAlerts && alerts.length > 0 && (
            <Card className="bg-red-50 border-red-200 p-6 mb-8">
              <h3 className="text-body font-semibold text-red-900 mb-4">Active Alerts</h3>
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-start justify-between bg-white p-3 rounded border">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${
                          alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.severity}
                        </Badge>
                        <span className="text-body-small font-medium text-eci-gray-900">{alert.serviceName}</span>
                        <span className="text-caption text-eci-gray-600">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-body-small text-eci-gray-700 mt-1">{alert.message}</p>
                    </div>
                    <div className="flex gap-1">
                      {!alert.acknowledged && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="h-6 px-2"
                        >
                          Ack
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resolveAlert(alert.id)}
                        className="h-6 px-2"
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

          {/* Integration List */}
          <Card className="bg-white shadow-sm">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-title font-semibold text-eci-gray-900">All Services</h2>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAllServicesCheck}
                    disabled={stats.checking > 0}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${stats.checking > 0 ? 'animate-spin' : ''}`} />
                    Check All
                  </Button>
                  <Button onClick={handleAllServicesCheck} className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Full Health Check
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {services.map((service) => (
                  <div key={service.id} className={`border rounded-lg p-4 transition-colors ${
                    selectedService === service.id 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-eci-gray-200 hover:border-eci-gray-300'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        <div className="text-2xl">{service.icon}</div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-body font-semibold text-eci-gray-900">{service.name}</h3>
                            {getStatusIcon(service.status)}
                            {getStatusBadge(service.status)}
                            <Badge variant="outline">{service.type}</Badge>
                            {service.healthDetails?.version && (
                              <Badge variant="outline" className="text-xs">
                                {service.healthDetails.version}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-body-small text-eci-gray-600 mb-3">{service.description}</p>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-caption text-eci-gray-600">
                              <Link className="h-3 w-3" />
                              <code className="bg-eci-gray-100 px-2 py-0.5 rounded text-xs">{service.endpoint}</code>
                            </div>
                            
                            <div className="flex items-center gap-6 text-caption">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-eci-gray-400" />
                                <span className="text-eci-gray-600">Last check:</span>
                                <span className="text-eci-gray-900">
                                  {new Date(service.lastCheck).toLocaleTimeString()}
                                </span>
                              </div>
                              
                              {service.responseTime !== undefined && (
                                <div className="flex items-center gap-1">
                                  <Activity className="h-3 w-3 text-eci-gray-400" />
                                  <span className="text-eci-gray-600">Response:</span>
                                  <span className={getResponseTimeColor(service.responseTime)}>
                                    {service.responseTime}ms
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-1">
                                <span className="text-eci-gray-600">Uptime:</span>
                                <span className={getUptimeColor(service.uptime)}>
                                  {service.uptime.toFixed(1)}%
                                </span>
                              </div>
                              
                              {service.healthDetails?.httpStatus && (
                                <div className="flex items-center gap-1">
                                  <span className="text-eci-gray-600">Status:</span>
                                  <span className={service.healthDetails.httpStatus === 200 ? 'text-green-600' : 'text-red-600'}>
                                    {service.healthDetails.httpStatus}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Health Details */}
                            {service.healthDetails?.dependencies && (
                              <div className="mt-2">
                                <p className="text-caption text-eci-gray-600 mb-1">Dependencies:</p>
                                <div className="flex flex-wrap gap-1">
                                  {service.healthDetails.dependencies.map((dep, index) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className={`text-xs ${
                                        dep.status === 'ok' 
                                          ? 'text-green-700 border-green-300' 
                                          : 'text-red-700 border-red-300'
                                      }`}
                                    >
                                      {dep.name}: {dep.status}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Error Message */}
                            {service.errorMessage && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                <p className="text-caption text-red-700">
                                  <strong>Error:</strong> {service.errorMessage}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {service.id === 'outreach-api' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate('/integrations/outreach/connect')}
                            className="flex items-center gap-2"
                          >
                            <Settings className="h-4 w-4" />
                            Configure
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => setSelectedService(selectedService === service.id ? null : service.id)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => window.open(service.endpoint, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleServiceCheck(service.id)}
                          disabled={service.status === 'checking'}
                        >
                          <RefreshCw className={`h-4 w-4 ${service.status === 'checking' ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Expanded Service Details */}
                    {selectedService === service.id && (
                      <div className="mt-4 pt-4 border-t border-eci-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                             <h4 className="text-caption font-semibold text-eci-gray-900 mb-2">Recent Metrics</h4>
                             <div className="text-caption text-eci-gray-600">
                               No recent metrics available
                             </div>
                           </div>
                          <div>
                            <h4 className="text-caption font-semibold text-eci-gray-900 mb-2">Alert Rules</h4>
                            {alertRules
                              .filter(rule => rule.serviceId === service.id && rule.enabled)
                              .slice(0, 3)
                              .map((rule, index) => (
                                <div key={index} className="text-caption text-eci-gray-600">
                                  {rule.name} ({rule.severity})
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    
  );
}