
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface AdminSession {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  ipAddress: string | null;
  userAgent: string | null;
  isActive: boolean;
}

interface AdminSessionConfig {
  sessionTimeout: number; // in milliseconds
  warningTime: number; // warn user X ms before timeout
  autoRefresh: boolean;
}

export const useAdminSession = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, userRole, loading: roleLoading } = useUserRole();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeoutWarning, setTimeoutWarning] = useState(false);
  const [config, setConfig] = useState<AdminSessionConfig>({
    sessionTimeout: 60 * 60 * 1000, // 1 hour default
    warningTime: 5 * 60 * 1000, // 5 minutes warning
    autoRefresh: true
  });

  // Generate session ID
  const generateSessionId = () => {
    return `admin_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Get client info
  const getClientInfo = () => {
    return {
      userAgent: navigator.userAgent,
      ipAddress: null, // Would need server-side detection
      timestamp: new Date()
    };
  };

  // Initialize admin session
  const initializeSession = useCallback(async () => {
    if (!user || !isAdmin || roleLoading) {
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      const clientInfo = getClientInfo();
      const sessionId = generateSessionId();

      const newSession: AdminSession = {
        sessionId,
        startTime: new Date(),
        lastActivity: new Date(),
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        isActive: true
      };

      setSession(newSession);
      console.log('Admin session initialized:', sessionId);

    } catch (error) {
      console.error('Error initializing admin session:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, roleLoading]);

  // Update session activity
  const updateActivity = useCallback(async () => {
    if (!session || !session.isActive) return;

    const now = new Date();
    setSession(prev => prev ? {
      ...prev,
      lastActivity: now
    } : null);
  }, [session]);

  // Check session timeout
  const checkTimeout = useCallback(() => {
    if (!session || !session.isActive) return;

    const now = new Date();
    const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
    const timeUntilTimeout = config.sessionTimeout - timeSinceActivity;

    // Show warning
    if (timeUntilTimeout <= config.warningTime && !timeoutWarning) {
      setTimeoutWarning(true);
    }

    // Force logout if timeout exceeded
    if (timeSinceActivity >= config.sessionTimeout) {
      endSession('timeout');
    }
  }, [session, config, timeoutWarning]);

  // Extend session
  const extendSession = useCallback(async () => {
    if (!session) return false;

    try {
      const now = new Date();
      setSession(prev => prev ? {
        ...prev,
        lastActivity: now
      } : null);

      setTimeoutWarning(false);
      console.log('Admin session extended');
      return true;
    } catch (error) {
      console.error('Error extending session:', error);
      return false;
    }
  }, [session, user]);

  // End session
  const endSession = useCallback(async (reason: 'logout' | 'timeout' | 'forced' = 'logout') => {
    if (!session) return;

    try {
      console.log('Admin session ended:', reason);
      
      setSession(prev => prev ? {
        ...prev,
        isActive: false
      } : null);

      // Sign out user
      if (reason === 'timeout' || reason === 'forced') {
        await signOut();
      }

    } catch (error) {
      console.error('Error ending session:', error);
    }
  }, [session, user, signOut]);

  // Session info for display
  const getSessionInfo = useCallback(() => {
    if (!session) return null;

    const now = new Date();
    const duration = now.getTime() - session.startTime.getTime();
    const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
    const timeUntilTimeout = config.sessionTimeout - timeSinceActivity;

    return {
      duration: Math.floor(duration / 1000), // in seconds
      timeUntilTimeout: Math.floor(timeUntilTimeout / 1000), // in seconds
      isNearTimeout: timeUntilTimeout <= config.warningTime,
      sessionId: session.sessionId.split('_').pop() // last part for display
    };
  }, [session, config]);

  // Initialize session when admin user is detected
  useEffect(() => {
    if (!roleLoading) {
      initializeSession();
    }
  }, [initializeSession, roleLoading]);

  // Set up activity tracking
  useEffect(() => {
    if (!session || !session.isActive) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [session, updateActivity]);

  // Set up timeout checking
  useEffect(() => {
    if (!session || !session.isActive) return;

    const interval = setInterval(checkTimeout, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [session, checkTimeout]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (session && session.isActive) {
        endSession('logout');
      }
    };
  }, []);

  return {
    session,
    loading,
    timeoutWarning,
    sessionInfo: getSessionInfo(),
    extendSession,
    endSession,
    updateActivity
  };
};
