
// Removed demo transcript import - only use real data

export interface TopicSegment {
  topic: string;
  start: number;
  end: number;
  confidence: number;
}

export function classifyTopics(transcript?: string): TopicSegment[] {
  // Only use real transcript data - no demo fallbacks
  if (!transcript || transcript.trim() === '') {
    console.warn('🚫 No transcript provided to classifyTopics - returning empty array');
    return [];
  }
  
  const textToParse = transcript;
  
  if (!textToParse) {
    return [];
  }

  // Simple topic classification based on keywords
  const topics = [
    {
      name: 'Introduction',
      keywords: ['welcome', 'agenda', 'objectives', 'start'],
      color: '#3B82F6'
    },
    {
      name: 'Progress Review',
      keywords: ['progress', 'feedback', 'stakeholder', 'positive'],
      color: '#10B981'
    },
    {
      name: 'Planning',
      keywords: ['next steps', 'timeline', 'implementation', 'prioritize'],
      color: '#F59E0B'
    },
    {
      name: 'Action Items',
      keywords: ['action items', 'ownership', 'deliverable', 'summary'],
      color: '#EF4444'
    }
  ];

  const segments: TopicSegment[] = [];
  const duration = 180; // 3 minutes
  const segmentDuration = 45; // 45 seconds per topic

  topics.forEach((topic, index) => {
    const start = index * segmentDuration;
    const end = Math.min(start + segmentDuration, duration);
    
    // Calculate confidence based on keyword presence
    const topicKeywords = topic.keywords.join('|');
    const regex = new RegExp(topicKeywords, 'gi');
    const matches = textToParse.match(regex) || [];
    const confidence = Math.min(0.5 + (matches.length * 0.1), 0.95);

    if (confidence > 0.5) {
      segments.push({
        topic: topic.name,
        start,
        end,
        confidence
      });
    }
  });

  return segments;
}
