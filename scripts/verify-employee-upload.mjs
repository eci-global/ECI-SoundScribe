// Simple script to verify the employee upload was successful

const SUPABASE_URL = "https://qinkldgvejheppheykfl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4";

async function verifyEmployeeUpload() {
  try {
    console.log('🔍 Verifying employee upload...');

    // Call the Edge Function GET endpoint to check current count
    const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-employees`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Error checking employee count:', result);
      return;
    }

    console.log('✅ Verification successful!');
    console.log(`📊 Current employee count: ${result.current_employee_count}`);
    console.log(`💬 Status: ${result.message}`);

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

// Run verification
verifyEmployeeUpload();