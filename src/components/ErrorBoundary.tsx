import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.error('🔥 ErrorBoundary caught error:', error);
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔥 ErrorBoundary componentDidCatch:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Enhanced error detection and handling
    const errorMessage = error.message || '';
    const errorStack = error.stack || '';
    
    // Check for specific error patterns
    const isRefetchIntervalError = errorMessage.includes('some is not a function') || 
                                  errorMessage.includes('.some is not a function') ||
                                  errorMessage.includes('refetchInterval');
    
    const isReactQueryError = errorMessage.includes('useQuery') || 
                             errorMessage.includes('react-query') ||
                             errorMessage.includes('@tanstack/react-query');
    
    const isSessionStorageError = errorMessage.includes('sessionStorage') ||
                                 errorMessage.includes('localStorage') ||
                                 errorMessage.includes('Storage quota');
    
    const isNetworkError = errorMessage.includes('fetch') ||
                          errorMessage.includes('network') ||
                          errorMessage.includes('Failed to fetch');

    // Log specific error types for debugging
    if (isRefetchIntervalError) {
      console.error('🔥 RefetchInterval Error detected:', {
        message: errorMessage,
        component: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
      
      // Clear potentially problematic session storage
      this.clearProblematicStorage();
    }

    if (isReactQueryError) {
      console.error('🔥 React Query Error detected:', {
        message: errorMessage,
        component: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }

    if (isSessionStorageError) {
      console.error('🔥 Session Storage Error detected:', {
        message: errorMessage,
        component: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
      
      // Clear all storage to prevent further issues
      this.clearAllStorage();
    }

    // Report error to console with context
    console.error('🔥 Error Context:', {
      errorId: this.state.errorId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      errorType: {
        isRefetchIntervalError,
        isReactQueryError,
        isSessionStorageError,
        isNetworkError
      }
    });
  }

  private clearProblematicStorage = () => {
    try {
      // Clear polling-related session storage
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('poll_') || 
            key.startsWith('quick_poll_') ||
            key.includes('refetch') ||
            key.includes('query')) {
          sessionStorage.removeItem(key);
          console.log(`🧹 Cleared problematic storage key: ${key}`);
        }
      });
    } catch (error) {
      console.warn('Failed to clear problematic storage:', error);
    }
  };

  private clearAllStorage = () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
      console.log('🧹 Cleared all browser storage');
    } catch (error) {
      console.warn('Failed to clear all storage:', error);
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      console.warn('🚫 Maximum retry attempts reached');
      return;
    }

    console.log(`🔄 Retrying... Attempt ${this.state.retryCount + 1}/${this.maxRetries}`);
    
    // Clear problematic storage before retry
    this.clearProblematicStorage();
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  private handleHardRefresh = () => {
    console.log('🔄 Performing hard refresh...');
    
    // Clear all storage before refresh
    this.clearAllStorage();
    
    // Force a complete page reload
    window.location.reload();
  };

  private handleGoHome = () => {
    console.log('🏠 Navigating to home...');
    
    // Clear problematic storage
    this.clearProblematicStorage();
    
    // Navigate to home
    window.location.href = '/';
  };

  private handleGoBack = () => {
    console.log('⬅️ Going back...');
    
    // Clear problematic storage
    this.clearProblematicStorage();
    
    // Go back in history
    window.history.back();
  };

  private getErrorDescription = (): string => {
    const error = this.state.error;
    if (!error) return 'An unknown error occurred';

    const errorMessage = error.message || '';
    
    // Provide user-friendly error descriptions
    if (errorMessage.includes('some is not a function') || 
        errorMessage.includes('refetchInterval')) {
      return 'There was an issue with data refreshing. This usually resolves itself after a page refresh.';
    }
    
    if (errorMessage.includes('useQuery') || 
        errorMessage.includes('react-query')) {
      return 'There was an issue loading data. Please try refreshing the page.';
    }
    
    if (errorMessage.includes('sessionStorage') || 
        errorMessage.includes('localStorage')) {
      return 'There was an issue with browser storage. Try clearing your browser cache.';
    }
    
    if (errorMessage.includes('fetch') || 
        errorMessage.includes('network')) {
      return 'There was a network connectivity issue. Please check your connection and try again.';
    }
    
    if (errorMessage.includes('404') || 
        errorMessage.includes('Not Found')) {
      return 'The requested resource was not found. It may have been moved or deleted.';
    }
    
    if (errorMessage.includes('401') || 
        errorMessage.includes('Unauthorized')) {
      return 'You are not authorized to access this resource. Please sign in again.';
    }
    
    return 'An unexpected error occurred. Please try refreshing the page.';
  };

  private getSuggestedActions = (): string[] => {
    const error = this.state.error;
    if (!error) return ['Try refreshing the page'];

    const errorMessage = error.message || '';
    
    if (errorMessage.includes('some is not a function') || 
        errorMessage.includes('refetchInterval')) {
      return [
        'Try refreshing the page',
        'Clear browser cache and cookies',
        'Check if the recording exists in your dashboard'
      ];
    }
    
    if (errorMessage.includes('401') || 
        errorMessage.includes('Unauthorized')) {
      return [
        'Sign out and sign back in',
        'Check your internet connection',
        'Try refreshing the page'
      ];
    }
    
    if (errorMessage.includes('network') || 
        errorMessage.includes('fetch')) {
      return [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a moment and try again'
      ];
    }
    
    return [
      'Try refreshing the page',
      'Clear browser cache',
      'Check your internet connection'
    ];
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.state.retryCount < this.maxRetries;
      const errorDescription = this.getErrorDescription();
      const suggestedActions = this.getSuggestedActions();

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
              <h1 className="text-lg font-semibold text-gray-900">
                Something went wrong
              </h1>
            </div>
            
            <Alert className="mb-4">
              <AlertDescription className="text-sm text-gray-600">
                {errorDescription}
              </AlertDescription>
            </Alert>

            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Suggested actions:
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                {suggestedActions.map((action, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              {canRetry && (
                <Button 
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                </Button>
              )}
              
              <Button 
                onClick={this.handleHardRefresh}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={this.handleGoBack}
                  className="flex-1"
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
                
                <Button 
                  onClick={this.handleGoHome}
                  className="flex-1"
                  variant="outline"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </div>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-3 bg-gray-100 rounded text-xs">
                <summary className="cursor-pointer font-medium text-gray-700">
                  Technical Details (Development)
                </summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <strong>Error ID:</strong> {this.state.errorId}
                  </div>
                  <div>
                    <strong>Message:</strong> {this.state.error.message}
                  </div>
                  <div>
                    <strong>Stack:</strong>
                    <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto max-h-32">
                      {this.state.error.stack}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto max-h-32">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;