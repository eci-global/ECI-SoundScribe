import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  Download, 
  ExternalLink, 
  RefreshCw, 
  User, 
  Building2, 
  Phone, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Upload,
  FileAudio
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  getOutreachService, 
  getStoredOutreachToken, 
  storeOutreachToken, 
  clearOutreachToken,
  type OutreachRecording,
  type OutreachToken 
} from '@/utils/outreachService';
import { useNavigate } from 'react-router-dom';

export default function OutreachImportPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recordings, setRecordings] = useState<OutreachRecording[]>([]);
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [importProgress, setImportProgress] = useState<Map<string, number>>(new Map());
  const [importResults, setImportResults] = useState<Map<string, 'success' | 'error'>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<OutreachToken | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Try to initialize the Outreach service and handle configuration errors
  let outreachService: any = null;
  try {
    outreachService = getOutreachService();
  } catch (err) {
    console.error('Outreach service initialization failed:', err);
    setConfigError(err instanceof Error ? err.message : 'Configuration error');
  }

  useEffect(() => {
    checkConnectionStatus();
  }, [user]);

  const checkConnectionStatus = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Check database for existing connection (same as OutreachConnect.tsx)
      const { data, error } = await supabase
        .from('outreach_connections')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setIsConnected(true);
        // Create a token object for compatibility with existing code
        const dbToken = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: new Date(data.token_expires_at).getTime(),
          token_type: 'Bearer'
        };
        setToken(dbToken);
        loadRecordings(dbToken);
      } else {
        setIsConnected(false);
        setToken(null);
        // Clear any old localStorage tokens
        clearOutreachToken();
      }
    } catch (err) {
      console.error('Error checking Outreach connection:', err);
      setIsConnected(false);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };


  const connectToOutreach = () => {
    if (!outreachService || !user) return;
    
    // Generate and save state for OAuth security
    const stateData = { userId: user.id, timestamp: Date.now() };
    const state = btoa(JSON.stringify(stateData));
    sessionStorage.setItem('outreach_oauth_state', state);
    
    const authUrl = outreachService.getAuthorizationUrl(state);
    window.location.href = authUrl;
  };

  const disconnect = async () => {
    if (!user || !window.confirm('Are you sure you want to disconnect your Outreach account?')) return;
    
    setLoading(true);
    
    try {
      // Remove from database
      const { error } = await supabase
        .from('outreach_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Clear local state
      clearOutreachToken();
      setIsConnected(false);
      setToken(null);
      setRecordings([]);
      setSelectedRecordings(new Set());
      setError(null);
      
      toast({
        title: "Disconnected Successfully",
        description: "Your Outreach account has been disconnected.",
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect your Outreach account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecordings = async (useToken?: OutreachToken) => {
    const currentToken = useToken || token;
    if (!currentToken || !user) return;

    setLoading(true);
    setError(null);
    
    try {
      // Check if token is expired
      const tokenExpired = currentToken.expires_at <= Date.now();
      
      if (tokenExpired) {
        // Try to refresh token via Edge Function
        const { data, error: refreshError } = await supabase.functions.invoke('outreach-refresh-token', {
          body: { userId: user.id }
        });

        if (refreshError || !data?.success) {
          throw new Error('Token refresh failed. Please reconnect your account.');
        }

        // Reload connection from database after refresh
        await checkConnectionStatus();
        return;
      }

      // Use Edge Function to securely load recordings
      const { data: result, error: fetchError } = await supabase.functions.invoke('outreach-get-recordings', {
        body: {
          userId: user.id,
          limit: 50
        }
      });

      if (fetchError) {
        throw new Error(`Failed to fetch recordings: ${fetchError.message}`);
      }

      if (!result || !Array.isArray(result.recordings)) {
        throw new Error('Invalid response from recordings service');
      }
      
      setRecordings(result.recordings);
      
      if (result.recordings.length === 0) {
        toast({
          title: "No recordings found",
          description: "No call recordings were found in your Outreach account.",
        });
      }
    } catch (error) {
      console.error('Failed to load recordings:', error);
      setError(error instanceof Error ? error.message : 'Failed to load recordings');
      
      // If there's an auth error, disconnect
      if (error instanceof Error && error.message.includes('401')) {
        setIsConnected(false);
        await disconnect();
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleRecordingSelection = (recordingId: string) => {
    const newSelected = new Set(selectedRecordings);
    if (newSelected.has(recordingId)) {
      newSelected.delete(recordingId);
    } else {
      newSelected.add(recordingId);
    }
    setSelectedRecordings(newSelected);
  };

  const selectAll = () => {
    if (selectedRecordings.size === recordings.length) {
      setSelectedRecordings(new Set());
    } else {
      setSelectedRecordings(new Set(recordings.map(r => r.id)));
    }
  };

  const uploadFileToSupabase = async (file: File, fileName: string) => {
    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(`${user!.id}/${fileName}`, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recordings')
      .getPublicUrl(uploadData.path);

    return { path: uploadData.path, url: publicUrl };
  };

  const createRecordingEntry = async (recording: OutreachRecording, fileUrl: string, filePath: string) => {
    const { data, error } = await supabase
      .from('recordings')
      .insert({
        user_id: user!.id,
        title: recording.title,
        description: `Imported from Outreach - ${recording.prospect.name} (${recording.prospect.company || 'Unknown Company'})`,
        file_url: fileUrl,
        file_path: filePath,
        file_type: 'audio',
        status: 'uploading',
        duration: recording.duration || 0,
        outreach_metadata: {
          original_id: recording.id,
          prospect: recording.prospect,
          rep: recording.rep,
          imported_at: new Date().toISOString(),
          original_recorded_at: recording.recordedAt
        }
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  };

  const triggerAIProcessing = async (recordingId: string) => {
    // Trigger the AI processing edge function
    const { error } = await supabase.functions.invoke('process-recording', {
      body: { recordingId }
    });

    if (error) {
      console.error('AI processing trigger failed:', error);
      // Don't throw here - the recording is uploaded, processing can be retried
    }
  };

  const importRecording = async (recording: OutreachRecording) => {
    if (!token || !user) return;

    setImporting(prev => new Set(prev).add(recording.id));
    setImportProgress(prev => new Map(prev).set(recording.id, 0));
    
    try {
      // Step 1: Download the recording file via Edge Function (25%)
      setImportProgress(prev => new Map(prev).set(recording.id, 25));
      const { data: downloadResult, error: downloadError } = await supabase.functions.invoke('outreach-download-recording', {
        body: {
          userId: user.id,
          recordingUrl: recording.downloadUrl
        }
      });

      if (downloadError || !downloadResult) {
        throw new Error(`Failed to download recording: ${downloadError?.message || 'Unknown error'}`);
      }
      
      // Step 2: Create file object from base64 data (40%)
      setImportProgress(prev => new Map(prev).set(recording.id, 40));
      
      // Convert base64 back to blob
      const binaryString = atob(downloadResult.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: downloadResult.contentType || 'audio/mpeg' });
      
      const fileName = `outreach_${recording.id}_${Date.now()}.mp3`;
      const file = new File([blob], fileName, { type: downloadResult.contentType || 'audio/mpeg' });
      
      // Step 3: Upload to Supabase storage (70%)
      setImportProgress(prev => new Map(prev).set(recording.id, 70));
      const { url, path } = await uploadFileToSupabase(file, fileName);
      
      // Step 4: Create database entry (90%)
      setImportProgress(prev => new Map(prev).set(recording.id, 90));
      const recordingEntry = await createRecordingEntry(recording, url, path);
      
      // Step 5: Trigger AI processing (100%)
      setImportProgress(prev => new Map(prev).set(recording.id, 100));
      await triggerAIProcessing(recordingEntry.id);
      
      setImportResults(prev => new Map(prev).set(recording.id, 'success'));
      
      toast({
        title: "Recording imported",
        description: `"${recording.title}" has been imported and is being processed.`,
      });
      
    } catch (error) {
      console.error('Failed to import recording:', error);
      setImportResults(prev => new Map(prev).set(recording.id, 'error'));
      toast({
        title: "Import failed",
        description: `Failed to import "${recording.title}". ${error instanceof Error ? error.message : 'Please try again.'}`,
        variant: "destructive"
      });
    } finally {
      setImporting(prev => {
        const newSet = new Set(prev);
        newSet.delete(recording.id);
        return newSet;
      });
    }
  };

  const importSelectedRecordings = async () => {
    if (!token || selectedRecordings.size === 0) return;

    const recordingsToImport = recordings.filter(r => selectedRecordings.has(r.id));
    
    // Import recordings one by one to avoid overwhelming the system
    for (const recording of recordingsToImport) {
      await importRecording(recording);
    }
    
    setSelectedRecordings(new Set());
    
    toast({
      title: "Import complete",
      description: `Successfully imported ${recordingsToImport.length} recordings. They are now being processed.`,
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressStatus = (recordingId: string) => {
    if (importResults.has(recordingId)) {
      return importResults.get(recordingId) === 'success' ? 'completed' : 'failed';
    }
    if (importing.has(recordingId)) {
      return 'importing';
    }
    return 'ready';
  };

  if (configError) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recordings
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-red-500" />
              Outreach.io Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {configError}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              Please contact your administrator to configure the Outreach.io integration.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recordings
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Import from Outreach.io
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <FileAudio className="h-8 w-8 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Import Your Call Recordings</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Connect your Outreach account to import call recordings directly into the platform for AI analysis, transcription, and coaching insights.
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Browse and select your Outreach call recordings</li>
                  <li>• Automatic AI transcription and analysis</li>
                  <li>• Get coaching insights and key moments</li>
                  <li>• Chat with your recordings using AI</li>
                </ul>
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              onClick={connectToOutreach} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect to Outreach
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Recordings
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-green-600" />
              Import Outreach Recordings
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Connected
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => loadRecordings()}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={disconnect}>
                Disconnect
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {recordings.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedRecordings.size === recordings.length && recordings.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm font-medium">
                  {selectedRecordings.size} of {recordings.length} recording{recordings.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              {selectedRecordings.size > 0 && (
                <Button 
                  size="sm" 
                  onClick={importSelectedRecordings}
                  disabled={importing.size > 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Import Selected ({selectedRecordings.size})
                </Button>
              )}
            </div>
          )}

          {loading && recordings.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Loading recordings...</p>
            </div>
          ) : recordings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No call recordings found in your Outreach account</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {recordings.map((recording) => {
                const status = getProgressStatus(recording.id);
                const progress = importProgress.get(recording.id) || 0;
                
                return (
                  <div
                    key={recording.id}
                    className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedRecordings.has(recording.id)}
                      onCheckedChange={() => toggleRecordingSelection(recording.id)}
                      disabled={status === 'importing' || status === 'completed'}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-1">
                            {recording.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{recording.prospect.name}</span>
                            {recording.prospect.company && (
                              <>
                                <Building2 className="h-3 w-3" />
                                <span>{recording.prospect.company}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(recording.duration)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDistanceToNow(new Date(recording.recordedAt), { addSuffix: true })}
                            </span>
                          </div>
                          
                          {status === 'importing' && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                <span>Importing...</span>
                                <span>{progress}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {status === 'completed' && (
                            <div className="flex items-center gap-1 text-green-600 text-xs">
                              <CheckCircle className="h-3 w-3" />
                              <span>Imported</span>
                            </div>
                          )}
                          {status === 'failed' && (
                            <div className="flex items-center gap-1 text-red-600 text-xs">
                              <AlertCircle className="h-3 w-3" />
                              <span>Failed</span>
                            </div>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => importRecording(recording)}
                            disabled={status === 'importing' || status === 'completed'}
                          >
                            {status === 'importing' ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : status === 'completed' ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : status === 'failed' ? (
                              <AlertCircle className="h-3 w-3 text-red-600" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {recordings.length > 0 && (
            <div className="pt-4 border-t">
              <Alert>
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  <strong>Import Process:</strong> Your selected recordings will be downloaded from Outreach, 
                  uploaded to secure storage, and automatically processed with AI transcription and analysis. 
                  You'll be able to chat with your recordings and get coaching insights once processing is complete.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}