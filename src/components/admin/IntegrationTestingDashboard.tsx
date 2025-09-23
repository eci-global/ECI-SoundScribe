import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Play,
  Square,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Database,
  Shield,
  Cloud,
  Zap,
  Mail,
  Webhook,
  BarChart3,
  FileText,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { integrationTester } from '@/utils/testing/integrationTester';
import type { TestSuite, TestResult, TestCase } from '@/utils/testing/integrationTester';

export default function IntegrationTestingDashboard() {
  const { toast } = useToast();
  
  // State
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [currentExecution, setCurrentExecution] = useState<{
    suiteId: string;
    running: boolean;
    progress: number;
    currentTest?: string;
  } | null>(null);
  const [selectedSuite, setSelectedSuite] = useState<string>('');
  const [testResults, setTestResults] = useState<Record<string, TestResult[]>>({});
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [testConfiguration, setTestConfiguration] = useState({
    parallel: false,
    stopOnFirstFailure: false,
    retryFailedTests: true,
    dryRun: false
  });

  // Load data on component mount
  useEffect(() => {
    loadTestSuites();
    loadExecutionHistory();
  }, []);

  const loadTestSuites = async () => {
    try {
      const suites = await integrationTester.getTestSuites();
      setTestSuites(suites);
      if (suites.length > 0 && !selectedSuite) {
        setSelectedSuite(suites[0].id);
      }
    } catch (error: any) {
      console.error('Failed to load test suites:', error);
      toast({
        title: "Error",
        description: "Failed to load test suites",
        variant: "destructive"
      });
    }
  };

  const loadExecutionHistory = async () => {
    try {
      const history = await integrationTester.getExecutionHistory();
      setExecutionHistory(history.slice(-20)); // Last 20 executions
    } catch (error: any) {
      console.error('Failed to load execution history:', error);
      toast({
        title: "Error",
        description: "Failed to load execution history",
        variant: "destructive"
      });
    }
  };

  const executeTestSuite = async (suiteId: string) => {
    const suite = testSuites.find(s => s.id === suiteId);
    if (!suite) return;

    setCurrentExecution({
      suiteId,
      running: true,
      progress: 0,
      currentTest: undefined
    });

    try {
      // Start execution with progress tracking
      const results = await integrationTester.executeTestSuite(suiteId, {
        parallel: testConfiguration.parallel,
        stopOnFirstFailure: testConfiguration.stopOnFirstFailure,
        retryFailedTests: testConfiguration.retryFailedTests,
        dryRun: testConfiguration.dryRun,
        generateReport: true
      });

      // Store results
      setTestResults(prev => ({
        ...prev,
        [suiteId]: results
      }));

      // Update suite data and history
      await Promise.all([
        loadTestSuites(),
        loadExecutionHistory()
      ]);

      const passedTests = results.filter(r => r.status === 'passed').length;
      const totalTests = results.length;

      toast({
        title: "Test Suite Completed",
        description: `${passedTests}/${totalTests} tests passed`,
        variant: passedTests === totalTests ? "default" : "destructive"
      });

    } catch (error: any) {
      console.error('Test execution failed:', error);
      toast({
        title: "Test Execution Failed",
        description: error.message || "Failed to execute test suite",
        variant: "destructive"
      });
    } finally {
      setCurrentExecution(null);
    }
  };

  const stopTestExecution = async () => {
    if (currentExecution) {
      try {
        // Attempt to gracefully stop the test execution
        await integrationTester.updateTestSuite(currentExecution.suiteId, {
          overallStatus: 'failed',
          failedTests: testSuites.find(s => s.id === currentExecution.suiteId)?.tests.length || 0
        });
        
        setCurrentExecution(null);
        await loadTestSuites();
        
        toast({
          title: "Test Execution Stopped",
          description: "Test execution has been cancelled"
        });
      } catch (error: any) {
        console.error('Failed to stop test execution:', error);
        toast({
          title: "Error",
          description: "Failed to stop test execution",
          variant: "destructive"
        });
      }
    }
  };

  const getTestCategoryIcon = (category: TestCase['category']) => {
    switch (category) {
      case 'database': return <Database className="h-4 w-4" />;
      case 'auth': return <Shield className="h-4 w-4" />;
      case 'storage': return <Cloud className="h-4 w-4" />;
      case 'api': return <Zap className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'webhook': return <Webhook className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'timeout': return <Clock className="h-4 w-4 text-orange-600" />;
      case 'skipped': return <Clock className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'timeout': return 'bg-orange-100 text-orange-800';
      case 'skipped': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const selectedSuiteData = testSuites.find(s => s.id === selectedSuite);
  const selectedSuiteResults = testResults[selectedSuite] || [];

  return (
    <div className="space-y-6">
      {/* Test Execution Control */}
      <Card className="bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-body font-semibold text-eci-gray-900">Integration Testing</h3>
            <p className="text-caption text-eci-gray-600">
              Test all external service integrations and connectivity
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Test Configuration */}
            <div className="flex items-center gap-2 text-caption">
              <Switch
                checked={testConfiguration.parallel}
                onCheckedChange={(checked) => 
                  setTestConfiguration(prev => ({ ...prev, parallel: checked }))
                }
              />
              <span>Parallel</span>
            </div>
            <div className="flex items-center gap-2 text-caption">
              <Switch
                checked={testConfiguration.stopOnFirstFailure}
                onCheckedChange={(checked) => 
                  setTestConfiguration(prev => ({ ...prev, stopOnFirstFailure: checked }))
                }
              />
              <span>Stop on Failure</span>
            </div>
            <div className="flex items-center gap-2 text-caption">
              <Switch
                checked={testConfiguration.dryRun}
                onCheckedChange={(checked) => 
                  setTestConfiguration(prev => ({ ...prev, dryRun: checked }))
                }
              />
              <span>Dry Run</span>
            </div>
          </div>
        </div>

        {/* Current Execution Status */}
        {currentExecution && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-body font-medium text-blue-900">
                Executing: {testSuites.find(s => s.id === currentExecution.suiteId)?.name}
              </span>
              <Button
                onClick={stopTestExecution}
                variant="destructive"
                size="sm"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </div>
            <Progress value={currentExecution.progress} className="mb-2" />
            {currentExecution.currentTest && (
              <p className="text-caption text-blue-700">
                Current test: {currentExecution.currentTest}
              </p>
            )}
          </div>
        )}

        {/* Test Suites Overview */}
        <div className="grid grid-cols-4 gap-4">
          {testSuites.map((suite) => (
            <div
              key={suite.id}
              className={`p-4 border rounded cursor-pointer transition-colors ${
                selectedSuite === suite.id 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-eci-gray-200 hover:border-eci-gray-300'
              }`}
              onClick={() => setSelectedSuite(suite.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-body-small font-medium">{suite.name}</h4>
                <Badge 
                  className={
                    suite.overallStatus === 'passed' ? 'bg-green-100 text-green-800' :
                    suite.overallStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }
                >
                  {suite.overallStatus}
                </Badge>
              </div>
              <p className="text-caption text-eci-gray-600 mb-2">{suite.description}</p>
              <div className="flex items-center justify-between text-caption">
                <span>{suite.tests.length} tests</span>
                {suite.executedAt && (
                  <span className="text-eci-gray-500">
                    {new Date(suite.executedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              {suite.totalTests > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-eci-gray-600 mb-1">
                    <span>Passed: {suite.passedTests}</span>
                    <span>Failed: {suite.failedTests}</span>
                  </div>
                  <Progress value={(suite.passedTests / suite.totalTests) * 100} className="h-1" />
                </div>
              )}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  executeTestSuite(suite.id);
                }}
                disabled={currentExecution?.running}
                className="w-full mt-3 flex items-center gap-2"
                size="sm"
              >
                <Play className="h-3 w-3" />
                Run Tests
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Selected Suite Details */}
      {selectedSuiteData && (
        <Card className="bg-white shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-body font-semibold text-eci-gray-900">{selectedSuiteData.name}</h3>
              <p className="text-caption text-eci-gray-600">{selectedSuiteData.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => loadTestSuites()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                onClick={() => executeTestSuite(selectedSuiteData.id)}
                disabled={currentExecution?.running}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Run Suite
              </Button>
            </div>
          </div>

          {/* Test Cases */}
          <div className="space-y-3">
            <h4 className="text-body font-medium text-eci-gray-900">Test Cases</h4>
            {selectedSuiteData.tests.map((test) => {
              const result = selectedSuiteResults.find(r => r.testId === test.id);
              
              return (
                <div key={test.id} className="flex items-start justify-between p-3 border border-eci-gray-200 rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getTestCategoryIcon(test.category)}
                      <span className="text-body font-medium">{test.name}</span>
                      <Badge variant="outline">{test.category}</Badge>
                      <Badge variant="outline" className={getSeverityColor(test.severity)}>
                        {test.severity}
                      </Badge>
                      {!test.enabled && (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                      {result && (
                        <Badge className={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-caption text-eci-gray-600 mb-2">{test.description}</p>
                    <div className="flex items-center gap-4 text-caption text-eci-gray-500">
                      <span>Timeout: {test.timeout}ms</span>
                      <span>Retries: {test.retries}</span>
                      {test.dependencies.length > 0 && (
                        <span>Dependencies: {test.dependencies.length}</span>
                      )}
                      {result && (
                        <>
                          <span>Duration: {formatDuration(result.duration)}</span>
                          {result.executedAt && (
                            <span>Executed: {new Date(result.executedAt).toLocaleTimeString()}</span>
                          )}
                        </>
                      )}
                    </div>
                    {result && result.message && (
                      <p className={`text-caption mt-1 ${
                        result.status === 'passed' ? 'text-green-700' :
                        result.status === 'failed' || result.status === 'error' ? 'text-red-700' :
                        'text-orange-700'
                      }`}>
                        {result.message}
                      </p>
                    )}
                    {result && result.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-caption font-medium text-red-700">Errors:</p>
                        <ul className="list-disc list-inside text-caption text-red-600 ml-2">
                          {result.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result && result.warnings.length > 0 && (
                      <div className="mt-2">
                        <p className="text-caption font-medium text-yellow-700">Warnings:</p>
                        <ul className="list-disc list-inside text-caption text-yellow-600 ml-2">
                          {result.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {result && getStatusIcon(result.status)}
                    <Switch
                      checked={test.enabled}
                      onCheckedChange={(checked) => {
                        // In a real implementation, this would update the test configuration
                        console.log(`Toggle test ${test.id}: ${checked}`);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Execution History */}
      {executionHistory.length > 0 && (
        <Card className="bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-eci-gray-400" />
            <h3 className="text-body font-semibold text-eci-gray-900">Execution History</h3>
          </div>

          <div className="space-y-3">
            {executionHistory.slice(-10).reverse().map((execution, index) => {
              const suite = testSuites.find(s => s.id === execution.suiteId);
              const passedTests = execution.results.filter((r: TestResult) => r.status === 'passed').length;
              const totalTests = execution.results.length;
              const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
              
              return (
                <div key={`${execution.suiteId}-${execution.executedAt}`} className="flex items-center justify-between p-3 border border-eci-gray-200 rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-body font-medium">{suite?.name || execution.suiteId}</span>
                      <Badge className={successRate === 100 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {passedTests}/{totalTests} passed
                      </Badge>
                      <span className="text-caption text-eci-gray-500">
                        {new Date(execution.executedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-caption text-eci-gray-600">
                      <span>Duration: {formatDuration(execution.duration)}</span>
                      <span>Success Rate: {successRate.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="w-24">
                    <Progress value={successRate} className="h-2" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}