// Helper function to process a recording for a specific employee
// This combines extract-employee-name and generate-employee-scorecard into one call

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recording_id, employee_id } = await req.json();

    if (!recording_id) {
      return new Response(
        JSON.stringify({ error: 'recording_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔧 Processing recording ${recording_id} for employee ${employee_id || 'auto-detect'}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: any = {
      recording_id,
      employee_id: employee_id || null,
      steps: []
    };

    // Step 1: Extract or assign employee
    if (employee_id) {
      console.log('📝 Assigning employee manually...');
      try {
        const { data: assignData, error: assignError } = await supabase.functions.invoke(
          'assign-employee-to-recording',
          { body: { recording_id, employee_id, manually_tagged: true } }
        );

        if (assignError) {
          console.error('❌ Assignment failed:', assignError);
          results.steps.push({ step: 'assign_employee', success: false, error: assignError });
        } else {
          console.log('✅ Employee assigned');
          results.steps.push({ step: 'assign_employee', success: true, data: assignData });
          results.employee_id = employee_id;
        }
      } catch (error) {
        console.error('❌ Assignment error:', error);
        results.steps.push({ step: 'assign_employee', success: false, error: error.message });
      }
    } else {
      console.log('🔍 Extracting employee from transcript...');
      try {
        const { data: extractData, error: extractError } = await supabase.functions.invoke(
          'extract-employee-name',
          { body: { recording_id } }
        );

        if (extractError) {
          console.error('❌ Extraction failed:', extractError);
          results.steps.push({ step: 'extract_employee', success: false, error: extractError });
        } else {
          console.log('✅ Employee extracted');
          results.steps.push({ step: 'extract_employee', success: true, data: extractData });
          results.employee_id = extractData?.employee_id || null;
        }
      } catch (error) {
        console.error('❌ Extraction error:', error);
        results.steps.push({ step: 'extract_employee', success: false, error: error.message });
      }
    }

    // Step 2: Generate scorecard
    console.log('📊 Generating scorecard...');
    try {
      const { data: scorecardData, error: scorecardError } = await supabase.functions.invoke(
        'generate-employee-scorecard',
        { body: { recording_id } }
      );

      if (scorecardError) {
        console.error('❌ Scorecard generation failed:', scorecardError);
        results.steps.push({ step: 'generate_scorecard', success: false, error: scorecardError });
      } else {
        console.log('✅ Scorecard generated');
        results.steps.push({ step: 'generate_scorecard', success: true, data: scorecardData });
      }
    } catch (error) {
      console.error('❌ Scorecard error:', error);
      results.steps.push({ step: 'generate_scorecard', success: false, error: error.message });
    }

    // Summary
    const allSuccess = results.steps.every((s: any) => s.success);
    results.status = allSuccess ? 'success' : 'partial_success';
    results.message = allSuccess
      ? 'Recording processed successfully'
      : 'Some steps failed, check results for details';

    console.log('🎉 Processing complete:', results.status);

    return new Response(
      JSON.stringify(results),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Processing failed',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
