
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, RefreshCw, Key, TestTube, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ApiTestResult {
  success: boolean;
  message?: string;
  error?: string;
  tests?: {
    modelsAccess: boolean;
    chatCompletions: boolean;
    testResponse: string;
  };
  apiInfo?: {
    modelsAvailable: number;
    keyValid: boolean;
    usageInfo: any;
  };
  timestamp?: string;
}

export function ApiKeyManager() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ApiTestResult | null>(null);
  const { toast } = useToast();

  const testOpenAIApiKey = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      console.log('Testing OpenAI API key configuration...');
      
      const { data, error } = await supabase.functions.invoke('test-openai', {
        body: {}
      });

      if (error) {
        console.error('Test function error:', error);
        setTestResult({
          success: false,
          error: error.message || 'Failed to test API key',
          timestamp: new Date().toISOString()
        });
        
        toast({
          title: 'API Test Failed',
          description: error.message || 'Could not test OpenAI API key',
          variant: 'destructive'
        });
        return;
      }

      console.log('API test result:', data);
      setTestResult(data);
      
      if (data.success) {
        toast({
          title: 'API Test Successful',
          description: 'OpenAI API key is configured correctly and working'
        });
      } else {
        toast({
          title: 'API Test Failed',
          description: data.error || 'API key test failed',
          variant: 'destructive'
        });
      }
      
    } catch (error) {
      console.error('API test error:', error);
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
      
      setTestResult(errorResult);
      
      toast({
        title: 'Test Error',
        description: 'Failed to run API key test',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = () => {
    if (!testResult) {
      return <Badge variant="outline">Not tested</Badge>;
    }
    
    if (testResult.success) {
      return <Badge variant="default" className="bg-green-500">Working</Badge>;
    } else {
      return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const getStatusIcon = () => {
    if (!testResult) {
      return <Key className="h-5 w-5 text-gray-500" />;
    }
    
    if (testResult.success) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon()}
                OpenAI API Configuration
              </CardTitle>
              <CardDescription>
                Test and validate your OpenAI API key configuration
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <Button
                variant="outline"
                size="sm"
                onClick={testOpenAIApiKey}
                disabled={testing}
              >
                {testing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                Test API Key
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!testResult && (
            <Alert>
              <Key className="h-4 w-4" />
              <AlertTitle>API Key Status Unknown</AlertTitle>
              <AlertDescription>
                Click "Test API Key" to verify your OpenAI configuration is working correctly.
              </AlertDescription>
            </Alert>
          )}

          {testResult && testResult.success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>API Key Working</AlertTitle>
              <AlertDescription>
                Your OpenAI API key is configured correctly and all tests passed.
              </AlertDescription>
            </Alert>
          )}

          {testResult && !testResult.success && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>API Key Issue Detected</AlertTitle>
              <AlertDescription>
                {testResult.error || 'OpenAI API key test failed'}
              </AlertDescription>
            </Alert>
          )}

          {testResult?.success && testResult.tests && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium mb-2">Test Results</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Models Access:</span>
                  <Badge variant={testResult.tests.modelsAccess ? "default" : "destructive"}>
                    {testResult.tests.modelsAccess ? "✓ Pass" : "✗ Fail"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Chat Completions:</span>
                  <Badge variant={testResult.tests.chatCompletions ? "default" : "destructive"}>
                    {testResult.tests.chatCompletions ? "✓ Pass" : "✗ Fail"}
                  </Badge>
                </div>
                {testResult.apiInfo && (
                  <div className="flex justify-between">
                    <span>Models Available:</span>
                    <span className="font-medium">{testResult.apiInfo.modelsAvailable}</span>
                  </div>
                )}
                {testResult.tests.testResponse && (
                  <div className="mt-2 p-2 bg-white rounded border">
                    <div className="text-xs text-gray-500 mb-1">Test Response:</div>
                    <div className="font-mono text-xs">{testResult.tests.testResponse}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {testResult?.timestamp && (
            <div className="text-xs text-gray-500">
              Last tested: {new Date(testResult.timestamp).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration Instructions</CardTitle>
          <CardDescription>
            How to set up your OpenAI API key in Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <p><strong>1. Get your OpenAI API key:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Visit <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600 underline">OpenAI API Keys</a></li>
              <li>Create a new secret key or copy an existing one</li>
              <li>Make sure your account has sufficient credits</li>
            </ul>
            
            <p className="mt-4"><strong>2. Configure in Supabase:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Go to your Supabase project dashboard</li>
              <li>Navigate to Settings → Edge Functions</li>
              <li>Add a new secret: <code className="bg-gray-100 px-1">OPENAI_API_KEY</code></li>
              <li>Paste your OpenAI API key as the value</li>
            </ul>
            
            <p className="mt-4"><strong>3. Test the configuration:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Click "Test API Key" above to verify it's working</li>
              <li>Upload a test recording to verify end-to-end processing</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
