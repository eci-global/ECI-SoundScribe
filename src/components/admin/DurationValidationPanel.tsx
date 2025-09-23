/**
 * Duration Validation Panel
 * 
 * Admin tool to identify and fix duration timestamp mismatches
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { formatDuration } from '@/utils/mediaDuration';
import { 
  findSuspiciousRecordings, 
  batchValidateAndCorrect, 
  generateValidationReport,
  type DurationValidationResult 
} from '@/utils/durationValidator';
import type { Recording } from '@/types/recording';

export default function DurationValidationPanel() {
  const [suspiciousRecordings, setSuspiciousRecordings] = useState<Recording[]>([]);
  const [validationResults, setValidationResults] = useState<DurationValidationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<string>('');

  // Load suspicious recordings on mount
  useEffect(() => {
    loadSuspiciousRecordings();
  }, []);

  const loadSuspiciousRecordings = async () => {
    setIsLoading(true);
    try {
      const recordings = await findSuspiciousRecordings();
      setSuspiciousRecordings(recordings);
      console.log(`📊 Found ${recordings.length} recordings with suspicious durations`);
    } catch (error) {
      console.error('❌ Failed to load suspicious recordings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateAndCorrectAll = async () => {
    if (suspiciousRecordings.length === 0) return;

    setIsValidating(true);
    setProgress(0);
    setValidationResults([]);

    try {
      const results: DurationValidationResult[] = [];
      
      for (let i = 0; i < suspiciousRecordings.length; i++) {
        const recording = suspiciousRecordings[i];
        console.log(`🔍 Validating recording ${i + 1}/${suspiciousRecordings.length}: ${recording.id}`);
        
        // Import dynamically to avoid circular dependencies
        const { validateRecordingDuration, correctRecordingDuration } = await import('@/utils/durationValidator');
        
        const result = await validateRecordingDuration(recording);
        
        // Attempt correction if mismatch detected
        if (result.mismatch && result.actual_duration) {
          const corrected = await correctRecordingDuration(recording.id, result.actual_duration);
          result.corrected = corrected;
        }
        
        results.push(result);
        setValidationResults([...results]);
        setProgress(((i + 1) / suspiciousRecordings.length) * 100);
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Generate and display report
      const validationReport = generateValidationReport(results);
      setReport(validationReport);
      
      console.log('✅ Duration validation complete');
    } catch (error) {
      console.error('❌ Validation process failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusBadge = (result: DurationValidationResult) => {
    if (result.error) {
      return <Badge variant="destructive">Error</Badge>;
    }
    if (result.corrected) {
      return <Badge variant="default" className="bg-green-500">Corrected</Badge>;
    }
    if (result.mismatch) {
      return <Badge variant="secondary">Mismatch</Badge>;
    }
    return <Badge variant="outline">Valid</Badge>;
  };

  const getDurationDisplay = (duration: number | null) => {
    if (duration === null) return '—';
    if (duration === 9) return <span className="text-red-600 font-semibold">{formatDuration(duration)}</span>;
    return formatDuration(duration);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Duration Validation</h2>
          <p className="text-sm text-gray-600 mt-1">
            Identify and fix recordings with incorrect duration timestamps
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadSuspiciousRecordings}
            disabled={isLoading || isValidating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={validateAndCorrectAll}
            disabled={isValidating || suspiciousRecordings.length === 0}
          >
            <Clock className="h-4 w-4 mr-2" />
            Validate & Fix All
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-orange-600">{suspiciousRecordings.length}</div>
          <div className="text-sm text-gray-600">Suspicious Recordings</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-red-600">
            {validationResults.filter(r => r.mismatch).length}
          </div>
          <div className="text-sm text-gray-600">Mismatches Found</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">
            {validationResults.filter(r => r.corrected).length}
          </div>
          <div className="text-sm text-gray-600">Corrected</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-600">
            {validationResults.filter(r => r.error).length}
          </div>
          <div className="text-sm text-gray-600">Errors</div>
        </div>
      </div>

      {/* Validation Progress */}
      {isValidating && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div>Validating recordings... {Math.round(progress)}% complete</div>
              <Progress value={progress} className="w-full" />
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Report */}
      {report && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <pre className="whitespace-pre-wrap text-sm">{report}</pre>
          </AlertDescription>
        </Alert>
      )}

      {/* Suspicious Recordings List */}
      {suspiciousRecordings.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="font-medium">Recordings with Duration Issues</h3>
            <p className="text-sm text-gray-600">
              Recordings with missing, suspicious, or incorrect durations
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">Title</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Current Duration</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Actual Duration</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {suspiciousRecordings.map((recording) => {
                  const result = validationResults.find(r => r.recording_id === recording.id);
                  return (
                    <tr key={recording.id} className="border-t">
                      <td className="px-4 py-2">
                        <div className="font-medium truncate max-w-48">
                          {recording.title || 'Untitled'}
                        </div>
                        <div className="text-xs text-gray-500">{recording.id}</div>
                      </td>
                      <td className="px-4 py-2">
                        {getDurationDisplay(recording.duration)}
                      </td>
                      <td className="px-4 py-2">
                        {result ? getDurationDisplay(result.actual_duration) : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {result ? getStatusBadge(result) : (
                          isValidating ? (
                            <Badge variant="outline">Checking...</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Help Information */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <div className="font-medium">Common Duration Issues:</div>
            <ul className="text-sm space-y-1 ml-4">
              <li>• <strong>9-second bug:</strong> Azure Whisper API returns incorrect 9s duration</li>
              <li>• <strong>Missing duration:</strong> Failed extraction during upload</li>
              <li>• <strong>Timestamp mismatches:</strong> UI shows wrong time vs actual media length</li>
            </ul>
            <div className="mt-2 text-sm">
              This tool validates against the actual media files and corrects mismatches automatically.
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}