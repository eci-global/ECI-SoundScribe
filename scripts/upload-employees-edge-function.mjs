import fs from 'fs';

// Supabase configuration
const SUPABASE_URL = "https://qinkldgvejheppheykfl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4";

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

async function uploadEmployeesViaEdgeFunction() {
  try {
    console.log('🚀 Starting employee data upload via Edge Function...');

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

    console.log(`\n🚀 Calling Edge Function to upload ${employeeData.length} employees...`);

    // Call the Edge Function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        employees: employeeData
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Edge Function call failed:', result);
      return;
    }

    console.log('\n🎉 Upload completed successfully!');
    console.log('📋 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${result.summary.successful} employees`);
    console.log(`❌ Failed uploads: ${result.summary.failed} employees`);
    console.log(`📊 Total processed: ${result.summary.total_processed} employees`);
    console.log(`📊 Total in database: ${result.summary.total_in_database} employees`);

    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Error Details:');
      result.errors.forEach(error => {
        console.log(`  - ${error.email}: ${error.error}`);
      });
    }

  } catch (error) {
    console.error('❌ Error during upload:', error.message);
    console.error(error.stack);
  }
}

// Run the upload
uploadEmployeesViaEdgeFunction();