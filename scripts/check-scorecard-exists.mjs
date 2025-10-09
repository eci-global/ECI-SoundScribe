import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU5MDQ0NywiZXhwIjoyMDY1MTY2NDQ3fQ.kzYjtO7X0ECTfydiyCrt13WD4hnoknlYThqVia-jwo4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkScorecard() {
  console.log('🔍 Checking if scorecard exists...\n');

  // Check by scorecard ID
  const scorecardId = '6407d7db-8f9c-4ddd-8253-c4f765f88c04';

  const { data: byId, error: idError } = await supabase
    .from('employee_scorecards')
    .select('*')
    .eq('id', scorecardId)
    .single();

  if (byId) {
    console.log('✅ Found scorecard by ID!');
    console.log(JSON.stringify(byId, null, 2));
    return;
  } else {
    console.log('❌ Not found by scorecard ID:', scorecardId);
    console.log('   Error:', idError?.message);
  }

  // Check by recording + employee
  const { data: byRecEmp, error: recEmpError } = await supabase
    .from('employee_scorecards')
    .select('*')
    .eq('recording_id', 'b983a9f3-ca13-4ba1-a877-d35489dda124')
    .eq('employee_id', 'f625947d-aa0d-4e1f-8daa-33ac30ec1d46');

  console.log('\n📋 Searching by recording + employee...');
  if (byRecEmp && byRecEmp.length > 0) {
    console.log(`✅ Found ${byRecEmp.length} scorecard(s)!`);
    byRecEmp.forEach(sc => {
      console.log('\n📊 Scorecard:', sc.id);
      console.log('   Overall Score:', sc.overall_score);
      console.log('   Strengths:', sc.strengths);
      console.log('   Improvements:', sc.improvements);
    });
  } else {
    console.log('❌ No scorecards found');
    console.log('   Error:', recEmpError?.message);
  }

  // Check all scorecards for Andrew
  const { data: allAndrew, error: allError } = await supabase
    .from('employee_scorecards')
    .select('*')
    .eq('employee_id', 'f625947d-aa0d-4e1f-8daa-33ac30ec1d46');

  console.log('\n📋 All scorecards for Andrew Sherley...');
  if (allAndrew && allAndrew.length > 0) {
    console.log(`✅ Found ${allAndrew.length} total scorecard(s) for Andrew!`);
    allAndrew.forEach(sc => {
      console.log(`\n   - Scorecard ${sc.id}`);
      console.log(`     Recording: ${sc.recording_id}`);
      console.log(`     Score: ${sc.overall_score}`);
      console.log(`     Date: ${new Date(sc.evaluated_at).toLocaleString()}`);
    });
  } else {
    console.log('❌ No scorecards found for Andrew at all');
    console.log('   Error:', allError?.message);
  }
}

checkScorecard().catch(console.error);
