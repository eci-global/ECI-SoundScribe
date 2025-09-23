import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const { data: recordings, error } = await supabase
  .from('recordings')
  .select('id, title, status')
  .order('created_at', { ascending: false })
  .limit(5);

if (error) {
  console.log('Error:', error.message);
} else {
  console.log('Recent recordings:');
  recordings?.forEach((r, i) => console.log(`${i+1}. ${r.title} (${r.id})`));
}