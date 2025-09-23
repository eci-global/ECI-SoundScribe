/**
 * Duration Debug Utility
 * 
 * Helps trace and debug duration extraction and storage issues
 */

import { supabase } from '@/integrations/supabase/client';
import { extractMediaDuration } from './mediaDuration';

export interface DurationDebugResult {
  step: string;
  value: number | null;
  success: boolean;
  error?: string;
  method?: string;
  timestamp: string;
}

/**
 * Comprehensive duration debugging for a file
 */
export async function debugDurationFlow(file: File): Promise<{
  results: DurationDebugResult[];
  summary: {
    extractedDuration: number | null;
    finalStoredDuration: number | null;
    hasIssues: boolean;
    recommendations: string[];
  };
}> {
  const results: DurationDebugResult[] = [];
  const recommendations: string[] = [];
  
  console.log(`🔍 Starting comprehensive duration debug for: ${file.name}`);
  
  // Step 1: Client-side extraction
  results.push({
    step: 'file_validation',
    value: null,
    success: true,
    timestamp: new Date().toISOString()
  });
  
  console.log(`📋 File details: ${file.name}, ${file.type}, ${(file.size / 1024 / 1024).toFixed(1)}MB`);
  
  // Step 2: Extract duration using our utility
  let extractedDuration: number | null = null;
  try {
    const extractionResult = await extractMediaDuration(file);
    extractedDuration = extractionResult.duration;
    
    results.push({
      step: 'client_extraction',
      value: extractedDuration,
      success: extractionResult.success,
      error: extractionResult.error,
      method: extractionResult.method,
      timestamp: new Date().toISOString()
    });
    
    console.log(`🎵 Extracted duration: ${extractedDuration}s using ${extractionResult.method}`);
    
    if (!extractionResult.success) {
      recommendations.push(`Client extraction failed: ${extractionResult.error}`);
    } else if (extractedDuration === 11) {
      recommendations.push('⚠️ Extracted 11 seconds - this may be the issue we\'re investigating');
    }
  } catch (error) {
    results.push({
      step: 'client_extraction',
      value: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown extraction error',
      timestamp: new Date().toISOString()
    });
    
    recommendations.push('Client extraction threw an exception');
  }
  
  // Step 3: Test what would be stored in database
  const mockRecordingData = {
    user_id: 'test-user-id',
    title: `Debug Test - ${file.name}`,
    description: 'Duration debug test',
    file_url: 'test://url',
    file_type: file.type.startsWith('video/') ? 'video' as const : 'audio' as const,
    file_size: file.size,
    status: 'processing' as const,
    duration: extractedDuration, // This is what would be stored
  };
  
  results.push({
    step: 'database_preparation',
    value: extractedDuration,
    success: true,
    timestamp: new Date().toISOString()
  });
  
  console.log(`💾 Would store in database: duration = ${extractedDuration}`);
  
  // Step 4: Check for suspicious patterns
  if (extractedDuration === 11) {
    results.push({
      step: 'suspicious_detection',
      value: 11,
      success: false,
      error: 'Detected problematic 11-second duration',
      timestamp: new Date().toISOString()
    });
    
    recommendations.push('🚨 Found the 11-second issue! Duration extraction is returning 11 seconds.');
    recommendations.push('Check if this file actually has an 11-second duration or if extraction is failing.');
  } else if (extractedDuration && extractedDuration < 15) {
    recommendations.push(`Duration is ${extractedDuration}s - if this seems too short, there may be an extraction issue`);
  }
  
  // Step 5: Format for display
  const displayDuration = extractedDuration ? `${Math.floor(extractedDuration / 60)}:${(extractedDuration % 60).toString().padStart(2, '0')}` : '—';
  
  results.push({
    step: 'ui_formatting',
    value: extractedDuration,
    success: true,
    method: `Formatted as: ${displayDuration}`,
    timestamp: new Date().toISOString()
  });
  
  console.log(`🎨 UI would display: ${displayDuration}`);
  
  const hasIssues = results.some(r => !r.success) || extractedDuration === 11;
  
  if (hasIssues) {
    recommendations.push('Run this debug on a known good file to compare results');
    recommendations.push('Check browser developer tools for additional error messages');
  }
  
  return {
    results,
    summary: {
      extractedDuration,
      finalStoredDuration: extractedDuration,
      hasIssues,
      recommendations
    }
  };
}

/**
 * Query recent recordings from database to check stored duration values
 */
export async function queryStoredDurations(limit: number = 10): Promise<{
  recordings: Array<{
    id: string;
    title: string;
    duration: number | null;
    created_at: string;
    file_size: number;
    status: string;
  }>;
  analysis: {
    totalRecordings: number;
    withDuration: number;
    withoutDuration: number;
    elevenSecondCount: number;
    averageDuration: number | null;
    suspiciousPatterns: string[];
  };
}> {
  try {
    console.log(`🔍 Querying ${limit} most recent recordings from database...`);
    
    const { data: recordings, error } = await supabase
      .from('recordings')
      .select('id, title, duration, created_at, file_size, status')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw error;
    }
    
    const totalRecordings = recordings?.length || 0;
    const withDuration = recordings?.filter(r => r.duration !== null).length || 0;
    const withoutDuration = totalRecordings - withDuration;
    const elevenSecondCount = recordings?.filter(r => r.duration === 11).length || 0;
    
    const durationsOnly = recordings?.map(r => r.duration).filter(d => d !== null) as number[];
    const averageDuration = durationsOnly.length > 0 
      ? durationsOnly.reduce((sum, d) => sum + d, 0) / durationsOnly.length 
      : null;
    
    const suspiciousPatterns: string[] = [];
    
    if (elevenSecondCount > 0) {
      suspiciousPatterns.push(`${elevenSecondCount} recordings with exactly 11 seconds duration`);
    }
    
    const nineSecondCount = recordings?.filter(r => r.duration === 9).length || 0;
    if (nineSecondCount > 0) {
      suspiciousPatterns.push(`${nineSecondCount} recordings with 9-second bug`);
    }
    
    const nullCount = recordings?.filter(r => r.duration === null).length || 0;
    if (nullCount > 0) {
      suspiciousPatterns.push(`${nullCount} recordings with null duration`);
    }
    
    console.log(`📊 Database analysis: ${totalRecordings} total, ${withDuration} with duration, ${elevenSecondCount} with 11s`);
    
    return {
      recordings: recordings || [],
      analysis: {
        totalRecordings,
        withDuration,
        withoutDuration,
        elevenSecondCount,
        averageDuration,
        suspiciousPatterns
      }
    };
  } catch (error) {
    console.error('❌ Failed to query database:', error);
    throw error;
  }
}

/**
 * Test duration extraction on a specific audio blob
 */
export async function testDurationExtraction(audioBlob: Blob, filename: string = 'test-audio'): Promise<DurationDebugResult[]> {
  const results: DurationDebugResult[] = [];
  
  console.log(`🧪 Testing duration extraction on blob: ${(audioBlob.size / 1024 / 1024).toFixed(1)}MB`);
  
  // Convert blob to file
  const file = new File([audioBlob], filename, { type: audioBlob.type });
  
  try {
    const debugResult = await debugDurationFlow(file);
    return debugResult.results;
  } catch (error) {
    results.push({
      step: 'test_extraction',
      value: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown test error',
      timestamp: new Date().toISOString()
    });
    
    return results;
  }
}

/**
 * Create test audio file for debugging
 */
export function createTestAudioFile(durationSeconds: number = 30): File {
  // Create a simple sine wave audio file
  const sampleRate = 44100;
  const samples = sampleRate * durationSeconds;
  const buffer = new ArrayBuffer(samples * 2);
  const view = new DataView(buffer);
  
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.3; // 440Hz tone
    const intSample = Math.round(sample * 32767);
    view.setInt16(i * 2, intSample, true);
  }
  
  const audioBlob = new Blob([buffer], { type: 'audio/wav' });
  return new File([audioBlob], `test-${durationSeconds}s.wav`, { type: 'audio/wav' });
}

/**
 * Generate comprehensive debug report
 */
export async function generateDebugReport(): Promise<string> {
  console.log('📋 Generating comprehensive duration debug report...');
  
  const report: string[] = [];
  report.push('# Duration Debug Report');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push('');
  
  try {
    // Query database
    const dbResults = await queryStoredDurations(20);
    
    report.push('## Database Analysis');
    report.push(`- Total recordings: ${dbResults.analysis.totalRecordings}`);
    report.push(`- With duration: ${dbResults.analysis.withDuration}`);
    report.push(`- Without duration: ${dbResults.analysis.withoutDuration}`);
    report.push(`- 11-second count: ${dbResults.analysis.elevenSecondCount}`);
    report.push(`- Average duration: ${dbResults.analysis.averageDuration?.toFixed(1)}s`);
    
    if (dbResults.analysis.suspiciousPatterns.length > 0) {
      report.push('');
      report.push('### Suspicious Patterns:');
      dbResults.analysis.suspiciousPatterns.forEach(pattern => {
        report.push(`- ${pattern}`);
      });
    }
    
    report.push('');
    report.push('## Recent Recordings');
    dbResults.recordings.forEach(rec => {
      const duration = rec.duration ? `${rec.duration}s` : 'null';
      const size = (rec.file_size / 1024 / 1024).toFixed(1);
      report.push(`- ${rec.title}: ${duration} (${size}MB, ${rec.status})`);
    });
    
  } catch (error) {
    report.push('## Database Query Failed');
    report.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Test with synthetic audio
  try {
    report.push('');
    report.push('## Test Audio Extraction');
    
    const testFile = createTestAudioFile(30);
    const testResults = await debugDurationFlow(testFile);
    
    report.push(`- Test file: ${testFile.name} (${testFile.type})`);
    report.push(`- Extracted duration: ${testResults.summary.extractedDuration}s`);
    report.push(`- Has issues: ${testResults.summary.hasIssues}`);
    
    if (testResults.summary.recommendations.length > 0) {
      report.push('- Recommendations:');
      testResults.summary.recommendations.forEach(rec => {
        report.push(`  - ${rec}`);
      });
    }
    
  } catch (error) {
    report.push('## Test Audio Failed');
    report.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  const fullReport = report.join('\n');
  console.log('✅ Debug report generated');
  return fullReport;
}