/**
 * Call Matching Algorithm for BDR Training Integration
 * 
 * Matches Excel scorecard entries with existing recordings in the system
 * Uses fuzzy matching, date proximity, and duration similarity for accurate matching
 */

import { NormalizedScorecardData } from './scorecardValidator';

// Recording data structure from database
export interface RecordingData {
  id: string;
  title: string;
  user_id: string;
  call_date?: string | null;
  created_at: string;
  duration_seconds?: number | null;
  transcript?: string | null;
  ai_summary?: string | null;
  coaching_evaluation?: any | null;
  metadata?: Record<string, any> | null;
}

// Match result structure
export interface CallMatchResult {
  scorecardEntry: NormalizedScorecardData;
  matchedRecording: RecordingData | null;
  confidence: number; // 0.0 to 1.0
  matchCriteria: MatchCriteria[];
  alternativeMatches: AlternativeMatch[];
  requiresManualReview: boolean;
  matchReason: string;
}

// Individual match criteria
export interface MatchCriteria {
  type: 'exact_id' | 'fuzzy_title' | 'date_proximity' | 'duration_similarity' | 'user_context' | 'content_similarity';
  matched: boolean;
  confidence: number;
  details: string;
  weight: number;
}

// Alternative match suggestion
export interface AlternativeMatch {
  recording: RecordingData;
  confidence: number;
  reason: string;
  matchCriteria: MatchCriteria[];
}

// Matching configuration
export interface MatchingConfig {
  confidenceThreshold: number; // Minimum confidence for auto-match
  manualReviewThreshold: number; // Below this requires manual review
  fuzzyMatchThreshold: number; // String similarity threshold
  dateTolerance: number; // Days tolerance for date matching
  durationTolerance: number; // Percentage tolerance for duration
  maxAlternatives: number; // Maximum alternative matches to suggest
  weights: MatchingWeights;
  enableContentMatching: boolean;
  strictUserMatching: boolean; // Only match recordings from same user
}

// Weighting for different matching criteria
export interface MatchingWeights {
  exactId: number;
  fuzzyTitle: number;
  dateProximity: number;
  durationSimilarity: number;
  userContext: number;
  contentSimilarity: number;
}

// Default matching configuration
export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  confidenceThreshold: 0.8,
  manualReviewThreshold: 0.6,
  fuzzyMatchThreshold: 0.7,
  dateTolerance: 3, // 3 days
  durationTolerance: 0.2, // 20%
  maxAlternatives: 3,
  weights: {
    exactId: 1.0,
    fuzzyTitle: 0.8,
    dateProximity: 0.6,
    durationSimilarity: 0.4,
    userContext: 0.3,
    contentSimilarity: 0.7
  },
  enableContentMatching: true,
  strictUserMatching: false
};

// Batch matching result
export interface BatchMatchResult {
  matches: CallMatchResult[];
  summary: MatchingSummary;
  unmatched: NormalizedScorecardData[];
  requiresReview: CallMatchResult[];
}

export interface MatchingSummary {
  totalEntries: number;
  exactMatches: number;
  fuzzyMatches: number;
  unmatchedEntries: number;
  requiresManualReview: number;
  averageConfidence: number;
  processingTimeMs: number;
}

/**
 * Main function to match scorecard entries with recordings
 */
export async function matchCallsToRecordings(
  scorecardEntries: NormalizedScorecardData[],
  recordings: RecordingData[],
  userId?: string,
  config: Partial<MatchingConfig> = {}
): Promise<BatchMatchResult> {
  const startTime = Date.now();
  const matchConfig = { ...DEFAULT_MATCHING_CONFIG, ...config };
  
  const matches: CallMatchResult[] = [];
  const unmatched: NormalizedScorecardData[] = [];
  const requiresReview: CallMatchResult[] = [];
  
  // Filter recordings by user if specified
  let candidateRecordings = recordings;
  if (userId && matchConfig.strictUserMatching) {
    candidateRecordings = recordings.filter(r => r.user_id === userId);
  }

  // Create index for faster lookups
  const recordingIndex = createRecordingIndex(candidateRecordings);

  for (const entry of scorecardEntries) {
    try {
      const matchResult = await findBestMatch(entry, candidateRecordings, recordingIndex, matchConfig);
      
      if (matchResult.matchedRecording) {
        if (matchResult.confidence >= matchConfig.confidenceThreshold) {
          matches.push(matchResult);
        } else if (matchResult.confidence >= matchConfig.manualReviewThreshold) {
          requiresReview.push(matchResult);
        } else {
          unmatched.push(entry);
        }
      } else {
        unmatched.push(entry);
      }
    } catch (error) {
      console.error(`Error matching call ${entry.callIdentifier}:`, error);
      unmatched.push(entry);
    }
  }

  const processingTime = Date.now() - startTime;
  
  // Calculate summary statistics
  const summary: MatchingSummary = {
    totalEntries: scorecardEntries.length,
    exactMatches: matches.filter(m => m.matchCriteria.some(c => c.type === 'exact_id' && c.matched)).length,
    fuzzyMatches: matches.filter(m => !m.matchCriteria.some(c => c.type === 'exact_id' && c.matched)).length,
    unmatchedEntries: unmatched.length,
    requiresManualReview: requiresReview.length,
    averageConfidence: matches.length > 0 ? 
      matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length : 0,
    processingTimeMs: processingTime
  };

  return {
    matches,
    summary,
    unmatched,
    requiresReview
  };
}

/**
 * Find the best match for a single scorecard entry
 */
async function findBestMatch(
  entry: NormalizedScorecardData,
  recordings: RecordingData[],
  recordingIndex: RecordingIndex,
  config: MatchingConfig
): Promise<CallMatchResult> {
  let bestMatch: RecordingData | null = null;
  let bestConfidence = 0;
  let bestCriteria: MatchCriteria[] = [];
  const alternatives: AlternativeMatch[] = [];

  // Step 1: Try exact ID match first (highest priority)
  const exactMatch = findExactIdMatch(entry, recordingIndex);
  if (exactMatch) {
    const criteria = evaluateMatchCriteria(entry, exactMatch, config);
    const confidence = calculateMatchConfidence(criteria, config);
    
    return {
      scorecardEntry: entry,
      matchedRecording: exactMatch,
      confidence,
      matchCriteria: criteria,
      alternativeMatches: [],
      requiresManualReview: false,
      matchReason: 'Exact ID match found'
    };
  }

  // Step 2: Fuzzy matching with all recordings
  const candidateMatches: Array<{ recording: RecordingData; criteria: MatchCriteria[]; confidence: number }> = [];

  for (const recording of recordings) {
    const criteria = evaluateMatchCriteria(entry, recording, config);
    const confidence = calculateMatchConfidence(criteria, config);
    
    if (confidence > 0.1) { // Only consider if there's some similarity
      candidateMatches.push({ recording, criteria, confidence });
    }
  }

  // Sort by confidence
  candidateMatches.sort((a, b) => b.confidence - a.confidence);

  // Select best match and alternatives
  if (candidateMatches.length > 0) {
    const best = candidateMatches[0];
    bestMatch = best.recording;
    bestConfidence = best.confidence;
    bestCriteria = best.criteria;

    // Get alternative matches
    for (let i = 1; i < Math.min(candidateMatches.length, config.maxAlternatives + 1); i++) {
      const alt = candidateMatches[i];
      alternatives.push({
        recording: alt.recording,
        confidence: alt.confidence,
        reason: generateMatchReason(alt.criteria),
        matchCriteria: alt.criteria
      });
    }
  }

  const requiresManualReview = bestConfidence < config.confidenceThreshold && bestConfidence >= config.manualReviewThreshold;
  const matchReason = bestMatch ? generateMatchReason(bestCriteria) : 'No suitable match found';

  return {
    scorecardEntry: entry,
    matchedRecording: bestMatch,
    confidence: bestConfidence,
    matchCriteria: bestCriteria,
    alternativeMatches: alternatives,
    requiresManualReview,
    matchReason
  };
}

/**
 * Create index for faster recording lookups
 */
interface RecordingIndex {
  byId: Map<string, RecordingData>;
  byTitle: Map<string, RecordingData[]>;
  byDate: Map<string, RecordingData[]>;
  all: RecordingData[];
}

function createRecordingIndex(recordings: RecordingData[]): RecordingIndex {
  const byId = new Map<string, RecordingData>();
  const byTitle = new Map<string, RecordingData[]>();
  const byDate = new Map<string, RecordingData[]>();

  for (const recording of recordings) {
    // Index by ID fragments
    const titleParts = extractIdFromTitle(recording.title);
    for (const part of titleParts) {
      byId.set(part.toLowerCase(), recording);
    }

    // Index by normalized title
    const normalizedTitle = normalizeTitle(recording.title);
    if (!byTitle.has(normalizedTitle)) {
      byTitle.set(normalizedTitle, []);
    }
    byTitle.get(normalizedTitle)!.push(recording);

    // Index by date
    const dateKey = extractDateKey(recording.call_date || recording.created_at);
    if (dateKey) {
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, []);
      }
      byDate.get(dateKey)!.push(recording);
    }
  }

  return { byId, byTitle, byDate, all: recordings };
}

/**
 * Find exact ID match using index
 */
function findExactIdMatch(entry: NormalizedScorecardData, index: RecordingIndex): RecordingData | null {
  const callId = entry.callIdentifier.toLowerCase().trim();
  
  // Direct lookup
  if (index.byId.has(callId)) {
    return index.byId.get(callId)!;
  }

  // Try variations
  const variations = generateIdVariations(callId);
  for (const variation of variations) {
    if (index.byId.has(variation)) {
      return index.byId.get(variation)!;
    }
  }

  return null;
}

/**
 * Evaluate all matching criteria for a recording
 */
function evaluateMatchCriteria(
  entry: NormalizedScorecardData,
  recording: RecordingData,
  config: MatchingConfig
): MatchCriteria[] {
  const criteria: MatchCriteria[] = [];

  // 1. Exact ID match
  const exactIdMatch = checkExactIdMatch(entry.callIdentifier, recording.title);
  criteria.push({
    type: 'exact_id',
    matched: exactIdMatch.matched,
    confidence: exactIdMatch.confidence,
    details: exactIdMatch.details,
    weight: config.weights.exactId
  });

  // 2. Fuzzy title match
  const fuzzyMatch = checkFuzzyTitleMatch(entry.callIdentifier, recording.title, config.fuzzyMatchThreshold);
  criteria.push({
    type: 'fuzzy_title',
    matched: fuzzyMatch.matched,
    confidence: fuzzyMatch.confidence,
    details: fuzzyMatch.details,
    weight: config.weights.fuzzyTitle
  });

  // 3. Date proximity
  const dateMatch = checkDateProximity(entry.callDate, recording.call_date || recording.created_at, config.dateTolerance);
  criteria.push({
    type: 'date_proximity',
    matched: dateMatch.matched,
    confidence: dateMatch.confidence,
    details: dateMatch.details,
    weight: config.weights.dateProximity
  });

  // 4. Duration similarity
  const durationMatch = checkDurationSimilarity(entry.durationMinutes, recording.duration_seconds, config.durationTolerance);
  criteria.push({
    type: 'duration_similarity',
    matched: durationMatch.matched,
    confidence: durationMatch.confidence,
    details: durationMatch.details,
    weight: config.weights.durationSimilarity
  });

  // 5. Content similarity (if enabled and transcript available)
  if (config.enableContentMatching && recording.transcript) {
    const contentMatch = checkContentSimilarity(entry, recording);
    criteria.push({
      type: 'content_similarity',
      matched: contentMatch.matched,
      confidence: contentMatch.confidence,
      details: contentMatch.details,
      weight: config.weights.contentSimilarity
    });
  }

  return criteria;
}

/**
 * Calculate overall match confidence from criteria
 */
function calculateMatchConfidence(criteria: MatchCriteria[], config: MatchingConfig): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const criterion of criteria) {
    if (criterion.matched) {
      weightedSum += criterion.confidence * criterion.weight;
      totalWeight += criterion.weight;
    }
  }

  return totalWeight > 0 ? Math.min(weightedSum / totalWeight, 1.0) : 0;
}

/**
 * Check for exact ID match in recording title
 */
function checkExactIdMatch(callId: string, recordingTitle: string): { matched: boolean; confidence: number; details: string } {
  const normalizedCallId = callId.toLowerCase().trim();
  const titleIds = extractIdFromTitle(recordingTitle);
  
  for (const titleId of titleIds) {
    if (titleId.toLowerCase() === normalizedCallId) {
      return {
        matched: true,
        confidence: 1.0,
        details: `Exact match found: "${titleId}" in "${recordingTitle}"`
      };
    }
  }

  return {
    matched: false,
    confidence: 0,
    details: 'No exact ID match found'
  };
}

/**
 * Check fuzzy title matching using string similarity
 */
function checkFuzzyTitleMatch(callId: string, recordingTitle: string, threshold: number): { matched: boolean; confidence: number; details: string } {
  const similarity = calculateStringSimilarity(callId, recordingTitle);
  const matched = similarity >= threshold;
  
  return {
    matched,
    confidence: similarity,
    details: `String similarity: ${(similarity * 100).toFixed(1)}% (threshold: ${(threshold * 100)}%)`
  };
}

/**
 * Check date proximity between call date and recording date
 */
function checkDateProximity(callDate: Date | null, recordingDate: string, toleranceDays: number): { matched: boolean; confidence: number; details: string } {
  if (!callDate || !recordingDate) {
    return {
      matched: false,
      confidence: 0,
      details: 'Missing date information'
    };
  }

  const recDate = new Date(recordingDate);
  if (isNaN(recDate.getTime())) {
    return {
      matched: false,
      confidence: 0,
      details: 'Invalid recording date format'
    };
  }

  const diffDays = Math.abs((callDate.getTime() - recDate.getTime()) / (24 * 60 * 60 * 1000));
  const matched = diffDays <= toleranceDays;
  const confidence = matched ? Math.max(0, 1 - (diffDays / toleranceDays)) : 0;

  return {
    matched,
    confidence,
    details: `Date difference: ${diffDays.toFixed(1)} days (tolerance: ${toleranceDays} days)`
  };
}

/**
 * Check duration similarity between call and recording
 */
function checkDurationSimilarity(callMinutes: number | null, recordingSeconds: number | null, tolerancePercent: number): { matched: boolean; confidence: number; details: string } {
  if (!callMinutes || !recordingSeconds) {
    return {
      matched: false,
      confidence: 0,
      details: 'Missing duration information'
    };
  }

  const recordingMinutes = recordingSeconds / 60;
  const diffPercent = Math.abs(callMinutes - recordingMinutes) / Math.max(callMinutes, recordingMinutes);
  const matched = diffPercent <= tolerancePercent;
  const confidence = matched ? Math.max(0, 1 - (diffPercent / tolerancePercent)) : 0;

  return {
    matched,
    confidence,
    details: `Duration difference: ${(diffPercent * 100).toFixed(1)}% (tolerance: ${(tolerancePercent * 100)}%)`
  };
}

/**
 * Check content similarity using transcript analysis
 */
function checkContentSimilarity(entry: NormalizedScorecardData, recording: RecordingData): { matched: boolean; confidence: number; details: string } {
  if (!recording.transcript || !entry.managerNotes) {
    return {
      matched: false,
      confidence: 0,
      details: 'Missing content for comparison'
    };
  }

  // Simple keyword matching - could be enhanced with more sophisticated NLP
  const notes = entry.managerNotes.toLowerCase();
  const transcript = recording.transcript.toLowerCase();
  
  const keywords = extractKeywords(notes);
  const matchedKeywords = keywords.filter(keyword => transcript.includes(keyword));
  
  const similarity = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;
  const matched = similarity > 0.3; // 30% keyword overlap

  return {
    matched,
    confidence: similarity,
    details: `Content similarity: ${(similarity * 100).toFixed(1)}% (${matchedKeywords.length}/${keywords.length} keywords)`
  };
}

/**
 * Utility functions
 */

function extractIdFromTitle(title: string): string[] {
  const ids: string[] = [];
  
  // Common ID patterns: CALL_001, Call-123, Meeting_456, etc.
  const patterns = [
    /\b(CALL[_\-]?\w+)\b/gi,
    /\b(Meeting[_\-]?\w+)\b/gi,
    /\b([A-Z]{2,}[_\-]?\d+)\b/g,
    /\b(\w+[_\-]\d+)\b/g,
    /\b(\d{3,})\b/g // Simple numbers
  ];

  for (const pattern of patterns) {
    const matches = title.match(pattern);
    if (matches) {
      ids.push(...matches);
    }
  }

  return [...new Set(ids)]; // Remove duplicates
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function extractDateKey(dateString: string): string | null {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
}

function generateIdVariations(id: string): string[] {
  const variations = [id];
  
  // Add variations with different separators
  variations.push(id.replace(/[-_]/g, ''));
  variations.push(id.replace(/[-_]/g, '_'));
  variations.push(id.replace(/[-_]/g, '-'));
  
  return [...new Set(variations)];
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction - remove common words and extract meaningful terms
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must']);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.has(word))
    .slice(0, 10); // Limit to top 10 keywords
}

function generateMatchReason(criteria: MatchCriteria[]): string {
  const matchedCriteria = criteria.filter(c => c.matched);
  
  if (matchedCriteria.length === 0) {
    return 'No matching criteria found';
  }

  const bestCriterion = matchedCriteria.reduce((best, current) => 
    current.confidence > best.confidence ? current : best
  );

  const reasonMap = {
    exact_id: 'Exact ID match',
    fuzzy_title: 'Similar title',
    date_proximity: 'Matching date',
    duration_similarity: 'Similar duration',
    user_context: 'Same user',
    content_similarity: 'Similar content'
  };

  return reasonMap[bestCriterion.type] || 'Multiple criteria matched';
}