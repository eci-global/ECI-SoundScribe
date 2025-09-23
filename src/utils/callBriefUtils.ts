import type { Recording } from '@/types/recording';
import { SpeakerResolver } from '@/utils/speakerResolution';

export interface CallBriefData {
  participants: string[];
  keyPoints: string[];
  hasRealData: boolean;
  source: string;
}

/**
 * Extracts participant information from the recording's AI speaker analysis
 */
export function extractParticipants(recording: Recording): { participants: string[]; hasRealData: boolean } {
  // Method 1: Try to get speakers from AI speaker analysis
  if (recording.ai_speaker_analysis) {
    const speakers = SpeakerResolver.resolveActualSpeakers(recording).speakers;
    if (speakers.length > 0) {
      return {
        participants: speakers.map(speaker => speaker.name),
        hasRealData: true
      };
    }
  }

  // Method 2: Try to extract participants from AI summary text
  if (recording.ai_summary) {
    const participantMatches = recording.ai_summary.match(/\*\*Participants?:\*\*\s*([^*\n]+)/i);
    if (participantMatches) {
      const participants = participantMatches[1]
        .split(/[,;]/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
      
      if (participants.length > 0) {
        return {
          participants,
          hasRealData: true
        };
      }
    }
  }

  // Method 3: Try to extract from summary field
  if (recording.summary) {
    const participantMatches = recording.summary.match(/\*\*Participants?:\*\*\s*([^*\n]+)/i);
    if (participantMatches) {
      const participants = participantMatches[1]
        .split(/[,;]/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
      
      if (participants.length > 0) {
        return {
          participants,
          hasRealData: true
        };
      }
    }
  }

  // Method 4: Use speaker count from SpeakerResolver as fallback
  const speakerCount = SpeakerResolver.getSpeakerCount(recording);
  if (speakerCount > 0) {
    const participants = Array.from({ length: speakerCount }, (_, i) => `Speaker ${i + 1}`);
    return {
      participants,
      hasRealData: false
    };
  }

  // Final fallback
  return {
    participants: ['Unknown participants'],
    hasRealData: false
  };
}

/**
 * Extracts key points from the recording's AI summary or insights
 */
export function extractKeyPoints(recording: Recording): { keyPoints: string[]; hasRealData: boolean } {
  // Method 1: Try to extract from AI summary
  if (recording.ai_summary) {
    const keyPoints = parseKeyPointsFromText(recording.ai_summary);
    if (keyPoints.length > 0) {
      return {
        keyPoints,
        hasRealData: true
      };
    }
  }

  // Method 2: Try to extract from AI insights
  if (recording.ai_insights) {
    let insights: any = recording.ai_insights;
    
    // Handle JSON string
    if (typeof insights === 'string') {
      try {
        insights = JSON.parse(insights);
      } catch (e) {
        // Continue to next method
      }
    }

    if (insights && typeof insights === 'object') {
      const keyPoints: string[] = [];
      
      // Extract from keyPoints field
      if (insights.keyPoints && Array.isArray(insights.keyPoints)) {
        keyPoints.push(...insights.keyPoints);
      }

      // Extract from keyTakeaways field
      if (insights.keyTakeaways && Array.isArray(insights.keyTakeaways)) {
        keyPoints.push(...insights.keyTakeaways);
      }

      // Extract from opportunities field
      if (insights.opportunities && Array.isArray(insights.opportunities)) {
        keyPoints.push(...insights.opportunities);
      }

      if (keyPoints.length > 0) {
        return {
          keyPoints: keyPoints.slice(0, 5), // Limit to top 5
          hasRealData: true
        };
      }
    }
  }

  // Method 3: Try to extract from regular summary
  if (recording.summary) {
    const keyPoints = parseKeyPointsFromText(recording.summary);
    if (keyPoints.length > 0) {
      return {
        keyPoints,
        hasRealData: true
      };
    }
  }

  // Method 4: Generate basic key points from transcript if available
  if (recording.transcript) {
    const keyPoints = generateBasicKeyPoints(recording);
    if (keyPoints.length > 0) {
      return {
        keyPoints,
        hasRealData: false
      };
    }
  }

  // Final fallback
  return {
    keyPoints: ['Call analysis pending - key points will be generated automatically'],
    hasRealData: false
  };
}

/**
 * Parses key points from markdown-formatted text
 */
function parseKeyPointsFromText(text: string): string[] {
  const keyPoints: string[] = [];

  // Look for "Key Points:" section
  const keyPointsMatch = text.match(/\*\*Key Points?:\*\*(.*?)(?=\*\*|$)/s);
  if (keyPointsMatch) {
    const points = keyPointsMatch[1]
      .split(/[•\-*]/)
      .map(point => point.trim())
      .filter(point => point.length > 0 && !point.match(/^\d+\.?\s*$/))
      .slice(0, 5);
    
    keyPoints.push(...points);
  }

  // Look for "Summary:" section if no key points found
  if (keyPoints.length === 0) {
    const summaryMatch = text.match(/\*\*Summary:\*\*(.*?)(?=\*\*|$)/s);
    if (summaryMatch) {
      const summary = summaryMatch[1].trim();
      // Split by sentences and take first few
      const sentences = summary.split(/[.!?]/)
        .map(s => s.trim())
        .filter(s => s.length > 20)
        .slice(0, 3);
      
      keyPoints.push(...sentences);
    }
  }

  // Look for bullet points anywhere in text
  if (keyPoints.length === 0) {
    const bulletMatches = text.match(/[•\-*]\s*([^•\-*\n]+)/g);
    if (bulletMatches) {
      const points = bulletMatches
        .map(match => match.replace(/^[•\-*]\s*/, '').trim())
        .filter(point => point.length > 10)
        .slice(0, 5);
      
      keyPoints.push(...points);
    }
  }

  return keyPoints;
}

/**
 * Generates basic key points from transcript content
 */
function generateBasicKeyPoints(recording: Recording): string[] {
  if (!recording.transcript) return [];

  const keyPoints: string[] = [];
  const transcript = recording.transcript;

  // Check for common business terms
  const businessTerms = ['meeting', 'project', 'deadline', 'budget', 'proposal', 'contract', 'deal', 'client'];
  const foundTerms = businessTerms.filter(term => 
    transcript.toLowerCase().includes(term.toLowerCase())
  );

  if (foundTerms.length > 0) {
    keyPoints.push(`Discussion covered ${foundTerms.slice(0, 3).join(', ')} topics`);
  }

  // Check for questions
  const questionCount = (transcript.match(/\?/g) || []).length;
  if (questionCount > 0) {
    keyPoints.push(`${questionCount} questions were asked during the conversation`);
  }

  // Check for action-oriented language
  const actionWords = ['will', 'should', 'need to', 'have to', 'plan to', 'going to'];
  const hasActionItems = actionWords.some(word => 
    transcript.toLowerCase().includes(word.toLowerCase())
  );

  if (hasActionItems) {
    keyPoints.push('Action items and next steps were discussed');
  }

  // Basic call structure
  const duration = recording.duration || 0;
  if (duration > 0) {
    keyPoints.push(`${Math.round(duration / 60)} minute conversation with detailed discussion`);
  }

  return keyPoints.slice(0, 3);
}

/**
 * Extracts complete call brief data from recording
 */
export function extractCallBrief(recording: Recording): CallBriefData {
  const { participants, hasRealData: hasRealParticipants } = extractParticipants(recording);
  const { keyPoints, hasRealData: hasRealKeyPoints } = extractKeyPoints(recording);

  return {
    participants,
    keyPoints,
    hasRealData: hasRealParticipants || hasRealKeyPoints,
    source: hasRealParticipants && hasRealKeyPoints ? 'AI Analysis' : 
            hasRealParticipants || hasRealKeyPoints ? 'Partial AI Analysis' : 
            'Basic Analysis'
  };
}