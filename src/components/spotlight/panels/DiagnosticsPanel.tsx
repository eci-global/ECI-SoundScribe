import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle, Play, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { diagnoseAIFeatures, runFullAIProcessing, formatDiagnosticReport, type DiagnosticResult } from '@/utils/aiDiagnostics';
import type { Recording } from '@/types/recording';

interface DiagnosticsPanelProps {
  recording?: Recording | null;
}

export default function DiagnosticsPanel({ recording }: DiagnosticsPanelProps) {
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const runDiagnostic = async () => {
    if (!recording?.id) return;

    setIsRunningDiagnostic(true);
    try {
      const result = await diagnoseAIFeatures(recording.id);
      setDiagnosticResult(result);
      
      if (result.overallStatus === 'healthy') {
        toast({
          title: "All AI Features Working",
          description: "All AI features are functioning properly for this recording."
        });
      } else {
        toast({
          title: "Issues Detected",
          description: `Found ${result.features.filter(f => f.status !== 'working').length} issues with AI features.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Diagnostic failed:', error);
      toast({
        title: "Diagnostic Failed",
        description: "Could not run AI features diagnostic.",
        variant: "destructive"
      });
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const runFullProcessing = async () => {
    if (!recording?.id) return;

    setIsProcessing(true);
    try {
      const result = await runFullAIProcessing(recording.id);
      
      if (result.success) {
        toast({
          title: "AI Processing Complete",
          description: result.message
        });
        
        // Re-run diagnostic after processing
        setTimeout(() => {
          runDiagnostic();
        }, 2000);
      } else {
        toast({
          title: "Processing Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Full processing failed:', error);
      toast({
        title: "Processing Failed",
        description: "Could not complete AI processing.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-run diagnostic when recording changes
  useEffect(() => {
    if (recording?.id) {
      runDiagnostic();
    }
  }, [recording?.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'missing_data':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case 'broken':
        return <Badge className="bg-red-100 text-red-800">Issues Found</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  if (!recording) {
    return (
      <div className="p-6 text-center text-gray-500">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>No recording selected</p>
        <p className="text-sm">Select a recording to run AI features diagnostic</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Features Diagnostic</h3>
          <p className="text-sm text-gray-600">Check the status of AI features for this recording</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runDiagnostic}
            disabled={isRunningDiagnostic}
            variant="outline"
            size="sm"
          >
            {isRunningDiagnostic ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Run Diagnostic
          </Button>
          {diagnosticResult && diagnosticResult.overallStatus !== 'healthy' && (
            <Button
              onClick={runFullProcessing}
              disabled={isProcessing}
              size="sm"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wrench className="w-4 h-4 mr-2" />
              )}
              Fix Issues
            </Button>
          )}
        </div>
      </div>

      {diagnosticResult && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Overall Status</CardTitle>
              {getStatusBadge(diagnosticResult.overallStatus)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Feature Status List */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Feature Status</h4>
              {diagnosticResult.features.map((feature, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(feature.status)}
                    <div>
                      <span className="font-medium text-gray-900">{feature.feature}</span>
                      <p className="text-sm text-gray-600">{feature.message}</p>
                    </div>
                  </div>
                  {feature.data && (
                    <div className="text-xs text-gray-500">
                      {feature.data.count && `${feature.data.count} items`}
                      {feature.data.length && `${feature.data.length} chars`}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {diagnosticResult.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Recommendations</h4>
                <ul className="space-y-1">
                  {diagnosticResult.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-blue-500 font-medium">{index + 1}.</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Raw Report (Collapsible) */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                View Raw Report
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                {formatDiagnosticReport(diagnosticResult)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      {isRunningDiagnostic && !diagnosticResult && (
        <Card>
          <CardContent className="p-6 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-500" />
            <p className="text-gray-600">Running AI features diagnostic...</p>
          </CardContent>
        </Card>
      )}

      {isProcessing && (
        <Card>
          <CardContent className="p-6 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-green-500" />
            <p className="text-gray-600">Processing AI features...</p>
            <p className="text-sm text-gray-500 mt-1">This may take a few minutes</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 