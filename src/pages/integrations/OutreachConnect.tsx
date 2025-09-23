import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StandardLayout from '@/components/layout/StandardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Link, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  Shield,
  Zap,
  Users,
  Phone
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function OutreachConnect() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<any>(null);

  // Check if already connected
  useEffect(() => {
    async function checkConnection() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('outreach_connections')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data && !error) {
          setIsConnected(true);
          setConnectionDetails(data);
        }
      } catch (err) {
        console.error('Error checking Outreach connection:', err);
      } finally {
        setIsLoading(false);
      }
    }

    checkConnection();
  }, [user]);

  const handleConnect = () => {
    setIsConnecting(true);
    
    // Generate state parameter for security
    const state = btoa(JSON.stringify({
      userId: user?.id,
      timestamp: Date.now(),
      returnUrl: window.location.pathname
    }));
    
    // Store state in sessionStorage for callback verification
    sessionStorage.setItem('outreach_oauth_state', state);
    
    // Construct OAuth URL
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_OUTREACH_CLIENT_ID || '',
      redirect_uri: import.meta.env.VITE_OUTREACH_REDIRECT_URI || `${window.location.origin}/integrations/outreach/callback`,
      response_type: 'code',
      scope: 'calls.all accounts.all prospects.all users.all emailAddresses.all',
      state
    });
    
    const authUrl = `https://api.outreach.io/oauth/authorize?${params.toString()}`;
    
    // Redirect to Outreach OAuth
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    if (!user || !window.confirm('Are you sure you want to disconnect your Outreach account?')) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('outreach_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      setIsConnected(false);
      setConnectionDetails(null);
      
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
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <StandardLayout activeSection="summaries">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-brand-red mx-auto mb-4" />
            <p className="text-body text-eci-gray-600">Loading Outreach connection status...</p>
          </div>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout activeSection="summaries">
      <div className="min-h-screen bg-eci-light-gray">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-800 mb-2">Outreach Integration</h1>
            <p className="text-body-large text-eci-gray-600">
              Connect your Outreach account to sync call recordings and insights with your sales workflow
            </p>
          </div>

          {/* Connection Status Card */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Link className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Connection Status</CardTitle>
                    <CardDescription>
                      {isConnected ? 'Your Outreach account is connected' : 'Connect your Outreach account to get started'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDisconnect}
                        disabled={isLoading}
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge className="bg-gray-100 text-gray-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Connected
                      </Badge>
                      <Button 
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="bg-brand-red hover:bg-brand-red/90"
                      >
                        {isConnecting ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Link className="h-4 w-4 mr-2" />
                            Connect Outreach
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            {isConnected && connectionDetails && (
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-eci-gray-600">Connected User</p>
                    <p className="font-medium">{connectionDetails.outreach_user_email || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-eci-gray-600">Connected Since</p>
                    <p className="font-medium">
                      {new Date(connectionDetails.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-eci-gray-600">Organization ID</p>
                    <p className="font-medium">{connectionDetails.outreach_org_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-eci-gray-600">Token Status</p>
                    <p className="font-medium">
                      {new Date(connectionDetails.token_expires_at) > new Date() ? (
                        <span className="text-green-600">Active</span>
                      ) : (
                        <span className="text-red-600">Expired</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-eci-gray-900 mb-1">Automatic Prospect Mapping</h3>
                    <p className="text-sm text-eci-gray-600">
                      AI automatically identifies and maps call participants to your Outreach prospects
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-eci-gray-900 mb-1">Call Activity Sync</h3>
                    <p className="text-sm text-eci-gray-600">
                      Automatically create call activities in Outreach with AI-generated summaries and insights
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Zap className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-eci-gray-900 mb-1">Real-time Updates</h3>
                    <p className="text-sm text-eci-gray-600">
                      Webhook integration keeps your data in sync between Echo AI and Outreach
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-eci-gray-900 mb-1">Secure OAuth 2.0</h3>
                    <p className="text-sm text-eci-gray-600">
                      Industry-standard OAuth 2.0 authentication ensures your data remains secure
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Security Notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Note:</strong> Echo AI only requests the minimum permissions needed to sync your call data. 
              Your Outreach credentials are encrypted and stored securely. You can revoke access at any time.
            </AlertDescription>
          </Alert>

          {/* Help Section */}
          <div className="mt-8 text-center">
            <p className="text-sm text-eci-gray-600 mb-2">
              Need help setting up your integration?
            </p>
            <Button variant="outline" size="sm" asChild>
              <a 
                href="https://developers.outreach.io/api/getting-started/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center"
              >
                View Outreach API Docs
                <ExternalLink className="h-3 w-3 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
}