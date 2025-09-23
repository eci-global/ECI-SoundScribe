import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  try {
    // Get a single recording to see the structure
    const { data: recordings, error } = await supabase
      .from('recordings')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error fetching recordings:', error);
      return;
    }

    if (recordings && recordings.length > 0) {
      console.log('📊 Recording table columns:');
      const columns = Object.keys(recordings[0]);
      columns.forEach(column => {
        console.log(`   - ${column}: ${typeof recordings[0][column]}`);
      });
      
      console.log('\n📋 Sample recording data:');
      console.log(JSON.stringify(recordings[0], null, 2));
    } else {
      console.log('📭 No recordings found in database');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkSchema(); 