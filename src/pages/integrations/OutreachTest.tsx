import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TestTube,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Users,
  Zap,
  Settings,
  ExternalLink,
  Play
} from 'lucide-react';
import { useOutreachIntegration } from '@/hooks/useOutreachIntegration';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import OutreachSyncPanel from '@/components/integrations/outreach/OutreachSyncPanel';
import ProspectMapping from '@/components/integrations/outreach/ProspectMapping';
import { BulkSyncPanel } from '@/components/integrations/outreach/BulkSyncPanel';

export default function OutreachTest() {
  const { toast } = useToast();
  const { 
    connection, 
    isConnected, 
    searchProspects, 
    createCallActivity, 
    syncRecording,
    getSyncStatus 
  } = useOutreachIntegration();
  
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isTestingSearch, setIsTestingSearch] = useState(false);
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [testResults, setTestResults] = useState<any>({});
  const [mockRecordings, setMockRecordings] = useState<any[]>([]);

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      if (!isConnected) {
        throw new Error('Not connected to Outreach');
      }

      // Test basic API connectivity
      const prospects = await searchProspects('test');
      
      setTestResults(prev => ({
        ...prev,
        connection: {
          success: true,
          message: `Connected as ${connection?.outreach_user_email}`,
          data: { prospectCount: prospects.length }
        }
      }));

      toast({
        title: "Connection Test Passed",
        description: "Successfully connected to Outreach API",
      });
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        connection: {
          success: false,
          message: error.message,
          error: error
        }
      }));

      toast({
        title: "Connection Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const testProspectSearch = async () => {
    setIsTestingSearch(true);
    try {
      // Test searching for prospects
      const prospects = await searchProspects('test@example.com');
      
      setTestResults(prev => ({
        ...prev,
        search: {
          success: true,
          message: `Found ${prospects.length} prospects`,
          data: prospects.slice(0, 3) // Show first 3 results
        }
      }));

      toast({
        title: "Search Test Passed",
        description: `Successfully searched prospects`,
      });
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        search: {
          success: false,
          message: error.message,
          error: error
        }
      }));

      toast({
        title: "Search Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsTestingSearch(false);
    }
  };

  const testSyncFlow = async () => {
    setIsTestingSync(true);
    try {
      // Create a mock recording for testing
      const mockRecording = {
        id: 'test-recording-' + Date.now(),
        title: 'Test Recording for Outreach Integration',
        description: 'This is a test recording to verify the Outreach sync flow',
        transcript: 'This is a test transcript containing email@example.com for testing prospect discovery.',
        ai_summary: 'Test call summary for integration testing',
        ai_insights: {
          key_points: ['Test point 1', 'Test point 2'],
          next_steps: 'Follow up on test integration'
        },
        duration: 300,
        status: 'completed',
        created_at: new Date().toISOString(),
        user_id: connection?.user_id
      };

      // Insert test recording
      const { data: insertedRecording, error: insertError } = await supabase
        .from('recordings')
        .insert(mockRecording)
        .select()
        .single();

      if (insertError) throw insertError;

      // Test sync
      await syncRecording(insertedRecording.id);

      // Get sync status
      const syncStatus = await getSyncStatus(insertedRecording.id);

      setTestResults(prev => ({
        ...prev,
        sync: {
          success: true,
          message: 'Sync test completed',
          data: {
            recordingId: insertedRecording.id,
            syncStatus: syncStatus
          }
        }
      }));

      // Clean up test recording
      await supabase
        .from('recordings')
        .delete()
        .eq('id', insertedRecording.id);

      toast({
        title: "Sync Test Completed",
        description: "Successfully tested recording sync flow",
      });
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        sync: {
          success: false,
          message: error.message,
          error: error
        }
      }));

      toast({
        title: "Sync Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsTestingSync(false);
    }
  };

  const loadMockRecordings = async () => {
    try {
      const { data: recordings, error } = await supabase
        .from('recordings')
        .select('*')
        .eq('user_id', connection?.user_id)
        .eq('status', 'completed')
        .limit(5);

      if (error) throw error;
      setMockRecordings(recordings || []);
    } catch (error: any) {
      console.error('Failed to load recordings:', error);
    }
  };

  React.useEffect(() => {
    if (isConnected) {
      loadMockRecordings();
    }
  }, [isConnected]);

  const renderTestResult = (key: string, testName: string) => {
    const result = testResults[key];
    if (!result) return null;

    return (
      <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <div className="flex items-center gap-2">
          {result.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <span className="font-medium">{testName}</span>
        </div>
        <AlertDescription className="mt-2">
          <div>{result.message}</div>
          {result.data && (
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </AlertDescription>
      </Alert>
    );
  };

  if (!isConnected) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Outreach Integration Test</CardTitle>
                <CardDescription>
                  Test your Outreach.io integration components
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please connect your Outreach account before running tests.
                <Button 
                  variant="link" 
                  className="p-0 ml-2 h-auto"
                  onClick={() => window.open('/integrations/outreach/connect', '_blank')}
                >
                  Connect Now
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <TestTube className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Outreach Integration Test</CardTitle>
                <CardDescription>
                  Test all components of your Outreach.io integration
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">Connected</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open('/integrations/outreach/connect', '_blank')}
              >
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Button
              onClick={testConnection}
              disabled={isTestingConnection}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isTestingConnection ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Test Connection
            </Button>
            
            <Button
              onClick={testProspectSearch}
              disabled={isTestingSearch}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isTestingSearch ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              Test Search
            </Button>
            
            <Button
              onClick={testSyncFlow}
              disabled={isTestingSync}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isTestingSync ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Test Sync
            </Button>
          </div>
          
          {/* Test Results */}
          <div className="mt-6 space-y-4">
            {renderTestResult('connection', 'Connection Test')}
            {renderTestResult('search', 'Prospect Search Test')}
            {renderTestResult('sync', 'Recording Sync Test')}
          </div>
        </CardContent>
      </Card>

      {/* Component Tests */}
      <Tabs defaultValue="sync-panel" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sync-panel">Sync Panel</TabsTrigger>
          <TabsTrigger value="prospect-mapping">Prospect Mapping</TabsTrigger>
          <TabsTrigger value="bulk-sync">Bulk Sync</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sync-panel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>OutreachSyncPanel Component Test</CardTitle>
              <CardDescription>
                Test the individual recording sync panel
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mockRecordings.length > 0 ? (
                <BulkSyncPanel userId="demo-user" />
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No recordings available for testing. Upload a recording first.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="prospect-mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ProspectMapping Component Test</CardTitle>
              <CardDescription>
                Test the prospect mapping interface
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProspectMapping
                recordingId="test-recording"
                speakers={[
                  { name: "John Doe", email: "john@example.com", company: "Acme Corp" },
                  { name: "Jane Smith", email: "jane@example.com", company: "Beta Inc" }
                ]}
                onMappingComplete={(mappings) => {
                  toast({
                    title: "Mapping Complete",
                    description: `Mapped ${mappings.length} speakers to prospects`,
                  });
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bulk-sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>BulkSyncPanel Component Test</CardTitle>
              <CardDescription>
                Test the bulk sync interface
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkSyncPanel userId="demo-user" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}