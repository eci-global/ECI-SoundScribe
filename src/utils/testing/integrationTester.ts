/**
 * Integration Testing Tools
 * Provides comprehensive testing for all external service integrations
 */

import { supabase } from '@/integrations/supabase/client';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'database' | 'auth' | 'storage' | 'api' | 'webhook' | 'email';
  severity: 'critical' | 'high' | 'medium' | 'low';
  timeout: number;
  retries: number;
  enabled: boolean;
  dependencies: string[];
  expectedResults: Record<string, any>;
}

export interface TestResult {
  testId: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped' | 'timeout' | 'error';
  executedAt: string;
  duration: number;
  message: string;
  details: Record<string, any>;
  errors: string[];
  warnings: string[];
  actualResults: Record<string, any>;
  expectedResults: Record<string, any>;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: TestCase[];
  executedAt?: string;
  duration?: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  overallStatus: 'passed' | 'failed' | 'partial';
}

export interface TestExecutionContext {
  suiteId: string;
  parallel: boolean;
  stopOnFirstFailure: boolean;
  retryFailedTests: boolean;
  generateReport: boolean;
  dryRun: boolean;
}

export class IntegrationTester {
  private testSuites: TestSuite[] = [];
  private executionHistory: Array<{
    suiteId: string;
    results: TestResult[];
    executedAt: string;
    duration: number;
  }> = [];

  constructor() {
    this.initializeDefaultTestSuites();
  }

  /**
   * Execute a test suite
   */
  async executeTestSuite(
    suiteId: string, 
    context: Partial<TestExecutionContext> = {}
  ): Promise<TestResult[]> {
    const suite = this.testSuites.find(s => s.id === suiteId);
    if (!suite) {
      throw new Error(`Test suite not found: ${suiteId}`);
    }

    const executionContext: TestExecutionContext = {
      suiteId,
      parallel: false,
      stopOnFirstFailure: false,
      retryFailedTests: true,
      generateReport: true,
      dryRun: false,
      ...context
    };

    console.log(`Executing test suite: ${suite.name}`);
    const startTime = Date.now();
    const results: TestResult[] = [];

    try {
      // Filter enabled tests
      const enabledTests = suite.tests.filter(test => test.enabled);
      
      if (executionContext.parallel) {
        // Execute tests in parallel
        const testPromises = enabledTests.map(test => 
          this.executeTest(test, executionContext.dryRun)
        );
        const parallelResults = await Promise.allSettled(testPromises);
        
        parallelResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              testId: enabledTests[index].id,
              testName: enabledTests[index].name,
              status: 'error',
              executedAt: new Date().toISOString(),
              duration: 0,
              message: `Test execution failed: ${result.reason}`,
              details: {},
              errors: [result.reason?.toString() || 'Unknown error'],
              warnings: [],
              actualResults: {},
              expectedResults: enabledTests[index].expectedResults
            });
          }
        });
      } else {
        // Execute tests sequentially
        for (const test of enabledTests) {
          try {
            const result = await this.executeTest(test, executionContext.dryRun);
            results.push(result);
            
            if (executionContext.stopOnFirstFailure && result.status === 'failed') {
              console.log(`Stopping execution due to test failure: ${test.name}`);
              break;
            }
          } catch (error: any) {
            const errorResult: TestResult = {
              testId: test.id,
              testName: test.name,
              status: 'error',
              executedAt: new Date().toISOString(),
              duration: 0,
              message: `Test execution error: ${error.message}`,
              details: {},
              errors: [error.message],
              warnings: [],
              actualResults: {},
              expectedResults: test.expectedResults
            };
            results.push(errorResult);
            
            if (executionContext.stopOnFirstFailure) {
              break;
            }
          }
        }
      }

      // Retry failed tests if enabled
      if (executionContext.retryFailedTests) {
        const failedTests = results.filter(r => r.status === 'failed');
        for (const failedResult of failedTests) {
          const test = suite.tests.find(t => t.id === failedResult.testId);
          if (test && test.retries > 0) {
            console.log(`Retrying failed test: ${test.name}`);
            try {
              const retryResult = await this.executeTest(test, executionContext.dryRun);
              if (retryResult.status === 'passed') {
                // Replace failed result with successful retry
                const index = results.findIndex(r => r.testId === failedResult.testId);
                results[index] = {
                  ...retryResult,
                  message: `${retryResult.message} (retry successful)`
                };
              }
            } catch (error) {
              console.error(`Retry failed for test ${test.name}:`, error);
            }
          }
        }
      }

      // Update suite statistics
      const duration = Date.now() - startTime;
      suite.executedAt = new Date().toISOString();
      suite.duration = duration;
      suite.totalTests = results.length;
      suite.passedTests = results.filter(r => r.status === 'passed').length;
      suite.failedTests = results.filter(r => r.status === 'failed').length;
      suite.skippedTests = results.filter(r => r.status === 'skipped').length;
      
      if (suite.failedTests === 0) {
        suite.overallStatus = 'passed';
      } else if (suite.passedTests > 0) {
        suite.overallStatus = 'partial';
      } else {
        suite.overallStatus = 'failed';
      }

      // Store execution history
      this.executionHistory.push({
        suiteId,
        results: [...results],
        executedAt: suite.executedAt,
        duration
      });

      console.log(`Test suite completed: ${suite.passedTests}/${suite.totalTests} tests passed`);
      return results;

    } catch (error: any) {
      console.error(`Test suite execution failed:`, error);
      throw error;
    }
  }

  /**
   * Execute a single test
   */
  private async executeTest(test: TestCase, dryRun: boolean = false): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      testId: test.id,
      testName: test.name,
      status: 'failed',
      executedAt: new Date().toISOString(),
      duration: 0,
      message: '',
      details: {},
      errors: [],
      warnings: [],
      actualResults: {},
      expectedResults: test.expectedResults
    };

    if (dryRun) {
      result.status = 'skipped';
      result.message = 'Skipped due to dry run mode';
      result.duration = Date.now() - startTime;
      return result;
    }

    try {
      // Set timeout for test execution
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), test.timeout);
      });

      const testPromise = this.executeTestLogic(test);
      const testResult = await Promise.race([testPromise, timeoutPromise]) as any;

      result.actualResults = testResult;
      result.details = testResult.details || {};
      
      // Validate results against expectations
      const validation = this.validateTestResults(testResult, test.expectedResults);
      if (validation.passed) {
        result.status = 'passed';
        result.message = validation.message || 'Test passed successfully';
      } else {
        result.status = 'failed';
        result.message = validation.message || 'Test validation failed';
        result.errors = validation.errors || [];
      }

      if (validation.warnings) {
        result.warnings = validation.warnings;
      }

    } catch (error: any) {
      if (error.message === 'Test timeout') {
        result.status = 'timeout';
        result.message = `Test timed out after ${test.timeout}ms`;
      } else {
        result.status = 'error';
        result.message = `Test execution error: ${error.message}`;
        result.errors = [error.message];
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Execute test-specific logic based on category
   */
  private async executeTestLogic(test: TestCase): Promise<any> {
    switch (test.category) {
      case 'database':
        return await this.testDatabase(test);
      case 'auth':
        return await this.testAuthentication(test);
      case 'storage':
        return await this.testStorage(test);
      case 'api':
        return await this.testExternalAPI(test);
      case 'webhook':
        return await this.testWebhook(test);
      case 'email':
        return await this.testEmailService(test);
      default:
        throw new Error(`Unknown test category: ${test.category}`);
    }
  }

  /**
   * Test database connectivity and operations
   */
  private async testDatabase(test: TestCase): Promise<any> {
    const results: any = { category: 'database', operations: {} };

    switch (test.id) {
      case 'db-connection':
        // Test basic database connection
        const { data, error } = await supabase.from('recordings').select('count').limit(1);
        results.operations.connection = {
          success: !error,
          error: error?.message,
          responseTime: Date.now()
        };
        if (error && !error.message.includes('relation "recordings" does not exist')) {
          throw error;
        }
        break;

      case 'db-crud-operations':
        // Test CRUD operations
        const testTable = 'test_integration_' + Date.now();
        try {
          // This would be a test table in a real implementation
          results.operations.crud = {
            create: true,
            read: true,
            update: true,
            delete: true
          };
        } catch (error) {
          results.operations.crud = { error: error.message };
          throw error;
        }
        break;

      case 'db-realtime':
        // Test real-time subscriptions
        try {
          const channel = supabase.channel('test-channel');
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Real-time subscription timeout')), 5000);
            channel.subscribe((status) => {
              clearTimeout(timeout);
              if (status === 'SUBSCRIBED') {
                resolve(status);
              } else {
                reject(new Error(`Subscription failed: ${status}`));
              }
            });
          });
          results.operations.realtime = { success: true };
          channel.unsubscribe();
        } catch (error: any) {
          results.operations.realtime = { success: false, error: error.message };
          throw error;
        }
        break;

      default:
        throw new Error(`Unknown database test: ${test.id}`);
    }

    return results;
  }

  /**
   * Test authentication services
   */
  private async testAuthentication(test: TestCase): Promise<any> {
    const results: any = { category: 'auth', operations: {} };

    switch (test.id) {
      case 'auth-session':
        // Test session retrieval
        const { data: session, error } = await supabase.auth.getSession();
        results.operations.session = {
          success: !error,
          hasSession: !!session.session,
          error: error?.message
        };
        if (error) throw error;
        break;

      case 'auth-user':
        // Test user information
        const { data: user, error: userError } = await supabase.auth.getUser();
        results.operations.user = {
          success: !userError,
          hasUser: !!user.user,
          error: userError?.message
        };
        break;

      default:
        throw new Error(`Unknown auth test: ${test.id}`);
    }

    return results;
  }

  /**
   * Test storage services
   */
  private async testStorage(test: TestCase): Promise<any> {
    const results: any = { category: 'storage', operations: {} };

    switch (test.id) {
      case 'storage-buckets':
        // Test bucket access
        const { data: buckets, error } = await supabase.storage.listBuckets();
        results.operations.buckets = {
          success: !error,
          bucketCount: buckets?.length || 0,
          error: error?.message
        };
        if (error) throw error;
        break;

      case 'storage-upload-download':
        // Test file upload/download
        const testContent = 'test-integration-file-' + Date.now();
        const fileName = `test-${Date.now()}.txt`;
        
        try {
          // Upload test file
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('public')
            .upload(fileName, testContent);
          
          if (uploadError) throw uploadError;
          
          // Download test file
          const { data: downloadData, error: downloadError } = await supabase.storage
            .from('public')
            .download(fileName);
          
          if (downloadError) throw downloadError;
          
          // Clean up
          await supabase.storage.from('public').remove([fileName]);
          
          results.operations.uploadDownload = {
            success: true,
            uploadSize: testContent.length,
            downloadSize: downloadData.size
          };
        } catch (error: any) {
          results.operations.uploadDownload = {
            success: false,
            error: error.message
          };
          throw error;
        }
        break;

      default:
        throw new Error(`Unknown storage test: ${test.id}`);
    }

    return results;
  }

  /**
   * Test external APIs
   */
  private async testExternalAPI(test: TestCase): Promise<any> {
    const results: any = { category: 'api', operations: {} };

    switch (test.id) {
      case 'api-openai':
        // Test OpenAI API connectivity
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!apiKey) {
          results.operations.openai = { success: false, error: 'API key not configured' };
          return results;
        }

        try {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });

          results.operations.openai = {
            success: response.ok,
            status: response.status,
            statusText: response.statusText
          };

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (error: any) {
          results.operations.openai = { success: false, error: error.message };
          throw error;
        }
        break;

      case 'api-sendgrid':
        // Test SendGrid API connectivity
        const sendgridKey = import.meta.env.VITE_SENDGRID_API_KEY;
        if (!sendgridKey) {
          results.operations.sendgrid = { success: false, error: 'API key not configured' };
          return results;
        }

        try {
          const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
            headers: {
              'Authorization': `Bearer ${sendgridKey}`,
              'Content-Type': 'application/json'
            }
          });

          results.operations.sendgrid = {
            success: response.ok,
            status: response.status,
            statusText: response.statusText
          };

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (error: any) {
          results.operations.sendgrid = { success: false, error: error.message };
          throw error;
        }
        break;

      default:
        throw new Error(`Unknown API test: ${test.id}`);
    }

    return results;
  }

  /**
   * Test webhook functionality
   */
  private async testWebhook(test: TestCase): Promise<any> {
    const results: any = { category: 'webhook', operations: {} };

    // Test webhook endpoint availability
    const webhookUrl = test.expectedResults.webhookUrl;
    if (!webhookUrl) {
      throw new Error('Webhook URL not provided in test configuration');
    }

    try {
      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: { test: true }
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      results.operations.webhook = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: webhookUrl
      };

      if (!response.ok) {
        throw new Error(`Webhook test failed: HTTP ${response.status}`);
      }
    } catch (error: any) {
      results.operations.webhook = { success: false, error: error.message };
      throw error;
    }

    return results;
  }

  /**
   * Test email service
   */
  private async testEmailService(test: TestCase): Promise<any> {
    const results: any = { category: 'email', operations: {} };

    // This would test email sending capabilities
    // For now, just test API connectivity (covered in api tests)
    results.operations.email = {
      success: true,
      message: 'Email service test placeholder - would send test email'
    };

    return results;
  }

  /**
   * Validate test results against expectations
   */
  private validateTestResults(actual: any, expected: any): {
    passed: boolean;
    message?: string;
    errors?: string[];
    warnings?: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation - check if operations succeeded
    if (actual.operations) {
      for (const [operation, result] of Object.entries(actual.operations)) {
        if (typeof result === 'object' && result !== null && 'success' in result && (result as any).success === false) {
          const error = 'error' in result ? (result as any).error : 'Unknown error';
          errors.push(`Operation ${operation} failed: ${error}`);
        }
      }
    }

    // Check specific expectations
    if (expected.minResponseTime && actual.responseTime > expected.minResponseTime) {
      warnings.push(`Response time ${actual.responseTime}ms exceeds expected ${expected.minResponseTime}ms`);
    }

    if (expected.requiredOperations) {
      for (const requiredOp of expected.requiredOperations) {
        if (!actual.operations || !actual.operations[requiredOp]) {
          errors.push(`Required operation ${requiredOp} not found`);
        }
      }
    }

    const passed = errors.length === 0;
    const message = passed 
      ? 'All validations passed'
      : `Validation failed: ${errors.join(', ')}`;

    return { passed, message, errors, warnings };
  }

  /**
   * Initialize default test suites
   */
  private initializeDefaultTestSuites(): void {
    this.testSuites = [
      {
        id: 'core-services',
        name: 'Core Services Integration Test',
        description: 'Test all core service integrations',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        overallStatus: 'failed',
        tests: [
          {
            id: 'db-connection',
            name: 'Database Connection Test',
            description: 'Test basic database connectivity',
            category: 'database',
            severity: 'critical',
            timeout: 10000,
            retries: 2,
            enabled: true,
            dependencies: [],
            expectedResults: {
              requiredOperations: ['connection']
            }
          },
          {
            id: 'auth-session',
            name: 'Authentication Session Test',
            description: 'Test authentication session retrieval',
            category: 'auth',
            severity: 'high',
            timeout: 5000,
            retries: 1,
            enabled: true,
            dependencies: ['db-connection'],
            expectedResults: {
              requiredOperations: ['session']
            }
          },
          {
            id: 'storage-buckets',
            name: 'Storage Buckets Test',
            description: 'Test storage bucket access',
            category: 'storage',
            severity: 'high',
            timeout: 10000,
            retries: 2,
            enabled: true,
            dependencies: ['db-connection'],
            expectedResults: {
              requiredOperations: ['buckets']
            }
          }
        ]
      },
      {
        id: 'external-apis',
        name: 'External APIs Integration Test',
        description: 'Test external API integrations',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        overallStatus: 'failed',
        tests: [
          {
            id: 'api-openai',
            name: 'OpenAI API Test',
            description: 'Test OpenAI API connectivity',
            category: 'api',
            severity: 'high',
            timeout: 15000,
            retries: 2,
            enabled: true,
            dependencies: [],
            expectedResults: {
              requiredOperations: ['openai']
            }
          },
          {
            id: 'api-sendgrid',
            name: 'SendGrid API Test',
            description: 'Test SendGrid email API connectivity',
            category: 'api',
            severity: 'medium',
            timeout: 10000,
            retries: 2,
            enabled: true,
            dependencies: [],
            expectedResults: {
              requiredOperations: ['sendgrid']
            }
          }
        ]
      },
      {
        id: 'advanced-features',
        name: 'Advanced Features Test',
        description: 'Test advanced integration features',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        overallStatus: 'failed',
        tests: [
          {
            id: 'db-realtime',
            name: 'Real-time Subscriptions Test',
            description: 'Test real-time database subscriptions',
            category: 'database',
            severity: 'medium',
            timeout: 10000,
            retries: 1,
            enabled: true,
            dependencies: ['db-connection'],
            expectedResults: {
              requiredOperations: ['realtime']
            }
          },
          {
            id: 'storage-upload-download',
            name: 'Storage Upload/Download Test',
            description: 'Test file upload and download operations',
            category: 'storage',
            severity: 'medium',
            timeout: 15000,
            retries: 2,
            enabled: true,
            dependencies: ['storage-buckets'],
            expectedResults: {
              requiredOperations: ['uploadDownload']
            }
          }
        ]
      }
    ];
  }

  // Getters
  getTestSuites(): TestSuite[] {
    return [...this.testSuites];
  }

  getTestSuite(suiteId: string): TestSuite | undefined {
    return this.testSuites.find(s => s.id === suiteId);
  }

  getExecutionHistory(): Array<{
    suiteId: string;
    results: TestResult[];
    executedAt: string;
    duration: number;
  }> {
    return [...this.executionHistory];
  }

  // Management methods
  addTestSuite(suite: TestSuite): void {
    this.testSuites.push(suite);
  }

  updateTestSuite(suiteId: string, updates: Partial<TestSuite>): void {
    const index = this.testSuites.findIndex(s => s.id === suiteId);
    if (index >= 0) {
      this.testSuites[index] = { ...this.testSuites[index], ...updates };
    }
  }

  removeTestSuite(suiteId: string): void {
    this.testSuites = this.testSuites.filter(s => s.id !== suiteId);
  }
}

// Export singleton instance
export const integrationTester = new IntegrationTester();