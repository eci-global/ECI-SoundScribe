import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Cloud, 
  Zap,
  RefreshCw,
  Bug
} from 'lucide-react';
import { CoachingDiagnostics, formatDiagnosticReport, type CoachingDiagnostic } from '@/utils/coachingDiagnostics';

interface CoachingDiagnosticPanelProps {
  recordingId: string;
  onDiagnosticComplete?: (diagnostic: CoachingDiagnostic) => void;
}

export function CoachingDiagnosticPanel({ recordingId, onDiagnosticComplete }: CoachingDiagnosticPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [diagnostic, setDiagnostic] = useState<CoachingDiagnostic | null>(null);
  const [quickTest, setQuickTest] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<string>('');

  const runDiagnostic = async () => {
    setIsRunning(true);
    setDiagnostic(null);
    setCurrentStep('Initializing diagnostic...');

    try {
      const result = await CoachingDiagnostics.diagnoseCoachingGeneration(recordingId);
      setDiagnostic(result);
      onDiagnosticComplete?.(result);
    } catch (error) {
      console.error('Diagnostic failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentStep('');
    }
  };

  const runQuickTest = async () => {
    setIsRunning(true);
    try {
      const result = await CoachingDiagnostics.quickPerformanceTest();
      setQuickTest(result);
    } catch (error) {
      console.error('Quick test failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStepIcon = (step: string, success: boolean) => {
    if (step === 'fetch_recording') return <Database className="w-4 h-4" />;
    if (step === 'azure_connectivity') return <Cloud className="w-4 h-4" />;
    if (step === 'coaching_generation') return <Zap className="w-4 h-4" />;
    return success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Coaching Generation Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              onClick={runQuickTest}
              disabled={isRunning}
              variant="outline"
              size="sm"
            >
              <Activity className="w-4 h-4 mr-2" />
              Quick Health Check
            </Button>
            <Button
              onClick={runDiagnostic}
              disabled={isRunning}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
              Full Diagnostic
            </Button>
          </div>

          {isRunning && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center text-blue-800 text-sm">
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                <span>{currentStep || 'Running diagnostic...'}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Test Results */}
      {quickTest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Performance Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <Database className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold">{quickTest.dbLatency}ms</div>
                <div className="text-sm text-gray-600">Database Latency</div>
              </div>
              <div className="text-center">
                <Cloud className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold">{quickTest.azureConnectivity}ms</div>
                <div className="text-sm text-gray-600">Azure Connectivity</div>
              </div>
              <div className="text-center">
                <Activity className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <Badge className={getHealthColor(quickTest.overallHealth)}>
                  {quickTest.overallHealth.toUpperCase()}
                </Badge>
                <div className="text-sm text-gray-600 mt-1">Overall Health</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Diagnostic Results */}
      {diagnostic && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Diagnostic Summary</span>
                <Badge variant="outline" className="text-sm">
                  <Clock className="w-3 h-3 mr-1" />
                  {(diagnostic.totalDuration / 1000).toFixed(1)}s total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Performance Steps</h4>
                  <div className="space-y-2">
                    {diagnostic.results.map((result, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {getStepIcon(result.step, result.success)}
                          <span className={result.success ? 'text-green-700' : 'text-red-700'}>
                            {result.step.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {result.duration}ms
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Key Metrics</h4>
                  <div className="space-y-1 text-sm">
                    <div>Recording ID: <code className="text-xs bg-gray-100 px-1 rounded">{diagnostic.recordingId}</code></div>
                    <div>Total Steps: {diagnostic.results.length}</div>
                    <div>Successful: {diagnostic.results.filter(r => r.success).length}</div>
                    <div>Failed: {diagnostic.results.filter(r => !r.success).length}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottlenecks */}
          {diagnostic.bottlenecks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  Identified Bottlenecks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {diagnostic.bottlenecks.map((bottleneck, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span className="text-red-700">{bottleneck}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {diagnostic.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <CheckCircle className="w-5 h-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {diagnostic.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span className="text-blue-700">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-x-auto">
                {formatDiagnosticReport(diagnostic)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}