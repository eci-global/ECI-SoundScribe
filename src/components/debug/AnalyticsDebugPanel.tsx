import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, RefreshCw, Settings } from 'lucide-react';

interface AnalyticsDebugPanelProps {
  recordingId: string;
}

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export function AnalyticsDebugPanel({ recordingId }: AnalyticsDebugPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    const tests: TestResult[] = [];

    // Test 1: Check recording exists and has transcript
    tests.push({ test: 'Recording Data Check', status: 'pending', message: 'Checking recording data...' });
    setResults([...tests]);

    try {
      const { data: recording, error: recordingError } = await supabase
        .from('recordings')
        .select('id, transcript, user_id, created_at')
        .eq('id', recordingId)
        .single();

      if (recordingError || !recording) {
        tests[0] = { 
          test: 'Recording Data Check', 
          status: 'error', 
          message: 'Recording not found or inaccessible',
          details: recordingError
        };
      } else if (!recording.transcript) {
        tests[0] = { 
          test: 'Recording Data Check', 
          status: 'error', 
          message: 'No transcript available - recording needs to be processed first' 
        };
      } else {
        tests[0] = { 
          test: 'Recording Data Check', 
          status: 'success', 
          message: `Recording found with transcript (${recording.transcript.length} characters)`,
          details: { transcriptLength: recording.transcript.length, userId: recording.user_id }
        };
      }
    } catch (error) {
      tests[0] = { 
        test: 'Recording Data Check', 
        status: 'error', 
        message: `Database error: ${error.message}`,
        details: error
      };
    }

    setResults([...tests]);

    // Test 2: Test Azure OpenAI configuration
    tests.push({ test: 'Azure OpenAI Config', status: 'pending', message: 'Testing Azure OpenAI connection...' });
    setResults([...tests]);

    try {
      const { data: configTest, error: configError } = await supabase.functions.invoke('test-azure-openai', {});

      if (configError) {
        tests[1] = { 
          test: 'Azure OpenAI Config', 
          status: 'error', 
          message: 'Azure OpenAI configuration failed',
          details: configError
        };
      } else if (configTest?.results) {
        tests[1] = { 
          test: 'Azure OpenAI Config', 
          status: 'success', 
          message: 'Azure OpenAI connection successful',
          details: configTest.results
        };
      } else {
        tests[1] = { 
          test: 'Azure OpenAI Config', 
          status: 'error', 
          message: 'Azure OpenAI test returned unexpected response',
          details: configTest
        };
      }
    } catch (error) {
      tests[1] = { 
        test: 'Azure OpenAI Config', 
        status: 'error', 
        message: `Connection test failed: ${error.message}`,
        details: error
      };
    }

    setResults([...tests]);

    // Test 3: Test the analyze-speakers-topics edge function
    tests.push({ test: 'Analytics Edge Function', status: 'pending', message: 'Testing analytics edge function...' });
    setResults([...tests]);

    try {
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-speakers-topics', {
        body: {
          recording_id: recordingId,
          transcript: 'This is a test transcript to verify the analytics function is working properly.'
        }
      });

      if (analysisError) {
        tests[2] = { 
          test: 'Analytics Edge Function', 
          status: 'error', 
          message: `Edge function failed: ${analysisError.message || 'Unknown error'}`,
          details: analysisError
        };
      } else if (analysisResult?.success) {
        tests[2] = { 
          test: 'Analytics Edge Function', 
          status: 'success', 
          message: 'Edge function executed successfully',
          details: {
            topics: analysisResult.topics_count || 0,
            speakers: analysisResult.speakers?.length || 0,
            provider: analysisResult.provider,
            model: analysisResult.model
          }
        };
      } else {
        tests[2] = { 
          test: 'Analytics Edge Function', 
          status: 'error', 
          message: 'Edge function returned unexpected result',
          details: analysisResult
        };
      }
    } catch (error) {
      tests[2] = { 
        test: 'Analytics Edge Function', 
        status: 'error', 
        message: `Function execution failed: ${error.message}`,
        details: error
      };
    }

    setResults([...tests]);

    // Test 4: Check AI moments in database
    tests.push({ test: 'AI Moments Check', status: 'pending', message: 'Checking for existing AI moments...' });
    setResults([...tests]);

    try {
      const { data: moments, error: momentsError } = await supabase
        .from('ai_moments')
        .select('type, start_time, label, metadata')
        .eq('recording_id', recordingId)
        .in('type', ['sentiment_neg', 'positive_peak', 'negative_dip', 'emotional_moment']);

      if (momentsError) {
        tests[3] = { 
          test: 'AI Moments Check', 
          status: 'error', 
          message: `Error querying AI moments: ${momentsError.message}`,
          details: momentsError
        };
      } else {
        tests[3] = { 
          test: 'AI Moments Check', 
          status: 'success', 
          message: `Found ${moments?.length || 0} sentiment moments`,
          details: { 
            count: moments?.length || 0,
            types: [...new Set(moments?.map(m => m.type) || [])]
          }
        };
      }
    } catch (error) {
      tests[3] = { 
        test: 'AI Moments Check', 
        status: 'error', 
        message: `Database query failed: ${error.message}`,
        details: error
      };
    }

    setResults([...tests]);
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'pending':
        return <Badge variant="outline">Running...</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Analytics Debug Panel</h3>
      </div>
      
      <div className="mb-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            'Run Diagnostics'
          )}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border border-border rounded-md">
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(result.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{result.test}</span>
                  {getStatusBadge(result.status)}
                </div>
                <p className="text-sm text-muted-foreground">{result.message}</p>
                {result.details && result.status === 'error' && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Show details
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
                {result.details && result.status === 'success' && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {typeof result.details === 'object' && result.details.count !== undefined && (
                      <span>Count: {result.details.count}</span>
                    )}
                    {typeof result.details === 'object' && result.details.transcriptLength !== undefined && (
                      <span>Transcript length: {result.details.transcriptLength} chars</span>
                    )}
                    {typeof result.details === 'object' && result.details.topics !== undefined && (
                      <span>Topics: {result.details.topics}, Speakers: {result.details.speakers}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length > 0 && !isRunning && (
        <div className="mt-4 p-3 bg-muted rounded-md">
          <h4 className="font-medium text-sm mb-2">Next Steps:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {results.some(r => r.status === 'error') && (
              <>
                <li>• Check the browser console for detailed error logs</li>
                <li>• Verify Azure OpenAI environment variables are set in Supabase</li>
                <li>• Ensure the recording has been processed and has a transcript</li>
                <li>• Try refreshing the page and running diagnostics again</li>
              </>
            )}
            {results.every(r => r.status === 'success') && (
              <li className="text-green-600">• All tests passed! The analytics should work properly now.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}