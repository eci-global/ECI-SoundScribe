import { createClient } from '@supabase/supabase-js';

// Use production Supabase credentials with SERVICE ROLE KEY
const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU5MDQ0NywiZXhwIjoyMDY1MTY2NDQ3fQ.kzYjtO7X0ECTfydiyCrt13WD4hnoknlYThqVia-jwo4';

// Create client with SERVICE ROLE KEY to bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const RECORDING_ID = 'b983a9f3-ca13-4ba1-a877-d35489dda124';
const ANDREW_EMPLOYEE_ID = 'f625947d-aa0d-4e1f-8daa-33ac30ec1d46';

async function generateScorecardForAndrew() {
  console.log('🎯 Generating Performance Scorecard for Andrew Sherley');
  console.log('=' .repeat(70));
  console.log('');

  // STEP 1: Verify recording exists
  console.log('📋 STEP 1: Verifying recording...');
  const { data: recording, error: recError } = await supabase
    .from('recordings')
    .select('id, title, status, transcript')
    .eq('id', RECORDING_ID)
    .single();

  if (recError || !recording) {
    console.error('❌ Recording not found:', recError?.message);
    return;
  }

  console.log(`✅ Found recording: "${recording.title}"`);
  console.log(`   Status: ${recording.status}`);
  console.log(`   Has transcript: ${recording.transcript ? 'Yes (' + recording.transcript.length + ' chars)' : 'No'}`);

  if (!recording.transcript || recording.transcript.length < 100) {
    console.error('');
    console.error('❌ Recording has no transcript or transcript is too short.');
    console.error('   Scorecard generation requires a transcript with actual conversation.');
    return;
  }
  console.log('');

  // STEP 2: Verify participation exists
  console.log('📋 STEP 2: Verifying employee participation...');
  const { data: participation, error: partError } = await supabase
    .from('employee_call_participation')
    .select(`
      id,
      employee_id,
      participation_type,
      employees!inner(first_name, last_name, email)
    `)
    .eq('recording_id', RECORDING_ID)
    .eq('employee_id', ANDREW_EMPLOYEE_ID)
    .single();

  if (partError || !participation) {
    console.error('❌ Participation record not found');
    console.error('   The recording must be linked to Andrew first.');
    return;
  }

  console.log(`✅ Found participation record`);
  console.log(`   Employee: ${participation.employees.first_name} ${participation.employees.last_name}`);
  console.log(`   Participation ID: ${participation.id}`);
  console.log('');

  // STEP 3: Check if scorecard already exists
  console.log('📋 STEP 3: Checking for existing scorecard...');
  const { data: existingScorecard, error: existError } = await supabase
    .from('employee_scorecards')
    .select('id, overall_score, evaluated_at')
    .eq('recording_id', RECORDING_ID)
    .eq('employee_id', ANDREW_EMPLOYEE_ID);

  if (existingScorecard && existingScorecard.length > 0) {
    console.log('⚠️  Scorecard already exists for this recording!');
    console.log(`   Scorecard ID: ${existingScorecard[0].id}`);
    console.log(`   Overall Score: ${existingScorecard[0].overall_score}`);
    console.log(`   Evaluated: ${new Date(existingScorecard[0].evaluated_at).toLocaleString()}`);
    console.log('');
    console.log('💡 To regenerate, delete the existing scorecard first:');
    console.log(`   DELETE FROM employee_scorecards WHERE id = '${existingScorecard[0].id}';`);
    console.log('');
    console.log('✅ Scorecard already exists - no action needed!');
    return;
  }

  console.log('✅ No existing scorecard (will create new one)');
  console.log('');

  // STEP 4: Generate scorecard via Edge Function
  console.log('📋 STEP 4: Calling generate-employee-scorecard Edge Function...');
  console.log('   This will analyze the transcript and create a performance scorecard');
  console.log('   Please wait, this may take 10-30 seconds...');
  console.log('');

  const { data: result, error: scorecardError } = await supabase.functions.invoke(
    'generate-employee-scorecard',
    {
      body: {
        recording_id: RECORDING_ID,
        employee_id: ANDREW_EMPLOYEE_ID,
        participation_id: participation.id
      }
    }
  );

  if (scorecardError) {
    console.error('❌ Failed to generate scorecard:', scorecardError);
    console.error('');
    console.error('💡 Possible reasons:');
    console.error('   - Edge Function not deployed');
    console.error('   - Azure OpenAI credentials not configured');
    console.error('   - Transcript format issue');
    console.error('   - Database constraint violation');
    return;
  }

  console.log('✅ Scorecard generation completed!');
  console.log('');

  // STEP 5: Verify scorecard was created
  console.log('📋 STEP 5: Verifying scorecard creation...');
  const { data: newScorecard, error: verifyError } = await supabase
    .from('employee_scorecards')
    .select(`
      id,
      overall_score,
      strengths,
      improvements,
      criteria_scores,
      evaluated_at
    `)
    .eq('recording_id', RECORDING_ID)
    .eq('employee_id', ANDREW_EMPLOYEE_ID)
    .single();

  if (verifyError || !newScorecard) {
    console.error('❌ Scorecard was not created in database');
    console.error('   Edge Function may have run but failed to insert data');
    console.log('');
    console.log('📊 Function result:', JSON.stringify(result, null, 2));
    return;
  }

  console.log('✅ Scorecard successfully created in database!');
  console.log('');
  console.log('🎉 ===================================================================');
  console.log('🎉 SUCCESS! Performance Scorecard Generated!');
  console.log('🎉 ===================================================================');
  console.log('');
  console.log('📊 Scorecard Details:');
  console.log(`   Scorecard ID: ${newScorecard.id}`);
  console.log(`   Overall Score: ${newScorecard.overall_score}/10`);
  console.log(`   Evaluated: ${new Date(newScorecard.evaluated_at).toLocaleString()}`);
  console.log('');

  // Show strengths
  if (newScorecard.strengths && newScorecard.strengths.length > 0) {
    console.log('💪 Top Strengths:');
    newScorecard.strengths.forEach((strength, idx) => {
      console.log(`   ${idx + 1}. ${strength}`);
    });
  } else {
    console.log('💪 Top Strengths: (none identified)');
  }
  console.log('');

  // Show improvements
  if (newScorecard.improvements && newScorecard.improvements.length > 0) {
    console.log('📈 Improvement Areas:');
    newScorecard.improvements.forEach((improvement, idx) => {
      console.log(`   ${idx + 1}. ${improvement}`);
    });
  } else {
    console.log('📈 Improvement Areas: (none identified)');
  }
  console.log('');

  // Show criteria scores
  if (newScorecard.criteria_scores) {
    console.log('📋 Criteria Scores:');
    const criteria = newScorecard.criteria_scores;
    Object.keys(criteria).forEach(key => {
      const criterion = criteria[key];
      if (criterion && typeof criterion === 'object' && 'score' in criterion) {
        console.log(`   ${key}: ${criterion.score}/${criterion.max_score || 10}`);
      }
    });
  }
  console.log('');

  console.log('🔗 View on profile:');
  console.log(`   /employees/${ANDREW_EMPLOYEE_ID}`);
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Clear browser cache (Ctrl+Shift+R)');
  console.log('   2. Navigate to Andrew\'s profile page');
  console.log('   3. The "Top Strengths" and "Improvement Areas" sections should now show data!');
  console.log('');
}

// Run it
generateScorecardForAndrew().catch(console.error);
