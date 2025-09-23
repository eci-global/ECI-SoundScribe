/**
 * Suppress browser extension errors that pollute the console
 * These errors are not from our application and can confuse users
 */
export function suppressExtensionErrors() {
  // Suppress in development too since these errors are distracting
  const originalError = console.error;
  
  console.error = (...args) => {
    const errorString = args.join(' ');
    
    // Suppress known extension errors
    const extensionErrors = [
      'A listener indicated an asynchronous response',
      'Unchecked runtime.lastError',
      'Extension context invalidated',
      'Cannot access contents of url "chrome-extension://"',
      'Cannot access contents of url "edge-extension://"',
      'automations:1',
      'message channel closed before a response was received'
    ];
    
    const isExtensionError = extensionErrors.some(error => 
      errorString.includes(error)
    );
    
    if (!isExtensionError) {
      originalError.apply(console, args);
    }
  };

  // Also suppress unhandled promise rejections from extensions
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason || '';
    
    if (typeof message === 'string') {
      const extensionPatterns = [
        'listener indicated an asynchronous response',
        'message channel closed',
        'chrome-extension',
        'moz-extension'
      ];
      
      const isExtensionError = extensionPatterns.some(pattern => 
        message.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isExtensionError) {
        event.preventDefault();
        return;
      }
    }
  });
}

// Call this in your app initialization
// Example: in main.tsx or App.tsx
// suppressExtensionErrors();