import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { debugDurationFlow, queryStoredDurations, generateDebugReport, createTestAudioFile } from '@/utils/durationDebug';
import { repairRecordingDuration, identifySuspiciousRecordings } from '@/utils/durationRepair';
import { supabase } from '@/integrations/supabase/client';
import type { DurationDebugResult } from '@/utils/durationDebug';

export default function DurationDebug() {
  const [debugResults, setDebugResults] = useState<DurationDebugResult[]>([]);
  const [dbAnalysis, setDbAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fullReport, setFullReport] = useState<string>('');
  
  // Repair functionality state
  const [recordingId, setRecordingId] = useState('eadecee7-8825-4a57-86e3-baf32a6895bb');
  const [repairResult, setRepairResult] = useState<any>(null);
  const [recordingDetails, setRecordingDetails] = useState<any>(null);
  const [suspiciousRecordings, setSuspiciousRecordings] = useState<any[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      console.log(`📁 Selected file: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
    }
  };

  const runDebugFlow = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 Starting debug flow...');
      const result = await debugDurationFlow(selectedFile);
      setDebugResults(result.results);
      
      console.log('📊 Debug results:', result);
    } catch (error) {
      console.error('❌ Debug flow failed:', error);
      alert(`Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const queryDatabase = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Querying database...');
      const result = await queryStoredDurations(15);
      setDbAnalysis(result);
      
      console.log('📊 Database analysis:', result);
    } catch (error) {
      console.error('❌ Database query failed:', error);
      alert(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testWithSyntheticAudio = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing with synthetic audio...');
      const testFile = createTestAudioFile(25); // 25-second test file
      const result = await debugDurationFlow(testFile);
      setDebugResults(result.results);
      
      console.log('📊 Synthetic audio test results:', result);
    } catch (error) {
      console.error('❌ Synthetic audio test failed:', error);
      alert(`Synthetic test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async () => {
    setIsLoading(true);
    try {
      console.log('📋 Generating full debug report...');
      const report = await generateDebugReport();
      setFullReport(report);
      
      console.log('✅ Report generated');
    } catch (error) {
      console.error('❌ Report generation failed:', error);
      alert(`Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Repair functionality
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
      const result = await repairRecordingDuration(recordingId.trim());
      setRepairResult(result);
      
      // Refresh recording details after repair
      if (result.success) {
        await checkRecording();
      }
    } catch (error) {
      console.error('Error during repair:', error);
      setRepairResult({
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
      const result = await repairRecordingDuration(id);
      setRepairResult(result);
      
      // Refresh suspicious recordings list
      if (result.success) {
        await findSuspiciousRecordings();
      }
    } catch (error) {
      console.error('Error during repair:', error);
      setRepairResult({
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

  const getStepBadgeColor = (success: boolean) => {
    return success ? 'bg-green-500' : 'bg-red-500';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Duration Debug Utility</h1>
        <p className="text-gray-600 mt-2">Debug and trace duration extraction issues</p>
      </div>

      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Test File Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileSelect}
              className="w-full p-2 border rounded"
            />
            {selectedFile && (
              <div className="text-sm text-gray-600">
                Selected: {selectedFile.name} ({selectedFile.type}, {(selectedFile.size / 1024 / 1024).toFixed(1)}MB)
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button onClick={runDebugFlow} disabled={isLoading || !selectedFile}>
          {isLoading ? 'Running...' : 'Debug Selected File'}
        </Button>
        <Button onClick={queryDatabase} disabled={isLoading} variant="outline">
          {isLoading ? 'Querying...' : 'Query Database'}
        </Button>
        <Button onClick={testWithSyntheticAudio} disabled={isLoading} variant="outline">
          {isLoading ? 'Testing...' : 'Test Synthetic Audio'}
        </Button>
        <Button onClick={generateReport} disabled={isLoading} variant="outline">
          {isLoading ? 'Generating...' : 'Full Report'}
        </Button>
      </div>

      {/* Debug Results */}
      {debugResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Flow Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {debugResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <Badge className={getStepBadgeColor(result.success)}>
                      {result.success ? '✓' : '✗'}
                    </Badge>
                    <div>
                      <div className="font-medium">{result.step.replace(/_/g, ' ').toUpperCase()}</div>
                      {result.method && <div className="text-sm text-gray-500">{result.method}</div>}
                      {result.error && <div className="text-sm text-red-600">{result.error}</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">
                      {result.value !== null ? `${result.value}s` : 'null'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database Analysis */}
      {dbAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>Database Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{dbAnalysis.analysis.totalRecordings}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{dbAnalysis.analysis.withDuration}</div>
                  <div className="text-sm text-gray-600">With Duration</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{dbAnalysis.analysis.elevenSecondCount}</div>
                  <div className="text-sm text-gray-600">11-Second Count</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {dbAnalysis.analysis.averageDuration?.toFixed(1) || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Avg Duration</div>
                </div>
              </div>

              {dbAnalysis.analysis.suspiciousPatterns.length > 0 && (
                <div className="bg-yellow-50 p-4 rounded">
                  <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Suspicious Patterns</h4>
                  <ul className="text-yellow-700 space-y-1">
                    {dbAnalysis.analysis.suspiciousPatterns.map((pattern: string, index: number) => (
                      <li key={index}>• {pattern}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Recent Recordings</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {dbAnalysis.recordings.map((recording: any) => (
                    <div key={recording.id} className="flex justify-between items-center p-2 border rounded text-sm">
                      <div className="truncate">{recording.title}</div>
                      <div className="flex space-x-2 text-xs">
                        <Badge variant={recording.duration === 11 ? 'destructive' : recording.duration ? 'default' : 'secondary'}>
                          {recording.duration ? `${recording.duration}s` : 'null'}
                        </Badge>
                        <span className="text-gray-500">{(recording.file_size / 1024 / 1024).toFixed(1)}MB</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Report */}
      {fullReport && (
        <Card>
          <CardHeader>
            <CardTitle>Full Debug Report</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
              {fullReport}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Duration Repair Section */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Duration Repair Tool</CardTitle>
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
                size="sm"
              >
                Check
              </Button>
              <Button 
                onClick={repairRecording} 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                {isLoading ? 'Repairing...' : 'Repair'}
              </Button>
            </div>
          </div>

          {/* Recording Details */}
          {recordingDetails && (
            <div className="border rounded p-4 bg-gray-50">
              <h4 className="font-semibold mb-2">Recording Details</h4>
              {recordingDetails.error ? (
                <div className="text-red-600">
                  Error: {recordingDetails.error}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
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
            </div>
          )}

          {/* Repair Result */}
          {repairResult && (
            <div className="border rounded p-4 bg-blue-50">
              <h4 className="font-semibold mb-2">Repair Result</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Recording ID:</strong> {repairResult.recordingId}</div>
                <div><strong>Success:</strong> {repairResult.success ? '✅ Yes' : '❌ No'}</div>
                <div><strong>Method:</strong> {repairResult.method}</div>
                <div><strong>Before:</strong> {repairResult.oldDuration || 'null'} seconds</div>
                <div><strong>After:</strong> {repairResult.newDuration || 'null'} seconds</div>
                {repairResult.error && (
                  <div className="text-red-600"><strong>Error:</strong> {repairResult.error}</div>
                )}
                {repairResult.success && repairResult.newDuration !== repairResult.oldDuration && (
                  <div className="text-green-600 font-semibold">
                    ✅ Duration successfully repaired!
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspicious Recordings */}
      <Card>
        <CardHeader>
          <CardTitle>🔍 Find & Repair Suspicious Recordings</CardTitle>
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
                <div key={recording.id} className="border border-yellow-200 rounded p-3 bg-yellow-50">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 text-sm">
                      <div><strong>Title:</strong> {recording.title}</div>
                      <div><strong>Duration:</strong> {recording.duration || 'null'} seconds</div>
                      <div><strong>Created:</strong> {new Date(recording.created_at).toLocaleString()}</div>
                      <div><strong>File Size:</strong> {recording.file_size ? `${(recording.file_size / 1024 / 1024).toFixed(1)} MB` : 'Unknown'}</div>
                      <div className="text-xs text-gray-500"><strong>ID:</strong> {recording.id}</div>
                    </div>
                    <Button 
                      onClick={() => handleRepairSuspicious(recording.id)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Repair This
                    </Button>
                  </div>
                </div>
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
}