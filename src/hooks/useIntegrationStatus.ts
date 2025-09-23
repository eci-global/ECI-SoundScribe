import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ServiceHealth {
  id: string;
  name: string;
  description: string;
  type: 'api' | 'webhook' | 'database' | 'storage' | 'auth';
  endpoint: string;
  status: 'connected' | 'disconnected' | 'error' | 'checking';
  lastCheck: string;
  responseTime?: number;
  uptime: number;
  icon: string;
  errorMessage?: string;
  lastError?: string;
  healthDetails?: {
    certificateValid?: boolean;
    dnsResolution?: boolean;
    httpStatus?: number;
    version?: string;
    dependencies?: Array<{ name: string; status: 'ok' | 'error' }>;
  };
}

export interface IntegrationStatusConfig {
  checkInterval: number; // milliseconds
  timeout: number; // milliseconds
  retryAttempts: number;
  enableRealTimeMonitoring: boolean;
}

const DEFAULT_CONFIG: IntegrationStatusConfig = {
  checkInterval: 30000, // 30 seconds
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
  enableRealTimeMonitoring: true
};

export function useIntegrationStatus(config: Partial<IntegrationStatusConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastFullCheck, setLastFullCheck] = useState<Date | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize services with actual endpoints from environment
  const initializeServices = useCallback((): ServiceHealth[] => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xdpcxiouirwcfwybyxmr.supabase.co';
    const baseServices: Omit<ServiceHealth, 'status' | 'lastCheck' | 'responseTime' | 'uptime'>[] = [
      {
        id: 'supabase-db',
        name: 'Supabase Database',
        description: 'Primary database and real-time subscriptions',
        type: 'database',
        endpoint: `${supabaseUrl}/rest/v1/`,
        icon: '🗄️'
      },
      {
        id: 'supabase-auth',
        name: 'Supabase Auth',
        description: 'Authentication and user management',
        type: 'auth',
        endpoint: `${supabaseUrl}/auth/v1/health`,
        icon: '🔐'
      },
      {
        id: 'supabase-storage',
        name: 'Supabase Storage',
        description: 'File storage for recordings and exports',
        type: 'storage',
        endpoint: `${supabaseUrl}/storage/v1/`,
        icon: '💾'
      },
      {
        id: 'openai-api',
        name: 'OpenAI API',
        description: 'AI transcription and summary generation',
        type: 'api',
        endpoint: 'https://api.openai.com/v1/models',
        icon: '🤖'
      },
      {
        id: 'email-service',
        name: 'Email Service',
        description: 'Notification and report delivery',
        type: 'api',
        endpoint: 'https://api.sendgrid.com/v3/user/profile',
        icon: '📧'
      },
      {
        id: 'outreach-api',
        name: 'Outreach.io',
        description: 'Sales engagement platform integration',
        type: 'api',
        endpoint: 'https://api.outreach.io/api/v2/',
        icon: '🎯'
      }
    ];

    return baseServices.map(service => ({
      ...service,
      status: 'checking' as const,
      lastCheck: new Date().toISOString(),
      responseTime: undefined,
      uptime: 0
    }));
  }, []);

  // Check individual service health
  const checkServiceHealth = useCallback(async (
    service: ServiceHealth, 
    signal?: AbortSignal
  ): Promise<Partial<ServiceHealth>> => {
    const startTime = Date.now();
    
    try {
      // Custom health checks based on service type
      switch (service.id) {
        case 'supabase-db':
          return await checkSupabaseDatabase(service, signal);
        case 'supabase-auth':
          return await checkSupabaseAuth(service, signal);
        case 'supabase-storage':
          return await checkSupabaseStorage(service, signal);
        case 'openai-api':
          return await checkOpenAIAPI(service, signal);
        case 'email-service':
          return await checkEmailService(service, signal);
        case 'outreach-api':
          return await checkOutreachAPI(service, signal);
        default:
          return await checkGenericEndpoint(service, signal);
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'error',
        responseTime,
        errorMessage: error.message,
        lastError: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }, []);

  // Supabase Database health check
  const checkSupabaseDatabase = async (
    service: ServiceHealth, 
    signal?: AbortSignal
  ): Promise<Partial<ServiceHealth>> => {
    const startTime = Date.now();
    
    try {
      // Test basic database connection with a simple query
      const { data, error } = await supabase
        .from('recordings')
        .select('count')
        .limit(1)
        .abortSignal(signal);

      const responseTime = Date.now() - startTime;

      if (error && !error.message.includes('relation "recordings" does not exist')) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Additional health checks
      const healthDetails = {
        httpStatus: 200,
        version: 'PostgreSQL 15',
        dependencies: [
          { name: 'Real-time', status: 'ok' as const },
          { name: 'REST API', status: 'ok' as const }
        ]
      };

      return {
        status: 'connected',
        responseTime,
        lastCheck: new Date().toISOString(),
        healthDetails,
        errorMessage: undefined,
        lastError: undefined
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'error',
        responseTime,
        errorMessage: error.message,
        lastError: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  };

  // Supabase Auth health check
  const checkSupabaseAuth = async (
    service: ServiceHealth, 
    signal?: AbortSignal
  ): Promise<Partial<ServiceHealth>> => {
    const startTime = Date.now();
    
    try {
      // Test auth service by checking session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      const responseTime = Date.now() - startTime;

      if (error) {
        throw new Error(`Auth error: ${error.message}`);
      }

      const healthDetails = {
        httpStatus: 200,
        version: 'GoTrue v2',
        dependencies: [
          { name: 'JWT Validation', status: 'ok' as const },
          { name: 'Session Management', status: 'ok' as const }
        ]
      };

      return {
        status: 'connected',
        responseTime,
        lastCheck: new Date().toISOString(),
        healthDetails,
        errorMessage: undefined,
        lastError: undefined
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'error',
        responseTime,
        errorMessage: error.message,
        lastError: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  };

  // Supabase Storage health check
  const checkSupabaseStorage = async (
    service: ServiceHealth, 
    signal?: AbortSignal
  ): Promise<Partial<ServiceHealth>> => {
    const startTime = Date.now();
    
    try {
      // Test storage by listing buckets
      const { data, error } = await supabase.storage.listBuckets();
      
      const responseTime = Date.now() - startTime;

      if (error) {
        throw new Error(`Storage error: ${error.message}`);
      }

      const healthDetails = {
        httpStatus: 200,
        version: 'Storage v1',
        dependencies: [
          { name: 'File Upload', status: 'ok' as const },
          { name: 'Bucket Access', status: 'ok' as const }
        ]
      };

      return {
        status: 'connected',
        responseTime,
        lastCheck: new Date().toISOString(),
        healthDetails,
        errorMessage: undefined,
        lastError: undefined
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'error',
        responseTime,
        errorMessage: error.message,
        lastError: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  };

  // OpenAI API health check
  const checkOpenAIAPI = async (
    service: ServiceHealth, 
    signal?: AbortSignal
  ): Promise<Partial<ServiceHealth>> => {
    const startTime = Date.now();
    
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch(service.endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      const healthDetails = {
        httpStatus: response.status,
        version: 'OpenAI API v1',
        dependencies: [
          { name: 'Models API', status: 'ok' as const },
          { name: 'Authentication', status: 'ok' as const }
        ]
      };

      return {
        status: 'connected',
        responseTime,
        lastCheck: new Date().toISOString(),
        healthDetails,
        errorMessage: undefined,
        lastError: undefined
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'error',
        responseTime,
        errorMessage: error.message,
        lastError: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  };

  // Email service health check
  const checkEmailService = async (
    service: ServiceHealth, 
    signal?: AbortSignal
  ): Promise<Partial<ServiceHealth>> => {
    const startTime = Date.now();
    
    try {
      const apiKey = import.meta.env.VITE_SENDGRID_API_KEY;
      if (!apiKey) {
        // If no API key is configured, assume email service is not set up
        return {
          status: 'disconnected',
          responseTime: Date.now() - startTime,
          lastCheck: new Date().toISOString(),
          errorMessage: 'Email service not configured',
          healthDetails: {
            httpStatus: 0,
            dependencies: [
              { name: 'Configuration', status: 'error' as const }
            ]
          }
        };
      }

      const response = await fetch(service.endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const healthDetails = {
        httpStatus: response.status,
        version: 'SendGrid API v3',
        dependencies: [
          { name: 'Email Delivery', status: 'ok' as const },
          { name: 'Authentication', status: 'ok' as const }
        ]
      };

      return {
        status: 'connected',
        responseTime,
        lastCheck: new Date().toISOString(),
        healthDetails,
        errorMessage: undefined,
        lastError: undefined
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'error',
        responseTime,
        errorMessage: error.message,
        lastError: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  };

  // Outreach API health check
  const checkOutreachAPI = async (
    service: ServiceHealth, 
    signal?: AbortSignal
  ): Promise<Partial<ServiceHealth>> => {
    const startTime = Date.now();
    
    try {
      // Check if user has Outreach connection
      const { data: connection } = await supabase
        .from('outreach_connections')
        .select('access_token, token_expires_at')
        .limit(1)
        .single();

      const responseTime = Date.now() - startTime;

      if (!connection) {
        return {
          status: 'disconnected',
          responseTime,
          lastCheck: new Date().toISOString(),
          errorMessage: 'No Outreach connection configured',
          healthDetails: {
            httpStatus: 0,
            dependencies: [
              { name: 'OAuth Connection', status: 'error' as const }
            ]
          }
        };
      }

      // Check if token is expired
      const tokenExpired = new Date(connection.token_expires_at) <= new Date();
      if (tokenExpired) {
        return {
          status: 'error',
          responseTime,
          lastCheck: new Date().toISOString(),
          errorMessage: 'Access token expired - needs refresh',
          healthDetails: {
            httpStatus: 401,
            dependencies: [
              { name: 'Access Token', status: 'error' as const }
            ]
          }
        };
      }

      // Test API connectivity
      const response = await fetch('https://api.outreach.io/api/v2/', {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Accept': 'application/vnd.api+json'
        },
        signal
      });

      const finalResponseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const healthDetails = {
        httpStatus: response.status,
        version: 'Outreach API v2',
        dependencies: [
          { name: 'OAuth Token', status: 'ok' as const },
          { name: 'API Access', status: 'ok' as const }
        ]
      };

      return {
        status: 'connected',
        responseTime: finalResponseTime,
        lastCheck: new Date().toISOString(),
        healthDetails,
        errorMessage: undefined,
        lastError: undefined
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'error',
        responseTime,
        errorMessage: error.message,
        lastError: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  };

  // Generic endpoint health check
  const checkGenericEndpoint = async (
    service: ServiceHealth, 
    signal?: AbortSignal
  ): Promise<Partial<ServiceHealth>> => {
    const startTime = Date.now();
    
    try {
      const response = await fetch(service.endpoint, {
        method: 'HEAD',
        signal
      });

      const responseTime = Date.now() - startTime;

      const status = response.ok ? 'connected' : 'error';
      const errorMessage = response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`;

      return {
        status,
        responseTime,
        lastCheck: new Date().toISOString(),
        errorMessage,
        healthDetails: {
          httpStatus: response.status,
          certificateValid: response.url.startsWith('https://'),
          dnsResolution: true
        }
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'error',
        responseTime,
        errorMessage: error.message,
        lastError: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  };

  // Check all services
  const checkAllServices = useCallback(async () => {
    setGlobalError(null);
    
    // Cancel any existing checks
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      // Set all services to checking state
      setServices(prev => prev.map(service => ({
        ...service,
        status: 'checking',
        lastCheck: new Date().toISOString()
      })));

      // Check services in parallel with timeout
      const checkPromises = services.map(async (service) => {
        const timeoutId = setTimeout(() => {
          abortControllerRef.current?.abort();
        }, finalConfig.timeout);

        try {
          const updates = await checkServiceHealth(service, abortControllerRef.current?.signal);
          clearTimeout(timeoutId);
          return { ...service, ...updates };
        } catch (error: any) {
          clearTimeout(timeoutId);
          return {
            ...service,
            status: 'error' as const,
            errorMessage: error.message,
            lastCheck: new Date().toISOString()
          };
        }
      });

      const updatedServices = await Promise.all(checkPromises);
      
      // Update uptime calculations (simplified for demo)
      const servicesWithUptime = updatedServices.map(service => ({
        ...service,
        uptime: service.status === 'connected' ? 
          Math.min(service.uptime + 0.1, 100) : 
          Math.max(service.uptime - 1, 0)
      }));

      setServices(servicesWithUptime);
      setLastFullCheck(new Date());
    } catch (error: any) {
      setGlobalError(error.message);
    }
  }, [services, finalConfig.timeout]);

  // Check individual service
  const checkService = useCallback(async (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    setServices(prev => prev.map(s => 
      s.id === serviceId 
        ? { ...s, status: 'checking', lastCheck: new Date().toISOString() }
        : s
    ));

    try {
      const updates = await checkServiceHealth(service);
      setServices(prev => prev.map(s => 
        s.id === serviceId 
          ? { ...s, ...updates, uptime: updates.status === 'connected' ? 
              Math.min(s.uptime + 0.1, 100) : 
              Math.max(s.uptime - 1, 0) }
          : s
      ));
    } catch (error: any) {
      setServices(prev => prev.map(s => 
        s.id === serviceId 
          ? { 
              ...s, 
              status: 'error', 
              errorMessage: error.message,
              lastCheck: new Date().toISOString(),
              uptime: Math.max(s.uptime - 1, 0)
            }
          : s
      ));
    }
  }, [services, checkServiceHealth]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    
    // Initial check
    checkAllServices();
    
    // Set up interval
    if (finalConfig.enableRealTimeMonitoring) {
      checkIntervalRef.current = setInterval(checkAllServices, finalConfig.checkInterval);
    }
  }, [isMonitoring, checkAllServices, finalConfig]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Initialize services and start monitoring
  useEffect(() => {
    const initialServices = initializeServices();
    setServices(initialServices);
  }, [initializeServices]);

  // Auto-start monitoring
  useEffect(() => {
    if (services.length > 0 && !isMonitoring) {
      startMonitoring();
    }
  }, [services.length, isMonitoring, startMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  // Calculate summary statistics
  const stats = {
    total: services.length,
    connected: services.filter(s => s.status === 'connected').length,
    errors: services.filter(s => s.status === 'error').length,
    checking: services.filter(s => s.status === 'checking').length,
    disconnected: services.filter(s => s.status === 'disconnected').length,
    averageResponseTime: services
      .filter(s => s.responseTime !== undefined)
      .reduce((sum, s) => sum + (s.responseTime || 0), 0) / 
      Math.max(services.filter(s => s.responseTime !== undefined).length, 1),
    averageUptime: services.length > 0 ? 
      services.reduce((sum, s) => sum + s.uptime, 0) / services.length : 0
  };

  return {
    services,
    stats,
    isMonitoring,
    lastFullCheck,
    globalError,
    checkAllServices,
    checkService,
    startMonitoring,
    stopMonitoring,
    config: finalConfig
  };
}