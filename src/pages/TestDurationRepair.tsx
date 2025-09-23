import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { repairRecordingDuration, identifySuspiciousRecordings } from '@/utils/durationRepair';
import { supabase } from '@/integrations/supabase/client';

interface RepairResult {
  recordingId: string;
  oldDuration: number | null;
  newDuration: number | null;
  method: string;
  success: boolean;
  error?: string;
}

const TestDurationRepair: React.FC = () => {
  const [recordingId, setRecordingId] = useState('eadecee7-8825-4a57-86e3-baf32a6895bb');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RepairResult | null>(null);
  const [recordingDetails, setRecordingDetails] = useState<any>(null);
  const [suspiciousRecordings, setSuspiciousRecordings] = useState<any[]>([]);

  const checkRecording = async () => {
    if (!recordingId.trim()) return;
    
    setIsLoading(true);
    try {
      const { data: recording, error } = await supabase
        .from('recordings')
        .select('*')
        .eq('id', recordingId.trim())
        .single();

      if (error) {
        console.error('Failed to fetch recording:', error);
        setRecordingDetails({ error: error.message });
      } else {
        setRecordingDetails(recording);
      }
    } catch (error) {
      console.error('Error checking recording:', error);
      setRecordingDetails({ error: 'Failed to check recording' });
    } finally {
      setIsLoading(false);
    }
  };

  const repairRecording = async () => {
    if (!recordingId.trim()) return;
    
    setIsLoading(true);
    try {
      const repairResult = await repairRecordingDuration(recordingId.trim());
      setResult(repairResult);
      
      // Refresh recording details after repair
      if (repairResult.success) {
        await checkRecording();
      }
    } catch (error) {
      console.error('Error during repair:', error);
      setResult({
        recordingId: recordingId.trim(),
        oldDuration: null,
        newDuration: null,
        method: 'failed',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const findSuspiciousRecordings = async () => {
    setIsLoading(true);
    try {
      const suspicious = await identifySuspiciousRecordings();
      setSuspiciousRecordings(suspicious);
    } catch (error) {
      console.error('Error finding suspicious recordings:', error);
      setSuspiciousRecordings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepairSuspicious = async (id: string) => {
    setRecordingId(id);
    setIsLoading(true);
    try {
      const repairResult = await repairRecordingDuration(id);
      setResult(repairResult);
      
      // Refresh suspicious recordings list
      if (repairResult.success) {
        await findSuspiciousRecordings();
      }
    } catch (error) {
      console.error('Error during repair:', error);
      setResult({
        recordingId: id,
        oldDuration: null,
        newDuration: null,
        method: 'failed',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Duration Repair Test Tool</CardTitle>
          <CardDescription>
            Test the duration repair utility for specific recordings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="recordingId">Recording ID</Label>
              <Input
                id="recordingId"
                value={recordingId}
                onChange={(e) => setRecordingId(e.target.value)}
                placeholder="Enter recording ID"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button 
                onClick={checkRecording} 
                disabled={isLoading}
                variant="outline"
              >
                Check Recording
              </Button>
              <Button 
                onClick={repairRecording} 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Processing...' : 'Repair Duration'}
              </Button>
            </div>
          </div>

          {/* Recording Details */}
          {recordingDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recording Details</CardTitle>
              </CardHeader>
              <CardContent>
                {recordingDetails.error ? (
                  <div className="text-red-600">
                    Error: {recordingDetails.error}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div><strong>Title:</strong> {recordingDetails.title}</div>
                    <div><strong>Duration:</strong> {recordingDetails.duration || 'null'} seconds</div>
                    <div><strong>File URL:</strong> {recordingDetails.file_url ? 'Available' : 'Not available'}</div>
                    <div><strong>File Size:</strong> {recordingDetails.file_size ? `${(recordingDetails.file_size / 1024 / 1024).toFixed(1)} MB` : 'Unknown'}</div>
                    <div><strong>Transcript:</strong> {recordingDetails.transcript?.length || 0} characters</div>
                    <div><strong>AI Insights:</strong> {recordingDetails.ai_insights ? 'Available' : 'Not available'}</div>
                    <div><strong>Created:</strong> {recordingDetails.created_at ? new Date(recordingDetails.created_at).toLocaleString() : 'Unknown'}</div>
                    <div><strong>Processing Notes:</strong> {recordingDetails.processing_notes || 'None'}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Repair Result */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Repair Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>Recording ID:</strong> {result.recordingId}</div>
                  <div><strong>Success:</strong> {result.success ? '✅ Yes' : '❌ No'}</div>
                  <div><strong>Method:</strong> {result.method}</div>
                  <div><strong>Before:</strong> {result.oldDuration || 'null'} seconds</div>
                  <div><strong>After:</strong> {result.newDuration || 'null'} seconds</div>
                  {result.error && (
                    <div className="text-red-600"><strong>Error:</strong> {result.error}</div>
                  )}
                  {result.success && result.newDuration !== result.oldDuration && (
                    <div className="text-green-600 font-semibold">
                      ✅ Duration successfully repaired!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Suspicious Recordings */}
      <Card>
        <CardHeader>
          <CardTitle>Find Suspicious Recordings</CardTitle>
          <CardDescription>
            Identify recordings that may have duration issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={findSuspiciousRecordings} 
            disabled={isLoading}
            className="mb-4"
          >
            {isLoading ? 'Searching...' : 'Find Suspicious Recordings'}
          </Button>

          {suspiciousRecordings.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Found {suspiciousRecordings.length} suspicious recordings:</h4>
              {suspiciousRecordings.map((recording, index) => (
                <Card key={recording.id} className="border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 text-sm">
                        <div><strong>Title:</strong> {recording.title}</div>
                        <div><strong>Duration:</strong> {recording.duration || 'null'} seconds</div>
                        <div><strong>Created:</strong> {new Date(recording.created_at).toLocaleString()}</div>
                        <div><strong>File Size:</strong> {recording.file_size ? `${(recording.file_size / 1024 / 1024).toFixed(1)} MB` : 'Unknown'}</div>
                      </div>
                      <Button 
                        onClick={() => handleRepairSuspicious(recording.id)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Repair This
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {suspiciousRecordings.length === 0 && !isLoading && (
            <div className="text-green-600">
              No suspicious recordings found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestDurationRepair;