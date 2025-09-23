import { AnalysisSentimentMoment } from '@/types/sentimentAnalysis';
import { 
  deduplicateMoments, 
  filterHighQualityMoments, 
  validateSentimentData,
  selectBestMoments
} from './sentiment';

// Convert ai_moments from database to AnalysisSentimentMoment format with quality control
export const convertAiMomentsToSentiment = (aiMoments: any[], duration: number = 300): AnalysisSentimentMoment[] => {
  // Initial conversion
  const rawMoments = aiMoments.map(moment => ({
    id: moment.id,
    recording_id: moment.recording_id,
    start_time: moment.start_time,
    end_time: moment.end_time || moment.start_time + 5,
    sentiment: determineSentimentFromType(moment.type, moment.metadata),
    confidence: extractConfidence(moment.metadata),
    text: extractBestText(moment),
    speaker: extractSpeaker(moment.metadata),
    intensity: extractIntensity(moment.metadata, moment.type),
    created_at: moment.created_at || new Date().toISOString()
  }));

  // Apply quality control pipeline
  const { valid: validMoments } = validateSentimentData(rawMoments);
  const highQualityMoments = filterHighQualityMoments(validMoments, 50); // Lower threshold for more moments
  const deduplicatedMoments = deduplicateMoments(highQualityMoments);
  const bestMoments = selectBestMoments(deduplicatedMoments, 8, duration);

  console.log(`Sentiment conversion: ${aiMoments.length} raw → ${validMoments.length} valid → ${highQualityMoments.length} high quality → ${deduplicatedMoments.length} deduplicated → ${bestMoments.length} final`);
  
  return bestMoments;
};

// Improved sentiment determination
function determineSentimentFromType(type: string, metadata: any): 'positive' | 'negative' | 'neutral' {
  // Check metadata for explicit sentiment
  if (metadata?.sentiment) {
    return metadata.sentiment;
  }
  
  // Check sentiment_score for numeric values
  if (metadata?.sentiment_score !== undefined) {
    const score = metadata.sentiment_score;
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  }
  
  // Fallback to type-based detection
  switch (type) {
    case 'positive_peak':
    case 'positive_moment':
    case 'excitement':
    case 'agreement':
      return 'positive';
    case 'negative_dip':
    case 'sentiment_neg':
    case 'objection':
    case 'concern':
      return 'negative';
    default:
      return 'neutral';
  }
}

// Extract confidence with validation
function extractConfidence(metadata: any): number {
  const confidence = metadata?.confidence;
  if (typeof confidence === 'number' && confidence >= 0 && confidence <= 1) {
    return confidence;
  }
  
  // Assign confidence based on source
  const source = metadata?.source;
  switch (source) {
    case 'ai_sentiment_analysis': return 0.9;
    case 'ai_topic_analysis': return 0.7;
    case 'ai_decision_detection': return 0.95;
    case 'ai_objection_detection': return 0.85;
    case 'keyword_detection': return 0.6;
    default: return 0.75;
  }
}

// Extract the best available text
function extractBestText(moment: any): string | null {
  // Priority order: description > label > metadata.text
  if (moment.description && !moment.description.startsWith('AI-identified')) {
    return moment.description;
  }
  
  if (moment.metadata?.text && moment.metadata.text.length > 10) {
    return moment.metadata.text;
  }
  
  if (moment.label && !moment.label.startsWith('Sentiment')) {
    return moment.label;
  }
  
  return moment.description || moment.label || null;
}

// Extract speaker information
function extractSpeaker(metadata: any): string {
  const speaker = metadata?.speaker;
  if (speaker && speaker !== 'Unknown' && speaker.length > 0) {
    return speaker;
  }
  return 'Unknown';
}

// Extract intensity with validation
function extractIntensity(metadata: any, type: string): number {
  const intensity = metadata?.intensity;
  if (typeof intensity === 'number' && intensity >= 0 && intensity <= 1) {
    return intensity;
  }
  
  // Assign intensity based on type
  switch (type) {
    case 'positive_peak':
    case 'negative_dip':
      return 0.8;
    case 'sentiment_neg':
    case 'sentiment_shift':
      return 0.6;
    case 'emotional_moment':
      return 0.5;
    default:
      return 0.5;
  }
}

// Sentiment types that we track from ai_moments
export const SENTIMENT_MOMENT_TYPES = [
  'sentiment_neg', 
  'sentiment_shift', 
  'positive_peak', 
  'negative_dip', 
  'emotional_moment'
];