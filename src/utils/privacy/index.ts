/**
 * Privacy Utilities Index
 * Central export for all privacy-related utilities
 */

// Data Export
export { 
  DataExporter, 
  exportUserData, 
  createDownloadLink, 
  downloadExportedData 
} from './dataExporter';
export type { 
  ExportableData, 
  ExportOptions 
} from './dataExporter';

// Data Anonymization
export { 
  DataAnonymizer, 
  anonymizeData, 
  anonymizeDataset, 
  fieldAnonymizers 
} from './dataAnonymizer';
export type { 
  AnonymizationOptions, 
  AnonymizedResult 
} from './dataAnonymizer';

// Compliance Validation
export { 
  ComplianceValidator, 
  validateCompliance, 
  validateRegulationCompliance, 
  createComplianceContext 
} from './complianceValidator';
export type { 
  ComplianceRule, 
  ComplianceContext, 
  ComplianceResult, 
  ComplianceReport 
} from './complianceValidator';

/**
 * Privacy utility constants
 */
export const PRIVACY_CONSTANTS = {
  // Data retention periods (in days)
  RETENTION_PERIODS: {
    USER_ACTIVITY: 90,
    RECORDINGS: 365,
    TRANSCRIPTS: 730,
    AUDIT_LOGS: 2555, // 7 years
    ANALYTICS: 180,
    TEMPORARY_FILES: 30
  },
  
  // Export formats
  EXPORT_FORMATS: {
    JSON: 'json',
    CSV: 'csv',
    XML: 'xml',
    PDF: 'pdf'
  } as const,
  
  // Consent types
  CONSENT_TYPES: {
    DATA_COLLECTION: 'data_collection',
    DATA_PROCESSING: 'data_processing',
    MARKETING: 'marketing',
    ANALYTICS: 'analytics',
    COOKIES: 'cookies'
  } as const,
  
  // User rights
  USER_RIGHTS: {
    ACCESS: 'dataAccess',
    PORTABILITY: 'dataPortability',
    RECTIFICATION: 'dataRectification',
    ERASURE: 'dataErasure',
    RESTRICTION: 'processingRestriction',
    OBJECTION: 'objectToProcessing'
  } as const,
  
  // Regulations
  REGULATIONS: {
    GDPR: 'GDPR',
    CCPA: 'CCPA',
    PIPEDA: 'PIPEDA',
    LGPD: 'LGPD'
  } as const
};

/**
 * Common privacy validation patterns
 */
export const PRIVACY_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /[\d\s\-\(\)\+]{7,}/,
  SSN: /^\d{3}-?\d{2}-?\d{4}$/,
  CREDIT_CARD: /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/,
  IP_V4: /^(?:\d{1,3}\.){3}\d{1,3}$/,
  IP_V6: /^[0-9a-fA-F:]{3,39}$/
};

/**
 * Privacy utility functions
 */
export const privacyUtils = {
  /**
   * Check if data contains PII
   */
  containsPII: (data: any): boolean => {
    const stringData = JSON.stringify(data).toLowerCase();
    const piiIndicators = [
      'email', 'phone', 'ssn', 'social', 'address', 'name',
      'birth', 'credit', 'card', 'passport', 'license'
    ];
    return piiIndicators.some(indicator => stringData.includes(indicator));
  },

  /**
   * Get data classification
   */
  classifyData: (fieldName: string): 'public' | 'internal' | 'confidential' | 'restricted' => {
    const lower = fieldName.toLowerCase();
    
    if (lower.includes('password') || lower.includes('secret') || lower.includes('key')) {
      return 'restricted';
    }
    
    if (lower.includes('email') || lower.includes('phone') || lower.includes('address') ||
        lower.includes('ssn') || lower.includes('credit') || lower.includes('personal')) {
      return 'confidential';
    }
    
    if (lower.includes('user') || lower.includes('account') || lower.includes('profile')) {
      return 'internal';
    }
    
    return 'public';
  },

  /**
   * Generate privacy notice
   */
  generatePrivacyNotice: (dataTypes: string[], purposes: string[]): string => {
    return `We collect the following types of data: ${dataTypes.join(', ')}. ` +
           `This data is used for: ${purposes.join(', ')}. ` +
           `You have the right to access, rectify, and delete your personal data.`;
  },

  /**
   * Check consent expiry
   */
  isConsentExpired: (consentDate: string, expiryMonths: number = 24): boolean => {
    const consent = new Date(consentDate);
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() - expiryMonths);
    return consent < expiry;
  },

  /**
   * Format retention period
   */
  formatRetentionPeriod: (days: number): string => {
    if (days < 30) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (days < 365) {
      const months = Math.round(days / 30);
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.round(days / 365);
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
  },

  /**
   * Validate email for privacy purposes
   */
  isValidEmail: (email: string): boolean => {
    return PRIVACY_PATTERNS.EMAIL.test(email);
  },

  /**
   * Mask sensitive data
   */
  maskSensitiveData: (value: string, type: 'email' | 'phone' | 'card' | 'ssn'): string => {
    switch (type) {
      case 'email':
        return value.replace(/(.{2}).*@/, '$1***@');
      case 'phone':
        return value.replace(/\d(?=\d{4})/g, '*');
      case 'card':
        return value.replace(/\d(?=\d{4})/g, '*');
      case 'ssn':
        return value.replace(/\d/g, (d, i) => i < 3 || i >= value.length - 4 ? d : '*');
      default:
        return value;
    }
  }
};

/**
 * Privacy compliance checklist
 */
export const COMPLIANCE_CHECKLIST = {
  GDPR: [
    'Lawful basis for processing',
    'Data subject consent management',
    'Privacy by design implementation',
    'Data minimization principle',
    'Purpose limitation',
    'Accuracy maintenance',
    'Storage limitation',
    'Integrity and confidentiality',
    'Accountability demonstration',
    'Data subject rights implementation',
    'Privacy impact assessments',
    'Data protection officer designation',
    'Breach notification procedures'
  ],
  
  CCPA: [
    'Privacy policy disclosure',
    'Right to know implementation',
    'Right to delete implementation',
    'Right to opt-out implementation',
    'Non-discrimination policy',
    'Verifiable consumer requests',
    'Personal information inventory',
    'Third-party data sharing disclosure',
    'Consumer request fulfillment process'
  ]
};

/**
 * Default privacy configuration
 */
export const DEFAULT_PRIVACY_CONFIG = {
  gdprEnabled: true,
  ccpaEnabled: true,
  dataRetentionEnabled: true,
  consentManagementEnabled: true,
  auditLoggingEnabled: true,
  encryptionEnabled: true,
  anonymizationEnabled: true,
  userRightsEnabled: {
    dataAccess: true,
    dataPortability: true,
    dataRectification: true,
    dataErasure: true,
    processingRestriction: true,
    objectToProcessing: true
  },
  retentionPolicies: [
    { dataType: 'recordings', days: 365, autoDelete: true },
    { dataType: 'transcripts', days: 730, autoDelete: true },
    { dataType: 'user_activity', days: 90, autoDelete: true },
    { dataType: 'audit_logs', days: 2555, autoDelete: false },
    { dataType: 'analytics', days: 180, autoDelete: true }
  ]
};