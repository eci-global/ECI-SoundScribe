
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Users, 
  Calendar,
  Upload as UploadIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SyncStats {
  totalCalls: number;
  syncedCalls: number;
  pendingCalls: number;
  failedCalls: number;
  lastSyncTime: string | null;
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: 'success' | 'failed' | 'pending';
  created_at: string;
  error_message?: string;
  outreach_activity_id?: string;
}

export default function OutreachSyncPanel() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalCalls: 0,
    syncedCalls: 0,
    pendingCalls: 0,
    failedCalls: 0,
    lastSyncTime: null
  });
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([]);
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    loadSyncStats();
    loadRecentLogs();
  }, []);

  const loadSyncStats = async () => {
    try {
      const { data: logs, error } = await supabase
        .from('outreach_sync_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (logs) {
        const stats = {
          totalCalls: logs.length,
          syncedCalls: logs.filter(log => log.status === 'success').length,
          pendingCalls: logs.filter(log => log.status === 'pending').length,
          failedCalls: logs.filter(log => log.status === 'failed').length,
          lastSyncTime: logs.length > 0 ? logs[0].created_at : null
        };
        setSyncStats(stats);
      }
    } catch (error) {
      console.error('Error loading sync stats:', error);
    }
  };

  const loadRecentLogs = async () => {
    try {
      const { data: logs, error } = await supabase
        .from('outreach_sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Transform the data to ensure proper typing
      const typedLogs: SyncLog[] = (logs || []).map(log => ({
        id: log.id,
        sync_type: log.sync_type,
        status: ['success', 'failed', 'pending'].includes(log.status) 
          ? log.status as 'success' | 'failed' | 'pending'
          : 'pending',
        created_at: log.created_at,
        error_message: log.error_message,
        outreach_activity_id: log.outreach_activity_id
      }));
      
      setRecentLogs(typedLogs);
    } catch (error) {
      console.error('Error loading recent logs:', error);
    }
  };

  const handleManualSync = async () => {
    setIsLoading(true);
    setSyncProgress(0);

    try {
      // Simulate sync progress
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Here you would call your sync function
      // For now, we'll just simulate a successful sync
      setTimeout(() => {
        clearInterval(progressInterval);
        setSyncProgress(100);
        
        toast({
          title: "Sync Complete",
          description: "Successfully synced with Outreach",
        });

        // Reload stats and logs
        loadSyncStats();
        loadRecentLogs();
        setIsLoading(false);
        setSyncProgress(0);
      }, 3000);

    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync with Outreach. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
      setSyncProgress(0);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Outreach Sync Status</span>
            <Button 
              onClick={handleManualSync}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UploadIcon className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Syncing...' : 'Manual Sync'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sync Progress</span>
                <span>{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} className="w-full" />
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{syncStats.totalCalls}</div>
              <div className="text-sm text-gray-600">Total Calls</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{syncStats.syncedCalls}</div>
              <div className="text-sm text-gray-600">Synced</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{syncStats.pendingCalls}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{syncStats.failedCalls}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>

          {syncStats.lastSyncTime && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Last sync: {new Date(syncStats.lastSyncTime).toLocaleString()}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No sync activity yet</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="font-medium">{log.sync_type}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                      {log.error_message && (
                        <div className="text-sm text-red-600 mt-1">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(log.status)}
                    {log.outreach_activity_id && (
                      <Badge variant="outline" className="text-xs">
                        {log.outreach_activity_id.slice(0, 8)}...
                      </Badge>
                    )}
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
