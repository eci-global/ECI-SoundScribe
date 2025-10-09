// Auto-Process Recording: Orchestrator for Employee Detection → Participation → Scorecard
// This function automatically chains all processing steps when a recording completes
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

declare const Deno: { env: { get(key: string): string | undefined } };

interface RequestBody {
  recording_id: string;
  type?: string; // webhook type
  table?: string; // webhook table
  record?: any; // webhook record
}

interface ProcessingResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight(req);
  }

  console.log('🤖 Auto-process recording orchestrator started');

  try {
    // Parse request body
    const body: RequestBody = await req.json();

    // Extract recording_id from webhook payload or direct call
    let recording_id: string;
    if (body.record?.id) {
      // Webhook format
      recording_id = body.record.id;
      console.log('📨 Received from webhook:', body.type, body.table);
    } else if (body.recording_id) {
      // Direct API call format
      recording_id = body.recording_id;
    } else {
      return createErrorResponse('recording_id is required', 400);
    }

    console.log(`📊 Processing recording: ${recording_id}`);

    // Initialize Supabase client with service role
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

    const results: ProcessingResult[] = [];

    // Step 1: Verify recording exists and is completed with transcript
    console.log('1️⃣ Verifying recording...');

    const { data: recording, error: recError } = await supabase
      .from('recordings')
      .select('id, title, status, transcript')
      .eq('id', recording_id)
      .single();

    if (recError || !recording) {
      console.error('❌ Recording not found:', recError);
      return createErrorResponse('Recording not found', 404);
    }

    if (recording.status !== 'completed') {
      console.log('⏳ Recording not completed yet, skipping');
      return createSuccessResponse({
        recording_id,
        status: 'skipped',
        reason: 'Recording not completed'
      });
    }

    if (!recording.transcript) {
      console.log('⏳ No transcript available yet, skipping');
      return createSuccessResponse({
        recording_id,
        status: 'skipped',
        reason: 'No transcript available'
      });
    }

    console.log(`✅ Recording verified: ${recording.title}`);

    // Step 2: Extract employee name and create participation record
    console.log('2️⃣ Extracting employee name...');

    // Check if participation already exists (idempotency)
    const { data: existingParticipation } = await supabase
      .from('employee_call_participation')
      .select('id, employee_id')
      .eq('recording_id', recording_id);

    if (existingParticipation && existingParticipation.length > 0) {
      console.log('✅ Participation record already exists, skipping extraction');
      results.push({
        step: 'employee_extraction',
        success: true,
        skipped: true,
        reason: 'Participation record already exists',
        data: { participation_count: existingParticipation.length }
      });
    } else {
      // Call extract-employee-name function
      try {
        const { data: extractResult, error: extractError } = await supabase.functions.invoke(
          'extract-employee-name',
          {
            body: { recording_id }
          }
        );

        if (extractError) {
          console.error('❌ Employee extraction failed:', extractError);
          results.push({
            step: 'employee_extraction',
            success: false,
            error: extractError.message || 'Unknown error'
          });
        } else {
          console.log('✅ Employee extraction completed:', extractResult);
          results.push({
            step: 'employee_extraction',
            success: true,
            data: extractResult
          });
        }
      } catch (error: any) {
        console.error('❌ Employee extraction error:', error);
        results.push({
          step: 'employee_extraction',
          success: false,
          error: error.message
        });
      }
    }

    // Step 3: Generate scorecard if participation exists
    console.log('3️⃣ Checking for scorecard generation...');

    // Verify participation exists after extraction
    const { data: participationCheck } = await supabase
      .from('employee_call_participation')
      .select('id, employee_id')
      .eq('recording_id', recording_id);

    if (!participationCheck || participationCheck.length === 0) {
      console.log('⚠️ No participation records found, skipping scorecard generation');
      results.push({
        step: 'scorecard_generation',
        success: false,
        skipped: true,
        reason: 'No employee participation records found'
      });
    } else {
      console.log(`✅ Found ${participationCheck.length} participation record(s)`);

      // Check if scorecards already exist (idempotency)
      const { data: existingScorecards } = await supabase
        .from('employee_scorecards')
        .select('id')
        .eq('recording_id', recording_id);

      if (existingScorecards && existingScorecards.length > 0) {
        console.log('✅ Scorecards already exist, skipping generation');
        results.push({
          step: 'scorecard_generation',
          success: true,
          skipped: true,
          reason: 'Scorecards already exist',
          data: { scorecard_count: existingScorecards.length }
        });
      } else {
        // Generate scorecard
        try {
          const { data: scorecardResult, error: scorecardError } = await supabase.functions.invoke(
            'generate-employee-scorecard',
            {
              body: { recording_id }
            }
          );

          if (scorecardError) {
            console.error('❌ Scorecard generation failed:', scorecardError);
            results.push({
              step: 'scorecard_generation',
              success: false,
              error: scorecardError.message || 'Unknown error'
            });
          } else {
            console.log('✅ Scorecard generation completed:', scorecardResult);
            results.push({
              step: 'scorecard_generation',
              success: true,
              data: scorecardResult
            });
          }
        } catch (error: any) {
          console.error('❌ Scorecard generation error:', error);
          results.push({
            step: 'scorecard_generation',
            success: false,
            error: error.message
          });
        }
      }
    }

    // Determine overall success
    const hasFailures = results.some(r => r.success === false && !r.skipped);
    const allStepsCompleted = results.every(r => r.success || r.skipped);

    console.log('🏁 Auto-processing completed');
    console.log(`   Steps: ${results.length}`);
    console.log(`   Successful: ${results.filter(r => r.success).length}`);
    console.log(`   Failed: ${results.filter(r => !r.success && !r.skipped).length}`);
    console.log(`   Skipped: ${results.filter(r => r.skipped).length}`);

    return createSuccessResponse({
      recording_id,
      recording_title: recording.title,
      status: hasFailures ? 'partial_success' : 'success',
      all_steps_completed: allStepsCompleted,
      results,
      summary: {
        employee_extracted: results.find(r => r.step === 'employee_extraction')?.success || false,
        scorecard_generated: results.find(r => r.step === 'scorecard_generation')?.success || false
      }
    });

  } catch (error: any) {
    console.error('💥 Unexpected error in auto-process-recording:', error);
    return createErrorResponse(`Auto-processing failed: ${error.message}`, 500);
  }
});
