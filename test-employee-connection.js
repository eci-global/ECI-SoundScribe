// Test script to check Supabase connection and employee table access
// Run this in browser console at http://localhost:8080

console.log('Testing Supabase connection...');

// Test 1: Check if supabase client is available
if (typeof window !== 'undefined' && window.supabase) {
  console.log('✅ Supabase client found');
  
  // Test 2: Try to query the employees table
  window.supabase
    .from('employees')
    .select('*')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Error querying employees table:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
      } else {
        console.log('✅ Successfully queried employees table:', data);
      }
    })
    .catch((err) => {
      console.error('❌ Exception querying employees:', err);
    });
    
  // Test 3: Try to insert a test employee
  const testEmployee = {
    employee_id: 'TEST001',
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    department: 'Test',
    role: 'Tester',
    status: 'active'
  };
  
  console.log('Testing employee insert...');
  window.supabase
    .from('employees')
    .insert(testEmployee)
    .select()
    .single()
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Error inserting test employee:', error);
        console.error('Insert error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
      } else {
        console.log('✅ Successfully inserted test employee:', data);
        
        // Clean up - delete the test employee
        window.supabase
          .from('employees')
          .delete()
          .eq('id', data.id)
          .then(() => console.log('✅ Test employee cleaned up'));
      }
    })
    .catch((err) => {
      console.error('❌ Exception inserting employee:', err);
    });
    
} else {
  console.error('❌ Supabase client not found. Make sure you are on the correct page.');
}
