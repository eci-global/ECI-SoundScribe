import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Supabase configuration
const SUPABASE_URL = "https://qinkldgvejheppheykfl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to parse CSV
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/["'\ufeff]/g, '')); // Remove BOM

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing - handles basic comma separation
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add the last value

    // Skip rows with insufficient data
    if (values.length < 5 || !values[1] || !values[2] || !values[3] || !values[4]) {
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
      if (day && month && year && year.length === 4) {
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

  // Generate a unique employee_id if missing or empty
  let employeeId = csvRecord.employee_id?.toString()?.trim();
  if (!employeeId || employeeId === '') {
    employeeId = `EMP_${csvRecord.email?.split('@')[0]?.toUpperCase() || Date.now()}`;
  }

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

    // Display sample of what we're about to upload
    console.log('\n📋 Sample records to upload:');
    employeeData.slice(0, 3).forEach(emp => {
      console.log(`  - ${emp.employee_id}: ${emp.first_name} ${emp.last_name} (${emp.email}) - ${emp.department || 'No dept'} - ${emp.status}`);
    });

    console.log(`\n🚀 Starting upload of ${employeeData.length} employees...`);

    // Insert employees in small batches
    const batchSize = 20;
    let successCount = 0;
    let errorCount = 0;
    const failedRecords = [];

    for (let i = 0; i < employeeData.length; i += batchSize) {
      const batch = employeeData.slice(i, i + batchSize);
      console.log(`📤 Uploading batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(employeeData.length/batchSize)} (${batch.length} records)...`);

      // Try batch insert first
      const { data, error } = await supabase
        .from('employees')
        .insert(batch)
        .select();

      if (error) {
        console.warn(`⚠️  Batch insert failed: ${error.message}`);
        console.log(`🔄 Trying individual inserts for batch ${Math.floor(i/batchSize) + 1}...`);

        // Try inserting individual records
        for (const record of batch) {
          try {
            const { data: singleData, error: individualError } = await supabase
              .from('employees')
              .insert(record)
              .select();

            if (individualError) {
              // Try upsert if insert fails (might be duplicate)
              const { data: upsertData, error: upsertError } = await supabase
                .from('employees')
                .upsert(record, { onConflict: 'email' })
                .select();

              if (upsertError) {
                console.error(`❌ Failed to insert/upsert ${record.email}: ${upsertError.message}`);
                failedRecords.push({ record, error: upsertError.message });
                errorCount++;
              } else {
                successCount++;
                console.log(`✅ Upserted ${record.first_name} ${record.last_name} (${record.email})`);
              }
            } else {
              successCount++;
              console.log(`✅ Inserted ${record.first_name} ${record.last_name} (${record.email})`);
            }
          } catch (err) {
            console.error(`❌ Exception inserting ${record.email}: ${err.message}`);
            failedRecords.push({ record, error: err.message });
            errorCount++;
          }
        }
      } else {
        successCount += batch.length;
        console.log(`✅ Successfully uploaded batch ${Math.floor(i/batchSize) + 1} - ${batch.length} employees`);
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n📋 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${successCount} employees`);
    console.log(`❌ Failed uploads: ${errorCount} employees`);
    console.log(`📊 Total processed: ${successCount + errorCount} employees`);

    if (failedRecords.length > 0) {
      console.log('\n❌ Failed Records Details:');
      failedRecords.slice(0, 5).forEach(({ record, error }) => {
        console.log(`  - ${record.email} (${record.employee_id}): ${error}`);
      });
      if (failedRecords.length > 5) {
        console.log(`  ... and ${failedRecords.length - 5} more failed records`);
      }
    }

    // Display some sample inserted data
    console.log('\n🔍 Verifying upload with sample data...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('employees')
      .select('employee_id, first_name, last_name, email, department, status')
      .limit(5)
      .order('created_at', { ascending: false });

    if (sampleError) {
      console.warn(`⚠️  Could not fetch sample data: ${sampleError.message}`);
    } else if (sampleData && sampleData.length > 0) {
      console.log('📋 Latest uploaded employees:');
      sampleData.forEach(emp => {
        console.log(`  - ${emp.employee_id}: ${emp.first_name} ${emp.last_name} (${emp.email}) - ${emp.department || 'No dept'} - ${emp.status}`);
      });
    } else {
      console.log('ℹ️  No sample data retrieved (might be due to RLS policies)');
    }

    console.log('\n🎉 Employee upload process completed!');

  } catch (error) {
    console.error('❌ Error during upload:', error.message);
    console.error(error.stack);
  }
}

// Run the upload
uploadEmployees();