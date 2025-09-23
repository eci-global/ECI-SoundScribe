export interface SpeakerSegment {
  speaker: string;
  start: number;
  end: number;
  text: string;
}

export interface SpeakerTrack {
  name: string;
  color: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

// AGGRESSIVE memory limits to prevent Out of Memory errors
const MEMORY_LIMITS = {
  MAX_TRANSCRIPT_SIZE: 25000,    // 25KB max (reduced from unlimited)
  MAX_LINES_TO_PROCESS: 200,     // Max 200 lines (reduced significantly)
  MAX_SEGMENTS: 50,              // Max 50 segments total
  MAX_TEXT_LENGTH: 100,          // Max 100 chars per segment text
  MAX_SPEAKER_NAME_LENGTH: 30,   // Max 30 chars per speaker name
  MAX_DURATION: 7200,            // Max 2 hours (7200 seconds) - prevents huge duration values
  MIN_DURATION: 1,               // Min 1 second
  FALLBACK_DURATION: 1800        // 30 minutes fallback
};

/**
 * Validate and sanitize duration to prevent memory issues
 */
function validateDuration(duration: number): number {
  try {
    // Check if duration is a valid number
    if (typeof duration !== 'number' || !isFinite(duration) || isNaN(duration)) {
      console.warn(`⚠️ Invalid duration: ${duration}, using fallback`);
      return MEMORY_LIMITS.FALLBACK_DURATION;
    }

    // Check if duration is suspiciously large (likely incorrect)
    if (duration > MEMORY_LIMITS.MAX_DURATION) {
      console.warn(`⚠️ Duration too large: ${duration}s (${Math.round(duration/3600)}h), capping at ${MEMORY_LIMITS.MAX_DURATION}s`);
      return MEMORY_LIMITS.MAX_DURATION;
    }

    // Check if duration is too small
    if (duration < MEMORY_LIMITS.MIN_DURATION) {
      console.warn(`⚠️ Duration too small: ${duration}s, using fallback`);
      return MEMORY_LIMITS.FALLBACK_DURATION;
    }

    // Duration is reasonable
    return duration;
  } catch (error) {
    console.error('🔥 Error validating duration:', error);
    return MEMORY_LIMITS.FALLBACK_DURATION;
  }
}

export function parseSpotlightSpeakers(transcript: string, duration: number): SpeakerSegment[] {
  try {
    // Early validation
    if (!transcript || typeof transcript !== 'string') {
      console.log('📝 parseSpotlightSpeakers: No transcript provided');
      return [];
    }

    // CRITICAL: Validate duration to prevent memory issues
    const validatedDuration = validateDuration(duration);
    if (validatedDuration !== duration) {
      console.warn(`⚠️ Duration adjusted from ${duration}s to ${validatedDuration}s to prevent memory issues`);
    }

    // AGGRESSIVE size check - immediately truncate if too large
    let processedTranscript = transcript;
    if (transcript.length > MEMORY_LIMITS.MAX_TRANSCRIPT_SIZE) {
      console.warn(`⚠️ Transcript too large (${transcript.length}), truncating to ${MEMORY_LIMITS.MAX_TRANSCRIPT_SIZE} characters`);
      processedTranscript = transcript.substring(0, MEMORY_LIMITS.MAX_TRANSCRIPT_SIZE);
    }

    // Split into lines and limit immediately
    const allLines = processedTranscript.split('\n');
    const lines = allLines
      .filter(line => line && line.trim().length > 0)
      .slice(0, MEMORY_LIMITS.MAX_LINES_TO_PROCESS); // Aggressive line limit

    if (lines.length === 0) {
      console.log('📝 parseSpotlightSpeakers: No valid lines found');
      return [];
    }

    console.log(`📝 parseSpotlightSpeakers: Processing ${lines.length} lines (truncated from ${allLines.length}) with duration ${validatedDuration}s`);

    const segments: SpeakerSegment[] = [];
    let currentTime = 0;
    
    // CRITICAL: Use validated duration to prevent memory explosion
    const timePerLine = validatedDuration / lines.length;
    
    // Additional safety check - if timePerLine is too large, something is wrong
    if (timePerLine > 60) { // More than 1 minute per line is suspicious
      console.warn(`⚠️ Time per line is suspiciously large (${timePerLine}s), using safer calculation`);
      const saferTimePerLine = Math.min(timePerLine, 30); // Cap at 30 seconds per line
      console.log(`📝 Using safer time per line: ${saferTimePerLine}s instead of ${timePerLine}s`);
    }

    // Process lines with aggressive limits
    for (let index = 0; index < lines.length && segments.length < MEMORY_LIMITS.MAX_SEGMENTS; index++) {
      try {
        const line = lines[index];
        const trimmedLine = line.trim();
        
        if (!trimmedLine || trimmedLine.length === 0) {
          continue;
        }

        // Try to extract timestamp from the line (simplified)
        let timestamp = currentTime;
        const timeMatch = line.match(/(\d{1,2}):(\d{2})/);
        
        if (timeMatch) {
          const minutes = parseInt(timeMatch[1]) || 0;
          const seconds = parseInt(timeMatch[2]) || 0;
          const extractedTime = minutes * 60 + seconds;
          
          // Validate extracted timestamp
          if (extractedTime >= 0 && extractedTime <= validatedDuration) {
            timestamp = extractedTime;
          } else {
            console.warn(`⚠️ Invalid timestamp extracted: ${extractedTime}s, using calculated time`);
          }
        }

        // Extract speaker and text (simplified and memory-safe)
        const speakerMatch = line.match(/^([A-Za-z\s]+):/);
        let speaker = speakerMatch ? speakerMatch[1].trim() : `Speaker ${Math.floor(index / 3) + 1}`;
        
        // Limit speaker name length
        if (speaker.length > MEMORY_LIMITS.MAX_SPEAKER_NAME_LENGTH) {
          speaker = speaker.substring(0, MEMORY_LIMITS.MAX_SPEAKER_NAME_LENGTH);
        }
        
        // Remove timestamp and speaker prefix from text (simplified)
        let text = line
          .replace(/\d{1,2}:\d{2}/g, '') // Remove timestamps
          .replace(/^([A-Za-z\s]+):/, '') // Remove speaker prefix
          .trim();

        // Limit text length aggressively
        if (text.length > MEMORY_LIMITS.MAX_TEXT_LENGTH) {
          text = text.substring(0, MEMORY_LIMITS.MAX_TEXT_LENGTH) + '...';
        }

        if (text && text.length > 0) {
          const nextTimestamp = Math.min(timestamp + Math.min(timePerLine, 30), validatedDuration);
          
          segments.push({
            speaker,
            start: timestamp,
            end: nextTimestamp,
            text
          });

          currentTime = nextTimestamp;
        }
      } catch (lineError) {
        console.warn(`⚠️ Error processing line ${index}:`, lineError);
        // Continue processing other lines
      }
    }

    // Final safety check - ensure we don't exceed limits
    const finalSegments = segments.slice(0, MEMORY_LIMITS.MAX_SEGMENTS);
    
    if (finalSegments.length < segments.length) {
      console.warn(`⚠️ Segments truncated from ${segments.length} to ${finalSegments.length} to prevent memory issues`);
    }

    console.log(`📝 parseSpotlightSpeakers: Generated ${finalSegments.length} segments for ${validatedDuration}s duration`);
    return finalSegments;

  } catch (error) {
    console.error('🔥 parseSpotlightSpeakers failed:', error);
    
    // Emergency fallback - create minimal segments
    try {
      const safeDuration = validateDuration(duration);
      const fallbackSegments: SpeakerSegment[] = [];
      const segmentDuration = safeDuration / 5; // Create 5 simple segments
      
      for (let i = 0; i < 5; i++) {
        fallbackSegments.push({
          speaker: `Speaker ${i + 1}`,
          start: i * segmentDuration,
          end: (i + 1) * segmentDuration,
          text: `Segment ${i + 1}`
        });
      }
      
      console.log(`📝 parseSpotlightSpeakers: Using emergency fallback segments for ${safeDuration}s duration`);
      return fallbackSegments;
    } catch (fallbackError) {
      console.error('🔥 Emergency fallback failed:', fallbackError);
      return [];
    }
  }
}

/**
 * Memory-safe utility to get speaker tracks with aggressive limits
 */
export function getSpeakerTracks(segments: SpeakerSegment[]): SpeakerTrack[] {
  try {
    if (!Array.isArray(segments) || segments.length === 0) {
      return [];
    }

    // Limit segments to prevent memory issues
    const limitedSegments = segments.slice(0, MEMORY_LIMITS.MAX_SEGMENTS);
    
    // Group by speaker with memory limits
    const speakerMap = new Map<string, SpeakerTrack>();
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    let colorIndex = 0;

    for (const segment of limitedSegments) {
      try {
        if (!segment || !segment.speaker) continue;
        
        const speakerName = segment.speaker.substring(0, MEMORY_LIMITS.MAX_SPEAKER_NAME_LENGTH);
        
        if (!speakerMap.has(speakerName)) {
          speakerMap.set(speakerName, {
            name: speakerName,
            color: colors[colorIndex % colors.length],
            segments: []
          });
          colorIndex++;
        }

        const track = speakerMap.get(speakerName)!;
        
        // Limit segments per speaker
        if (track.segments.length < 20) { // Max 20 segments per speaker
          track.segments.push({
            start: segment.start,
            end: segment.end,
            text: segment.text.substring(0, MEMORY_LIMITS.MAX_TEXT_LENGTH)
          });
        }
      } catch (segmentError) {
        console.warn('⚠️ Error processing segment for tracks:', segmentError);
      }
    }

    const tracks = Array.from(speakerMap.values()).slice(0, 10); // Max 10 speakers
    console.log(`📝 getSpeakerTracks: Generated ${tracks.length} tracks`);
    
    return tracks;
  } catch (error) {
    console.error('🔥 getSpeakerTracks failed:', error);
    return [];
  }
}

/**
 * Emergency cleanup function to clear any cached data
 */
export function emergencyCleanup(): void {
  console.warn('🚨 Speaker parser emergency cleanup triggered');
  
  // Force garbage collection if available
  if (typeof window !== 'undefined' && 'gc' in window) {
    try {
      (window as any).gc();
    } catch {
      // Ignore if not available
    }
  }
}

/**
 * Debug function to check duration values
 */
export function debugDuration(duration: number, recordingId?: string): void {
  console.log(`🔍 Duration Debug for ${recordingId || 'unknown'}:`);
  console.log(`  - Raw duration: ${duration}`);
  console.log(`  - Type: ${typeof duration}`);
  console.log(`  - Is finite: ${isFinite(duration)}`);
  console.log(`  - Is NaN: ${isNaN(duration)}`);
  console.log(`  - In hours: ${duration / 3600}`);
  console.log(`  - In minutes: ${duration / 60}`);
  console.log(`  - Validated duration: ${validateDuration(duration)}`);
}
