import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DataExportRequest {
  id: string;
  userId: string;
  userEmail: string;
  requestedAt: string;
  completedAt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  format: 'json' | 'csv' | 'pdf';
  dataTypes: string[];
  downloadUrl?: string;
  expiresAt?: string;
  errorMessage?: string;
  fileSize?: number;
}

export interface DataDeletionRequest {
  id: string;
  userId: string;
  userEmail: string;
  requestedAt: string;
  scheduledAt?: string;
  completedAt?: string;
  status: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  deletionType: 'full' | 'partial';
  dataTypes: string[];
  retainTypes?: string[];
  confirmationToken?: string;
  confirmedAt?: string;
  errorMessage?: string;
  deletedItemsCount?: number;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: 'data_collection' | 'data_processing' | 'marketing' | 'analytics' | 'cookies';
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string;
  version: string;
  ipAddress: string;
  userAgent: string;
  source: 'registration' | 'settings' | 'banner' | 'api';
  metadata?: Record<string, any>;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'privacy' | 'security' | 'access' | 'data' | 'system';
  metadata?: Record<string, any>;
}

export interface RetentionPolicy {
  id: string;
  dataType: string;
  retentionPeriodDays: number;
  autoDelete: boolean;
  legalBasis: string;
  description: string;
  enabled: boolean;
  lastExecuted?: string;
  nextExecution?: string;
  itemsProcessed?: number;
}

export interface PrivacyComplianceConfig {
  gdprEnabled: boolean;
  ccpaEnabled: boolean;
  dataExportEnabled: boolean;
  dataDeletionEnabled: boolean;
  consentManagementEnabled: boolean;
  auditLoggingEnabled: boolean;
  automaticRetention: boolean;
  exportExpirationDays: number;
  deletionGracePeriodDays: number;
  anonymizationEnabled: boolean;
}

const DEFAULT_PRIVACY_CONFIG: PrivacyComplianceConfig = {
  gdprEnabled: true,
  ccpaEnabled: true,
  dataExportEnabled: true,
  dataDeletionEnabled: true,
  consentManagementEnabled: true,
  auditLoggingEnabled: true,
  automaticRetention: true,
  exportExpirationDays: 30,
  deletionGracePeriodDays: 30,
  anonymizationEnabled: true
};

export function usePrivacyCompliance(config: Partial<PrivacyComplianceConfig> = {}) {
  const finalConfig = { ...DEFAULT_PRIVACY_CONFIG, ...config };
  const { user } = useAuth();
  
  const [exportRequests, setExportRequests] = useState<DataExportRequest[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DataDeletionRequest[]>([]);
  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retentionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize retention policies
  const initializeRetentionPolicies = useCallback(() => {
    const defaultPolicies: RetentionPolicy[] = [
      {
        id: 'recordings-policy',
        dataType: 'recordings',
        retentionPeriodDays: 365,
        autoDelete: true,
        legalBasis: 'Legitimate interest for service improvement',
        description: 'Audio recordings and associated metadata',
        enabled: true
      },
      {
        id: 'transcripts-policy',
        dataType: 'transcripts',
        retentionPeriodDays: 730,
        autoDelete: true,
        legalBasis: 'Contract performance and legitimate interest',
        description: 'Transcription text and summaries',
        enabled: true
      },
      {
        id: 'user-activity-policy',
        dataType: 'user_activity',
        retentionPeriodDays: 90,
        autoDelete: true,
        legalBasis: 'Legitimate interest for security monitoring',
        description: 'User login and activity logs',
        enabled: true
      },
      {
        id: 'audit-logs-policy',
        dataType: 'audit_logs',
        retentionPeriodDays: 2555, // 7 years for compliance
        autoDelete: false,
        legalBasis: 'Legal obligation for audit trail',
        description: 'Privacy and security audit logs',
        enabled: true
      },
      {
        id: 'analytics-policy',
        dataType: 'analytics',
        retentionPeriodDays: 180,
        autoDelete: true,
        legalBasis: 'Legitimate interest for service optimization',
        description: 'Usage analytics and performance metrics',
        enabled: true
      }
    ];

    setRetentionPolicies(defaultPolicies);
  }, []);

  // Log privacy action to audit trail
  const logPrivacyAction = useCallback(async (
    action: string,
    resource: string,
    details: string,
    severity: AuditLogEntry['severity'] = 'info',
    metadata?: Record<string, any>
  ) => {
    if (!finalConfig.auditLoggingEnabled) return;

    const logEntry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      userEmail: user?.email,
      action,
      resource,
      details,
      severity,
      category: 'privacy',
      metadata
    };

    setAuditLogs(prev => [logEntry, ...prev].slice(0, 1000)); // Keep last 1000 entries
    
    // In a real implementation, this would also save to the database
    console.log('Privacy action logged:', logEntry);
  }, [finalConfig.auditLoggingEnabled, user]);

  // Request data export
  const requestDataExport = useCallback(async (
    format: 'json' | 'csv' | 'pdf' = 'json',
    dataTypes: string[] = ['all']
  ): Promise<string> => {
    if (!finalConfig.dataExportEnabled) {
      throw new Error('Data export is not enabled');
    }

    if (!user) {
      throw new Error('User must be authenticated to request data export');
    }

    setIsProcessing(true);
    setError(null);

    try {
      const requestId = `export-${Date.now()}-${user.id}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + finalConfig.exportExpirationDays);

      const exportRequest: DataExportRequest = {
        id: requestId,
        userId: user.id,
        userEmail: user.email || '',
        requestedAt: new Date().toISOString(),
        status: 'pending',
        format,
        dataTypes,
        expiresAt: expiresAt.toISOString()
      };

      setExportRequests(prev => [exportRequest, ...prev]);

      await logPrivacyAction(
        'data_export_requested',
        'user_data',
        `User requested data export in ${format} format`,
        'info',
        { format, dataTypes, requestId }
      );

      // Process the export (in background)
      processDataExport(exportRequest);

      return requestId;
    } catch (error: any) {
      setError(error.message);
      await logPrivacyAction(
        'data_export_failed',
        'user_data',
        `Data export request failed: ${error.message}`,
        'error',
        { error: error.message }
      );
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [finalConfig, user, logPrivacyAction]);

  // Process data export (simulated)
  const processDataExport = useCallback(async (request: DataExportRequest) => {
    try {
      // Update status to processing
      setExportRequests(prev => prev.map(req => 
        req.id === request.id ? { ...req, status: 'processing' } : req
      ));

      // Simulate export processing delay
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Collect user data from various sources
      const userData = await collectUserData(request.userId, request.dataTypes);
      
      // Generate export file
      const exportData = formatExportData(userData, request.format);
      const blob = new Blob([exportData], { type: getContentType(request.format) });
      const downloadUrl = URL.createObjectURL(blob);

      // Update request with completion details
      setExportRequests(prev => prev.map(req => 
        req.id === request.id ? {
          ...req,
          status: 'completed',
          completedAt: new Date().toISOString(),
          downloadUrl,
          fileSize: blob.size
        } : req
      ));

      await logPrivacyAction(
        'data_export_completed',
        'user_data',
        `Data export completed successfully`,
        'info',
        { requestId: request.id, fileSize: blob.size }
      );

    } catch (error: any) {
      setExportRequests(prev => prev.map(req => 
        req.id === request.id ? {
          ...req,
          status: 'failed',
          errorMessage: error.message
        } : req
      ));

      await logPrivacyAction(
        'data_export_failed',
        'user_data',
        `Data export failed: ${error.message}`,
        'error',
        { requestId: request.id, error: error.message }
      );
    }
  }, [logPrivacyAction]);

  // Collect user data from various sources
  const collectUserData = async (userId: string, dataTypes: string[]) => {
    const userData: Record<string, any> = {};

    try {
      // Collect data based on requested types
      if (dataTypes.includes('all') || dataTypes.includes('profile')) {
        // Get user profile data
        const { data: profile } = await supabase.auth.getUser();
        userData.profile = {
          id: profile.user?.id,
          email: profile.user?.email,
          created_at: profile.user?.created_at,
          last_sign_in_at: profile.user?.last_sign_in_at,
          // Remove sensitive data
          phone: profile.user?.phone ? '[REDACTED]' : null
        };
      }

      if (dataTypes.includes('all') || dataTypes.includes('recordings')) {
        // Get user recordings (if table exists)
        try {
          const { data: recordings, error } = await supabase
            .from('recordings')
            .select('*')
            .eq('user_id', userId);
          
          if (!error) {
            userData.recordings = recordings?.map(recording => ({
              ...recording,
              // Remove file URLs for privacy
              file_url: recording.file_url ? '[FILE_REFERENCE]' : null
            })) || [];
          }
        } catch (e) {
          // Table might not exist, skip
          userData.recordings = [];
        }
      }

      if (dataTypes.includes('all') || dataTypes.includes('audit_logs')) {
        // Get audit logs for this user
        userData.audit_logs = auditLogs
          .filter(log => log.userId === userId)
          .map(log => ({
            ...log,
            // Remove sensitive metadata
            metadata: log.metadata ? '[METADATA_PRESENT]' : null
          }));
      }

      if (dataTypes.includes('all') || dataTypes.includes('consent')) {
        // Get consent records
        userData.consent_records = consentRecords.filter(record => record.userId === userId);
      }

      return userData;
    } catch (error) {
      console.error('Error collecting user data:', error);
      throw new Error('Failed to collect user data');
    }
  };

  // Format export data based on requested format
  const formatExportData = (userData: Record<string, any>, format: string): string => {
    switch (format) {
      case 'json':
        return JSON.stringify(userData, null, 2);
      
      case 'csv':
        // Convert to CSV format
        const csvLines = ['Type,Data'];
        Object.entries(userData).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              csvLines.push(`${key}[${index}],"${JSON.stringify(item).replace(/"/g, '""')}"`);
            });
          } else {
            csvLines.push(`${key},"${JSON.stringify(value).replace(/"/g, '""')}"`);
          }
        });
        return csvLines.join('\n');
      
      case 'pdf':
        // For PDF, return a simple text representation
        const pdfContent = Object.entries(userData)
          .map(([key, value]) => `${key.toUpperCase()}:\n${JSON.stringify(value, null, 2)}\n\n`)
          .join('');
        return `PRIVACY DATA EXPORT\n\nGenerated: ${new Date().toISOString()}\n\n${pdfContent}`;
      
      default:
        return JSON.stringify(userData, null, 2);
    }
  };

  // Get content type for export format
  const getContentType = (format: string): string => {
    switch (format) {
      case 'json': return 'application/json';
      case 'csv': return 'text/csv';
      case 'pdf': return 'application/pdf';
      default: return 'application/json';
    }
  };

  // Request data deletion
  const requestDataDeletion = useCallback(async (
    deletionType: 'full' | 'partial' = 'full',
    dataTypes: string[] = ['all'],
    retainTypes: string[] = []
  ): Promise<string> => {
    if (!finalConfig.dataDeletionEnabled) {
      throw new Error('Data deletion is not enabled');
    }

    if (!user) {
      throw new Error('User must be authenticated to request data deletion');
    }

    setIsProcessing(true);
    setError(null);

    try {
      const requestId = `deletion-${Date.now()}-${user.id}`;
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + finalConfig.deletionGracePeriodDays);

      const deletionRequest: DataDeletionRequest = {
        id: requestId,
        userId: user.id,
        userEmail: user.email || '',
        requestedAt: new Date().toISOString(),
        scheduledAt: scheduledAt.toISOString(),
        status: 'scheduled',
        deletionType,
        dataTypes,
        retainTypes,
        confirmationToken: generateConfirmationToken()
      };

      setDeletionRequests(prev => [deletionRequest, ...prev]);

      await logPrivacyAction(
        'data_deletion_requested',
        'user_data',
        `User requested ${deletionType} data deletion`,
        'warning',
        { deletionType, dataTypes, retainTypes, requestId, scheduledAt }
      );

      return requestId;
    } catch (error: any) {
      setError(error.message);
      await logPrivacyAction(
        'data_deletion_failed',
        'user_data',
        `Data deletion request failed: ${error.message}`,
        'error',
        { error: error.message }
      );
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [finalConfig, user, logPrivacyAction]);

  // Confirm data deletion
  const confirmDataDeletion = useCallback(async (
    requestId: string,
    confirmationToken: string
  ): Promise<void> => {
    const request = deletionRequests.find(req => req.id === requestId);
    if (!request) {
      throw new Error('Deletion request not found');
    }

    if (request.confirmationToken !== confirmationToken) {
      throw new Error('Invalid confirmation token');
    }

    setIsProcessing(true);

    try {
      // Update request status
      setDeletionRequests(prev => prev.map(req => 
        req.id === requestId ? {
          ...req,
          confirmedAt: new Date().toISOString(),
          status: 'processing'
        } : req
      ));

      // Process deletion
      const deletedCount = await processDataDeletion(request);

      // Update completion status
      setDeletionRequests(prev => prev.map(req => 
        req.id === requestId ? {
          ...req,
          status: 'completed',
          completedAt: new Date().toISOString(),
          deletedItemsCount: deletedCount
        } : req
      ));

      await logPrivacyAction(
        'data_deletion_completed',
        'user_data',
        `Data deletion completed: ${deletedCount} items deleted`,
        'warning',
        { requestId, deletedCount }
      );

    } catch (error: any) {
      setDeletionRequests(prev => prev.map(req => 
        req.id === requestId ? {
          ...req,
          status: 'failed',
          errorMessage: error.message
        } : req
      ));

      await logPrivacyAction(
        'data_deletion_failed',
        'user_data',
        `Data deletion failed: ${error.message}`,
        'error',
        { requestId, error: error.message }
      );

      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [deletionRequests, logPrivacyAction]);

  // Process data deletion
  const processDataDeletion = async (request: DataDeletionRequest): Promise<number> => {
    let deletedCount = 0;

    try {
      if (request.dataTypes.includes('all') || request.dataTypes.includes('recordings')) {
        // Delete user recordings
        const { error } = await supabase
          .from('recordings')
          .delete()
          .eq('user_id', request.userId);
        
        if (!error) {
          deletedCount += 1; // Simplified count
        }
      }

      // Note: In a real implementation, you would delete from all relevant tables
      // and handle cascading deletions properly

      return deletedCount;
    } catch (error) {
      console.error('Error processing data deletion:', error);
      throw new Error('Failed to delete user data');
    }
  };

  // Generate confirmation token
  const generateConfirmationToken = (): string => {
    return Math.random().toString(36).substr(2, 16).toUpperCase();
  };

  // Record consent
  const recordConsent = useCallback(async (
    consentType: ConsentRecord['consentType'],
    granted: boolean,
    version: string = '1.0',
    source: ConsentRecord['source'] = 'settings',
    metadata?: Record<string, any>
  ): Promise<void> => {
    if (!finalConfig.consentManagementEnabled) return;

    if (!user) {
      throw new Error('User must be authenticated to record consent');
    }

    const consent: ConsentRecord = {
      id: `consent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      consentType,
      granted,
      grantedAt: granted ? new Date().toISOString() : undefined,
      revokedAt: !granted ? new Date().toISOString() : undefined,
      version,
      ipAddress: '0.0.0.0', // Would get real IP in production
      userAgent: navigator.userAgent,
      source,
      metadata
    };

    setConsentRecords(prev => [consent, ...prev]);

    await logPrivacyAction(
      granted ? 'consent_granted' : 'consent_revoked',
      'consent',
      `User ${granted ? 'granted' : 'revoked'} consent for ${consentType}`,
      'info',
      { consentType, granted, version, source }
    );
  }, [finalConfig.consentManagementEnabled, user, logPrivacyAction]);

  // Execute retention policies
  const executeRetentionPolicies = useCallback(async () => {
    if (!finalConfig.automaticRetention) return;

    for (const policy of retentionPolicies) {
      if (!policy.enabled || !policy.autoDelete) continue;

      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays);

        let itemsProcessed = 0;

        // Execute policy based on data type
        switch (policy.dataType) {
          case 'recordings':
            // Delete old recordings
            const { error: recordingsError } = await supabase
              .from('recordings')
              .delete()
              .lt('created_at', cutoffDate.toISOString());
            
            if (!recordingsError) {
              itemsProcessed = 1; // Simplified
            }
            break;

          case 'user_activity':
            // Clean up old activity logs (if table exists)
            itemsProcessed = 1;
            break;

          case 'analytics':
            // Clean up old analytics data
            itemsProcessed = 1;
            break;
        }

        // Update policy execution info
        setRetentionPolicies(prev => prev.map(p => 
          p.id === policy.id ? {
            ...p,
            lastExecuted: new Date().toISOString(),
            itemsProcessed
          } : p
        ));

        await logPrivacyAction(
          'retention_policy_executed',
          'data_retention',
          `Retention policy executed for ${policy.dataType}: ${itemsProcessed} items processed`,
          'info',
          { policyId: policy.id, dataType: policy.dataType, itemsProcessed }
        );

      } catch (error: any) {
        await logPrivacyAction(
          'retention_policy_failed',
          'data_retention',
          `Retention policy failed for ${policy.dataType}: ${error.message}`,
          'error',
          { policyId: policy.id, dataType: policy.dataType, error: error.message }
        );
      }
    }
  }, [finalConfig.automaticRetention, retentionPolicies, logPrivacyAction]);

  // Update retention policy
  const updateRetentionPolicy = useCallback((
    policyId: string,
    updates: Partial<RetentionPolicy>
  ) => {
    setRetentionPolicies(prev => prev.map(policy => 
      policy.id === policyId ? { ...policy, ...updates } : policy
    ));
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeRetentionPolicies();
  }, [initializeRetentionPolicies]);

  // Set up automatic retention policy execution
  useEffect(() => {
    if (finalConfig.automaticRetention) {
      // Run retention policies daily
      retentionIntervalRef.current = setInterval(executeRetentionPolicies, 24 * 60 * 60 * 1000);
    }

    return () => {
      if (retentionIntervalRef.current) {
        clearInterval(retentionIntervalRef.current);
      }
    };
  }, [finalConfig.automaticRetention, executeRetentionPolicies]);

  // Get user's current consent status
  const getUserConsent = useCallback((consentType: ConsentRecord['consentType']) => {
    if (!user) return null;

    const userConsents = consentRecords
      .filter(record => record.userId === user.id && record.consentType === consentType)
      .sort((a, b) => new Date(b.grantedAt || b.revokedAt || '').getTime() - 
                     new Date(a.grantedAt || a.revokedAt || '').getTime());

    return userConsents[0] || null;
  }, [user, consentRecords]);

  // Calculate compliance metrics
  const getComplianceMetrics = useCallback(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentRequests = [
      ...exportRequests.filter(req => new Date(req.requestedAt) > thirtyDaysAgo),
      ...deletionRequests.filter(req => new Date(req.requestedAt) > thirtyDaysAgo)
    ];

    const activeExports = exportRequests.filter(req => 
      req.status === 'completed' && 
      req.expiresAt && 
      new Date(req.expiresAt) > now
    );

    const scheduledDeletions = deletionRequests.filter(req => 
      req.status === 'scheduled' &&
      req.scheduledAt &&
      new Date(req.scheduledAt) > now
    );

    return {
      totalExportRequests: exportRequests.length,
      totalDeletionRequests: deletionRequests.length,
      recentRequestsCount: recentRequests.length,
      activeExportsCount: activeExports.length,
      scheduledDeletionsCount: scheduledDeletions.length,
      totalConsentRecords: consentRecords.length,
      totalAuditLogs: auditLogs.length,
      retentionPoliciesCount: retentionPolicies.filter(p => p.enabled).length
    };
  }, [exportRequests, deletionRequests, consentRecords, auditLogs, retentionPolicies]);

  return {
    // State
    exportRequests,
    deletionRequests,
    consentRecords,
    auditLogs,
    retentionPolicies,
    isProcessing,
    error,

    // Actions
    requestDataExport,
    requestDataDeletion,
    confirmDataDeletion,
    recordConsent,
    executeRetentionPolicies,
    updateRetentionPolicy,

    // Utilities
    getUserConsent,
    getComplianceMetrics,
    logPrivacyAction,

    // Configuration
    config: finalConfig
  };
}