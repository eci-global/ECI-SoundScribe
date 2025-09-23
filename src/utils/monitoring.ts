// Monitoring and error tracking utilities
import React from 'react';

export interface ErrorReport {
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  tags?: Record<string, string>;
  timestamp: string;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  database: {
    connections: {
      active: number;
      idle: number;
      waiting: number;
    };
    queryTime: number;
    errorRate: number;
  };
  // Add other system metrics here
}

class MonitoringService {
  private static instance: MonitoringService;
  private userId?: string;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  // Error tracking
  captureError(error: Error, context?: Record<string, any>, component?: string) {
    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      context: {
        ...context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.sessionId,
      },
      userId: this.userId,
      timestamp: new Date().toISOString(),
      severity: this.determineSeverity(error),
      component,
    };

    this.sendErrorReport(errorReport);
    console.error('Error captured:', errorReport);
  }

  // Performance tracking
  trackPerformance(name: string, startTime: number, tags?: Record<string, string>) {
    const duration = performance.now() - startTime;
    
    const metric: PerformanceMetric = {
      name,
      value: duration,
      unit: 'ms',
      tags: {
        ...tags,
        sessionId: this.sessionId,
        userId: this.userId || 'anonymous',
      },
      timestamp: new Date().toISOString(),
    };

    this.sendPerformanceMetric(metric);
  }

  // Custom event tracking
  trackEvent(eventName: string, properties?: Record<string, any>) {
    const event = {
      name: eventName,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: new Date().toISOString(),
      },
    };

    this.sendEvent(event);
  }

  // API response tracking
  trackApiResponse(endpoint: string, method: string, statusCode: number, duration: number) {
    this.trackPerformance(`api_${method.toLowerCase()}_${endpoint}`, performance.now() - duration, {
      endpoint,
      method,
      status: statusCode.toString(),
    });

    if (statusCode >= 400) {
      this.captureError(
        new Error(`API Error: ${method} ${endpoint} returned ${statusCode}`),
        { endpoint, method, statusCode },
        'api'
      );
    }
  }

  // File upload tracking
  trackFileUpload(fileSize: number, fileType: string, success: boolean, duration: number) {
    this.trackEvent('file_upload', {
      fileSize,
      fileType,
      success,
      duration,
    });

    this.trackPerformance('file_upload', performance.now() - duration, {
      fileType,
      success: success.toString(),
    });
  }

  // Processing tracking
  trackProcessing(recordingId: string, stage: string, success: boolean, duration?: number) {
    this.trackEvent('processing_stage', {
      recordingId,
      stage,
      success,
      duration,
    });
  }

  private determineSeverity(error: Error): ErrorReport['severity'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'medium';
    }
    
    if (message.includes('auth') || message.includes('permission')) {
      return 'high';
    }
    
    if (message.includes('crash') || message.includes('fatal')) {
      return 'critical';
    }
    
    return 'low';
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendErrorReport(errorReport: ErrorReport) {
    try {
      // In a real implementation, you'd send this to your error tracking service
      // like Sentry, LogRocket, or your own backend
      
      if (process.env.NODE_ENV === 'development') {
        console.group('🔥 Error Report');
        console.error(errorReport);
        console.groupEnd();
        return;
      }

      // Example: Send to backend endpoint
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      }).catch(() => {
        // Fail silently to avoid recursive errors
      });
    } catch (e) {
      // Fail silently
    }
  }

  private async sendPerformanceMetric(metric: PerformanceMetric) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Performance Metric:', metric);
        return;
      }

      // Example: Send to analytics service
      await fetch('/api/monitoring/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric),
      }).catch(() => {
        // Fail silently
      });
    } catch (e) {
      // Fail silently
    }
  }

  private async sendEvent(event: any) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('📈 Event:', event);
        return;
      }

      // Example: Send to analytics service
      await fetch('/api/monitoring/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }).catch(() => {
        // Fail silently
      });
    } catch (e) {
      // Fail silently
    }
  }
}

// Export singleton instance
export const monitoring = MonitoringService.getInstance();

// React hook for performance tracking
export function usePerformanceTracking() {
  const trackFunction = <T extends (...args: any[]) => any>(
    fn: T,
    name: string,
    tags?: Record<string, string>
  ): T => {
    return ((...args: any[]) => {
      const startTime = performance.now();
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result.finally(() => {
          monitoring.trackPerformance(name, startTime, tags);
        });
      } else {
        monitoring.trackPerformance(name, startTime, tags);
        return result;
      }
    }) as T;
  };

  return { trackFunction };
}

// Error boundary helper (use in .tsx files)
export function createErrorTrackingWrapper<P extends object>(
  componentName: string
) {
  return function withErrorTracking(
    Component: React.ComponentType<P>
  ): React.ComponentType<P> {
    return (props: P) => {
      try {
        return React.createElement(Component, props);
      } catch (error) {
        monitoring.captureError(
          error instanceof Error ? error : new Error(String(error)),
          { props },
          componentName
        );
        throw error;
      }
    };
  };
}

// Global error handler setup
export function setupGlobalErrorHandling() {
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    monitoring.captureError(
      new Error(`Unhandled Promise Rejection: ${event.reason}`),
      { reason: event.reason },
      'global'
    );
  });

  // Global errors
  window.addEventListener('error', (event) => {
    monitoring.captureError(
      event.error || new Error(event.message),
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      'global'
    );
  });

  // Performance observer for Core Web Vitals
  if ('PerformanceObserver' in window) {
    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        monitoring.trackPerformance('lcp', 0, {
          value: lastEntry.startTime.toString(),
          unit: 'ms'
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          monitoring.trackPerformance('fid', 0, {
            value: ((entry as any).processingStart - entry.startTime).toString(),
            unit: 'ms'
          });
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // Performance Observer not supported
    }
  }
}

export const getSystemMetrics = (): SystemMetrics => {
  const cpu = Math.random() * 100;
  const memory = Math.random() * 100;
  const disk = Math.random() * 100;
  const network = Math.random() * 100;

  // Database connections - fix the type issue
  const dbConnections = {
    active: Math.floor(Math.random() * 10),
    idle: Math.floor(Math.random() * 5),
    waiting: Math.floor(Math.random() * 3)
  };

  const dbConnectionsUsage = ((dbConnections.active / (dbConnections.active + dbConnections.idle + dbConnections.waiting)) * 100);

  return {
    cpu,
    memory,
    disk,
    network,
    database: {
      connections: dbConnections,
      queryTime: Math.random() * 100,
      errorRate: Math.random() * 5
    }
  };
};
