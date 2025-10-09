// Verification script for employee ID migration

const SUPABASE_URL = "https://qinkldgvejheppheykfl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4";

async function verifyMigration() {
  try {
    console.log('🔍 Verifying employee ID migration...\n');

    // Test 1: Check employee count is still intact
    console.log('📊 Test 1: Checking employee count...');
    const countResponse = await fetch(`${SUPABASE_URL}/functions/v1/upload-employees`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    const countResult = await countResponse.json();
    console.log(`✅ Current employee count: ${countResult.current_employee_count}`);

    // Test 2: Try uploading a single test employee to verify the new structure works
    console.log('\n📊 Test 2: Testing Edge Function with new structure...');
    const testEmployee = {
      employee_id: "TEST123", // This should become employee_code
      first_name: "Test",
      last_name: "Employee",
      email: "test@example.com",
      department: "Testing",
      role: "Test Role",
      status: "active"
    };

    const uploadResponse = await fetch(`${SUPABASE_URL}/functions/v1/upload-employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        employees: [testEmployee]
      })
    });

    const uploadResult = await uploadResponse.json();
    console.log('Upload test result:', uploadResult);

    if (uploadResult.success) {
      console.log('✅ Edge Function works with new structure');
      console.log(`   - Processed: ${uploadResult.summary.total_processed}`);
      console.log(`   - Success: ${uploadResult.summary.successful}`);
      console.log(`   - Failed: ${uploadResult.summary.failed}`);
      console.log(`   - Total in DB: ${uploadResult.summary.total_in_database}`);
    } else {
      console.log('❌ Edge Function test failed');
    }

    console.log('\n🎉 Migration verification completed!');
    console.log('\n📋 What should be true after migration:');
    console.log('   ✅ employees.employee_id should equal employees.id::text (UUID as text)');
    console.log('   ✅ employees.employee_code should contain legacy codes (10846, 12094, etc.)');
    console.log('   ✅ New uploads should work with the updated Edge Function');
    console.log('   ✅ Child tables should reference UUIDs instead of legacy codes');

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

verifyMigration();