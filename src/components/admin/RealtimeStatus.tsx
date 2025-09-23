import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  Database, 
  Bell, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface RealtimeStatusProps {
  connections: {
    kpi: boolean;
    users: boolean;
    recordings: boolean;
    audit: boolean;
    notifications: boolean;
  };
  lastUpdated?: {
    kpi?: Date;
    users?: Date;
    recordings?: Date;
    audit?: Date;
  };
  unreadNotifications?: number;
  onReconnect: () => void;
  onReconnectAll: () => void;
  onMarkNotificationsRead?: () => void;
  className?: string;
}

export function RealtimeStatus({
  connections,
  lastUpdated,
  unreadNotifications = 0,
  onReconnect,
  onReconnectAll,
  onMarkNotificationsRead,
  className = ''
}: RealtimeStatusProps) {
  const allConnected = Object.values(connections).every(Boolean);
  const connectedCount = Object.values(connections).filter(Boolean).length;
  const totalConnections = Object.keys(connections).length;

  const getConnectionIcon = (connected: boolean) => {
    return connected ? (
      <CheckCircle className="h-3 w-3 text-green-600" />
    ) : (
      <AlertTriangle className="h-3 w-3 text-red-600" />
    );
  };

  const formatLastUpdated = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Real-time Status</h3>
            <Badge 
              variant={allConnected ? "default" : "destructive"}
              className="ml-2"
            >
              {connectedCount}/{totalConnections}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Notifications indicator */}
            {unreadNotifications > 0 && (
              <div className="flex items-center gap-1">
                <Bell className="h-4 w-4 text-blue-600" />
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {unreadNotifications}
                </Badge>
                {onMarkNotificationsRead && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onMarkNotificationsRead}
                    className="h-6 px-2 text-xs"
                  >
                    Mark Read
                  </Button>
                )}
              </div>
            )}
            
            {/* Global connection status */}
            <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-sm ${
              allConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {allConnected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  <span>Live</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span>Issues</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Connection details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                {getConnectionIcon(connections.kpi)}
                <span className="text-sm font-medium">KPI Metrics</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {formatLastUpdated(lastUpdated?.kpi)}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                {getConnectionIcon(connections.users)}
                <span className="text-sm font-medium">Users</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {formatLastUpdated(lastUpdated?.users)}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                {getConnectionIcon(connections.recordings)}
                <span className="text-sm font-medium">Recordings</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {formatLastUpdated(lastUpdated?.recordings)}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                {getConnectionIcon(connections.audit)}
                <span className="text-sm font-medium">Audit Logs</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {formatLastUpdated(lastUpdated?.audit)}
              </div>
            </div>
          </div>
        </div>

        {/* Notification connection */}
        <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
          <div className="flex items-center gap-2">
            {getConnectionIcon(connections.notifications)}
            <span className="text-sm font-medium">Live Notifications</span>
            {connections.notifications && (
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <span className="text-xs text-blue-600">
            {connections.notifications ? 'Active' : 'Disconnected'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={onReconnectAll}
            className="flex-1 flex items-center gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Reconnect All
          </Button>
          
          {!allConnected && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReconnect}
              className="flex-1 flex items-center gap-2"
            >
              <Wifi className="h-3 w-3" />
              Fix Issues
            </Button>
          )}
        </div>

        {/* Status summary */}
        <div className="text-xs text-gray-500 text-center">
          {allConnected ? (
            "All systems operational - receiving live updates"
          ) : (
            `${totalConnections - connectedCount} connection${totalConnections - connectedCount > 1 ? 's' : ''} need attention`
          )}
        </div>
      </div>
    </Card>
  );
}