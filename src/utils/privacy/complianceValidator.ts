/**
 * Compliance Validation Utilities
 * Validates data handling practices against GDPR, CCPA, and other privacy regulations
 */

export interface ComplianceRule {
  id: string;
  name: string;
  regulation: 'GDPR' | 'CCPA' | 'PIPEDA' | 'LGPD' | 'Generic';
  category: 'data_collection' | 'data_processing' | 'data_storage' | 'data_transfer' | 'user_rights' | 'consent';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  autoFixable: boolean;
  validator: (context: ComplianceContext) => ComplianceResult;
}

export interface ComplianceContext {
  dataTypes: string[];
  processingPurposes: string[];
  dataRetentionPolicies: Array<{
    dataType: string;
    retentionPeriod: number;
    legalBasis: string;
  }>;
  consentRecords: Array<{
    type: string;
    granted: boolean;
    timestamp: string;
    version: string;
  }>;
  dataTransfers: Array<{
    destination: string;
    safeguards: string[];
    legalBasis: string;
  }>;
  securityMeasures: string[];
  userRights: {
    dataAccess: boolean;
    dataPortability: boolean;
    dataRectification: boolean;
    dataErasure: boolean;
    processingRestriction: boolean;
    objectToProcessing: boolean;
  };
  privacyPolicies: Array<{
    version: string;
    lastUpdated: string;
    language: string;
  }>;
  breachNotificationProcedures: boolean;
  dpoDesignated: boolean;
  impactAssessmentCompleted: boolean;
}

export interface ComplianceResult {
  passed: boolean;
  message: string;
  recommendations?: string[];
  autoFixActions?: Array<{
    action: string;
    description: string;
    parameters?: Record<string, any>;
  }>;
  documentation?: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ComplianceReport {
  overall: {
    score: number; // 0-100
    status: 'compliant' | 'partial' | 'non_compliant';
    totalRules: number;
    passedRules: number;
    failedRules: number;
  };
  byRegulation: Record<string, {
    score: number;
    passedRules: number;
    totalRules: number;
    criticalIssues: number;
  }>;
  byCategory: Record<string, {
    score: number;
    passedRules: number;
    totalRules: number;
  }>;
  violations: Array<{
    rule: ComplianceRule;
    result: ComplianceResult;
  }>;
  recommendations: string[];
  autoFixable: Array<{
    rule: ComplianceRule;
    actions: ComplianceResult['autoFixActions'];
  }>;
}

export class ComplianceValidator {
  private rules: ComplianceRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Add a custom compliance rule
   */
  addRule(rule: ComplianceRule): void {
    this.rules.push(rule);
  }

  /**
   * Validate compliance against all rules
   */
  validate(context: ComplianceContext): ComplianceReport {
    const results: Array<{ rule: ComplianceRule; result: ComplianceResult }> = [];
    
    // Run all validation rules
    this.rules.forEach(rule => {
      try {
        const result = rule.validator(context);
        results.push({ rule, result });
      } catch (error) {
        results.push({
          rule,
          result: {
            passed: false,
            message: `Validation error: ${error}`,
            severity: 'high'
          }
        });
      }
    });

    return this.generateReport(results);
  }

  /**
   * Validate specific regulation compliance
   */
  validateRegulation(context: ComplianceContext, regulation: string): ComplianceReport {
    const regulationRules = this.rules.filter(rule => rule.regulation === regulation);
    const results: Array<{ rule: ComplianceRule; result: ComplianceResult }> = [];
    
    regulationRules.forEach(rule => {
      const result = rule.validator(context);
      results.push({ rule, result });
    });

    return this.generateReport(results);
  }

  /**
   * Get auto-fixable issues
   */
  getAutoFixableIssues(context: ComplianceContext): Array<{
    rule: ComplianceRule;
    actions: ComplianceResult['autoFixActions'];
  }> {
    const autoFixable: Array<{
      rule: ComplianceRule;
      actions: ComplianceResult['autoFixActions'];
    }> = [];

    this.rules
      .filter(rule => rule.autoFixable)
      .forEach(rule => {
        const result = rule.validator(context);
        if (!result.passed && result.autoFixActions && result.autoFixActions.length > 0) {
          autoFixable.push({ rule, actions: result.autoFixActions });
        }
      });

    return autoFixable;
  }

  /**
   * Initialize default compliance rules
   */
  private initializeDefaultRules(): void {
    // GDPR Rules
    this.rules.push({
      id: 'gdpr-consent-required',
      name: 'Valid Consent Required',
      regulation: 'GDPR',
      category: 'consent',
      description: 'Processing must be based on valid consent or other legal basis',
      severity: 'critical',
      autoFixable: true,
      validator: (context) => {
        const hasValidConsent = context.consentRecords.some(consent => 
          consent.granted && this.isConsentValid(consent.timestamp)
        );
        
        const hasLegalBasis = context.dataRetentionPolicies.every(policy => 
          policy.legalBasis && policy.legalBasis.trim().length > 0
        );

        if (!hasValidConsent && !hasLegalBasis) {
          return {
            passed: false,
            message: 'No valid consent or legal basis found for data processing',
            severity: 'critical',
            recommendations: [
              'Obtain explicit consent from users',
              'Document legal basis for processing',
              'Implement consent management system'
            ],
            autoFixActions: [
              {
                action: 'enable_consent_management',
                description: 'Enable consent management system',
                parameters: { required: true }
              }
            ]
          };
        }

        return {
          passed: true,
          message: 'Valid consent or legal basis found',
          severity: 'low'
        };
      }
    });

    this.rules.push({
      id: 'gdpr-data-minimization',
      name: 'Data Minimization Principle',
      regulation: 'GDPR',
      category: 'data_collection',
      description: 'Only collect data that is necessary for specified purposes',
      severity: 'high',
      autoFixable: false,
      validator: (context) => {
        const sensitiveDataTypes = ['ssn', 'credit_card', 'biometric', 'health'];
        const hasSensitiveData = context.dataTypes.some(type => 
          sensitiveDataTypes.includes(type.toLowerCase())
        );

        if (hasSensitiveData && context.processingPurposes.length === 0) {
          return {
            passed: false,
            message: 'Sensitive data collected without clear processing purposes',
            severity: 'high',
            recommendations: [
              'Document specific purposes for sensitive data collection',
              'Remove unnecessary sensitive data fields',
              'Implement data classification system'
            ]
          };
        }

        return {
          passed: true,
          message: 'Data collection appears proportionate to purposes',
          severity: 'low'
        };
      }
    });

    this.rules.push({
      id: 'gdpr-retention-limits',
      name: 'Data Retention Limits',
      regulation: 'GDPR',
      category: 'data_storage',
      description: 'Data must not be kept longer than necessary',
      severity: 'high',
      autoFixable: true,
      validator: (context) => {
        const unlimitedRetention = context.dataRetentionPolicies.filter(policy => 
          policy.retentionPeriod <= 0 || policy.retentionPeriod > 2555 // > 7 years
        );

        if (unlimitedRetention.length > 0) {
          return {
            passed: false,
            message: `${unlimitedRetention.length} data types have unlimited or excessive retention periods`,
            severity: 'high',
            recommendations: [
              'Set specific retention periods for all data types',
              'Implement automatic data deletion',
              'Review retention periods regularly'
            ],
            autoFixActions: [
              {
                action: 'set_retention_limits',
                description: 'Set reasonable retention limits for data types',
                parameters: { 
                  defaultRetention: 365,
                  maxRetention: 2555
                }
              }
            ]
          };
        }

        return {
          passed: true,
          message: 'All data types have appropriate retention limits',
          severity: 'low'
        };
      }
    });

    this.rules.push({
      id: 'gdpr-user-rights',
      name: 'User Rights Implementation',
      regulation: 'GDPR',
      category: 'user_rights',
      description: 'Users must be able to exercise their data protection rights',
      severity: 'critical',
      autoFixable: true,
      validator: (context) => {
        const requiredRights = [
          'dataAccess',
          'dataPortability', 
          'dataRectification',
          'dataErasure'
        ];

        const missingRights = requiredRights.filter(right => 
          !context.userRights[right as keyof typeof context.userRights]
        );

        if (missingRights.length > 0) {
          return {
            passed: false,
            message: `Missing implementation for user rights: ${missingRights.join(', ')}`,
            severity: 'critical',
            recommendations: [
              'Implement data access functionality',
              'Enable data portability (export)',
              'Allow data rectification requests',
              'Implement right to erasure (deletion)'
            ],
            autoFixActions: [
              {
                action: 'enable_user_rights',
                description: 'Enable missing user rights functionality',
                parameters: { missingRights }
              }
            ]
          };
        }

        return {
          passed: true,
          message: 'All required user rights are implemented',
          severity: 'low'
        };
      }
    });

    // CCPA Rules
    this.rules.push({
      id: 'ccpa-privacy-notice',
      name: 'Privacy Notice Requirements',
      regulation: 'CCPA',
      category: 'data_collection',
      description: 'Must provide clear privacy notice about data collection',
      severity: 'high',
      autoFixable: false,
      validator: (context) => {
        const hasRecentPolicy = context.privacyPolicies.some(policy => {
          const lastUpdated = new Date(policy.lastUpdated);
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          return lastUpdated > oneYearAgo;
        });

        if (!hasRecentPolicy) {
          return {
            passed: false,
            message: 'Privacy policy is missing or outdated (>1 year)',
            severity: 'high',
            recommendations: [
              'Update privacy policy within the last year',
              'Include CCPA-specific disclosures',
              'Make policy easily accessible to users'
            ]
          };
        }

        return {
          passed: true,
          message: 'Current privacy policy is available',
          severity: 'low'
        };
      }
    });

    this.rules.push({
      id: 'ccpa-opt-out',
      name: 'Opt-Out Rights',
      regulation: 'CCPA',
      category: 'user_rights',
      description: 'Users must be able to opt out of personal information sale',
      severity: 'high',
      autoFixable: true,
      validator: (context) => {
        if (!context.userRights.objectToProcessing) {
          return {
            passed: false,
            message: 'Opt-out mechanism not implemented',
            severity: 'high',
            recommendations: [
              'Implement "Do Not Sell My Personal Information" link',
              'Provide clear opt-out process',
              'Honor opt-out requests within 15 days'
            ],
            autoFixActions: [
              {
                action: 'enable_opt_out',
                description: 'Enable opt-out functionality',
                parameters: { type: 'ccpa_opt_out' }
              }
            ]
          };
        }

        return {
          passed: true,
          message: 'Opt-out mechanism is available',
          severity: 'low'
        };
      }
    });

    // Generic Security Rules
    this.rules.push({
      id: 'security-encryption',
      name: 'Data Encryption',
      regulation: 'Generic',
      category: 'data_storage',
      description: 'Sensitive data must be encrypted',
      severity: 'critical',
      autoFixable: true,
      validator: (context) => {
        const hasEncryption = context.securityMeasures.includes('encryption');
        
        if (!hasEncryption) {
          return {
            passed: false,
            message: 'Data encryption not implemented',
            severity: 'critical',
            recommendations: [
              'Implement encryption at rest',
              'Use TLS for data in transit',
              'Encrypt sensitive data fields'
            ],
            autoFixActions: [
              {
                action: 'enable_encryption',
                description: 'Enable data encryption',
                parameters: { type: 'aes256' }
              }
            ]
          };
        }

        return {
          passed: true,
          message: 'Data encryption is implemented',
          severity: 'low'
        };
      }
    });

    this.rules.push({
      id: 'security-breach-notification',
      name: 'Breach Notification Procedures',
      regulation: 'Generic',
      category: 'data_processing',
      description: 'Must have procedures for data breach notification',
      severity: 'high',
      autoFixable: false,
      validator: (context) => {
        if (!context.breachNotificationProcedures) {
          return {
            passed: false,
            message: 'Data breach notification procedures not established',
            severity: 'high',
            recommendations: [
              'Establish breach detection procedures',
              'Define notification timelines',
              'Create incident response plan',
              'Train staff on breach response'
            ]
          };
        }

        return {
          passed: true,
          message: 'Breach notification procedures are in place',
          severity: 'low'
        };
      }
    });
  }

  /**
   * Generate compliance report
   */
  private generateReport(results: Array<{ rule: ComplianceRule; result: ComplianceResult }>): ComplianceReport {
    const totalRules = results.length;
    const passedRules = results.filter(r => r.result.passed).length;
    const failedRules = totalRules - passedRules;
    
    const score = totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 100;
    
    let status: 'compliant' | 'partial' | 'non_compliant';
    if (score >= 90) status = 'compliant';
    else if (score >= 70) status = 'partial';
    else status = 'non_compliant';

    // Group by regulation
    const byRegulation: Record<string, any> = {};
    const byCategory: Record<string, any> = {};
    
    ['GDPR', 'CCPA', 'Generic'].forEach(regulation => {
      const regulationResults = results.filter(r => r.rule.regulation === regulation);
      if (regulationResults.length > 0) {
        const passed = regulationResults.filter(r => r.result.passed).length;
        const critical = regulationResults.filter(r => 
          !r.result.passed && r.result.severity === 'critical'
        ).length;
        
        byRegulation[regulation] = {
          score: Math.round((passed / regulationResults.length) * 100),
          passedRules: passed,
          totalRules: regulationResults.length,
          criticalIssues: critical
        };
      }
    });

    // Group by category
    ['data_collection', 'data_processing', 'data_storage', 'data_transfer', 'user_rights', 'consent'].forEach(category => {
      const categoryResults = results.filter(r => r.rule.category === category);
      if (categoryResults.length > 0) {
        const passed = categoryResults.filter(r => r.result.passed).length;
        
        byCategory[category] = {
          score: Math.round((passed / categoryResults.length) * 100),
          passedRules: passed,
          totalRules: categoryResults.length
        };
      }
    });

    const violations = results.filter(r => !r.result.passed);
    const recommendations = Array.from(new Set(
      violations.flatMap(v => v.result.recommendations || [])
    ));

    const autoFixable = results
      .filter(r => r.rule.autoFixable && !r.result.passed && r.result.autoFixActions)
      .map(r => ({
        rule: r.rule,
        actions: r.result.autoFixActions!
      }));

    return {
      overall: {
        score,
        status,
        totalRules,
        passedRules,
        failedRules
      },
      byRegulation,
      byCategory,
      violations,
      recommendations,
      autoFixable
    };
  }

  /**
   * Check if consent is still valid (within reasonable time frame)
   */
  private isConsentValid(timestamp: string): boolean {
    const consentDate = new Date(timestamp);
    const now = new Date();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    return consentDate > twoYearsAgo && consentDate <= now;
  }
}

/**
 * Quick compliance check function
 */
export function validateCompliance(context: ComplianceContext): ComplianceReport {
  const validator = new ComplianceValidator();
  return validator.validate(context);
}

/**
 * Check specific regulation compliance
 */
export function validateRegulationCompliance(
  context: ComplianceContext,
  regulation: 'GDPR' | 'CCPA' | 'PIPEDA' | 'LGPD' | 'Generic'
): ComplianceReport {
  const validator = new ComplianceValidator();
  return validator.validateRegulation(context, regulation);
}

/**
 * Create compliance context from system state
 */
export function createComplianceContext(systemState: {
  dataTypes?: string[];
  processingPurposes?: string[];
  retentionPolicies?: any[];
  consentRecords?: any[];
  securityMeasures?: string[];
  userRightsEnabled?: Record<string, boolean>;
  privacyPolicyLastUpdated?: string;
  hasBreachProcedures?: boolean;
  hasDPO?: boolean;
  hasImpactAssessment?: boolean;
}): ComplianceContext {
  return {
    dataTypes: systemState.dataTypes || [],
    processingPurposes: systemState.processingPurposes || [],
    dataRetentionPolicies: systemState.retentionPolicies?.map(policy => ({
      dataType: policy.dataType || '',
      retentionPeriod: policy.retentionPeriodDays || 0,
      legalBasis: policy.legalBasis || ''
    })) || [],
    consentRecords: systemState.consentRecords?.map(consent => ({
      type: consent.consentType || '',
      granted: consent.granted || false,
      timestamp: consent.grantedAt || consent.timestamp || '',
      version: consent.version || '1.0'
    })) || [],
    dataTransfers: [], // Would be populated from actual transfer records
    securityMeasures: systemState.securityMeasures || [],
    userRights: {
      dataAccess: systemState.userRightsEnabled?.dataAccess || false,
      dataPortability: systemState.userRightsEnabled?.dataPortability || false,
      dataRectification: systemState.userRightsEnabled?.dataRectification || false,
      dataErasure: systemState.userRightsEnabled?.dataErasure || false,
      processingRestriction: systemState.userRightsEnabled?.processingRestriction || false,
      objectToProcessing: systemState.userRightsEnabled?.objectToProcessing || false
    },
    privacyPolicies: systemState.privacyPolicyLastUpdated ? [{
      version: '1.0',
      lastUpdated: systemState.privacyPolicyLastUpdated,
      language: 'en'
    }] : [],
    breachNotificationProcedures: systemState.hasBreachProcedures || false,
    dpoDesignated: systemState.hasDPO || false,
    impactAssessmentCompleted: systemState.hasImpactAssessment || false
  };
}