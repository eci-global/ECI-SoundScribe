import { SpeakerResolver, type SpeakerResolutionResult } from './speakerResolution';
import type { Recording } from '@/types/recording';

// AGGRESSIVE memory limits to prevent Out of Memory errors
const MEMORY_LIMITS = {
  MAX_CACHE_SIZE: 5,           // Reduced from 50 to 5
  CACHE_TTL: 2 * 60 * 1000,    // Reduced from 5 minutes to 2 minutes
  MAX_TRANSCRIPT_FOR_HASH: 50, // Only first 50 chars for hash (reduced from 100)
  CLEANUP_INTERVAL: 30000      // Cleanup every 30 seconds
};

// Cache for memoized speaker resolution results with aggressive cleanup
const speakerResolutionCache = new Map<string, {
  result: SpeakerResolutionResult;
  timestamp: number;
  recordingHash: string;
  size: number; // Track memory usage
}>();

// Memory usage tracking
let totalCacheMemory = 0;
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Memoized wrapper for expensive speaker resolution operations
 * Prevents repeated calculations that cause memory issues
 * Now with aggressive memory management
 */
export class MemoizedSpeakerResolver {
  
  /**
   * Start aggressive cleanup monitoring
   */
  private static startCleanupMonitoring(): void {
    if (cleanupInterval) return;
    
    cleanupInterval = setInterval(() => {
      this.aggressiveCleanup();
    }, MEMORY_LIMITS.CLEANUP_INTERVAL);
    
    console.log('🧹 Speaker resolution cleanup monitoring started');
  }
  
  /**
   * Stop cleanup monitoring
   */
  private static stopCleanupMonitoring(): void {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
      console.log('🧹 Speaker resolution cleanup monitoring stopped');
    }
  }
  
  /**
   * Get recording hash for cache key (minimal to reduce memory)
   */
  private static getRecordingHash(recording: Recording): string {
    try {
      const relevantFields = {
        id: recording.id,
        transcript: recording.transcript?.substring(0, MEMORY_LIMITS.MAX_TRANSCRIPT_FOR_HASH) || '', // Minimal transcript
        status: recording.status,
        updated_at: recording.updated_at
      };
      return JSON.stringify(relevantFields);
    } catch (error) {
      console.warn('⚠️ Error creating recording hash:', error);
      return recording.id || 'unknown';
    }
  }
  
  /**
   * Estimate memory usage of a cache entry
   */
  private static estimateMemoryUsage(result: SpeakerResolutionResult, hash: string): number {
    try {
      const resultSize = JSON.stringify(result).length;
      const hashSize = hash.length;
      return resultSize + hashSize + 100; // Add overhead
    } catch {
      return 1000; // Fallback estimate
    }
  }
  
  /**
   * Aggressive cache cleanup - runs frequently and clears aggressively
   */
  private static aggressiveCleanup(): void {
    try {
      const now = Date.now();
      let entriesRemoved = 0;
      
      // Remove expired entries
      for (const [key, entry] of speakerResolutionCache.entries()) {
        if (now - entry.timestamp > MEMORY_LIMITS.CACHE_TTL) {
          totalCacheMemory -= entry.size;
          speakerResolutionCache.delete(key);
          entriesRemoved++;
        }
      }
      
      // If cache is still too large, remove oldest entries aggressively
      if (speakerResolutionCache.size > MEMORY_LIMITS.MAX_CACHE_SIZE) {
        const entries = Array.from(speakerResolutionCache.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toRemove = entries.slice(0, speakerResolutionCache.size - MEMORY_LIMITS.MAX_CACHE_SIZE);
        toRemove.forEach(([key, entry]) => {
          totalCacheMemory -= entry.size;
          speakerResolutionCache.delete(key);
          entriesRemoved++;
        });
      }
      
      // If memory usage is still too high, clear more entries
      const maxMemory = 1024 * 1024; // 1MB max
      if (totalCacheMemory > maxMemory) {
        const entries = Array.from(speakerResolutionCache.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        while (totalCacheMemory > maxMemory / 2 && entries.length > 0) {
          const [key, entry] = entries.shift()!;
          totalCacheMemory -= entry.size;
          speakerResolutionCache.delete(key);
          entriesRemoved++;
        }
      }
      
      if (entriesRemoved > 0) {
        console.log(`🧹 Aggressive cleanup: removed ${entriesRemoved} entries, memory: ${totalCacheMemory} bytes`);
      }
    } catch (error) {
      console.warn('⚠️ Aggressive cleanup failed:', error);
      // In case of error, clear everything to be safe
      this.clearAllCache();
    }
  }
  
  /**
   * Memoized version of resolveActualSpeakers with aggressive memory management
   */
  static resolveActualSpeakers(recording: Recording): SpeakerResolutionResult {
    try {
      // Start monitoring if not already started
      this.startCleanupMonitoring();
      
      // Validate input
      if (!recording || !recording.id) {
        console.warn('⚠️ Invalid recording for speaker resolution');
        return { speakers: [], totalCount: 0, method: 'fallback', confidence: 0 };
      }
      
      const recordingHash = this.getRecordingHash(recording);
      const cacheKey = recording.id;
      const cached = speakerResolutionCache.get(cacheKey);
      
      // Return cached result if valid and recording hasn't changed
      if (cached && cached.recordingHash === recordingHash) {
        console.log('🎯 Using cached speaker resolution for:', recording.id);
        // Update timestamp to mark as recently used
        cached.timestamp = Date.now();
        return cached.result;
      }
      
      // Perform aggressive cleanup before computing new result
      this.aggressiveCleanup();
      
      // Compute new result with error handling
      console.log('🔄 Computing new speaker resolution for:', recording.id);
      let result: SpeakerResolutionResult;
      
      try {
        result = SpeakerResolver.resolveActualSpeakers(recording);
      } catch (resolverError) {
        console.error('🔥 Speaker resolver failed:', resolverError);
        result = { speakers: [], totalCount: 0, method: 'fallback', confidence: 0 };
      }
      
      // Estimate memory usage and decide whether to cache
      const estimatedSize = this.estimateMemoryUsage(result, recordingHash);
      
      // Only cache if it won't cause memory issues
      if (estimatedSize < 100000 && speakerResolutionCache.size < MEMORY_LIMITS.MAX_CACHE_SIZE) { // 100KB max per entry
        // Remove oldest entry if we're at the limit
        if (speakerResolutionCache.size >= MEMORY_LIMITS.MAX_CACHE_SIZE) {
          const oldestKey = Array.from(speakerResolutionCache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0];
          
          if (oldestKey) {
            const oldEntry = speakerResolutionCache.get(oldestKey);
            if (oldEntry) {
              totalCacheMemory -= oldEntry.size;
            }
            speakerResolutionCache.delete(oldestKey);
          }
        }
        
        // Cache the result
        speakerResolutionCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
          recordingHash,
          size: estimatedSize
        });
        
        totalCacheMemory += estimatedSize;
        console.log(`💾 Cached speaker resolution for ${recording.id}, total memory: ${totalCacheMemory} bytes`);
      } else {
        console.warn(`⚠️ Skipping cache for ${recording.id} due to size (${estimatedSize} bytes) or cache limit`);
      }
      
      return result;
    } catch (error) {
      console.error('🔥 Speaker resolution failed completely:', error);
      return { speakers: [], totalCount: 0, method: 'fallback', confidence: 0 };
    }
  }
  
  /**
   * Memoized version of getSpeakerCount with error handling
   */
  static getSpeakerCount(recording: Recording): number {
    try {
      const result = this.resolveActualSpeakers(recording);
      return result.totalCount || 0;
    } catch (error) {
      console.error('🔥 Error getting speaker count:', error);
      return 0;
    }
  }
  
  /**
   * Memoized version of getSpeakerNames with error handling
   */
  static getSpeakerNames(recording: Recording): string[] {
    try {
      const result = this.resolveActualSpeakers(recording);
      // Add defensive check to ensure result is valid
      if (!result || !result.speakers || !Array.isArray(result.speakers)) {
        console.error('MemoizedSpeakerResolver.getSpeakerNames: Invalid result', result);
        return [];
      }
      return result.speakers.map(s => s.displayName);
    } catch (error) {
      console.error('🔥 Error getting speaker names:', error);
      return [];
    }
  }
  
  /**
   * Clear cache for a specific recording (useful after updates)
   */
  static clearCache(recordingId: string): void {
    try {
      const entry = speakerResolutionCache.get(recordingId);
      if (entry) {
        totalCacheMemory -= entry.size;
        speakerResolutionCache.delete(recordingId);
        console.log(`🧹 Cleared cache for recording: ${recordingId}`);
      }
    } catch (error) {
      console.warn('⚠️ Error clearing specific cache:', error);
    }
  }
  
  /**
   * Clear all cache (useful for memory cleanup)
   */
  static clearAllCache(): void {
    try {
      const entriesCleared = speakerResolutionCache.size;
      speakerResolutionCache.clear();
      totalCacheMemory = 0;
      console.log(`🧹 Cleared all speaker resolution cache (${entriesCleared} entries)`);
    } catch (error) {
      console.warn('⚠️ Error clearing all cache:', error);
    }
  }
  
  /**
   * Get current memory usage stats
   */
  static getMemoryStats() {
    return {
      cacheSize: speakerResolutionCache.size,
      totalMemory: totalCacheMemory,
      maxCacheSize: MEMORY_LIMITS.MAX_CACHE_SIZE,
      entries: Array.from(speakerResolutionCache.keys())
    };
  }
  
  /**
   * Emergency memory cleanup - clears everything
   */
  static emergencyCleanup(): void {
    console.warn('🚨 Emergency speaker resolution cleanup triggered');
    this.clearAllCache();
    this.stopCleanupMonitoring();
    
    // Force garbage collection if available
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
      } catch {
        // Ignore if not available
      }
    }
  }
}