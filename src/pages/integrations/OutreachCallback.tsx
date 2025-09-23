import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StandardLayout from '@/components/layout/StandardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export default function OutreachCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (processed || !user) return;
    
    async function handleCallback() {
      if (processed) return;
      setProcessed(true);
      
      try {
        // Get OAuth parameters
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        // Check for OAuth errors
        if (error) {
          throw new Error(errorDescription || error);
        }
        
        if (!code || !state) {
          throw new Error('Missing required OAuth parameters');
        }
        
        // Verify state parameter
        const savedState = sessionStorage.getItem('outreach_oauth_state');
        console.log('State validation:', { savedState, receivedState: state, match: savedState === state });
        
        if (!savedState) {
          throw new Error('No saved state found - session may have expired. Please try connecting again.');
        }
        
        if (savedState !== state) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }
        
        // Clear saved state
        sessionStorage.removeItem('outreach_oauth_state');
        
        // Parse state to get user info
        const stateData = JSON.parse(atob(state));
        if (stateData.userId !== user?.id) {
          throw new Error('State user mismatch');
        }
        
        // Call the outreach-oauth Edge Function to exchange code for tokens
        console.log('Calling outreach-oauth Edge Function...');
        const { data: oauthResult, error: oauthError } = await supabase.functions.invoke('outreach-oauth', {
          body: {
            code,
            redirectUri: window.location.origin + '/integrations/outreach/callback',
            userId: user.id
          }
        });

        if (oauthError) {
          console.error('OAuth Edge Function error:', oauthError);
          throw new Error(`OAuth token exchange failed: ${oauthError.message}`);
        }

        if (!oauthResult?.connection) {
          throw new Error('Invalid response from OAuth endpoint');
        }

        console.log('OAuth connection successful:', oauthResult.connection);
        setStatus('success');
        
        // Redirect after success
        setTimeout(() => {
          navigate('/integrations/outreach/import');
        }, 2000);
        
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setErrorMessage(err.message || 'An unexpected error occurred');
      }
    }
    
    if (user) {
      handleCallback();
    }
  }, [searchParams, user, navigate, processed]);

  return (
    <StandardLayout activeSection="summaries">
      <div className="min-h-screen bg-eci-light-gray flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8">
            {status === 'processing' && (
              <div className="text-center">
                <RefreshCw className="h-12 w-12 animate-spin text-brand-red mx-auto mb-4" />
                <h2 className="text-title font-semibold text-eci-gray-900 mb-2">
                  Connecting to Outreach
                </h2>
                <p className="text-body text-eci-gray-600">
                  Please wait while we complete the connection...
                </p>
              </div>
            )}
            
            {status === 'success' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-title font-semibold text-eci-gray-900 mb-2">
                  Successfully Connected!
                </h2>
                <p className="text-body text-eci-gray-600 mb-6">
                  Your Outreach account has been connected successfully.
                </p>
                <p className="text-sm text-eci-gray-500">
                  Redirecting you back...
                </p>
              </div>
            )}
            
            {status === 'error' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-title font-semibold text-eci-gray-900 mb-2">
                  Connection Failed
                </h2>
                <Alert className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {errorMessage}
                  </AlertDescription>
                </Alert>
                <div className="space-y-3">
                  <Button
                    onClick={() => navigate('/integrations/outreach/import')}
                    variant="outline"
                    className="w-full"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => navigate('/')}
                    variant="ghost"
                    className="w-full"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StandardLayout>
  );
}