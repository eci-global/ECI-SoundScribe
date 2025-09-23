/**
 * Duration Backfill Panel
 * 
 * Admin component for backfilling duration data for existing recordings
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Clock, Play, AlertCircle, CheckCircle, RefreshCw, Database } from 'lucide-react';
import { 
  backfillAllDurations, 
  getDurationStatistics, 
  getRecordingsWithoutDuration,
  BackfillProgress 
} from '@/utils/durationBackfill';

interface DurationStats {
  total: number;
  withDuration: number;
  withoutDuration: number;
  percentage: number;
}

export default function DurationBackfillPanel() {
  const [stats, setStats] = useState<DurationStats>({ total: 0, withDuration: 0, withoutDuration: 0, percentage: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [progress, setProgress] = useState<BackfillProgress | null>(null);
  const [lastBackfillResult, setLastBackfillResult] = useState<string | null>(null);
  const { toast } = useToast();

  // Load statistics on component mount
  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setIsLoadingStats(true);
    try {
      const statsData = await getDurationStatistics();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load duration statistics:', error);
      toast({
        title: "Failed to load statistics",
        description: "Could not load duration coverage statistics",
        variant: "destructive"
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleBackfillStart = async () => {
    setIsBackfilling(true);
    setProgress(null);
    setLastBackfillResult(null);

    try {
      toast({
        title: "Starting duration backfill",
        description: "Processing existing recordings to extract duration data..."
      });

      const result = await backfillAllDurations((progressUpdate) => {
        setProgress(progressUpdate);
      });

      if (result.success) {
        const { successful, failed, total } = result.progress;
        setLastBackfillResult(`Completed: ${successful}/${total} successful, ${failed} failed`);
        
        toast({
          title: "Backfill completed",
          description: `Successfully processed ${successful} out of ${total} recordings`,
          variant: successful === total ? "default" : "destructive"
        });

        // Reload statistics
        await loadStatistics();
      } else {
        setLastBackfillResult(`Failed: ${result.error}`);
        toast({
          title: "Backfill failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastBackfillResult(`Error: ${errorMessage}`);
      toast({
        title: "Backfill error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  const getStatusColor = () => {
    if (stats.percentage >= 95) return 'bg-green-100 text-green-800 border-green-200';
    if (stats.percentage >= 80) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getStatusText = () => {
    if (stats.percentage >= 95) return 'Excellent';
    if (stats.percentage >= 80) return 'Good';
    if (stats.percentage >= 50) return 'Fair';
    return 'Poor';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <CardTitle>Duration Data Management</CardTitle>
        </div>
        <CardDescription>
          Manage duration metadata for recordings. Duration is extracted from file metadata during upload.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Statistics Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {isLoadingStats ? '—' : stats.total.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Recordings</div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {isLoadingStats ? '—' : stats.withDuration.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">With Duration</div>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {isLoadingStats ? '—' : stats.withoutDuration.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Missing Duration</div>
          </div>

          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {isLoadingStats ? '—' : `${stats.percentage}%`}
            </div>
            <div className="text-sm text-gray-600">Coverage</div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Status:</span>
          <Badge className={getStatusColor()}>
            {getStatusText()} Coverage
          </Badge>
          {stats.withoutDuration > 0 && (
            <Badge variant="outline" className="border-orange-200 text-orange-700">
              {stats.withoutDuration} need processing
            </Badge>
          )}
        </div>

        {/* Progress Section */}
        {isBackfilling && progress && (
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Backfilling Duration Data
              </span>
            </div>
            
            {progress.total > 0 && (
              <>
                <Progress 
                  value={(progress.processed / progress.total) * 100} 
                  className="w-full"
                />
                <div className="text-xs text-blue-700">
                  {progress.currentFile && (
                    <div>Processing: {progress.currentFile}</div>
                  )}
                  <div>
                    Progress: {progress.processed}/{progress.total} 
                    ({progress.successful} successful, {progress.failed} failed)
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Last Result */}
        {lastBackfillResult && !isBackfilling && (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-700">
              <strong>Last Result:</strong> {lastBackfillResult}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleBackfillStart}
            disabled={isBackfilling || stats.withoutDuration === 0}
            className="flex items-center gap-2"
          >
            {isBackfilling ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Backfill
              </>
            )}
          </Button>

          <Button
            onClick={loadStatistics}
            variant="outline"
            disabled={isLoadingStats}
            className="flex items-center gap-2"
          >
            {isLoadingStats ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Refresh Stats
              </>
            )}
          </Button>
        </div>

        {/* Info Section */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">How it works:</div>
              <ul className="space-y-1 text-xs">
                <li>• New uploads automatically extract duration during processing</li>
                <li>• Backfill downloads existing files and extracts duration metadata</li>
                <li>• Supports audio and video files in all standard formats</li>
                <li>• Duration data improves user experience and analytics</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}