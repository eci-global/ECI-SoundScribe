import { realtimeManager } from '@/integrations/supabase/client';

/**
 * Utility functions for managing Supabase realtime connections
 */

// Track connection failures to implement circuit breaker
let connectionFailureCount = 0;
const MAX_FAILURES = 3; // Reduced from 5 to be more aggressive
const FAILURE_RESET_TIME = 30000; // Reduced to 30 seconds
const CIRCUIT_BREAKER_TIMEOUT = 300000; // 5 minutes before allowing retry
let circuitBreakerTrippedAt: number | null = null;

/**
 * Check if realtime should be disabled due to repeated failures
 */
export function shouldDisableRealtime(): boolean {
  // Check if circuit breaker is currently tripped
  if (circuitBreakerTrippedAt) {
    const now = Date.now();
    if (now - circuitBreakerTrippedAt < CIRCUIT_BREAKER_TIMEOUT) {
      return true;
    } else {
      // Reset circuit breaker after timeout
      console.log('🔄 Circuit breaker timeout expired, allowing realtime retry');
      circuitBreakerTrippedAt = null;
      connectionFailureCount = 0;
      return false;
    }
  }

  const shouldDisable = connectionFailureCount >= MAX_FAILURES;
  if (shouldDisable && !circuitBreakerTrippedAt) {
    circuitBreakerTrippedAt = Date.now();
    console.log(`🚫 Circuit breaker tripped after ${MAX_FAILURES} failures`);
  }
  
  return shouldDisable;
}

/**
 * Record a connection failure
 */
export function recordConnectionFailure(): void {
  connectionFailureCount++;
  console.log(`⚠️ Connection failure recorded (${connectionFailureCount}/${MAX_FAILURES})`);
  
  // Reset failure count after a delay (only if circuit breaker not tripped)
  if (!circuitBreakerTrippedAt) {
    setTimeout(() => {
      connectionFailureCount = Math.max(0, connectionFailureCount - 1);
    }, FAILURE_RESET_TIME);
  }
}

/**
 * Record a successful connection
 */
export function recordConnectionSuccess(): void {
  console.log('✅ Connection success recorded, resetting failure count');
  connectionFailureCount = 0;
  circuitBreakerTrippedAt = null;
}

/**
 * Get connection status
 */
export function getConnectionStatus() {
  return {
    failureCount: connectionFailureCount,
    disabled: shouldDisableRealtime(),
    circuitBreakerTripped: circuitBreakerTrippedAt !== null,
    circuitBreakerTrippedAt,
    timeUntilReset: circuitBreakerTrippedAt 
      ? Math.max(0, CIRCUIT_BREAKER_TIMEOUT - (Date.now() - circuitBreakerTrippedAt))
      : 0,
    managerStatus: realtimeManager.getConnectionStatus()
  };
}

/**
 * Force cleanup all realtime connections
 */
export function forceCleanup(): void {
  realtimeManager.cleanup();
  connectionFailureCount = 0;
}

/**
 * Remove a specific channel by name
 */
export function removeChannel(channelName: string): void {
  realtimeManager.removeChannel(channelName);
}

/**
 * Create a safe channel that handles connection failures gracefully
 */
export function createSafeChannel(channelName: string, config?: any) {
  // Check if realtime is disabled via environment variable
  const realtimeDisabled = import.meta.env.VITE_DISABLE_REALTIME === 'true';
  if (realtimeDisabled) {
    console.log(`🚫 Realtime disabled via environment variable. Skipping channel: ${channelName}`);
    return null;
  }

  if (shouldDisableRealtime()) {
    console.warn(`⚠️ Realtime disabled due to repeated failures. Skipping channel: ${channelName}`);
    return null;
  }

  console.log(`🔄 Attempting to create safe channel: ${channelName}`);

  try {
    const channel = realtimeManager.createChannel(channelName, config);
    if (channel) {
      console.log(`✅ Successfully created safe channel: ${channelName}`);
      recordConnectionSuccess();
    } else {
      console.warn(`⚠️ Channel creation returned null for: ${channelName}`);
    }
    return channel;
  } catch (error) {
    console.error(`❌ Failed to create channel ${channelName}:`, error);
    recordConnectionFailure();
    return null;
  }
} 