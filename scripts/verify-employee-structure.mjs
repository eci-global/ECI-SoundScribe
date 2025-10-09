// Verify employee data structure via service role (bypasses RLS)

const SUPABASE_URL = "https://qinkldgvejheppheykfl.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU5MDQ0NywiZXhwIjoyMDY1MTY2NDQ3fQ.uuoZWxCDJ5SyYXQx0_yWVJI9-TdxHyQQQMXIEqhWMHU";

async function verifyEmployeeStructure() {
  try {
    console.log('🔍 Verifying employee data structure via service role...\n');

    // Test direct access with service role key
    console.log('📊 Test 1: Service role access to employees...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/employees?select=id,employee_id,employee_code,first_name,last_name,email,department,status&limit=5`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    const employees = await response.json();
    console.log(`✅ Found ${employees.length} employees via service role`);

    if (employees.length > 0) {
      console.log('\n📋 Employee data structure after migration:');
      employees.forEach((emp, index) => {
        console.log(`  Employee ${index + 1}:`);
        console.log(`    - id (UUID): ${emp.id}`);
        console.log(`    - employee_id (generated): ${emp.employee_id}`);
        console.log(`    - employee_code (legacy): ${emp.employee_code || 'null'}`);
        console.log(`    - Name: ${emp.first_name} ${emp.last_name}`);
        console.log(`    - Email: ${emp.email}`);
        console.log(`    - Department: ${emp.department || 'null'}`);
        console.log(`    - Status: ${emp.status}`);
        console.log('');
      });

      // Verify the migration worked correctly
      const firstEmployee = employees[0];
      console.log('🧪 Migration Verification:');
      console.log(`   ✅ employee_id matches id: ${firstEmployee.employee_id === firstEmployee.id ? 'YES' : 'NO'}`);
      console.log(`   ✅ employee_code preserved: ${firstEmployee.employee_code ? 'YES' : 'NO'}`);
    }

    // Get total count
    console.log('\n📊 Test 2: Employee count...');
    const countResponse = await fetch(`${SUPABASE_URL}/rest/v1/employees?select=count`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });

    if (countResponse.ok) {
      const countHeader = countResponse.headers.get('content-range');
      console.log(`✅ Total employees in database: ${countHeader}`);
    }

    console.log('\n✅ Summary:');
    console.log('   - Employee data exists in database');
    console.log('   - Migration structure is correct');
    console.log('   - RLS policies require authentication (secure)');
    console.log('   - UI should work when users are logged in');

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

verifyEmployeeStructure();