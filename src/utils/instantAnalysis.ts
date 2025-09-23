// Instant client-side analysis utilities
export interface InstantSpeakerSegment {
  id: string;
  speaker_name: string;
  start_time: number;
  end_time: number;
  text: string;
  confidence: number;
  created_at: string;
  recording_id: string;
}

export interface InstantTopicSegment {
  id: string;
  topic: string;
  start_time: number;
  end_time: number;
  confidence: number;
  keywords: string[];
  created_at: string;
  recording_id: string;
}

export interface InstantAIMoment {
  id: string;
  type: 'chapter' | 'objection' | 'sentiment_neg' | 'bookmark' | 'action';
  start_time: number;
  label: string;
  tooltip: string;
  confidence: number;
  created_at: string;
  recording_id: string;
}

// Instant speaker detection from transcript
export function extractSpeakersFromTranscript(transcript: string, recordingId: string): InstantSpeakerSegment[] {
  const segments: InstantSpeakerSegment[] = [];
  const lines = transcript.split('\n');
  let currentTime = 0;
  const timeIncrement = 30; // 30 seconds per segment average
  
  lines.forEach((line, index) => {
    // Look for speaker patterns: "Speaker 1:", "John:", "Agent:", etc.
    const speakerMatch = line.match(/^([A-Za-z0-9\s]+):\s*(.+)/);
    if (speakerMatch) {
      const [, speaker, text] = speakerMatch;
      const startTime = currentTime;
      const endTime = currentTime + timeIncrement;
      
      segments.push({
        id: `instant-speaker-${index}`,
        speaker_name: speaker.trim(),
        start_time: startTime,
        end_time: endTime,
        text: text.trim(),
        confidence: 0.8, // Good confidence for pattern-based detection
        created_at: new Date().toISOString(),
        recording_id: recordingId
      });
      
      currentTime = endTime;
    }
  });
  
  return segments;
}

// Instant topic extraction using keywords
export function extractTopicsFromTranscript(transcript: string, recordingId: string): InstantTopicSegment[] {
  const topics: InstantTopicSegment[] = [];
  const topicKeywords = {
    'Sales': ['price', 'cost', 'budget', 'purchase', 'buy', 'sell', 'deal', 'contract', 'quote'],
    'Technical': ['system', 'software', 'integration', 'API', 'database', 'technical', 'development'],
    'Support': ['help', 'issue', 'problem', 'support', 'assistance', 'troubleshoot', 'fix'],
    'Meeting': ['schedule', 'meeting', 'call', 'appointment', 'agenda', 'follow-up'],
    'Product': ['feature', 'product', 'service', 'functionality', 'capability', 'solution'],
    'Pricing': ['pricing', 'cost', 'fee', 'payment', 'billing', 'subscription', 'plan']
  };
  
  const words = transcript.toLowerCase().split(/\s+/);
  const wordCount = words.length;
  const segmentSize = Math.max(100, Math.floor(wordCount / 10)); // Divide into ~10 segments
  
  for (let i = 0; i < wordCount; i += segmentSize) {
    const segment = words.slice(i, i + segmentSize).join(' ');
    const startTime = (i / wordCount) * 1800; // Assume 30-minute recording
    const endTime = Math.min(startTime + (segmentSize / wordCount) * 1800, 1800);
    
    // Find matching topics
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      const matches = keywords.filter(keyword => segment.includes(keyword));
      if (matches.length > 0) {
        const confidence = Math.min(0.9, matches.length / keywords.length + 0.3);
        
        topics.push({
          id: `instant-topic-${topic}-${i}`,
          topic,
          start_time: startTime,
          end_time: endTime,
          confidence,
          keywords: matches,
          created_at: new Date().toISOString(),
          recording_id: recordingId
        });
      }
    });
  }
  
  return topics;
}

// Instant AI moments detection
export function extractMomentsFromTranscript(transcript: string, recordingId: string): InstantAIMoment[] {
  const moments: InstantAIMoment[] = [];
  const lines = transcript.split('\n');
  
  // Patterns for different moment types
  const patterns = {
    objection: /\b(but|however|concern|worry|issue|problem|disagree)\b/i,
    sentiment_neg: /\b(frustrated|angry|upset|disappointed|unhappy|dissatisfied)\b/i,
    action: /\b(will|shall|going to|need to|must|should|action|task|todo)\b/i,
    chapter: /\b(next|moving on|let's discuss|now|topic|section)\b/i
  };
  
  let currentTime = 0;
  const timePerLine = 1800 / lines.length; // Distribute across recording
  
  lines.forEach((line, index) => {
    Object.entries(patterns).forEach(([type, pattern]) => {
      if (pattern.test(line)) {
        moments.push({
          id: `instant-moment-${type}-${index}`,
          type: type as any,
          start_time: currentTime,
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} detected`,
          tooltip: line.substring(0, 100) + (line.length > 100 ? '...' : ''),
          confidence: 0.7,
          created_at: new Date().toISOString(),
          recording_id: recordingId
        });
      }
    });
    
    currentTime += timePerLine;
  });
  
  // Add chapter markers every 5 minutes
  for (let time = 0; time < 1800; time += 300) {
    moments.push({
      id: `instant-chapter-${time}`,
      type: 'chapter',
      start_time: time,
      label: `Chapter ${Math.floor(time / 300) + 1}`,
      tooltip: `Auto-generated chapter marker at ${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`,
      confidence: 0.9,
      created_at: new Date().toISOString(),
      recording_id: recordingId
    });
  }
  
  return moments;
}

// Instant coaching evaluation from transcript (0-100ms processing)
export function generateInstantCoaching(transcript: string): any {
  console.log('⚡ Generating instant coaching analysis...');
  
  const words = transcript.split(/\s+/).filter(w => w.length > 0);
  const lines = transcript.split('\n').filter(l => l.trim());
  const speakers = extractSpeakersFromTranscript(transcript, 'instant');
  
  // Calculate basic metrics
  const questionCount = (transcript.match(/\?/g) || []).length;
  const wordCount = words.length;
  const speakerCount = speakers.length;
  
  // Estimate talk time ratio (assuming balanced conversation = good score)
  const talkTimeRatio = speakerCount > 1 ? Math.min(100, 50 + (questionCount / wordCount * 1000) * 10) : 75;
  
  // Calculate engagement metrics
  const avgWordsPerSpeaker = speakerCount > 0 ? wordCount / speakerCount : 0;
  const hasActionItems = /\b(action|next step|follow up|task|meeting|schedule|send|email|call back|document|review)\b/i.test(transcript);
  const discoveryQuestions = Math.min(10, questionCount);
  
  // Generate overall score based on various factors
  let overallScore = 60; // Base score
  
  // Boost for questions (shows engagement)
  if (questionCount > 3) overallScore += 15;
  if (questionCount > 8) overallScore += 10;
  
  // Boost for balanced speakers
  if (speakerCount >= 2) overallScore += 10;
  
  // Boost for action items
  if (hasActionItems) overallScore += 10;
  
  // Boost for good word count
  if (wordCount > 500) overallScore += 5;
  if (wordCount > 2000) overallScore += 5;
  
  overallScore = Math.min(100, Math.max(0, overallScore));
  
  // Generate coaching structure
  const coachingEvaluation = {
    overallScore,
    criteria: {
      talkTimeRatio: Math.round(talkTimeRatio),
      objectionHandling: Math.min(10, Math.round(questionCount / 2)),
      discoveryQuestions,
      valueArticulation: Math.min(10, Math.round(avgWordsPerSpeaker / 50)),
      activeListening: Math.min(10, Math.round(questionCount / 3)),
      nextSteps: hasActionItems,
      rapport: Math.min(10, Math.round(overallScore / 10))
    },
    strengths: generateInstantStrengths(transcript, questionCount, hasActionItems, speakerCount),
    improvements: generateInstantImprovements(transcript, questionCount, hasActionItems, overallScore),
    actionItems: generateInstantActionItems(transcript, hasActionItems),
    summary: generateInstantSummary(overallScore, questionCount, speakerCount, hasActionItems),
    isInstantAnalysis: true,
    generatedAt: new Date().toISOString()
  };
  
  console.log('⚡ Instant coaching complete:', { overallScore, speakers: speakerCount, questions: questionCount });
  return coachingEvaluation;
}

// Generate instant strengths based on transcript analysis
function generateInstantStrengths(transcript: string, questionCount: number, hasActionItems: boolean, speakerCount: number): string[] {
  const strengths = [];
  
  if (questionCount > 5) strengths.push("Good use of discovery questions to understand needs");
  if (hasActionItems) strengths.push("Clear action items and next steps identified");
  if (speakerCount >= 2) strengths.push("Balanced conversation with multiple participants");
  if (transcript.length > 2000) strengths.push("Comprehensive discussion with detailed information");
  if (/\b(understand|got it|makes sense|exactly|absolutely)\b/i.test(transcript)) {
    strengths.push("Good listening and acknowledgment skills");
  }
  
  // Ensure we always have at least 2 strengths
  if (strengths.length === 0) {
    strengths.push("Recording captured successfully with clear audio");
    strengths.push("Conversation maintained good flow and structure");
  } else if (strengths.length === 1) {
    strengths.push("Professional communication style maintained throughout");
  }
  
  return strengths.slice(0, 3); // Limit to top 3
}

// Generate instant improvements based on analysis
function generateInstantImprovements(transcript: string, questionCount: number, hasActionItems: boolean, overallScore: number): string[] {
  const improvements = [];
  
  if (questionCount < 3) improvements.push("Increase discovery questions to better understand client needs");
  if (!hasActionItems) improvements.push("Establish clear next steps and action items");
  if (overallScore < 70) improvements.push("Focus on more engaging conversation techniques");
  if (transcript.includes("um") || transcript.includes("uh")) {
    improvements.push("Reduce filler words for more professional delivery");
  }
  
  // Ensure we always have suggestions
  if (improvements.length === 0) {
    improvements.push("Continue building on current communication strengths");
    improvements.push("Consider adding more specific follow-up questions");
  } else if (improvements.length === 1) {
    improvements.push("Practice active listening techniques for better engagement");
  }
  
  return improvements.slice(0, 3); // Limit to top 3
}

// Generate instant action items
function generateInstantActionItems(transcript: string, hasActionItems: boolean): string[] {
  if (hasActionItems) {
    return [
      "Follow up on action items discussed in the call",
      "Send summary email with key points and next steps", 
      "Schedule follow-up meeting as appropriate"
    ];
  }
  
  return [
    "Document key discussion points for future reference",
    "Identify potential follow-up opportunities",
    "Review conversation for improvement areas"
  ];
}

// Generate instant summary
function generateInstantSummary(overallScore: number, questionCount: number, speakerCount: number, hasActionItems: boolean): string {
  if (overallScore >= 80) {
    return `Excellent conversation with strong engagement (${questionCount} questions, ${speakerCount} participants). ${hasActionItems ? 'Clear action items established.' : 'Consider adding specific next steps.'}`;
  } else if (overallScore >= 60) {
    return `Good conversation with room for improvement. ${questionCount > 3 ? 'Good use of questions.' : 'Could benefit from more discovery questions.'} ${hasActionItems ? 'Action items identified.' : 'Next steps could be clearer.'}`;
  } else {
    return `Conversation completed with opportunities for enhancement. Focus on increasing engagement through questions and establishing clear next steps for better outcomes.`;
  }
}

// Main analysis function
export function performInstantAnalysis(transcript: string, recordingId: string) {
  console.log('Performing instant analysis...');
  
  return {
    speakers: extractSpeakersFromTranscript(transcript, recordingId),
    topics: extractTopicsFromTranscript(transcript, recordingId),
    moments: extractMomentsFromTranscript(transcript, recordingId),
    coaching: generateInstantCoaching(transcript), // Add instant coaching
    analyzedAt: new Date().toISOString(),
    confidence: 0.8
  };
} 