import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Function to parse CSV
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/["']/g, ''));

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/["']/g, ''));

    // Skip rows with insufficient data
    if (values.length < headers.length || !values[1] || !values[2] || !values[3]) {
      console.log(`Skipping incomplete row ${i}: ${values.join(',')}`);
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
      // Handle DD/MM/YYYY HH:MM format
      const dateStr = csvRecord.hire_date.split(' ')[0]; // Take only the date part
      const [day, month, year] = dateStr.split('/');
      hireDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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

  return {
    employee_id: csvRecord.employee_id?.toString() || `EMP_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    first_name: csvRecord.first_name || 'Unknown',
    last_name: csvRecord.last_name || 'Unknown',
    email: csvRecord.email,
    department: csvRecord.department || null,
    role: csvRecord.role || null,
    manager_id: null, // We'll handle manager relationships in a separate step
    team_id: null, // We'll handle team relationships in a separate step
    hire_date: hireDate,
    status: status,
    voice_profile: null,
    // user_id will be null initially - would need to be mapped to actual auth.users
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

    // Check if employees table exists
    const { data: tables, error: tablesError } = await supabase
      .from('employees')
      .select('count', { count: 'exact', head: true });

    if (tablesError) {
      console.error('❌ Error checking employees table:', tablesError.message);
      return;
    }

    console.log('✅ Employees table exists and is accessible');

    // Insert employees in batches
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < employeeData.length; i += batchSize) {
      const batch = employeeData.slice(i, i + batchSize);
      console.log(`📤 Uploading batch ${Math.floor(i/batchSize) + 1} (${batch.length} records)...`);

      const { data, error } = await supabase
        .from('employees')
        .upsert(batch, {
          onConflict: 'email',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error(`❌ Error uploading batch ${Math.floor(i/batchSize) + 1}:`, error.message);
        errorCount += batch.length;

        // Try inserting individual records to identify specific issues
        for (const record of batch) {
          const { error: individualError } = await supabase
            .from('employees')
            .upsert(record, { onConflict: 'email' });

          if (individualError) {
            console.error(`❌ Failed to insert employee ${record.email}:`, individualError.message);
          } else {
            successCount++;
            console.log(`✅ Successfully inserted ${record.email}`);
          }
        }
      } else {
        successCount += batch.length;
        console.log(`✅ Successfully uploaded batch ${Math.floor(i/batchSize) + 1}`);
      }
    }

    console.log('\n📋 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${successCount} employees`);
    console.log(`❌ Failed uploads: ${errorCount} employees`);
    console.log(`📊 Total processed: ${successCount + errorCount} employees`);

    // Display some sample inserted data
    const { data: sampleData } = await supabase
      .from('employees')
      .select('employee_id, first_name, last_name, email, department, status')
      .limit(5);

    if (sampleData) {
      console.log('\n📋 Sample uploaded employees:');
      sampleData.forEach(emp => {
        console.log(`  - ${emp.first_name} ${emp.last_name} (${emp.email}) - ${emp.department} - ${emp.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Error during upload:', error.message);
    console.error(error.stack);
  }
}

// Run the upload
uploadEmployees();