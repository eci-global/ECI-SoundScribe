import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU5MDQ0NywiZXhwIjoyMDY1MTY2NDQ3fQ.kzYjtO7X0ECTfydiyCrt13WD4hnoknlYThqVia-jwo4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const JOSH_EMPLOYEE_ID = 'f09b8e85-004a-4669-81d8-12fee9caf2d8';
const RECORDING_ID = 'e83560b8-f9c2-4642-aecd-85f976aaa975';

async function linkJoshTrinkleRecording() {
  console.log('🔗 Linking Josh Trinkle to Recording');
  console.log('=' .repeat(70));
  console.log('');

  // Step 1: Link the recording
  console.log('📋 Creating participation record...');
  const { data: participation, error: partError } = await supabase
    .from('employee_call_participation')
    .insert({
      recording_id: RECORDING_ID,
      employee_id: JOSH_EMPLOYEE_ID,
      participation_type: 'primary',
      talk_time_seconds: 0,
      talk_time_percentage: 0,
      confidence_score: 1.0,
      manually_tagged: true,
      speaker_segments: {
        detection_method: 'manual',
        detected_name: 'Josh Trinkle',
        name_type: 'first_name_only',
        reasoning: 'Manually linked after Azure backend failed to auto-detect'
      }
    })
    .select()
    .single();

  if (partError) {
    console.error('❌ Failed to create participation:', partError);
    return;
  }

  console.log(`✅ Participation record created: ${participation.id}`);
  console.log('');

  // Step 2: Update recording.employee_name
  console.log('📋 Updating recording.employee_name...');
  const { error: updateError } = await supabase
    .from('recordings')
    .update({ employee_name: 'Josh Trinkle' })
    .eq('id', RECORDING_ID);

  if (updateError) {
    console.warn('⚠️  Failed to update employee_name:', updateError);
  } else {
    console.log('✅ Updated recording.employee_name');
  }
  console.log('');

  // Step 3: Generate scorecard
  console.log('📋 Generating scorecard...');
  const { data: scorecard, error: scorecardError } = await supabase.functions.invoke(
    'generate-employee-scorecard',
    {
      body: {
        recording_id: RECORDING_ID,
        employee_id: JOSH_EMPLOYEE_ID,
        participation_id: participation.id
      }
    }
  );

  if (scorecardError) {
    console.warn('⚠️  Failed to generate scorecard:', scorecardError);
  } else {
    console.log('✅ Scorecard generated!');
    if (scorecard && scorecard.details) {
      console.log(`   Overall Score: ${scorecard.details[0]?.overall_score || 'N/A'}`);
      console.log(`   Strengths: ${scorecard.details[0]?.strengths_count || 0}`);
      console.log(`   Improvements: ${scorecard.details[0]?.improvements_count || 0}`);
    }
  }
  console.log('');

  console.log('🎉 ===================================================================');
  console.log('🎉 SUCCESS! Josh Trinkle is now linked to the recording!');
  console.log('🎉 ===================================================================');
  console.log('');
  console.log('🔗 View profile:');
  console.log(`   /employees/${JOSH_EMPLOYEE_ID}`);
  console.log('');
  console.log('💡 Clear cache (Ctrl+Shift+R) and check the profile page!');
  console.log('');
}

linkJoshTrinkleRecording().catch(console.error);
