import React from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { useRealtimeDuration } from '@/hooks/useRealtimeDuration';
import { cn } from '@/lib/utils';

interface LiveDurationProps {
  recordingId: string;
  className?: string;
  showIcon?: boolean;
  showCalculatingText?: boolean;
  fallbackDuration?: number | null;
}

/**
 * Component that displays duration with real-time updates
 * Shows live duration changes as recordings are processed
 */
export default function LiveDuration({ 
  recordingId, 
  className,
  showIcon = true,
  showCalculatingText = true,
  fallbackDuration
}: LiveDurationProps) {
  try {
    // Early return for invalid recordingId
    if (!recordingId) {
      console.log('⚠️ LiveDuration: Invalid recordingId provided');
      return (
        <span className={cn('text-xs text-gray-500 flex items-center gap-1', className)}>
          {showIcon && <Clock className="w-3 h-3" />}
          —
        </span>
      );
    }

    console.log(`🔍 LiveDuration: Processing recording ${recordingId.slice(0, 8)}...`);
    const { duration, isCalculating, error } = useRealtimeDuration(recordingId);

  const formatDuration = (seconds?: number | string | null) => {
    // Handle both string and number inputs from database NUMERIC fields
    const numSeconds = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
    
    if (!numSeconds || isNaN(numSeconds) || numSeconds <= 0) return '—';
    
    const hrs = Math.floor(numSeconds / 3600);
    const mins = Math.floor((numSeconds % 3600) / 60);
    const secs = Math.floor(numSeconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Simple fallback logic: realtime OR fallback OR null
  const convertedFallback = typeof fallbackDuration === 'string' ? parseFloat(fallbackDuration) : fallbackDuration;
  const validFallback = convertedFallback && !isNaN(convertedFallback) && convertedFallback > 0 ? convertedFallback : null;
  
  const displayDuration = duration || validFallback;
  const durationSource = duration ? 'realtime' : validFallback ? 'fallback' : 'none';

  // Enhanced debug logging for troubleshooting
  console.log(`🕐 LiveDuration [${recordingId?.slice(0, 8) || 'null'}...]: `, {
    hookDuration: duration,
    hookDurationType: typeof duration,
    fallbackDuration: fallbackDuration, 
    fallbackDurationType: typeof fallbackDuration,
    convertedFallback: convertedFallback,
    validFallback: validFallback,
    finalDisplayDuration: displayDuration,
    durationSource: durationSource,
    isCalculating: isCalculating,
    error: error,
    timestamp: new Date().toISOString()
  });

  // Show error state
  if (error) {
    return (
      <span className={cn('text-xs text-red-500 flex items-center gap-1', className)}>
        {showIcon && <Clock className="w-3 h-3" />}
        Error
      </span>
    );
  }

  // Show calculating state - only when explicitly calculating and no duration available
  if (isCalculating && !displayDuration) {
    console.log(`⏳ Showing calculating state for ${recordingId?.slice(0, 8) || 'null'}...`);
    return (
      <span className={cn('text-xs text-gray-500 flex items-center gap-1', className)}>
        {showIcon && <Loader2 className="w-3 h-3 animate-spin" />}
        {showCalculatingText ? 'Calculating...' : '—'}
      </span>
    );
  }
  
  // Show dash if no duration available and not calculating
  if (!displayDuration) {
    console.log(`➖ No duration available for ${recordingId?.slice(0, 8) || 'null'}...`);
    return (
      <span className={cn('text-xs text-gray-500 flex items-center gap-1', className)}>
        {showIcon && <Clock className="w-3 h-3" />}
        —
      </span>
    );
  }

  // Show duration - we have a valid duration to display
  const formattedDuration = formatDuration(displayDuration);
  console.log(`✅ Displaying duration for ${recordingId?.slice(0, 8) || 'null'}...: ${formattedDuration} (source: ${durationSource})`);
  
  return (
    <span className={cn('text-xs text-gray-600 flex items-center gap-1', className)}>
      {showIcon && <Clock className="w-3 h-3" />}
      {formattedDuration}
    </span>
  );
  } catch (err) {
    console.error(`💥 LiveDuration error for ${recordingId?.slice(0, 8) || 'unknown'}...:`, err);
    // Fallback to static display on any error
    return (
      <span className={cn('text-xs text-gray-500 flex items-center gap-1', className)}>
        {showIcon && <Clock className="w-3 h-3" />}
        —
      </span>
    );
  }
}

/**
 * Reliable static duration formatter component for list views
 * Use this when real-time updates aren't critical (e.g., bulk displays)
 */
export function StaticDuration({ 
  seconds, 
  className,
  showIcon = true,
  recordingId
}: { 
  seconds?: number | string | null; 
  className?: string;
  showIcon?: boolean;
  recordingId?: string;
}) {
  const formatDuration = (seconds?: number | string | null) => {
    // Handle both string and number inputs from database NUMERIC fields
    const numSeconds = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
    
    if (!numSeconds || isNaN(numSeconds) || numSeconds <= 0) return '—';
    
    const hrs = Math.floor(numSeconds / 3600);
    const mins = Math.floor((numSeconds % 3600) / 60);
    const secs = Math.floor(numSeconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formattedDuration = formatDuration(seconds);
  
  // Debug logging for static duration
  if (recordingId) {
    console.log(`📌 StaticDuration [${recordingId.slice(0, 8)}...]: ${seconds} -> ${formattedDuration}`);
  }

  return (
    <span className={cn('text-xs text-gray-600 flex items-center gap-1', className)}>
      {showIcon && <Clock className="w-3 h-3" />}
      {formattedDuration}
    </span>
  );
}

/**
 * Compact duration display for use in lists and cards
 */
export function CompactDuration({ 
  recordingId, 
  fallbackDuration,
  className 
}: { 
  recordingId: string; 
  fallbackDuration?: number | null;
  className?: string;
}) {
  return (
    <LiveDuration 
      recordingId={recordingId}
      fallbackDuration={fallbackDuration}
      className={cn('text-xs', className)}
      showIcon={false}
      showCalculatingText={false}
    />
  );
}

/**
 * Hybrid duration component that tries real-time first, falls back to static
 * Use this for list views where duration reliability is more important than real-time updates
 */
export function HybridDuration({
  recordingId,
  fallbackDuration,
  className,
  showIcon = true
}: {
  recordingId: string;
  fallbackDuration?: number | string | null;
  className?: string;
  showIcon?: boolean;
}) {
  try {
    // Early return for invalid recordingId
    if (!recordingId) {
      console.log('⚠️ HybridDuration: Invalid recordingId provided');
      return (
        <span className={cn('text-xs text-gray-500 flex items-center gap-1', className)}>
          {showIcon && <Clock className="w-3 h-3" />}
          —
        </span>
      );
    }

    console.log(`🔍 HybridDuration: Processing recording ${recordingId.slice(0, 8)}...`);
    const { duration, isCalculating, error } = useRealtimeDuration(recordingId);

    console.log(`📊 HybridDuration [${recordingId.slice(0, 8)}...]:`, {
      duration,
      isCalculating,
      error,
      fallbackDuration
    });

    // If real-time has an error or is taking too long, use static display
    if (error) {
      console.log(`⚠️ HybridDuration falling back to static for ${recordingId.slice(0, 8)}... due to error: ${error}`);
      return (
        <StaticDuration
          seconds={fallbackDuration}
          className={className}
          showIcon={showIcon}
          recordingId={recordingId}
        />
      );
    }

    // If we have a valid real-time duration, use it
    if (duration !== null && duration !== undefined && duration > 0) {
      console.log(`✅ HybridDuration using real-time duration: ${duration}`);
      return (
        <span className={cn('text-xs text-green-600 flex items-center gap-1', className)}>
          {showIcon && <Clock className="w-3 h-3" />}
          {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
        </span>
      );
    }

    // If calculating, show loading state
    if (isCalculating) {
      console.log(`⏳ HybridDuration showing calculating state for ${recordingId.slice(0, 8)}...`);
      return (
        <span className={cn('text-xs text-blue-500 flex items-center gap-1', className)}>
          {showIcon && <Clock className="w-3 h-3 animate-spin" />}
          Calculating...
        </span>
      );
    }

    // Fallback to static duration if no real-time data
    console.log(`📋 HybridDuration falling back to static duration: ${fallbackDuration}`);
    return (
      <StaticDuration
        seconds={fallbackDuration}
        className={className}
        showIcon={showIcon}
        recordingId={recordingId}
      />
    );
  } catch (err) {
    console.error(`💥 HybridDuration error for ${recordingId?.slice(0, 8) || 'unknown'}...:`, err);
    // Fallback to static display on any error
    return (
      <StaticDuration
        seconds={fallbackDuration}
        className={className}
        showIcon={showIcon}
        recordingId={recordingId}
      />
    );
  }
}

/**
 * Efficient duration display that uses shared subscription data
 * Use this instead of CompactDuration when you have bulk duration data
 */
export function BulkDuration({ 
  duration,
  isCalculating,
  fallbackDuration,
  className 
}: { 
  duration?: number | string | null;
  isCalculating?: boolean;
  fallbackDuration?: number | string | null;
  className?: string;
}) {
  const formatDuration = (seconds?: number | string | null) => {
    // Handle both string and number inputs from database NUMERIC fields
    const numSeconds = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
    
    if (!numSeconds || isNaN(numSeconds) || numSeconds <= 0) return '—';
    
    const hrs = Math.floor(numSeconds / 3600);
    const mins = Math.floor((numSeconds % 3600) / 60);
    const secs = Math.floor(numSeconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Use real-time duration, fallback to provided duration, or show calculating
  const displayDuration = duration ?? fallbackDuration;

  // Show calculating state
  if (isCalculating || (!displayDuration && !duration)) {
    return (
      <span className={cn('text-xs text-gray-500', className)}>
        —
      </span>
    );
  }

  // Show duration
  return (
    <span className={cn('text-xs text-gray-600', className)}>
      {formatDuration(displayDuration)}
    </span>
  );
}