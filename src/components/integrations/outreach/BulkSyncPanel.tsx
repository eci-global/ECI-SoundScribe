import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Recording } from '@/types/recording';
import type { OutreachSyncLog } from '@/types/outreach';
import { convertToRecording } from '@/utils/typeConversion';

interface BulkSyncPanelProps {
  userId: string;
}

export const BulkSyncPanel: React.FC<BulkSyncPanelProps> = ({ userId }) => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set());
  const [syncLogs, setSyncLogs] = useState<OutreachSyncLog[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncingRecordings, setSyncingRecordings] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch recordings
        const { data: recordingsData, error: recordingsError } = await supabase
          .from('recordings')
          .select('*')
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        if (recordingsError) throw recordingsError;
        
        const typedRecordings = recordingsData?.map(convertToRecording) || [];
        setRecordings(typedRecordings);

        // Fetch sync logs
        const { data: logsData, error: logsError } = await supabase
          .from('outreach_sync_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (logsError) throw logsError;
        
        // Convert to proper type - remove non-existent fields
        const typedLogs: OutreachSyncLog[] = (logsData || []).map(log => ({
          id: log.id,
          user_id: log.user_id,
          recording_id: log.recording_id,
          sync_type: log.sync_type,
          status: log.status,
          error_message: log.error_message,
          outreach_activity_id: log.outreach_activity_id,
          created_at: log.created_at
        }));
        
        setSyncLogs(typedLogs);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load sync data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleSelectRecording = (recordingId: string) => {
    setSelectedRecordings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordingId)) {
        newSet.delete(recordingId);
      } else {
        newSet.add(recordingId);
      }
      return newSet;
    });
  };

  const handleSyncAll = async () => {
    if (syncing) return;

    setSyncing(true);
    try {
      const recordingsToSync = Array.from(selectedRecordings);
      const totalRecordings = recordingsToSync.length;
      let syncedCount = 0;

      for (const recordingId of recordingsToSync) {
        try {
          const { error } = await supabase.functions.invoke('sync-to-outreach', {
            body: { recordingId }
          });

          if (error) {
            console.error(`Sync error for recording ${recordingId}:`, error);
            toast({
              title: "Sync Failed",
              description: `Failed to sync recording ${recordingId}: ${error.message}`,
              variant: "destructive"
            });
          } else {
            syncedCount++;
          }
        } catch (error: any) {
          console.error(`Unexpected sync error for recording ${recordingId}:`, error);
          toast({
            title: "Sync Failed",
            description: `Unexpected error syncing recording ${recordingId}: ${error.message}`,
            variant: "destructive"
          });
        }
      }

      toast({
        title: "Sync Complete",
        description: `Successfully synced ${syncedCount} of ${totalRecordings} recordings to Outreach`
      });
    } finally {
      setSyncing(false);
      setSelectedRecordings(new Set());
    }
  };

  const progress = recordings.length > 0 ? (selectedRecordings.size / recordings.length) * 100 : 0;

  return (
    <Card className="bg-white/70 backdrop-blur-md border-white/20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          Bulk Sync to Outreach
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading recordings...</div>
        ) : (
          <>
            <div className="space-y-3">
              {recordings.map((recording) => (
                <div key={recording.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                  <Checkbox
                    id={`recording-${recording.id}`}
                    checked={selectedRecordings.has(recording.id)}
                    onCheckedChange={() => handleSelectRecording(recording.id)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`recording-${recording.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed"
                    >
                      {recording.title || 'Untitled Recording'}
                    </label>
                    <p className="text-sm text-gray-500">Uploaded on {new Date(recording.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>

            <Progress value={progress} className="mt-4" />
            <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
              <span>{selectedRecordings.size} of {recordings.length} selected</span>
              <span>{progress.toFixed(0)}%</span>
            </div>

            <Button
              onClick={handleSyncAll}
              disabled={syncing || selectedRecordings.size === 0}
              className="w-full mt-4"
            >
              {syncing ? 'Syncing...' : 'Sync All Selected'}
            </Button>

            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-semibold mb-2">Recent Sync Logs</h4>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {syncLogs.map((log) => (
                  <div key={log.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                    {log.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {log.status === 'failed' && <AlertCircle className="w-5 h-5 text-red-600" />}
                    {log.status === 'processing' && <Clock className="w-5 h-5 text-blue-600" />}
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Recording {log.recording_id?.slice(0, 8)}...</span>
                        <Badge variant={log.status === 'completed' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}>
                          {log.status}
                        </Badge>
                      </div>
                      {log.error_message && (
                        <p className="text-sm text-red-600 mt-1">{log.error_message}</p>
                      )}
                      {log.outreach_activity_id && (
                        <p className="text-sm text-gray-600 mt-1">Activity: {log.outreach_activity_id}</p>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
