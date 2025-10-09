import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

declare const Deno: { env: { get(key: string): string | undefined } };

interface RequestBody {
  participation_id: string;
  recording_id: string;
  old_employee_id: string;
  new_employee_id: string;
  reason: string;
  corrected_by?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight(req);
  }

  console.log('🔄 Employee reassignment request received');

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const {
      participation_id,
      recording_id,
      old_employee_id,
      new_employee_id,
      reason,
      corrected_by
    } = body;

    // Validate required fields
    if (!participation_id || !new_employee_id || !reason) {
      return createErrorResponse('Missing required fields: participation_id, new_employee_id, reason', 400);
    }

    if (reason.trim().length < 10) {
      return createErrorResponse('Reason must be at least 10 characters', 400);
    }

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

    console.log(`📋 Reassigning participation ${participation_id} from employee ${old_employee_id} to ${new_employee_id}`);

    // Verify new employee exists and is active
    const { data: newEmployee, error: employeeError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, status')
      .eq('id', new_employee_id)
      .single();

    if (employeeError || !newEmployee) {
      console.error('❌ New employee not found:', employeeError);
      return createErrorResponse('New employee not found', 404);
    }

    if (newEmployee.status !== 'active') {
      return createErrorResponse('Cannot assign to inactive employee', 400);
    }

    console.log(`✅ Verified new employee: ${newEmployee.first_name} ${newEmployee.last_name}`);

    // Get current participation record
    const { data: currentParticipation, error: fetchError } = await supabase
      .from('employee_call_participation')
      .select('*')
      .eq('id', participation_id)
      .single();

    if (fetchError || !currentParticipation) {
      console.error('❌ Participation record not found:', fetchError);
      return createErrorResponse('Participation record not found', 404);
    }

    // Prepare correction history entry
    const currentSpeakerSegments = currentParticipation.speaker_segments || {};
    const correctionEntry = {
      corrected_at: new Date().toISOString(),
      old_employee_id: old_employee_id || currentParticipation.employee_id,
      new_employee_id: new_employee_id,
      reason: reason.trim(),
      corrected_by: corrected_by || 'unknown',
      previous_detection_method: currentSpeakerSegments.detection_method || 'unknown',
      previous_confidence: currentParticipation.confidence_score || 0
    };

    // Add correction to history array
    const correctionHistory = currentSpeakerSegments.correction_history || [];
    correctionHistory.push(correctionEntry);

    // Update speaker_segments with correction metadata
    const updatedSpeakerSegments = {
      ...currentSpeakerSegments,
      detection_method: 'manual_correction',
      corrected: true,
      correction_history: correctionHistory,
      last_correction: correctionEntry
    };

    // Update the participation record
    const { data: updatedParticipation, error: updateError } = await supabase
      .from('employee_call_participation')
      .update({
        employee_id: new_employee_id,
        manually_tagged: true,
        speaker_segments: updatedSpeakerSegments,
        updated_at: new Date().toISOString()
      })
      .eq('id', participation_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update participation record:', updateError);
      return createErrorResponse(`Failed to update participation: ${updateError.message}`, 500);
    }

    console.log(`✅ Successfully updated participation record`);

    // Update any scorecards associated with this participation
    const { data: scorecards, error: scorecardUpdateError } = await supabase
      .from('employee_scorecards')
      .update({
        employee_id: new_employee_id,
        updated_at: new Date().toISOString()
      })
      .eq('participation_id', participation_id)
      .select();

    if (scorecardUpdateError) {
      console.warn('⚠️ Failed to update scorecards (may not exist):', scorecardUpdateError);
    } else {
      console.log(`✅ Updated ${scorecards?.length || 0} related scorecards`);
    }

    // Create audit log entry
    try {
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          user_id: corrected_by || null,
          action: 'employee_reassignment',
          resource_type: 'employee_call_participation',
          resource_id: participation_id,
          details: {
            recording_id,
            old_employee_id: old_employee_id || currentParticipation.employee_id,
            new_employee_id,
            new_employee_name: `${newEmployee.first_name} ${newEmployee.last_name}`,
            reason,
            previous_detection_method: currentSpeakerSegments.detection_method,
            previous_confidence: currentParticipation.confidence_score
          },
          created_at: new Date().toISOString()
        });

      if (auditError) {
        console.warn('⚠️ Failed to create audit log (table may not exist):', auditError);
      } else {
        console.log('✅ Created audit log entry');
      }
    } catch (auditError) {
      // Non-blocking - audit logging is optional
      console.warn('⚠️ Audit logging failed (non-blocking):', auditError);
    }

    console.log('🏁 Employee reassignment completed successfully');

    return createSuccessResponse({
      success: true,
      participation_id,
      old_employee_id: old_employee_id || currentParticipation.employee_id,
      new_employee_id,
      new_employee_name: `${newEmployee.first_name} ${newEmployee.last_name}`,
      reason,
      corrected_at: correctionEntry.corrected_at,
      scorecards_updated: scorecards?.length || 0
    });

  } catch (error) {
    console.error('💥 Unexpected error in reassign-employee-participation:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });

    return createErrorResponse(
      `Failed to reassign employee: ${error.message}`,
      500
    );
  }
});
