import { createClient } from '@supabase/supabase-js';

// Use production Supabase credentials
const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function addMilanJandu() {
  console.log('👤 Adding Milan Jandu to employees table...\n');

  // Employee data for Milan Jandu
  const employeeData = {
    first_name: 'Milan',
    last_name: 'Jandu',
    email: 'milan.jandu@ecisolutions.com',
    department: 'Sales',
    role: 'Sales Representative',
    status: 'active',
    hire_date: new Date().toISOString().split('T')[0], // Today's date
  };

  try {
    // Check if Milan Jandu already exists
    const { data: existing, error: checkError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email')
      .ilike('first_name', 'Milan')
      .ilike('last_name', 'Jandu');

    if (checkError) {
      console.error('❌ Error checking for existing employee:', checkError);
      throw checkError;
    }

    if (existing && existing.length > 0) {
      console.log('✅ Milan Jandu already exists in database:');
      console.log(`   ID: ${existing[0].id}`);
      console.log(`   Email: ${existing[0].email}`);
      console.log(`   Name: ${existing[0].first_name} ${existing[0].last_name}`);
      return existing[0];
    }

    // Insert Milan Jandu
    console.log('📝 Inserting Milan Jandu with data:');
    console.log(JSON.stringify(employeeData, null, 2));
    console.log('');

    const { data: newEmployee, error: insertError } = await supabase
      .from('employees')
      .insert(employeeData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting employee:', insertError);
      throw insertError;
    }

    console.log('✅ Successfully added Milan Jandu!');
    console.log(`   ID: ${newEmployee.id}`);
    console.log(`   Email: ${newEmployee.email}`);
    console.log(`   Name: ${newEmployee.first_name} ${newEmployee.last_name}`);
    console.log(`   Department: ${newEmployee.department}`);
    console.log(`   Role: ${newEmployee.role}`);
    console.log(`   Status: ${newEmployee.status}`);
    console.log('');
    console.log('🔗 Profile URL: /employees/profile/' + newEmployee.id);
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Refresh the employee list page');
    console.log('   2. Navigate to Milan Jandu\'s profile');
    console.log('   3. Upload a recording for Milan Jandu');
    console.log('   4. Check the Recordings tab for detection badges');

    return newEmployee;
  } catch (error) {
    console.error('❌ Failed to add Milan Jandu:', error);
    process.exit(1);
  }
}

// Run the script
addMilanJandu().catch(console.error);
