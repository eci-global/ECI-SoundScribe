import { supabase } from '@/integrations/supabase/client';

interface EdgeFunctionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface EdgeFunctionError extends Error {
  status?: number;
  details?: any;
}

/**
 * Enhanced Edge Function client with better error handling
 */
export class EdgeFunctionClient {
  /**
   * Invoke an Edge Function with enhanced error handling
   */
  static async invoke<T = any>(
    functionName: string,
    body: any = {},
    options: { retries?: number; timeout?: number } = {}
  ): Promise<{ data: T | null; error: EdgeFunctionError | null }> {
    const { retries = 1, timeout = 30000 } = options;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        console.log(`Calling Edge Function: ${functionName}`, { body, attempt: attempt + 1 });
        // Ensure we attach a fresh access token explicitly. While supabase-js
        // normally injects it, being explicit prevents 401s when envs mismatch.
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        const headers: Record<string, string> = accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {};
        
        // TEMPORARY FIX: Force upload-scorecard-data to use production
        if (functionName === 'upload-scorecard-data') {
          console.log('🔧 Forcing upload-scorecard-data to use production...');
          const response = await fetch('https://qinkldgvejheppheykfl.supabase.co/functions/v1/upload-scorecard-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...headers
            },
            body: JSON.stringify(body)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
          
          const data = await response.json();
          console.log('✅ Production upload-scorecard-data response:', data);
          return { data, error: null };
        }
        
        // Normal supabase function call for other functions
        const { data, error } = await supabase.functions.invoke(functionName, {
          body,
          headers
        });
        
        if (error) {
          console.error(`Edge Function error (${functionName}):`, error);
          
          // Try to extract more meaningful error information
          const enhancedError = this.enhanceError(error, data);
          
          // If this is the last attempt, return the error
          if (attempt === retries - 1) {
            return { data: null, error: enhancedError };
          }
          
          // If it's a rate limit or temporary error, retry
          if (this.isRetryableError(enhancedError)) {
            console.log(`Retrying ${functionName} in ${(attempt + 1) * 1000}ms...`);
            await this.delay((attempt + 1) * 1000);
            continue;
          }
          
          // If it's not retryable, return immediately
          return { data: null, error: enhancedError };
        }
        
        console.log(`Edge Function success (${functionName}):`, data);
        return { data, error: null };
        
      } catch (error) {
        console.error(`Edge Function call failed (${functionName}):`, error);
        
        if (attempt === retries - 1) {
          const enhancedError = this.enhanceError(error as Error);
          return { data: null, error: enhancedError };
        }
        
        // Retry on network errors
        console.log(`Retrying ${functionName} in ${(attempt + 1) * 1000}ms...`);
        await this.delay((attempt + 1) * 1000);
      }
    }
    
    // This should never be reached, but TypeScript requires it
    return { data: null, error: new Error('Unexpected error') as EdgeFunctionError };
  }
  
  /**
   * Enhance error with more meaningful information
   */
  private static enhanceError(error: any, responseData?: any): EdgeFunctionError {
    const enhanced = new Error() as EdgeFunctionError;
    
    // Start with the original error message
    let message = 'Unknown error occurred';
    let status: number | undefined;
    let details: any;

    // Helper to try extracting a useful message from various shapes
    const extractFrom = (src: any): string | undefined => {
      if (!src) return undefined;
      if (typeof src === 'string') {
        // Try parse JSON string bodies first
        try {
          const parsed = JSON.parse(src);
          return (
            parsed?.error ||
            parsed?.message ||
            (Array.isArray(parsed?.errors) ? parsed.errors.map((e: any) => e.message || String(e)).join('; ') : undefined) ||
            undefined
          );
        } catch {
          return src; // plain text
        }
      }
      // Object-like
      return (
        src.error ||
        src.message ||
        (Array.isArray(src.errors) ? src.errors.map((e: any) => e.message || String(e)).join('; ') : undefined)
      );
    };
    
    if (error) {
      // Handle different error formats
      if (typeof error === 'string') {
        message = error;
      } else if (error.message) {
        message = error.message;
        status = error.status;
        details = error.details;
      }
      
      // Check for specific error patterns
      if (message === 'Edge Function returned a non-2xx status code') {
        // Try to extract error from response data first
        const fromResponse = extractFrom(responseData);
        // Supabase FunctionsHttpError often carries a context with the body
        const fromContext = extractFrom((error as any)?.context ?? (error as any)?.body);
        message = fromResponse || fromContext || message;
      }
      
      // Handle common error scenarios
      if (message.includes('Recording not found')) {
        message = 'Recording not found. Please ensure the recording exists and try again.';
      } else if (message.includes('No transcript available')) {
        message = 'No transcript available. Please ensure the recording has been fully processed.';
      } else if (message.includes('OpenAI API')) {
        message = 'AI service temporarily unavailable. Please try again in a few moments.';
      } else if (message.includes('rate limit') || message.includes('429')) {
        message = 'Too many requests. Please wait a moment and try again.';
      }
    }
    
    enhanced.message = message;
    enhanced.status = status;
    enhanced.details = details;
    enhanced.name = 'EdgeFunctionError';
    
    return enhanced;
  }
  
  /**
   * Check if an error is retryable
   */
  private static isRetryableError(error: EdgeFunctionError): boolean {
    if (!error.message) return false;
    
    const retryablePatterns = [
      'rate limit',
      '429',
      'timeout',
      'network',
      'connection',
      'temporary'
    ];
    
    return retryablePatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    );
  }
  
  /**
   * Delay utility for retries
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 
