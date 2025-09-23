import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const AzureConnectivityTest: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testConnectivity = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-azure-connectivity', {});
      
      if (error) {
        setResults({ success: false, error: error.message });
      } else {
        setResults(data);
      }
    } catch (err) {
      setResults({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (ok: boolean) => {
    return ok ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Azure Backend Connectivity Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testConnectivity} 
          disabled={testing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
          {testing ? 'Testing...' : 'Test Azure Connectivity'}
        </Button>

        {results && (
          <div className="space-y-3">
            {results.success ? (
              <>
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <h3 className="font-semibold text-green-800">Test Results</h3>
                  <p className="text-sm text-green-600">
                    {results.summary?.working} of {results.summary?.totalTested} backends working
                  </p>
                </div>
                
                {results.results?.map((result: any, index: number) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{result.url}</span>
                      {getStatusIcon(result.health?.ok)}
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      Status: {result.health?.status} | Data: {JSON.stringify(result.health?.data || result.health?.error).slice(0, 100)}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <h3 className="font-semibold text-red-800">Test Failed</h3>
                <p className="text-sm text-red-600">{results.error}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};