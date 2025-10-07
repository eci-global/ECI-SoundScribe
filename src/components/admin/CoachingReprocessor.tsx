
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  PlayCircle, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  BarChart3,
  FileText,
  Clock,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RecordingToProcess {
  id: string;
  title: string;
  content_type: string | null;
  created_at: string;
  user_email: string;
}

interface ProcessResult {
  id: string;
  title: string;
  status: 'success' | 'error';
  error?: string;
}

export default function CoachingReprocessor() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [recordingsToProcess, setRecordingsToProcess] = useState<RecordingToProcess[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    withCoaching: 0,
    withoutCoaching: 0
  });
  const { toast } = useToast();

  // Check for recordings that need coaching evaluation
  const checkRecordings = async () => {
    setChecking(true);
    try {
      // Get total counts
      const { count: totalCount } = await supabase
        .from('recordings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const { count: withCoachingCount } = await supabase
        .from('recordings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .not('coaching_evaluation', 'is', null);

      const withoutCoachingCount = (totalCount || 0) - (withCoachingCount || 0);

      // Get recordings that need processing with proper error handling
      const { data: recordings, error } = await supabase
        .from('recordings')
        .select(`
          id,
          title,
          content_type,
          created_at,
          profiles!recordings_user_id_fkey(email)
        `)
        .eq('status', 'completed')
        .is('coaching_evaluation', null)
        .not('transcript', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching recordings:', error);
        throw error;
      }

      const processableRecordings = recordings?.map(r => ({
        id: r.id,
        title: r.title,
        content_type: r.content_type,
        created_at: r.created_at,
        user_email: Array.isArray(r.profiles) && r.profiles.length > 0 ? r.profiles[0].email : 'Unknown'
      })) || [];

      setRecordingsToProcess(processableRecordings);
      setStats({
        total: totalCount || 0,
        withCoaching: withCoachingCount || 0,
        withoutCoaching: withoutCoachingCount
      });

      toast({
        title: "Scan Complete",
        description: `Found ${processableRecordings.length} recordings that need coaching evaluation`,
      });
    } catch (error) {
      console.error('Error checking recordings:', error);
      toast({
        title: "Error",
        description: "Failed to scan recordings for coaching data",
        variant: "destructive",
      });
    }
    setChecking(false);
  };

  // Process recordings for coaching evaluation
  const processRecordings = async (batchSize: number = 5) => {
    if (recordingsToProcess.length === 0) return;

    setProcessing(true);
    setProgress(0);
    setResults([]);

    try {
      const batches = [];
      for (let i = 0; i < recordingsToProcess.length; i += batchSize) {
        batches.push(recordingsToProcess.slice(i, i + batchSize));
      }

      let processedCount = 0;
      const allResults: ProcessResult[] = [];

      for (const batch of batches) {
        // Process batch through Edge Function
        const { data, error } = await supabase.functions.invoke('reprocess-coaching', {
          body: {
            recording_ids: batch.map(r => r.id),
            batch_size: batchSize
          }
        });

        if (error) {
          console.error('Batch processing error:', error);
          // Add error results for this batch
          batch.forEach(recording => {
            allResults.push({
              id: recording.id,
              title: recording.title,
              status: 'error',
              error: error.message
            });
          });
        } else {
          allResults.push(...(data.results || []));
          processedCount += data.processed || 0;
        }

        // Update progress
        const progressPercentage = ((allResults.length / recordingsToProcess.length) * 100);
        setProgress(progressPercentage);
        setResults([...allResults]);

        // Small delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      toast({
        title: "Processing Complete",
        description: `Successfully processed ${processedCount} of ${recordingsToProcess.length} recordings`,
        variant: processedCount > 0 ? "default" : "destructive",
      });

      // Refresh the check after processing
      if (processedCount > 0) {
        setTimeout(checkRecordings, 2000);
      }

    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing Failed",
        description: "An error occurred during batch processing",
        variant: "destructive",
      });
    }

    setProcessing(false);
  };

  // Process single recording
  const processSingleRecording = async (recording: RecordingToProcess) => {
    try {
      const { data, error } = await supabase.functions.invoke('reprocess-coaching', {
        body: { recording_id: recording.id }
      });

      if (error) throw error;

      toast({
        title: "Processing Complete",
        description: `Successfully processed "${recording.title}"`,
      });

      // Remove from list and refresh stats
      setRecordingsToProcess(prev => prev.filter(r => r.id !== recording.id));
      checkRecordings();
    } catch (error) {
      console.error('Single processing error:', error);
      toast({
        title: "Processing Failed",
        description: `Failed to process "${recording.title}"`,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    checkRecordings();
  }, []);

  const getContentTypeColor = (contentType: string | null) => {
    switch (contentType) {
      case 'sales_call': return 'bg-blue-100 text-blue-800';
      case 'customer_support': return 'bg-green-100 text-green-800';
      case 'team_meeting': return 'bg-purple-100 text-purple-800';
      case 'training_session': return 'bg-orange-100 text-orange-800';
      case 'user_experience': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContentTypeLabel = (contentType: string | null) => {
    switch (contentType) {
      case 'sales_call': return 'Sales Call';
      case 'customer_support': return 'Support';
      case 'team_meeting': return 'Meeting';
      case 'training_session': return 'Training';
      case 'user_experience': return 'UX Interview';
      default: return contentType || 'Other';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Recordings</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">With Coaching Data</p>
                <p className="text-2xl font-bold text-green-600">{stats.withCoaching}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Missing Coaching Data</p>
                <p className="text-2xl font-bold text-orange-600">{stats.withoutCoaching}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Coaching Data Reprocessor
          </CardTitle>
          <CardDescription>
            Generate AI coaching evaluations for recordings that don't have coaching data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={checkRecordings} 
              disabled={checking}
              variant="outline"
            >
              {checking ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Scan for Missing Data
            </Button>

            {recordingsToProcess.length > 0 && (
              <Button 
                onClick={() => processRecordings(5)} 
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <PlayCircle className="w-4 h-4 mr-2" />
                )}
                Process All ({recordingsToProcess.length})
              </Button>
            )}
          </div>

          {processing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing recordings...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Display */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {result.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium">{result.title}</span>
                  </div>
                  {result.error && (
                    <span className="text-sm text-red-600">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recordings to Process */}
      {recordingsToProcess.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recordings Missing Coaching Data</CardTitle>
            <CardDescription>
              These recordings have transcripts but no coaching evaluation data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recordingsToProcess.slice(0, 10).map((recording) => (
                <div key={recording.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{recording.title}</h4>
                      <Badge className={getContentTypeColor(recording.content_type)}>
                        {getContentTypeLabel(recording.content_type)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{recording.user_email}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(recording.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => processSingleRecording(recording)}
                    disabled={processing}
                  >
                    <Target className="w-4 h-4 mr-1" />
                    Process
                  </Button>
                </div>
              ))}
              
              {recordingsToProcess.length > 10 && (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Showing first 10 recordings. Use "Process All" to handle all {recordingsToProcess.length} recordings.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {recordingsToProcess.length === 0 && !checking && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
            <p className="text-gray-600">
              All eligible recordings already have coaching evaluation data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
