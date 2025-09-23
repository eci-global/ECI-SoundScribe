// Global error handler for production debugging
export function setupGlobalErrorHandler() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    if (error?.message?.includes('some is not a function')) {
      console.error('🚨 Global refetchInterval error caught:', {
        message: error.message,
        stack: error.stack,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
      
      // Prevent the error from crashing the app
      event.preventDefault();
    }
  });

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    if (event.error?.message?.includes('some is not a function')) {
      console.error('🚨 Global JavaScript error caught:', {
        message: event.error.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error.stack,
        timestamp: new Date().toISOString()
      });
    }
  });
}

// Safe array check utility for refetchInterval functions
export function isSafeArray(data: any): data is Array<any> {
  return data !== null && 
         data !== undefined && 
         Array.isArray(data) && 
         data.length > 0;
}

// Safe object check utility for refetchInterval functions
export function isSafeObject(data: any): data is Record<string, any> {
  return data !== null && 
         data !== undefined && 
         typeof data === 'object' && 
         !Array.isArray(data);
}