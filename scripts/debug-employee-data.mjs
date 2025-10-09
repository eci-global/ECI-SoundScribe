// Debug script to check current employee data structure

const SUPABASE_URL = "https://qinkldgvejheppheykfl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4";

async function debugEmployeeData() {
  try {
    console.log('🔍 Debugging employee data structure...\n');

    // Test direct fetch to employees table
    console.log('📊 Test 1: Direct fetch from employees table...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/employees?select=id,employee_id,employee_code,first_name,last_name,email,department,status&limit=5`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
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
    console.log(`✅ Found ${employees.length} employees`);

    if (employees.length > 0) {
      console.log('\n📋 Sample employee data:');
      employees.forEach((emp, index) => {
        console.log(`  Employee ${index + 1}:`);
        console.log(`    - ID (UUID): ${emp.id}`);
        console.log(`    - employee_id (generated): ${emp.employee_id}`);
        console.log(`    - employee_code (legacy): ${emp.employee_code}`);
        console.log(`    - Name: ${emp.first_name} ${emp.last_name}`);
        console.log(`    - Email: ${emp.email}`);
        console.log(`    - Department: ${emp.department}`);
        console.log(`    - Status: ${emp.status}`);
        console.log('');
      });

      // Test if employee_id equals id::text
      const firstEmployee = employees[0];
      console.log('🧪 Validation:');
      console.log(`   employee_id: "${firstEmployee.employee_id}"`);
      console.log(`   id: "${firstEmployee.id}"`);
      console.log(`   Match: ${firstEmployee.employee_id === firstEmployee.id ? '✅' : '❌'}`);
    }

    // Test count query
    console.log('\n📊 Test 2: Count query...');
    const countResponse = await fetch(`${SUPABASE_URL}/rest/v1/employees?select=count`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });

    if (countResponse.ok) {
      const countHeader = countResponse.headers.get('content-range');
      console.log(`✅ Total employees in database: ${countHeader}`);
    } else {
      console.error(`❌ Count query failed: ${countResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    console.error(error.stack);
  }
}

debugEmployeeData();