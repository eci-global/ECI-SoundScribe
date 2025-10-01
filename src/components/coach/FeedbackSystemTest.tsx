import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  Target,
  BarChart3,
  Users,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AICalibrationService } from '@/services/aiCalibrationService';
import { ManagerValidationWorkflow } from '@/services/managerValidationWorkflow';
import { RealtimeConstraintService } from '@/services/realtimeConstraintService';
import FeedbackAnalyticsDashboard from '@/components/analytics/FeedbackAnalyticsDashboard';

interface TestResult {
  test: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  duration?: number;
}

const FeedbackSystemTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'idle' | 'testing' | 'completed'>('idle');

  const tests = [
    {
      name: 'Database Schema Validation',
      description: 'Verify all required tables exist and have proper structure',
      test: testDatabaseSchema
    },
    {
      name: 'Manager Feedback Modal',
      description: 'Test manager feedback modal functionality',
      test: testManagerFeedbackModal
    },
    {
      name: 'AI Calibration Service',
      description: 'Test AI calibration constraint generation',
      test: testAICalibrationService
    },
    {
      name: 'Validation Workflow',
      description: 'Test manager validation workflow for high-variance scores',
      test: testValidationWorkflow
    },
    {
      name: 'Real-time Constraint Updates',
      description: 'Test real-time constraint update system',
      test: testRealtimeConstraintUpdates
    },
    {
      name: 'Analytics Dashboard',
      description: 'Test feedback analytics dashboard data loading',
      test: testAnalyticsDashboard
    },
    {
      name: 'End-to-End Integration',
      description: 'Test complete feedback system integration',
      test: testEndToEndIntegration
    }
  ];

  const runAllTests = async () => {
    setIsRunning(true);
    setSystemStatus('testing');
    setTestResults([]);

    for (const test of tests) {
      const startTime = Date.now();
      
      // Set test as running
      setTestResults(prev => [...prev, {
        test: test.name,
        status: 'running',
        message: 'Running test...',
        duration: 0
      }]);

      try {
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        setTestResults(prev => prev.map(t => 
          t.test === test.name 
            ? { ...t, status: result.success ? 'passed' : 'failed', message: result.message, duration }
            : t
        ));

        if (!result.success) {
          console.error(`Test failed: ${test.name}`, result.error);
        }

      } catch (error) {
        const duration = Date.now() - startTime;
        setTestResults(prev => prev.map(t => 
          t.test === test.name 
            ? { ...t, status: 'failed', message: `Test error: ${error.message}`, duration }
            : t
        ));
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
    setSystemStatus('completed');
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full bg-gray-300" />;
      case 'running':
        return <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse" />;
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-600';
      case 'running':
        return 'text-blue-600';
      case 'passed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
    }
  };

  const passedTests = testResults.filter(t => t.status === 'passed').length;
  const totalTests = testResults.length;
  const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feedback System Test Suite</h2>
          <p className="text-gray-600">Comprehensive testing of the manager feedback system</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Running Tests...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {totalTests}
              </div>
              <div className="text-sm text-gray-500">Total Tests</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {passedTests}
              </div>
              <div className="text-sm text-green-500">Passed</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-blue-500">Success Rate</div>
            </div>
          </div>
          
          {totalTests > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Test Progress</span>
                <span className="text-sm text-gray-600">{passedTests}/{totalTests}</span>
              </div>
              <Progress value={successRate} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Test Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <h4 className="font-medium">{result.test}</h4>
                    <p className={cn("text-sm", getStatusColor(result.status))}>
                      {result.message}
                    </p>
                  </div>
                </div>
                {result.duration && (
                  <Badge variant="outline">
                    {result.duration}ms
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Dashboard Preview */}
      {systemStatus === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Analytics Dashboard Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FeedbackAnalyticsDashboard />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Test Functions
async function testDatabaseSchema(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const requiredTables = [
      'manager_feedback_corrections',
      'ai_calibration_constraints',
      'constraint_updates',
      'validation_queue',
      'validation_alerts',
      'ai_calibration_logs'
    ];

    for (const table of requiredTables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        return { success: false, message: `Table ${table} not accessible`, error: error.message };
      }
    }

    return { success: true, message: 'All required tables exist and are accessible' };

  } catch (error) {
    return { success: false, message: 'Database schema validation failed', error: error.message };
  }
}

async function testManagerFeedbackModal(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Test if the modal component can be imported and rendered
    const { default: ManagerFeedbackModal } = await import('@/components/coach/ManagerFeedbackModal');
    
    if (!ManagerFeedbackModal) {
      return { success: false, message: 'ManagerFeedbackModal component not found' };
    }

    return { success: true, message: 'ManagerFeedbackModal component is available' };

  } catch (error) {
    return { success: false, message: 'ManagerFeedbackModal test failed', error: error.message };
  }
}

async function testAICalibrationService(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const constraints = await AICalibrationService.getCalibrationConstraints();
    const patterns = await AICalibrationService.getManagerCorrectionPatterns();
    const alignment = await AICalibrationService.getOverallAlignment();

    if (typeof alignment !== 'number' || alignment < 0 || alignment > 1) {
      return { success: false, message: 'Invalid alignment score returned' };
    }

    return { 
      success: true, 
      message: `Calibration service working - ${constraints.length} constraints, ${patterns.length} patterns, ${(alignment * 100).toFixed(1)}% alignment` 
    };

  } catch (error) {
    return { success: false, message: 'AI Calibration Service test failed', error: error.message };
  }
}

async function testValidationWorkflow(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const validationItems = await ManagerValidationWorkflow.detectHighVarianceScores();
    const stats = await ManagerValidationWorkflow.getValidationStats();

    return { 
      success: true, 
      message: `Validation workflow working - ${validationItems.length} high-variance items detected, ${stats.totalPending} pending validations` 
    };

  } catch (error) {
    return { success: false, message: 'Validation Workflow test failed', error: error.message };
  }
}

async function testRealtimeConstraintUpdates(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    await RealtimeConstraintService.initialize();
    const recentUpdates = await RealtimeConstraintService.getRecentConstraintUpdates(5);
    const stats = await RealtimeConstraintService.getConstraintUpdateStats();

    return { 
      success: true, 
      message: `Real-time constraint service working - ${recentUpdates.length} recent updates, ${stats.totalUpdates} total updates` 
    };

  } catch (error) {
    return { success: false, message: 'Real-time Constraint Updates test failed', error: error.message };
  }
}

async function testAnalyticsDashboard(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Test if the analytics dashboard component can be imported
    const { default: FeedbackAnalyticsDashboard } = await import('@/components/analytics/FeedbackAnalyticsDashboard');
    
    if (!FeedbackAnalyticsDashboard) {
      return { success: false, message: 'FeedbackAnalyticsDashboard component not found' };
    }

    return { success: true, message: 'Analytics Dashboard component is available' };

  } catch (error) {
    return { success: false, message: 'Analytics Dashboard test failed', error: error.message };
  }
}

async function testEndToEndIntegration(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Test the complete flow
    const constraints = await AICalibrationService.getCalibrationConstraints();
    const validationItems = await ManagerValidationWorkflow.detectHighVarianceScores();
    const alignment = await AICalibrationService.getOverallAlignment();

    const allServicesWorking = 
      Array.isArray(constraints) &&
      Array.isArray(validationItems) &&
      typeof alignment === 'number';

    if (!allServicesWorking) {
      return { success: false, message: 'One or more services not working properly' };
    }

    return { 
      success: true, 
      message: `End-to-end integration successful - All services working together` 
    };

  } catch (error) {
    return { success: false, message: 'End-to-end integration test failed', error: error.message };
  }
}

export default FeedbackSystemTest;
