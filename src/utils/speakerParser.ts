
export interface Speaker {
  name: string;
  startTime: number;
  endTime: number;
  segments: Array<{ start: number; end: number; text: string }>;
  totalTime: number;
}

export interface Topic {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface AIEnhancedSpeaker extends Speaker {
  confidence?: number;
  aiIdentified?: boolean;
  characteristics?: {
    role?: string;
    organization?: string;
    introduction_method?: string;
  };
}

export function parseSpeakers(transcript: string, aiSpeakerAnalysis?: any): AIEnhancedSpeaker[] {
  // If we have AI speaker analysis, use that first
  if (aiSpeakerAnalysis?.identified_speakers) {
    console.log('Using AI-enhanced speaker analysis');
    return parseWithAIAnalysis(transcript, aiSpeakerAnalysis);
  }

  // Fallback to legacy parsing
  return parseSpeakersLegacy(transcript);
}

function parseWithAIAnalysis(transcript: string, aiAnalysis: any): AIEnhancedSpeaker[] {
  const speakers: AIEnhancedSpeaker[] = [];
  
  // Process AI-identified speakers
  for (const aiSpeaker of aiAnalysis.identified_speakers) {
    const speaker: AIEnhancedSpeaker = {
      name: aiSpeaker.name,
      startTime: aiSpeaker.segments[0]?.start_time || 0,
      endTime: aiSpeaker.segments[aiSpeaker.segments.length - 1]?.end_time || 0,
      segments: aiSpeaker.segments.map((seg: any) => ({
        start: seg.start_time,
        end: seg.end_time,
        text: seg.text
      })),
      totalTime: aiSpeaker.segments.reduce((total: number, seg: any) => 
        total + (seg.end_time - seg.start_time), 0),
      confidence: aiSpeaker.confidence,
      aiIdentified: true,
      characteristics: aiSpeaker.characteristics
    };
    speakers.push(speaker);
  }

  // Process unidentified segments (fallback to generic labels)
  if (aiAnalysis.unidentified_segments) {
    for (const unidentified of aiAnalysis.unidentified_segments) {
      const speaker: AIEnhancedSpeaker = {
        name: unidentified.speaker_label,
        startTime: unidentified.segments[0]?.start_time || 0,
        endTime: unidentified.segments[unidentified.segments.length - 1]?.end_time || 0,
        segments: unidentified.segments.map((seg: any) => ({
          start: seg.start_time,
          end: seg.end_time,
          text: seg.text
        })),
        totalTime: unidentified.segments.reduce((total: number, seg: any) => 
          total + (seg.end_time - seg.start_time), 0),
        confidence: 0.1, // Very low confidence for unidentified
        aiIdentified: false
      };
      speakers.push(speaker);
    }
  }

  return speakers;
}

function parseSpeakersLegacy(transcript: string): AIEnhancedSpeaker[] {
  // Return empty array if no transcript provided - no mock data
  if (!transcript || transcript.trim().length === 0) {
    return [];
  }

  const actualTranscript = transcript;

  const speakers: AIEnhancedSpeaker[] = [];
  const lines = actualTranscript.split('\n').filter(line => line.trim());
  
  // Enhanced regex patterns to identify speakers
  const introPatterns = [
    /this is (\w+(?:\s+\w+)?)/i,
    /(\w+(?:\s+\w+)?) here/i,
    /(\w+(?:\s+\w+)?) from/i,
    /^(\w+(?:\s+\w+)?):/,
    /\[[\d:]+\]\s*(\w+(?:\s+\w+)?):/,
    /my name is (\w+(?:\s+\w+)?)/i,
    /i'm (\w+(?:\s+\w+)?)/i
  ];

  const speakerMap = new Map<string, AIEnhancedSpeaker>();

  lines.forEach((line, index) => {
    // Extract timestamp
    const timeMatch = line.match(/\[(\d{2}):(\d{2})\]/);
    const timestamp = timeMatch ? 
      parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]) : 
      index * 30; // Default 30 seconds per line

    // Try to identify speaker
    let speakerName = '';
    let introMethod = '';
    for (const pattern of introPatterns) {
      const match = line.match(pattern);
      if (match) {
        speakerName = match[1];
        if (pattern.source.includes('this is')) introMethod = 'self_introduction';
        else if (pattern.source.includes('from')) introMethod = 'organization_intro';
        else introMethod = 'speaker_label';
        break;
      }
    }

    if (speakerName) {
      if (!speakerMap.has(speakerName)) {
        speakerMap.set(speakerName, {
          name: speakerName,
          startTime: timestamp,
          endTime: timestamp + 30,
          segments: [],
          totalTime: 0,
          confidence: introMethod === 'self_introduction' ? 0.8 : 0.5,
          aiIdentified: false,
          characteristics: {
            introduction_method: introMethod
          }
        });
      }

      const speaker = speakerMap.get(speakerName)!;
      const segmentEnd = timestamp + 30;
      
      speaker.segments.push({
        start: timestamp,
        end: segmentEnd,
        text: line.replace(/\[[\d:]+\]/, '').replace(/^\w+:/, '').trim()
      });
      
      speaker.endTime = Math.max(speaker.endTime, segmentEnd);
      speaker.totalTime += 30;
    }
  });

  return Array.from(speakerMap.values());
}

export function parseTopics(transcript: string): Topic[] {
  // Return empty array - topics should come from AI analysis stored in database
  // This function is deprecated in favor of topic_segments table data
  return [];
}
