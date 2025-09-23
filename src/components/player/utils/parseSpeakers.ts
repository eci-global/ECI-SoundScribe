
export interface SpeakerTrack {
  name: string;
  color: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export function parseSpeakers(transcript?: string): SpeakerTrack[] {
  // Only use real transcript data - no demo fallbacks
  if (!transcript || transcript.trim() === '') {
    console.warn('🚫 No transcript provided to parseSpeakers - returning empty array');
    return [];
  }
  
  const textToParse = transcript;
  
  if (!textToParse) {
    return [];
  }

  const lines = textToParse.split('\n').filter(line => line.trim());
  const speakers: Record<string, SpeakerTrack> = {};
  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316'];
  let colorIndex = 0;

  let currentTime = 0;
  const estimatedDuration = 180; // 3 minutes default
  const timePerLine = estimatedDuration / lines.length;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    // Try to extract timestamp from the line
    const timeMatch = line.match(/\((\d{1,2}):(\d{2})\)/);
    let timestamp = currentTime;
    
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1]);
      const seconds = parseInt(timeMatch[2]);
      timestamp = minutes * 60 + seconds;
    }

    // Extract speaker and text
    const speakerMatch = line.match(/^\*\*([^*]+)\s+\(/);
    if (speakerMatch) {
      const speakerName = speakerMatch[1].trim();
      
      // Remove timestamp and speaker prefix from text
      let text = line
        .replace(/^\*\*[^*]+\s+\([^)]+\):\*\*\s*/, '')
        .trim();

      if (text && speakerName) {
        if (!speakers[speakerName]) {
          speakers[speakerName] = {
            name: speakerName,
            color: colors[colorIndex % colors.length],
            segments: []
          };
          colorIndex++;
        }

        const nextTimestamp = timestamp + timePerLine;
        
        speakers[speakerName].segments.push({
          start: timestamp,
          end: Math.min(nextTimestamp, estimatedDuration),
          text: text
        });

        currentTime = nextTimestamp;
      }
    }
  });

  return Object.values(speakers).map(speaker => ({
    name: speaker.name,
    color: speaker.color,
    segments: speaker.segments
  }));
}
