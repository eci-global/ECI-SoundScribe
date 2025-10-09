// Backfill Employee Participation Records - Create missing records from AI-detected names
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

declare const Deno: { env: { get(key: string): string | undefined } };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  limit?: number;
  dry_run?: boolean;
  target_employee_id?: string;
}

interface BackfillResult {
  recording_id: string;
  employee_name: string;
  matched_employee_id: string | null;
  matched_employee_name: string | null;
  participation_created: boolean;
  reason: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight(req);
  }

  console.log('🔄 Employee participation backfill started');

  try {
    // Parse request
    const requestBody: RequestBody = await req.json().catch(() => ({}));
    const { limit = 50, dry_run = false, target_employee_id } = requestBody;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return createErrorResponse('Supabase configuration missing', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`🔍 Finding recordings that need participation records (limit: ${limit}, dry_run: ${dry_run})`);

    // Find recordings with employee_name but no employee_call_participation records
    let recordingsQuery = supabase
      .from('recordings')
      .select('id, title, employee_name, created_at')
      .not('employee_name', 'is', null)
      .neq('employee_name', '')
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data: recordings, error: recordingsError } = await recordingsQuery;

    if (recordingsError) {
      return createErrorResponse(`Database error: ${recordingsError.message}`, 500);
    }

    if (!recordings || recordings.length === 0) {
      return createSuccessResponse({
        processed: 0,
        results: [],
        summary: { created: 0, skipped: 0, errors: 0, unmatched: 0 }
      });
    }

    console.log(`📋 Found ${recordings.length} recordings with employee names`);

    // Filter out recordings that already have participation records
    const recordingIds = recordings.map(r => r.id);
    const { data: existingParticipation } = await supabase
      .from('employee_call_participation')
      .select('recording_id')
      .in('recording_id', recordingIds);

    const existingRecordingIds = new Set(
      (existingParticipation || []).map(p => p.recording_id)
    );

    const recordingsNeedingBackfill = recordings.filter(
      r => !existingRecordingIds.has(r.id)
    );

    console.log(`🎯 ${recordingsNeedingBackfill.length} recordings need participation records`);

    if (recordingsNeedingBackfill.length === 0) {
      return createSuccessResponse({
        processed: 0,
        results: [],
        summary: { created: 0, skipped: recordings.length, errors: 0, unmatched: 0 }
      });
    }

    // Get all active employees for name matching
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_code')
      .eq('status', 'active');

    if (employeesError) {
      return createErrorResponse(`Failed to fetch employees: ${employeesError.message}`, 500);
    }

    console.log(`👥 Found ${employees?.length || 0} active employees for matching`);

    // Process each recording
    const results: BackfillResult[] = [];
    const summary = { created: 0, skipped: 0, errors: 0, unmatched: 0 };

    for (const recording of recordingsNeedingBackfill) {
      console.log(`🔍 Processing recording: ${recording.id} - "${recording.employee_name}"`);

      try {
        const result = await processRecordingBackfill(
          recording,
          employees || [],
          supabase,
          dry_run
        );

        results.push(result);
        summary[result.participation_created ? 'created' :
                result.matched_employee_id ? 'errors' : 'unmatched']++;

        // Log important actions
        if (result.participation_created) {
          console.log(`✅ Created participation record: ${recording.employee_name} → ${result.matched_employee_name}`);
        } else if (!result.matched_employee_id) {
          console.log(`⚠️ No employee match found for: "${recording.employee_name}"`);
        }

      } catch (error) {
        console.error(`❌ Error processing ${recording.id}:`, error);
        results.push({
          recording_id: recording.id,
          employee_name: recording.employee_name,
          matched_employee_id: null,
          matched_employee_name: null,
          participation_created: false,
          reason: `Processing error: ${error.message}`
        });
        summary.errors++;
      }
    }

    console.log('📊 Backfill summary:', summary);

    const response = {
      processed: results.length,
      results,
      summary,
      dry_run,
      recommendations: generateBackfillRecommendations(results, summary)
    };

    return createSuccessResponse(response);

  } catch (error) {
    console.error('💥 Unexpected error in backfill-employee-participation:', error);
    return createErrorResponse(`Backfill failed: ${error.message}`, 500);
  }
});

async function processRecordingBackfill(
  recording: any,
  employees: any[],
  supabase: any,
  dryRun: boolean
): Promise<BackfillResult> {

  const employeeName = recording.employee_name.trim();
  const nameParts = employeeName.split(' ');

  // Try to match employee name to database records
  let matchedEmployee = null;

  // Strategy 1: Exact full name match
  for (const emp of employees) {
    const empFullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    if (empFullName === employeeName.toLowerCase()) {
      matchedEmployee = emp;
      break;
    }
  }

  // Strategy 2: Fuzzy matching if no exact match
  if (!matchedEmployee && nameParts.length >= 2) {
    const firstName = nameParts[0].toLowerCase();
    const lastName = nameParts.slice(1).join(' ').toLowerCase();

    for (const emp of employees) {
      const empFirstName = emp.first_name.toLowerCase();
      const empLastName = emp.last_name.toLowerCase();

      // Check if first name matches and last name contains any part
      if (empFirstName.includes(firstName) || firstName.includes(empFirstName)) {
        if (empLastName.includes(lastName) || lastName.includes(empLastName)) {
          matchedEmployee = emp;
          break;
        }
      }
    }
  }

  // Strategy 3: First name only match (if confident)
  if (!matchedEmployee && nameParts.length === 1) {
    const possibleMatches = employees.filter(emp =>
      emp.first_name.toLowerCase() === nameParts[0].toLowerCase()
    );

    if (possibleMatches.length === 1) {
      matchedEmployee = possibleMatches[0];
    }
  }

  const result: BackfillResult = {
    recording_id: recording.id,
    employee_name: employeeName,
    matched_employee_id: matchedEmployee?.id || null,
    matched_employee_name: matchedEmployee ?
      `${matchedEmployee.first_name} ${matchedEmployee.last_name}` : null,
    participation_created: false,
    reason: ''
  };

  if (!matchedEmployee) {
    result.reason = `No employee match found for "${employeeName}"`;
    return result;
  }

  if (dryRun) {
    result.reason = `Dry run: Would create participation record for ${result.matched_employee_name}`;
    result.participation_created = true; // Simulated success
    return result;
  }

  // Create the participation record
  try {
    const { data: participationRecord, error: participationError } = await supabase
      .from('employee_call_participation')
      .insert({
        recording_id: recording.id,
        employee_id: matchedEmployee.id,
        participation_type: 'primary',
        talk_time_seconds: 0,
        talk_time_percentage: 0,
        confidence_score: 0.8, // Assumed high confidence from AI detection
        manually_tagged: false,
        speaker_segments: null
      })
      .select()
      .single();

    if (participationError) {
      result.reason = `Failed to create participation record: ${participationError.message}`;
      return result;
    }

    result.participation_created = true;
    result.reason = `Successfully created participation record (ID: ${participationRecord.id})`;
    return result;

  } catch (error) {
    result.reason = `Error creating participation record: ${error.message}`;
    return result;
  }
}

function generateBackfillRecommendations(
  results: BackfillResult[],
  summary: any
): string[] {
  const recommendations: string[] = [];

  if (summary.created > 0) {
    recommendations.push(`${summary.created} participation records created successfully`);
  }

  if (summary.unmatched > 0) {
    recommendations.push(`${summary.unmatched} employee names could not be matched - review employee database`);

    // List the unmatched names for review
    const unmatchedNames = results
      .filter(r => !r.matched_employee_id)
      .map(r => r.employee_name)
      .slice(0, 5);

    if (unmatchedNames.length > 0) {
      recommendations.push(`Unmatched names include: ${unmatchedNames.join(', ')}`);
    }
  }

  if (summary.errors > 0) {
    recommendations.push(`${summary.errors} errors occurred - check logs for details`);
  }

  const successRate = results.length > 0 ?
    (summary.created / results.length * 100).toFixed(1) : '0';
  recommendations.push(`Success rate: ${successRate}%`);

  if (summary.unmatched > 0) {
    recommendations.push('Consider running verify-employee-names to improve AI detection accuracy');
  }

  return recommendations;
}