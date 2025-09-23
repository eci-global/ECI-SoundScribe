import { supabase } from '@/integrations/supabase/client';

export interface DiagnosticResult {
  step: string;
  duration: number;
  success: boolean;
  error?: string;
  data?: any;
}

export interface CoachingDiagnostic {
  recordingId: string;
  totalDuration: number;
  results: DiagnosticResult[];
  bottlenecks: string[];
  recommendations: string[];
}

export class CoachingDiagnostics {
  
  /**
   * Run comprehensive diagnostics on coaching generation
   */
  static async diagnoseCoachingGeneration(recordingId: string): Promise<CoachingDiagnostic> {
    const results: DiagnosticResult[] = [];
    const startTime = Date.now();
    let bottlenecks: string[] = [];
    let recommendations: string[] = [];

    // Step 1: Fetch recording data
    const fetchStart = Date.now();
    try {
      const { data: recording, error } = await supabase
        .from('recordings')
        .select('id, transcript, coaching_evaluation, enable_coaching')
        .eq('id', recordingId)
        .single();

      const fetchDuration = Date.now() - fetchStart;
      results.push({
        step: 'fetch_recording',
        duration: fetchDuration,
        success: !error,
        error: error?.message,
        data: { transcriptLength: recording?.transcript?.length || 0 }
      });

      if (fetchDuration > 1000) {
        bottlenecks.push('Database fetch is slow (>1s)');
        recommendations.push('Consider database indexing or connection optimization');
      }

      if (!recording?.transcript) {
        bottlenecks.push('No transcript available');
        recommendations.push('Ensure recording has been transcribed before coaching generation');
        return {
          recordingId,
          totalDuration: Date.now() - startTime,
          results,
          bottlenecks,
          recommendations
        };
      }

      if (recording.transcript.length > 8000) {
        bottlenecks.push(`Large transcript (${recording.transcript.length} chars, truncated to 8000)`);
        recommendations.push('Consider optimizing transcript length or streaming processing');
      }

      // Step 2: Test Azure OpenAI connectivity
      const connectivityStart = Date.now();
      try {
        const { data: testResult, error: testError } = await supabase.functions.invoke('test-azure-openai');
        const connectivityDuration = Date.now() - connectivityStart;
        
        results.push({
          step: 'azure_connectivity',
          duration: connectivityDuration,
          success: !testError && testResult?.success,
          error: testError?.message || testResult?.error,
          data: testResult
        });

        if (connectivityDuration > 5000) {
          bottlenecks.push('Azure OpenAI connectivity test is slow (>5s)');
          recommendations.push('Check network latency to Azure endpoints');
        }

        if (testError || !testResult?.success) {
          bottlenecks.push('Azure OpenAI connection failed');
          recommendations.push('Check Azure OpenAI API keys and endpoint configuration');
        }

      } catch (error) {
        results.push({
          step: 'azure_connectivity',
          duration: Date.now() - connectivityStart,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown connectivity error'
        });
        bottlenecks.push('Azure OpenAI connectivity test failed');
      }

      // Step 3: Test coaching generation (actual call)
      const generationStart = Date.now();
      try {
        const { data: coachingResult, error: coachingError } = await supabase.functions.invoke('generate-coaching', {
          body: { recording_id: recordingId }
        });

        const generationDuration = Date.now() - generationStart;
        results.push({
          step: 'coaching_generation',
          duration: generationDuration,
          success: !coachingError && coachingResult?.coaching_evaluation,
          error: coachingError?.message,
          data: {
            hasEvaluation: !!coachingResult?.coaching_evaluation,
            usage: coachingResult?.usage
          }
        });

        if (generationDuration > 60000) {
          bottlenecks.push('Coaching generation is very slow (>60s)');
          recommendations.push('Consider optimizing AI prompt, reducing transcript size, or upgrading Azure OpenAI tier');
        } else if (generationDuration > 30000) {
          bottlenecks.push('Coaching generation is slow (>30s)');
          recommendations.push('Monitor Azure OpenAI response times and consider prompt optimization');
        }

        if (coachingError) {
          bottlenecks.push(`Coaching generation failed: ${coachingError.message}`);
          recommendations.push('Check edge function logs and Azure OpenAI configuration');
        }

      } catch (error) {
        results.push({
          step: 'coaching_generation',
          duration: Date.now() - generationStart,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown generation error'
        });
        bottlenecks.push('Coaching generation failed with exception');
      }

    } catch (error) {
      results.push({
        step: 'fetch_recording',
        duration: Date.now() - fetchStart,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown fetch error'
      });
      bottlenecks.push('Failed to fetch recording data');
    }

    return {
      recordingId,
      totalDuration: Date.now() - startTime,
      results,
      bottlenecks,
      recommendations
    };
  }

  /**
   * Quick performance test for coaching generation
   */
  static async quickPerformanceTest(): Promise<{
    dbLatency: number;
    azureConnectivity: number;
    overallHealth: 'good' | 'warning' | 'poor';
  }> {
    // Test database latency
    const dbStart = Date.now();
    try {
      await supabase.from('recordings').select('id').limit(1);
    } catch (error) {
      console.warn('DB latency test failed:', error);
    }
    const dbLatency = Date.now() - dbStart;

    // Test Azure connectivity
    const azureStart = Date.now();
    let azureConnectivity = 0;
    try {
      await supabase.functions.invoke('test-azure-openai');
      azureConnectivity = Date.now() - azureStart;
    } catch (error) {
      azureConnectivity = Date.now() - azureStart;
      console.warn('Azure connectivity test failed:', error);
    }

    // Determine overall health
    let overallHealth: 'good' | 'warning' | 'poor' = 'good';
    if (dbLatency > 2000 || azureConnectivity > 10000) {
      overallHealth = 'poor';
    } else if (dbLatency > 500 || azureConnectivity > 5000) {
      overallHealth = 'warning';
    }

    return {
      dbLatency,
      azureConnectivity,
      overallHealth
    };
  }

  /**
   * Monitor coaching generation progress with step-by-step timing
   */
  static async monitorCoachingGeneration(recordingId: string, onProgress?: (step: string, elapsed: number) => void): Promise<any> {
    const startTime = Date.now();
    
    const updateProgress = (step: string) => {
      const elapsed = Date.now() - startTime;
      onProgress?.(step, elapsed);
      console.log(`Coaching Generation - ${step}: ${elapsed}ms elapsed`);
    };

    try {
      updateProgress('Starting coaching generation');
      
      const { data, error } = await supabase.functions.invoke('generate-coaching', {
        body: { recording_id: recordingId }
      });

      updateProgress('Coaching generation completed');
      
      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      updateProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}

// Utility to format diagnostic results for display
export function formatDiagnosticReport(diagnostic: CoachingDiagnostic): string {
  const { recordingId, totalDuration, results, bottlenecks, recommendations } = diagnostic;
  
  let report = `🔍 Coaching Generation Diagnostic Report\n`;
  report += `Recording ID: ${recordingId}\n`;
  report += `Total Duration: ${totalDuration}ms (${(totalDuration/1000).toFixed(1)}s)\n\n`;

  report += `📊 Step-by-Step Performance:\n`;
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    report += `${index + 1}. ${status} ${result.step}: ${result.duration}ms\n`;
    if (result.error) {
      report += `   Error: ${result.error}\n`;
    }
    if (result.data) {
      report += `   Data: ${JSON.stringify(result.data)}\n`;
    }
  });

  if (bottlenecks.length > 0) {
    report += `\n🚫 Identified Bottlenecks:\n`;
    bottlenecks.forEach((bottleneck, index) => {
      report += `${index + 1}. ${bottleneck}\n`;
    });
  }

  if (recommendations.length > 0) {
    report += `\n💡 Recommendations:\n`;
    recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });
  }

  return report;
}