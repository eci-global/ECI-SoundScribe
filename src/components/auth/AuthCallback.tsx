import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * SAML SSO Callback Handler
 *
 * This component handles the redirect from Okta after SAML authentication.
 * Supabase automatically exchanges the SAML response for a session,
 * we just need to detect the session and redirect to the app.
 */
export const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('AuthCallback: Processing SSO callback...');

        // Check if we have a session (Supabase handles SAML automatically)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('AuthCallback: Error getting session:', error);
          // Redirect to login with error message
          navigate('/?error=auth_failed', { replace: true });
          return;
        }

        if (session) {
          console.log('AuthCallback: Session found, user authenticated:', session.user.email);

          // Initialize new user (creates profile and assigns default role)
          try {
            const { error: initError } = await supabase.rpc('initialize_new_user');
            if (initError) {
              console.error('AuthCallback: Error initializing user:', initError);
              // Continue anyway - user might already be initialized
            } else {
              console.log('AuthCallback: User initialized successfully');
            }
          } catch (initErr) {
            console.error('AuthCallback: Exception initializing user:', initErr);
            // Continue anyway
          }

          // Success! Redirect to dashboard
          navigate('/recordings', { replace: true });
        } else {
          console.log('AuthCallback: No session found, redirecting to login');
          // No session yet - might still be processing
          // Wait a moment and try again
          setTimeout(() => {
            supabase.auth.getSession().then(({ data: { session: retrySession } }) => {
              if (retrySession) {
                console.log('AuthCallback: Session found on retry:', retrySession.user.email);
                navigate('/recordings', { replace: true });
              } else {
                console.log('AuthCallback: Still no session, redirecting to login');
                navigate('/?error=auth_timeout', { replace: true });
              }
            });
          }, 2000);
        }
      } catch (err) {
        console.error('AuthCallback: Exception:', err);
        navigate('/?error=auth_exception', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <h2 className="text-xl font-semibold">Completing sign-in...</h2>
        <p className="text-muted-foreground">
          Please wait while we authenticate your account.
        </p>
      </div>
    </div>
  );
};
