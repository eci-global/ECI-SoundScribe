/**
 * Security Monitoring Service
 * 
 * Tracks and logs security events for monitoring and alerting
 */

export interface SecurityEvent {
  id: string;
  timestamp: string;
  eventType: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  userId?: string;
  sessionId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export type SecurityEventType = 
  | 'file_upload_attempt'
  | 'file_validation_failed'
  | 'file_processing_timeout'
  | 'file_processing_error'
  | 'suspicious_file_content'
  | 'large_file_upload'
  | 'multiple_upload_attempts'
  | 'excel_processing_start'
  | 'excel_processing_success'
  | 'excel_processing_error'
  | 'excel_processing_slow'
  | 'security_validation_bypassed'
  | 'unusual_user_behavior';

export class SecurityMonitoringService {
  private static events: SecurityEvent[] = [];
  private static readonly MAX_EVENTS = 1000;
  private static readonly CRITICAL_THRESHOLDS = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxProcessingTime: 30000, // 30 seconds
    maxUploadsPerMinute: 10,
    maxFailedAttempts: 5
  };

  /**
   * Log a security event
   */
  static logEvent(
    eventType: SecurityEventType,
    details: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    source: string = 'client'
  ): void {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      source,
      details,
      userId: this.getCurrentUserId(),
      sessionId: this.getCurrentSessionId(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    // Add to local storage
    this.events.unshift(event);
    
    // Keep only recent events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(0, this.MAX_EVENTS);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[SECURITY] ${eventType}:`, event);
    }

    // Check for critical patterns
    this.checkCriticalPatterns(event);

    // Store in localStorage for persistence
    this.persistEvents();
  }

  /**
   * Get recent security events
   */
  static getRecentEvents(limit: number = 50): SecurityEvent[] {
    return this.events.slice(0, limit);
  }

  /**
   * Get events by type
   */
  static getEventsByType(eventType: SecurityEventType): SecurityEvent[] {
    return this.events.filter(event => event.eventType === eventType);
  }

  /**
   * Get events by severity
   */
  static getEventsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): SecurityEvent[] {
    return this.events.filter(event => event.severity === severity);
  }

  /**
   * Check for suspicious patterns
   */
  static checkSuspiciousActivity(): {
    isSuspicious: boolean;
    reasons: string[];
    riskScore: number;
  } {
    const recentEvents = this.getRecentEvents(100);
    const reasons: string[] = [];
    let riskScore = 0;

    // Check for multiple failed uploads
    const failedUploads = recentEvents.filter(
      event => event.eventType === 'file_validation_failed' && 
      event.timestamp > this.getTimeMinutesAgo(5)
    );
    if (failedUploads.length > 3) {
      reasons.push('Multiple failed file upload attempts');
      riskScore += 30;
    }

    // Check for large file uploads
    const largeFiles = recentEvents.filter(
      event => event.eventType === 'large_file_upload' &&
      event.timestamp > this.getTimeMinutesAgo(10)
    );
    if (largeFiles.length > 2) {
      reasons.push('Multiple large file uploads');
      riskScore += 20;
    }

    // Check for processing timeouts
    const timeouts = recentEvents.filter(
      event => event.eventType === 'file_processing_timeout' &&
      event.timestamp > this.getTimeMinutesAgo(5)
    );
    if (timeouts.length > 2) {
      reasons.push('Multiple processing timeouts');
      riskScore += 25;
    }

    // Check for suspicious content
    const suspiciousContent = recentEvents.filter(
      event => event.eventType === 'suspicious_file_content' &&
      event.timestamp > this.getTimeMinutesAgo(10)
    );
    if (suspiciousContent.length > 0) {
      reasons.push('Suspicious file content detected');
      riskScore += 40;
    }

    return {
      isSuspicious: riskScore > 50,
      reasons,
      riskScore: Math.min(riskScore, 100)
    };
  }

  /**
   * Generate security report
   */
  static generateSecurityReport(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentActivity: SecurityEvent[];
    suspiciousActivity: ReturnType<typeof this.checkSuspiciousActivity>;
    recommendations: string[];
  } {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    this.events.forEach(event => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    });

    const suspiciousActivity = this.checkSuspiciousActivity();
    const recommendations: string[] = [];

    if (suspiciousActivity.isSuspicious) {
      recommendations.push('Consider implementing rate limiting for file uploads');
      recommendations.push('Review file validation rules');
      recommendations.push('Monitor user activity more closely');
    }

    if (eventsBySeverity.critical > 0) {
      recommendations.push('Investigate critical security events immediately');
    }

    if (eventsByType.file_processing_error > 10) {
      recommendations.push('Review Excel processing error handling');
    }

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsBySeverity,
      recentActivity: this.getRecentEvents(20),
      suspiciousActivity,
      recommendations
    };
  }

  /**
   * Clear old events
   */
  static clearOldEvents(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    this.events = this.events.filter(event => 
      new Date(event.timestamp) > cutoffTime
    );
    this.persistEvents();
  }

  // Private helper methods

  private static generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static getCurrentUserId(): string | undefined {
    // In a real implementation, this would get the current user ID
    return localStorage.getItem('user_id') || undefined;
  }

  private static getCurrentSessionId(): string | undefined {
    // In a real implementation, this would get the current session ID
    return localStorage.getItem('session_id') || undefined;
  }

  private static getClientIP(): string | undefined {
    // In a real implementation, this would get the client IP
    // For now, return undefined as this is client-side
    return undefined;
  }

  private static getTimeMinutesAgo(minutes: number): string {
    return new Date(Date.now() - minutes * 60 * 1000).toISOString();
  }

  private static checkCriticalPatterns(event: SecurityEvent): void {
    // Check for critical patterns that require immediate attention
    if (event.severity === 'critical') {
      this.logCriticalAlert(event);
    }

    // Check for rapid-fire events
    const recentSimilarEvents = this.events.filter(e => 
      e.eventType === event.eventType &&
      e.timestamp > this.getTimeMinutesAgo(1)
    );

    if (recentSimilarEvents.length > 5) {
      this.logEvent(
        'unusual_user_behavior',
        {
          pattern: 'rapid_fire_events',
          eventType: event.eventType,
          count: recentSimilarEvents.length
        },
        'high',
        'security_monitor'
      );
    }
  }

  private static logCriticalAlert(event: SecurityEvent): void {
    // In a real implementation, this would send alerts to security team
    console.error(`[CRITICAL SECURITY ALERT] ${event.eventType}:`, event);
    
    // Could integrate with external services like:
    // - Slack notifications
    // - Email alerts
    // - Security incident management systems
  }

  private static persistEvents(): void {
    try {
      localStorage.setItem('security_events', JSON.stringify(this.events));
    } catch (error) {
      console.error('Failed to persist security events:', error);
    }
  }

  /**
   * Load events from localStorage on initialization
   */
  static initialize(): void {
    try {
      const stored = localStorage.getItem('security_events');
      if (stored) {
        this.events = JSON.parse(stored);
        // Clear old events on initialization
        this.clearOldEvents(24);
      }
    } catch (error) {
      console.error('Failed to load security events:', error);
      this.events = [];
    }
  }
}

// Initialize the service when the module loads
SecurityMonitoringService.initialize();
