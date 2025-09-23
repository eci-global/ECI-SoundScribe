import React, { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface MemoryStats {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  isHigh: boolean;
  isCritical: boolean;
}

interface MemoryGuardProps {
  children: React.ReactNode;
  onMemoryCleanup?: () => void;
}

/**
 * MemoryGuard component that monitors memory usage and prevents Out of Memory errors
 */
export const MemoryGuard: React.FC<MemoryGuardProps> = ({ children, onMemoryCleanup }) => {
  const [memoryStats, setMemoryStats] = useState<MemoryStats>({ isHigh: false, isCritical: false });
  const [showWarning, setShowWarning] = useState(false);
  const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastCleanupRef = useRef<number>(0);

  // Memory thresholds
  const MEMORY_THRESHOLDS = {
    HIGH_MEMORY_PERCENT: 70,      // Show warning at 70%
    CRITICAL_MEMORY_PERCENT: 85,  // Auto cleanup at 85%
    CLEANUP_COOLDOWN: 30000,      // 30 seconds between cleanups
    CHECK_INTERVAL: 5000          // Check every 5 seconds
  };

  /**
   * Get current memory usage statistics
   */
  const getMemoryStats = (): MemoryStats => {
    try {
      // Check if performance.memory is available (Chrome/Edge)
      if ('performance' in window && 'memory' in performance) {
        const memory = (performance as any).memory;
        const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        return {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          isHigh: usedPercent > MEMORY_THRESHOLDS.HIGH_MEMORY_PERCENT,
          isCritical: usedPercent > MEMORY_THRESHOLDS.CRITICAL_MEMORY_PERCENT
        };
      }
      
      // Fallback for browsers without performance.memory
      return { isHigh: false, isCritical: false };
    } catch (error) {
      console.warn('⚠️ Memory monitoring not available:', error);
      return { isHigh: false, isCritical: false };
    }
  };

  /**
   * Format bytes to human readable format
   */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Simplified cleanup - removed aggressive operations
   */
  const performEmergencyCleanup = async (): Promise<void> => {
    console.log('🧹 Performing safe memory cleanup');
    
    try {
      // Only clear specific session storage items
      if (typeof sessionStorage !== 'undefined') {
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
          if (key.startsWith('poll_') || 
              key.startsWith('quick_poll_')) {
            sessionStorage.removeItem(key);
          }
        });
      }

      // Call component-specific cleanup if provided
      if (onMemoryCleanup) {
        onMemoryCleanup();
      }

      console.log('✅ Safe memory cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  };

  /**
   * Manual cleanup triggered by user
   */
  const handleManualCleanup = async (): Promise<void> => {
    await performEmergencyCleanup();
    
    // Hide warning temporarily
    setShowWarning(false);
    
    // Recheck memory after cleanup
    setTimeout(() => {
      const newStats = getMemoryStats();
      setMemoryStats(newStats);
      
      if (newStats.isHigh) {
        setShowWarning(true);
      }
    }, 1000);
  };

  /**
   * Hard refresh the page as last resort
   */
  const handleHardRefresh = (): void => {
    console.warn('🚨 Performing hard refresh due to memory issues');
    
    // Clear all storage before refresh
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore errors
    }
    
    window.location.reload();
  };

  /**
   * Simplified memory monitoring - disabled aggressive monitoring
   */
  useEffect(() => {
    // Disable aggressive memory monitoring that was causing crashes
    console.log('MemoryGuard: Monitoring disabled to prevent crashes');
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <>
      {children}
      
      {showWarning && memoryStats.isHigh && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <Alert className={`border-2 ${memoryStats.isCritical ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'}`}>
            <AlertTriangle className={`h-4 w-4 ${memoryStats.isCritical ? 'text-red-600' : 'text-yellow-600'}`} />
            <AlertDescription className="space-y-3">
              <div>
                <p className={`font-medium ${memoryStats.isCritical ? 'text-red-800' : 'text-yellow-800'}`}>
                  {memoryStats.isCritical ? 'Critical Memory Usage!' : 'High Memory Usage'}
                </p>
                <p className={`text-sm ${memoryStats.isCritical ? 'text-red-700' : 'text-yellow-700'}`}>
                  {memoryStats.isCritical 
                    ? 'The page may crash soon. Immediate action recommended.'
                    : 'Memory usage is high. Consider cleaning up to improve performance.'
                  }
                </p>
                
                {memoryStats.usedJSHeapSize && memoryStats.jsHeapSizeLimit && (
                  <p className={`text-xs ${memoryStats.isCritical ? 'text-red-600' : 'text-yellow-600'} mt-1`}>
                    Memory: {formatBytes(memoryStats.usedJSHeapSize)} / {formatBytes(memoryStats.jsHeapSizeLimit)}
                    ({Math.round((memoryStats.usedJSHeapSize / memoryStats.jsHeapSizeLimit) * 100)}%)
                  </p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleManualCleanup}
                  className="flex-1"
                  variant={memoryStats.isCritical ? "destructive" : "default"}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clean Up
                </Button>
                
                {memoryStats.isCritical && (
                  <Button
                    size="sm"
                    onClick={handleHardRefresh}
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-xs">
                  <input
                    type="checkbox"
                    checked={autoCleanupEnabled}
                    onChange={(e) => setAutoCleanupEnabled(e.target.checked)}
                    className="w-3 h-3"
                  />
                  <span className={memoryStats.isCritical ? 'text-red-700' : 'text-yellow-700'}>
                    Auto cleanup
                  </span>
                </label>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowWarning(false)}
                  className="h-6 px-2 text-xs"
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
};

export default MemoryGuard; 