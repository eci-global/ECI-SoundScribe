import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

declare const Deno: { env: { get(key: string): string | undefined } };

interface RequestBody {
  recording_id: string;
  employee_id: string;
  participation_type?: 'primary' | 'secondary' | 'observer';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight(req);
  }

  try {
    const body: RequestBody = await req.json();
    const { recording_id, employee_id, participation_type = 'primary' } = body || {} as RequestBody;

    if (!recording_id || !employee_id) {
      return createErrorResponse('recording_id and employee_id are required', 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return createErrorResponse('Supabase configuration missing', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Validate recording
    const { data: recording, error: recErr } = await supabase
      .from('recordings')
      .select('id')
      .eq('id', recording_id)
      .single();
    if (recErr || !recording) {
      return createErrorResponse('Recording not found', 404);
    }

    // Validate employee
    const { data: employee, error: empErr } = await supabase
      .from('employees')
      .select('id, status, first_name, last_name')
      .eq('id', employee_id)
      .single();
    if (empErr || !employee) {
      return createErrorResponse('Employee not found', 404);
    }
    if ((employee as any).status && (employee as any).status !== 'active') {
      return createErrorResponse('Employee is not active', 400);
    }

    // Check existing participation
    const { data: existing } = await supabase
      .from('employee_call_participation')
      .select('id')
      .eq('recording_id', recording_id)
      .eq('employee_id', employee_id)
      .maybeSingle();

    let participation_id: string | null = existing?.id || null;
    if (!participation_id) {
      // Create participation
      const { data: part, error: partErr } = await supabase
        .from('employee_call_participation')
        .insert({
          recording_id,
          employee_id,
          participation_type,
          talk_time_seconds: 0,
          talk_time_percentage: 0,
          confidence_score: 1.0,
          manually_tagged: true,
          speaker_segments: { detection_method: 'manual_assignment' },
        })
        .select('id')
        .single();
      if (partErr) {
        return createErrorResponse(`Failed to create participation: ${partErr.message}`, 500);
      }
      participation_id = part.id;
    }

    // Generate scorecard if not exists
    const { data: existingScorecards } = await supabase
      .from('employee_scorecards')
      .select('id')
      .eq('recording_id', recording_id);

    let scorecards_created = 0;
    if (!existingScorecards || existingScorecards.length === 0) {
      try {
        const { data: scData, error: scError } = await supabase.functions.invoke('generate-employee-scorecard', {
          body: { recording_id }
        });
        if (scError) {
          console.warn('assign-employee-to-recording: scorecard generation failed:', scError);
        } else {
          scorecards_created = (scData?.scorecards_created || 0) as number;
        }
      } catch (e) {
        console.warn('assign-employee-to-recording: error invoking scorecard generation:', (e as any)?.message || e);
      }
    }

    return createSuccessResponse({
      success: true,
      recording_id,
      employee_id,
      participation_id,
      scorecards_created,
      employee_name: `${(employee as any).first_name || ''} ${(employee as any).last_name || ''}`.trim()
    });

  } catch (error) {
    return createErrorResponse(`Failed to assign employee: ${(error as any)?.message || error}`, 500);
  }
});

