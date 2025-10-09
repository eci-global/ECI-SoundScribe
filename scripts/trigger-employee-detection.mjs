import { createClient } from '@supabase/supabase-js';

// Use production Supabase credentials
const SUPABASE_URL = 'https://qinkldgvejheppheykfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function triggerEmployeeDetection() {
  console.log('🚀 Triggering bulk employee name extraction...\n');

  try {
    // Call the bulk-extract-employee-names Edge Function
    const { data, error } = await supabase.functions.invoke('bulk-extract-employee-names', {
      body: {
        limit: 20,
        skip_existing: false
      }
    });

    if (error) {
      console.error('❌ Error invoking function:', error);
      throw error;
    }

    console.log('✅ Bulk extraction completed!');
    console.log('📊 Results:', JSON.stringify(data, null, 2));
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Refresh Milan Jandu\'s profile page');
    console.log('   2. Go to the "Recordings" tab');
    console.log('   3. Look for detection badges on recordings');
    console.log('   4. Hover over badges to see detection method and confidence');

  } catch (error) {
    console.error('❌ Failed to trigger employee detection:', error);
    process.exit(1);
  }
}

// Run the script
triggerEmployeeDetection().catch(console.error);
