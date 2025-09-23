/**
 * Title-Based Matching Utility
 * 
 * Provides simple, reliable matching between Excel filenames and recording titles.
 * Replaces complex fuzzy matching with deterministic exact title matching.
 */

import { supabase } from '@/integrations/supabase/client';

export interface TitleMatchResult {
  recordingId: string;
  recordingTitle: string;
  matchConfidence: number; // 1.0 for exact match, 0.0 for no match
  matchType: 'exact_title' | 'no_match';
  filenameWithoutExtension: string;
}

export interface TitleMatchRequest {
  sourceFilename: string; // e.g., "08132025 Jamee Hutchinson to Abigail Rocha.xlsx"
  userId?: string; // Optional: filter by user
}

/**
 * Extract filename without extension for title matching
 */
export function extractFilenameWithoutExtension(filename: string): string {
  return filename.replace(/\.(xlsx|xls|csv)$/i, '').trim();
}

/**
 * Normalize title for consistent matching
 */
export function normalizeTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s]/g, ''); // Remove special characters for comparison
}

/**
 * Find recordings that match the Excel filename by title
 */
export async function findRecordingsByTitle(
  request: TitleMatchRequest
): Promise<TitleMatchResult[]> {
  try {
    const filenameWithoutExtension = extractFilenameWithoutExtension(request.sourceFilename);
    const normalizedFilename = normalizeTitle(filenameWithoutExtension);

    console.log('🔍 Searching for recordings with title matching:', {
      sourceFilename: request.sourceFilename,
      filenameWithoutExtension,
      normalizedFilename
    });

    // Build query with optional user filter
    let query = supabase
      .from('recordings')
      .select('id, title, user_id, created_at, duration, transcript')
      .not('transcript', 'is', null); // Only match recordings with transcripts

    // Add user filter if specified
    if (request.userId) {
      query = query.eq('user_id', request.userId);
    }

    const { data: recordings, error } = await query
      .order('created_at', { ascending: false })
      .limit(100); // Reasonable limit for performance

    if (error) {
      console.error('❌ Error querying recordings:', error);
      throw error;
    }

    if (!recordings || recordings.length === 0) {
      console.log('📭 No recordings found for title matching');
      return [];
    }

    const matches: TitleMatchResult[] = [];

    // Check each recording for exact title match
    for (const recording of recordings) {
      const normalizedRecordingTitle = normalizeTitle(recording.title);
      
      // Exact match check
      if (normalizedRecordingTitle === normalizedFilename) {
        matches.push({
          recordingId: recording.id,
          recordingTitle: recording.title,
          matchConfidence: 1.0,
          matchType: 'exact_title',
          filenameWithoutExtension
        });

        console.log('✅ Found exact title match:', {
          recordingId: recording.id,
          recordingTitle: recording.title,
          filename: request.sourceFilename
        });
      }
    }

    if (matches.length === 0) {
      console.log('🔍 No exact title matches found for:', filenameWithoutExtension);
    }

    return matches;

  } catch (error) {
    console.error('❌ Error in title-based matching:', error);
    throw error;
  }
}

/**
 * Find single best recording match for a filename
 */
export async function findBestRecordingMatch(
  request: TitleMatchRequest
): Promise<TitleMatchResult | null> {
  const matches = await findRecordingsByTitle(request);
  
  if (matches.length === 0) {
    return null;
  }

  // Return the first exact match (they should all be equivalent)
  return matches[0];
}

/**
 * Validate if a filename and recording title would match
 */
export function validateTitleMatch(filename: string, recordingTitle: string): boolean {
  const normalizedFilename = normalizeTitle(extractFilenameWithoutExtension(filename));
  const normalizedTitle = normalizeTitle(recordingTitle);
  
  return normalizedFilename === normalizedTitle;
}

/**
 * Get match preview for UI display
 */
export async function getMatchPreview(
  filename: string,
  userId?: string
): Promise<{
  filenameWithoutExtension: string;
  potentialMatches: Array<{
    recordingId: string;
    recordingTitle: string;
    isExactMatch: boolean;
    createdAt: string;
  }>;
  exactMatchCount: number;
}> {
  try {
    const filenameWithoutExtension = extractFilenameWithoutExtension(filename);
    const matches = await findRecordingsByTitle({ 
      sourceFilename: filename, 
      userId 
    });

    const potentialMatches = matches.map(match => ({
      recordingId: match.recordingId,
      recordingTitle: match.recordingTitle,
      isExactMatch: match.matchType === 'exact_title',
      createdAt: new Date().toISOString() // Would need to get from recording data
    }));

    return {
      filenameWithoutExtension,
      potentialMatches,
      exactMatchCount: matches.filter(m => m.matchType === 'exact_title').length
    };

  } catch (error) {
    console.error('❌ Error getting match preview:', error);
    return {
      filenameWithoutExtension: extractFilenameWithoutExtension(filename),
      potentialMatches: [],
      exactMatchCount: 0
    };
  }
}

/**
 * Batch match multiple filenames to recordings
 */
export async function batchMatchTitles(
  filenames: string[],
  userId?: string
): Promise<Map<string, TitleMatchResult[]>> {
  const results = new Map<string, TitleMatchResult[]>();

  for (const filename of filenames) {
    try {
      const matches = await findRecordingsByTitle({
        sourceFilename: filename,
        userId
      });
      results.set(filename, matches);
    } catch (error) {
      console.error(`❌ Error matching filename ${filename}:`, error);
      results.set(filename, []);
    }
  }

  return results;
}

/**
 * Statistics for title matching accuracy
 */
export async function getTitleMatchingStats(userId?: string): Promise<{
  totalRecordings: number;
  recordingsWithTranscripts: number;
  avgTitleLength: number;
  uniqueTitleCount: number;
  duplicateTitleCount: number;
}> {
  try {
    let query = supabase
      .from('recordings')
      .select('title, transcript');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: recordings, error } = await query;

    if (error) throw error;

    const totalRecordings = recordings?.length || 0;
    const recordingsWithTranscripts = recordings?.filter(r => r.transcript).length || 0;
    
    const titles = recordings?.map(r => r.title) || [];
    const avgTitleLength = titles.length > 0 
      ? titles.reduce((sum, title) => sum + title.length, 0) / titles.length 
      : 0;

    const uniqueTitles = new Set(titles);
    const uniqueTitleCount = uniqueTitles.size;
    const duplicateTitleCount = totalRecordings - uniqueTitleCount;

    return {
      totalRecordings,
      recordingsWithTranscripts,
      avgTitleLength: Math.round(avgTitleLength),
      uniqueTitleCount,
      duplicateTitleCount
    };

  } catch (error) {
    console.error('❌ Error getting title matching stats:', error);
    return {
      totalRecordings: 0,
      recordingsWithTranscripts: 0,
      avgTitleLength: 0,
      uniqueTitleCount: 0,
      duplicateTitleCount: 0
    };
  }
}