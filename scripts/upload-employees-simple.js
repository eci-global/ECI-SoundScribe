import { supabase } from '../src/integrations/supabase/client.js';
import fs from 'fs';

// Function to parse CSV
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/["']/g, ''));

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/["']/g, ''));

    // Skip rows with insufficient data
    if (values.length < headers.length || !values[1] || !values[2] || !values[3]) {
      console.log(`Skipping incomplete row ${i}: ${values.slice(0, 5).join(',')}`);
      continue;
    }

    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || null;
    });

    records.push(record);
  }

  return records;
}

// Function to transform CSV data to match database schema
function transformEmployeeData(csvRecord) {
  // Parse hire date
  let hireDate = null;
  if (csvRecord.hire_date && csvRecord.hire_date !== '') {
    try {
      const dateStr = csvRecord.hire_date.split(' ')[0];
      const [day, month, year] = dateStr.split('/');
      if (day && month && year) {
        hireDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    } catch (error) {
      console.warn(`Invalid date format for ${csvRecord.email}: ${csvRecord.hire_date}`);
    }
  }

  // Handle status mapping
  let status = 'active';
  if (csvRecord.status === 'disabled') {
    status = 'inactive';
  } else if (csvRecord.status === 'terminated') {
    status = 'terminated';
  }

  // Generate a unique employee_id if missing
  const employeeId = csvRecord.employee_id?.toString() ||
    `EMP_${csvRecord.email?.split('@')[0]?.toUpperCase() || Date.now()}`;

  return {
    employee_id: employeeId,
    first_name: csvRecord.first_name || 'Unknown',
    last_name: csvRecord.last_name || 'Unknown',
    email: csvRecord.email,
    department: csvRecord.department || null,
    role: csvRecord.role || null,
    manager_id: null,
    team_id: null,
    hire_date: hireDate,
    status: status,
    voice_profile: null,
    user_id: null
  };
}

// Main upload function
async function uploadEmployees() {
  try {
    console.log('🚀 Starting employee data upload...');

    // Read CSV file
    const csvPath = 'C:\\Users\\dkoranteng\\Downloads\\user-profiles.csv';
    console.log(`📖 Reading CSV file: ${csvPath}`);

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const csvRecords = parseCSV(csvContent);

    console.log(`📊 Parsed ${csvRecords.length} records from CSV`);

    // Transform data
    const employeeData = csvRecords
      .filter(record => record.email && record.first_name && record.last_name)
      .map(transformEmployeeData);

    console.log(`✅ Transformed ${employeeData.length} valid employee records`);

    // Check current employees count
    const { count, error: countError } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error checking employees table:', countError.message);
      console.log('ℹ️  This might be due to RLS policies. Continuing with upload...');
    } else {
      console.log(`📊 Current employees in database: ${count || 0}`);
    }

    // Insert employees in smaller batches
    const batchSize = 25;
    let successCount = 0;
    let errorCount = 0;
    const failedRecords = [];

    for (let i = 0; i < employeeData.length; i += batchSize) {
      const batch = employeeData.slice(i, i + batchSize);
      console.log(`📤 Uploading batch ${Math.floor(i/batchSize) + 1} (${batch.length} records)...`);

      const { data, error } = await supabase
        .from('employees')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Error uploading batch ${Math.floor(i/batchSize) + 1}:`, error.message);

        // Try inserting individual records to identify specific issues
        for (const record of batch) {
          const { data: singleData, error: individualError } = await supabase
            .from('employees')
            .insert(record)
            .select();

          if (individualError) {
            console.error(`❌ Failed to insert employee ${record.email}:`, individualError.message);
            failedRecords.push({ record, error: individualError.message });
            errorCount++;
          } else {
            successCount++;
            console.log(`✅ Successfully inserted ${record.first_name} ${record.last_name} (${record.email})`);
          }
        }
      } else {
        successCount += batch.length;
        console.log(`✅ Successfully uploaded batch ${Math.floor(i/batchSize) + 1} - ${batch.length} employees`);
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📋 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${successCount} employees`);
    console.log(`❌ Failed uploads: ${errorCount} employees`);
    console.log(`📊 Total processed: ${successCount + errorCount} employees`);

    if (failedRecords.length > 0) {
      console.log('\n❌ Failed Records Details:');
      failedRecords.slice(0, 5).forEach(({ record, error }) => {
        console.log(`  - ${record.email}: ${error}`);
      });
      if (failedRecords.length > 5) {
        console.log(`  ... and ${failedRecords.length - 5} more failed records`);
      }
    }

    // Display some sample inserted data
    const { data: sampleData } = await supabase
      .from('employees')
      .select('employee_id, first_name, last_name, email, department, status')
      .limit(5);

    if (sampleData && sampleData.length > 0) {
      console.log('\n📋 Sample uploaded employees:');
      sampleData.forEach(emp => {
        console.log(`  - ${emp.first_name} ${emp.last_name} (${emp.email}) - ${emp.department || 'No dept'} - ${emp.status}`);
      });
    }

    // Final count check
    const { count: finalCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    if (finalCount !== null) {
      console.log(`\n📊 Total employees in database after upload: ${finalCount}`);
    }

  } catch (error) {
    console.error('❌ Error during upload:', error.message);
    console.error(error.stack);
  }
}

// Run the upload
uploadEmployees();