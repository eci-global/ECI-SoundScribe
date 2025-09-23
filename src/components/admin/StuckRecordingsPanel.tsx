import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StuckRecording {
  id: string;
  title: string;
  status: string;
  created_at: string;
  transcript: string | null;
  ai_summary: string | null;
  duration: number | null;
}

interface FixResult {
  recordingId: string;
  oldStatus: string;
  newStatus: string;
  reason: string;
}

export default function StuckRecordingsPanel() {
  const [stuckRecordings, setStuckRecordings] = useState<StuckRecording[]>([]);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [fixResults, setFixResults] = useState<FixResult[]>([]);
  const { toast } = useToast();

  const checkStuckRecordings = async () => {
    setLoading(true);
    try {
      // Find recordings stuck in processing for more than 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          id, 
          title, 
          status, 
          created_at, 
          transcript, 
          ai_summary, 
          duration
        `)
        .eq('status', 'processing')
        .lt('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Supabase query error:', error);
        throw new Error(`Database query failed: ${error.message}`);
      }

      setStuckRecordings(data || []);
      setLastCheck(new Date());
      
      if (data && data.length > 0) {
        toast({
          title: "Stuck Recordings Found",
          description: `Found ${data.length} recordings stuck in processing status`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "All Clear",
          description: "No stuck recordings found",
        });
      }
    } catch (error) {
      console.error('Error checking stuck recordings:', error);
      toast({
        title: "Error",
        description: "Failed to check for stuck recordings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fixStuckRecordings = async () => {
    if (stuckRecordings.length === 0) {
      toast({
        title: "No Recordings to Fix",
        description: "Run a check first to find stuck recordings",
        variant: "destructive"
      });
      return;
    }

    setFixing(true);
    setFixResults([]);
    
    try {
      // Client-side fix mechanism since Edge Function isn't deployed
      const fixes: FixResult[] = [];
      
      for (const recording of stuckRecordings) {
        const age = Math.round((Date.now() - new Date(recording.created_at).getTime()) / 60000);
        
        let newStatus: string;
        let reason: string;
        
        // Determine appropriate status based on what was completed
        // Simplified logic: Always use 'completed' for recordings with transcript
        if (recording.transcript) {
          newStatus = 'completed';
          reason = recording.ai_summary 
            ? 'Has transcript and AI summary' 
            : 'Has transcript (AI summary optional)';
        } else if (!recording.transcript && age > 15) {
          newStatus = 'failed';
          reason = 'No transcript after 15+ minutes - likely failed';
        } else {
          // Skip recordings that might still be processing
          continue;
        }

        // Update the recording status
        const { error: updateError } = await supabase
          .from('recordings')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', recording.id);

        if (updateError) {
          console.error(`Failed to update ${recording.id}:`, updateError);
          fixes.push({
            recordingId: recording.id,
            oldStatus: recording.status,
            newStatus: 'ERROR',
            reason: `Update failed: ${updateError.message}`
          });
        } else {
          fixes.push({
            recordingId: recording.id,
            oldStatus: recording.status,
            newStatus: newStatus,
            reason: reason
          });
        }
      }

      setFixResults(fixes);
      
      const successful = fixes.filter(f => f.newStatus !== 'ERROR').length;
      const failed = fixes.filter(f => f.newStatus === 'ERROR').length;
      
      toast({
        title: "Fix Complete",
        description: `Fixed ${successful} recordings${failed > 0 ? `, ${failed} failed` : ''}`,
      });

      // Refresh the stuck recordings list
      await checkStuckRecordings();
      
    } catch (error) {
      console.error('Error fixing stuck recordings:', error);
      toast({
        title: "Fix Failed",
        description: "Failed to fix stuck recordings",
        variant: "destructive"
      });
    } finally {
      setFixing(false);
    }
  };

  const getRecordingAge = (createdAt: string) => {
    const age = Math.round((Date.now() - new Date(createdAt).getTime()) / 60000);
    return `${age} minutes`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="bg-white shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-title font-semibold text-eci-gray-900 mb-2">
            Stuck Recordings Recovery
          </h2>
          <p className="text-body-small text-eci-gray-600">
            Find and fix recordings stuck in processing status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={checkStuckRecordings}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Check Status
          </Button>
          <Button
            size="sm"
            onClick={fixStuckRecordings}
            disabled={fixing || stuckRecordings.length === 0}
            className="flex items-center gap-2"
          >
            <CheckCircle className={`h-4 w-4 ${fixing ? 'animate-spin' : ''}`} />
            Fix Stuck Records
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-gray-600" />
            <span className="text-body-small font-medium text-gray-700">Stuck Records</span>
          </div>
          <p className="text-title-large font-semibold text-gray-900">
            {stuckRecordings.length}
          </p>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-body-small font-medium text-blue-700">With Transcript</span>
          </div>
          <p className="text-title-large font-semibold text-blue-900">
            {stuckRecordings.filter(r => r.transcript).length}
          </p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-body-small font-medium text-green-700">With Summary</span>
          </div>
          <p className="text-title-large font-semibold text-green-900">
            {stuckRecordings.filter(r => r.ai_summary).length}
          </p>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-body-small font-medium text-orange-700">Last Check</span>
          </div>
          <p className="text-body-small font-semibold text-orange-900">
            {lastCheck ? lastCheck.toLocaleTimeString() : 'Never'}
          </p>
        </div>
      </div>

      {/* Stuck Recordings List */}
      {stuckRecordings.length > 0 && (
        <div className="mb-6">
          <h3 className="text-body font-medium text-eci-gray-900 mb-3">Stuck Recordings</h3>
          <div className="space-y-3">
            {stuckRecordings.map((recording) => (
              <div key={recording.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-body font-medium text-gray-900">{recording.title}</h4>
                    <p className="text-body-small text-gray-600">ID: {recording.id}</p>
                  </div>
                  <Badge className={getStatusColor(recording.status)}>
                    {recording.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-body-small">
                  <div>
                    <span className="text-gray-600">Age:</span>
                    <span className="ml-1 font-medium">{getRecordingAge(recording.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Transcript:</span>
                    <span className={`ml-1 font-medium ${recording.transcript ? 'text-green-600' : 'text-red-600'}`}>
                      {recording.transcript ? 'Present' : 'Missing'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Summary:</span>
                    <span className={`ml-1 font-medium ${recording.ai_summary ? 'text-green-600' : 'text-red-600'}`}>
                      {recording.ai_summary ? 'Present' : 'Missing'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <span className={`ml-1 font-medium ${recording.duration ? 'text-green-600' : 'text-red-600'}`}>
                      {recording.duration ? `${recording.duration}s` : 'Missing'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fix Results */}
      {fixResults.length > 0 && (
        <div>
          <h3 className="text-body font-medium text-eci-gray-900 mb-3">Fix Results</h3>
          <div className="space-y-2">
            {fixResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(result.newStatus)}>
                    {result.oldStatus} → {result.newStatus}
                  </Badge>
                  <span className="text-body-small">ID: {result.recordingId}</span>
                </div>
                <span className="text-body-small text-gray-600">{result.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stuckRecordings.length === 0 && lastCheck && (
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-body font-medium text-gray-900 mb-1">All Clear!</h3>
          <p className="text-body-small text-gray-600">No stuck recordings found</p>
        </div>
      )}
    </Card>
  );
}