import { createClient } from "@supabase/supabase-js";

console.log("🔧 Creating admin user...");

const supabase = createClient(
  'https://qinkldgvejheppheykfl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU5MDQ0NywiZXhwIjoyMDY1MTY2NDQ3fQ.kzYjtO7X0ECTfydiyCrt13WD4hnoknlYThqVia-jwo4'
);

console.log("✅ Supabase client created");
console.log("📧 Creating user: dkoranteng@ecisolutions.com");

