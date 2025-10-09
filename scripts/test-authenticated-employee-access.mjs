// Test employee data access with authenticated user context
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qinkldgvejheppheykfl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuthenticatedAccess() {
  try {
    console.log('🔍 Testing employee data access with authenticated context...\n');

    // First, let's see what auth users exist
    console.log('📊 Test 1: Check auth.users (requires service role)...');

    // Test with the UI approach - using supabase client with auth context
    console.log('📊 Test 2: Testing employee access via Supabase client...');

    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, employee_id, employee_code, first_name, last_name, email, department, status')
      .limit(5);

    if (error) {
      console.error('❌ Error accessing employees:', error);
      console.log('Error details:', JSON.stringify(error, null, 2));

      // Let's check what the current auth state is
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Current user:', user);
      console.log('User error:', userError);

    } else {
      console.log(`✅ Found ${employees.length} employees`);

      if (employees.length > 0) {
        console.log('\n📋 Sample employee data:');
        employees.forEach((emp, index) => {
          console.log(`  Employee ${index + 1}:`);
          console.log(`    - ID: ${emp.id}`);
          console.log(`    - employee_id: ${emp.employee_id}`);
          console.log(`    - employee_code: ${emp.employee_code}`);
          console.log(`    - Name: ${emp.first_name} ${emp.last_name}`);
          console.log(`    - Email: ${emp.email}`);
          console.log(`    - Department: ${emp.department}`);
          console.log('');
        });
      }
    }

    // Test 3: Try to access via service role (should work)
    console.log('\n📊 Test 3: Direct REST call (anonymous)...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/employees?select=id,employee_id,employee_code,first_name,last_name,email&limit=3`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log('REST response status:', response.status);
    console.log('REST response:', result);

  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }
}

testAuthenticatedAccess();