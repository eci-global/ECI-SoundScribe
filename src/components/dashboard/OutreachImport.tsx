import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, Download, ExternalLink, RefreshCw, User, Building2, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { 
  getOutreachService, 
  getStoredOutreachToken, 
  storeOutreachToken, 
  clearOutreachToken,
  type OutreachRecording,
  type OutreachToken 
} from '@/utils/outreachService';

interface OutreachImportProps {
  onRecordingImported: (recording: any) => void;
}

export function OutreachImport({ onRecordingImported }: OutreachImportProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recordings, setRecordings] = useState<OutreachRecording[]>([]);
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<OutreachToken | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  
  const { toast } = useToast();
  
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
    
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state === 'outreach_oauth') {
      handleOAuthCallback(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkConnectionStatus = () => {
    if (!outreachService) return;
    
    const storedToken = getStoredOutreachToken();
    if (storedToken && outreachService.isTokenValid(storedToken)) {
      setToken(storedToken);
      setIsConnected(true);
    } else {
      setIsConnected(false);
      clearOutreachToken();
    }
  };

  const handleOAuthCallback = async (code: string) => {
    setLoading(true);
    try {
      const newToken = await outreachService.exchangeCodeForToken(code);
      storeOutreachToken(newToken);
      setToken(newToken);
      setIsConnected(true);
      
      toast({
        title: "Connected to Outreach",
        description: "Successfully connected to your Outreach account.",
      });
      
      // Automatically load recordings
      loadRecordings(newToken);
    } catch (error) {
      console.error('OAuth callback error:', error);
      setError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const connectToOutreach = () => {
    if (!outreachService) return;
    
    const authUrl = outreachService.getAuthorizationUrl('outreach_oauth');
    window.location.href = authUrl;
  };

  const disconnect = () => {
    clearOutreachToken();
    setIsConnected(false);
    setToken(null);
    setRecordings([]);
    setSelectedRecordings(new Set());
    setError(null);
    
    toast({
      title: "Disconnected",
      description: "Disconnected from Outreach account.",
    });
  };

  const loadRecordings = async (useToken?: OutreachToken) => {
    const currentToken = useToken || token;
    if (!currentToken) return;

    setLoading(true);
    setError(null);
    
    try {
      const result = await outreachService.getRecordings(currentToken.access_token, {
        limit: 50
      });
      
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
      
      // If token expired, try to refresh
      if (error instanceof Error && error.message.includes('401')) {
        try {
          const newToken = await outreachService.refreshAccessToken(currentToken.refresh_token);
          storeOutreachToken(newToken);
          setToken(newToken);
          // Retry loading recordings
          await loadRecordings(newToken);
          return;
        } catch (refreshError) {
          setIsConnected(false);
          clearOutreachToken();
        }
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

  const importSelectedRecordings = async () => {
    if (!token || selectedRecordings.size === 0) return;

    const recordingsToImport = recordings.filter(r => selectedRecordings.has(r.id));
    
    for (const recording of recordingsToImport) {
      await importRecording(recording);
    }
    
    setSelectedRecordings(new Set());
  };

  const importRecording = async (recording: OutreachRecording) => {
    if (!token) return;

    setImporting(prev => new Set(prev).add(recording.id));
    
    try {
      // Download the recording file
      const blob = await outreachService.downloadRecording(token.access_token, recording.downloadUrl);
      
      // Create a local recording entry
      const importedRecording = {
        id: `outreach_${recording.id}`,
        title: recording.title,
        description: `Imported from Outreach - ${recording.prospect.name} (${recording.prospect.company || 'Unknown Company'})`,
        file_type: 'audio' as const,
        status: 'uploading' as const,
        created_at: recording.recordedAt,
        outreach_metadata: {
          original_id: recording.id,
          prospect: recording.prospect,
          rep: recording.rep,
          imported_at: new Date().toISOString()
        }
      };

      // Trigger the import callback
      onRecordingImported({
        recording: importedRecording,
        file: new File([blob], `${recording.title}.mp3`, { type: 'audio/mpeg' })
      });
      
      toast({
        title: "Recording imported",
        description: `"${recording.title}" has been imported and is being processed.`,
      });
      
    } catch (error) {
      console.error('Failed to import recording:', error);
      toast({
        title: "Import failed",
        description: `Failed to import "${recording.title}". Please try again.`,
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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (configError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-red-500" />
            Outreach.io Integration
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
    );
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Import from Outreach.io
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect your Outreach account to import call recordings directly into SoundScribe for AI analysis and coaching.
          </p>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={connectToOutreach} 
            disabled={loading}
            className="w-full"
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
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-green-600" />
            Outreach Recordings
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

        {selectedRecordings.size > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border">
            <span className="text-sm font-medium">
              {selectedRecordings.size} recording{selectedRecordings.size !== 1 ? 's' : ''} selected
            </span>
            <Button 
              size="sm" 
              onClick={importSelectedRecordings}
              disabled={importing.size > 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Import Selected
            </Button>
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
            <p className="text-sm">No call recordings found</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Checkbox
                  checked={selectedRecordings.has(recording.id)}
                  onCheckedChange={() => toggleRecordingSelection(recording.id)}
                  disabled={importing.has(recording.id)}
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
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => importRecording(recording)}
                      disabled={importing.has(recording.id)}
                    >
                      {importing.has(recording.id) ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}