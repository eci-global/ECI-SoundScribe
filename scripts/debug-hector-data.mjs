// Debug script to check Hector Monreal's data specifically

const SUPABASE_URL = "https://qinkldgvejheppheykfl.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU5MDQ0NywiZXhwIjoyMDY1MTY2NDQ3fQ.uuoZWxCDJ5SyYXQx0_yWVJI9-TdxHyQQQMXIEqhWMHU";

async function debugHectorData() {
  try {
    console.log('🔍 Debugging Hector Monreal data...\n');

    // Step 1: Find Hector in employees table
    console.log('📊 Step 1: Finding Hector Monreal in employees table...');
    const employeeResponse = await fetch(`${SUPABASE_URL}/rest/v1/employees?select=*&or=first_name.ilike.%25hector%25,last_name.ilike.%25monreal%25`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!employeeResponse.ok) {
      console.error('❌ Failed to fetch Hector:', employeeResponse.status);
      return;
    }

    const employees = await employeeResponse.json();
    console.log(`✅ Found ${employees.length} matching employees:`);

    let hector = null;
    employees.forEach((emp, index) => {
      console.log(`  ${index + 1}. ${emp.first_name} ${emp.last_name}`);
      console.log(`     - ID (UUID): ${emp.id}`);
      console.log(`     - employee_id (generated): ${emp.employee_id}`);
      console.log(`     - employee_code (legacy): ${emp.employee_code}`);
      console.log(`     - Email: ${emp.email}`);

      if (emp.first_name?.toLowerCase().includes('hector') && emp.last_name?.toLowerCase().includes('monreal')) {
        hector = emp;
      }
    });

    if (!hector) {
      console.log('❌ Hector Monreal not found');
      return;
    }

    console.log(`\n🎯 Using Hector: ${hector.first_name} ${hector.last_name} (ID: ${hector.id})`);

    // Step 2: Check scorecards
    console.log('\n📊 Step 2: Checking employee_scorecards...');
    const scorecardResponse = await fetch(`${SUPABASE_URL}/rest/v1/employee_scorecards?select=*&employee_id=eq.${hector.id}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (scorecardResponse.ok) {
      const scorecards = await scorecardResponse.json();
      console.log(`✅ Found ${scorecards.length} scorecards for UUID ${hector.id}`);
      if (scorecards.length > 0) {
        console.log('   Sample scorecard:');
        console.log(`   - Recording ID: ${scorecards[0].recording_id}`);
        console.log(`   - Score: ${scorecards[0].overall_score}`);
        console.log(`   - Date: ${scorecards[0].evaluation_date}`);
      }
    } else {
      console.log(`❌ Failed to fetch scorecards: ${scorecardResponse.status}`);
    }

    // Step 3: Check with employee_code (legacy)
    if (hector.employee_code) {
      console.log(`\n📊 Step 3: Checking scorecards with employee_code ${hector.employee_code}...`);
      const codeScorecardsResponse = await fetch(`${SUPABASE_URL}/rest/v1/employee_scorecards?select=*&employee_id=eq.${hector.employee_code}`, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (codeScorecardsResponse.ok) {
        const codeCards = await codeScorecardsResponse.json();
        console.log(`✅ Found ${codeCards.length} scorecards for employee_code ${hector.employee_code}`);
        if (codeCards.length > 0) {
          console.log('   Sample scorecard:');
          console.log(`   - Recording ID: ${codeCards[0].recording_id}`);
          console.log(`   - Score: ${codeCards[0].overall_score}`);
          console.log(`   - Date: ${codeCards[0].evaluation_date}`);
        }
      }
    }

    // Step 4: Check call participation
    console.log(`\n📊 Step 4: Checking employee_call_participation for UUID ${hector.id}...`);
    const participationResponse = await fetch(`${SUPABASE_URL}/rest/v1/employee_call_participation?select=*&employee_id=eq.${hector.id}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (participationResponse.ok) {
      const participation = await participationResponse.json();
      console.log(`✅ Found ${participation.length} call participation records for UUID`);
    }

    // Step 5: Check with employee_code for participation
    if (hector.employee_code) {
      console.log(`\n📊 Step 5: Checking call participation with employee_code ${hector.employee_code}...`);
      const codeParticipationResponse = await fetch(`${SUPABASE_URL}/rest/v1/employee_call_participation?select=*&employee_id=eq.${hector.employee_code}`, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (codeParticipationResponse.ok) {
        const codeParticipation = await codeParticipationResponse.json();
        console.log(`✅ Found ${codeParticipation.length} call participation records for employee_code`);
      }
    }

    console.log('\n📋 Summary:');
    console.log(`   - Employee found: ${hector.first_name} ${hector.last_name}`);
    console.log(`   - UUID: ${hector.id}`);
    console.log(`   - Generated employee_id: ${hector.employee_id}`);
    console.log(`   - Legacy employee_code: ${hector.employee_code}`);
    console.log('   - Check which ID format has the actual scorecard/participation data');

  } catch (error) {
    console.error('❌ Error during debug:', error.message);
  }
}

debugHectorData();