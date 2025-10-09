import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmployeeData {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  role?: string;
  manager_id?: string;
  team_id?: string;
  hire_date?: string;
  status?: string;
  voice_profile?: any;
  user_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    if (req.method === 'POST') {
      const { employees } = await req.json();

      if (!employees || !Array.isArray(employees)) {
        return new Response(
          JSON.stringify({ error: 'Invalid request: employees array is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log(`Uploading ${employees.length} employees...`);

      // Process employees in batches
      const batchSize = 50;
      let successCount = 0;
      let errorCount = 0;
      const errors: any[] = [];

      for (let i = 0; i < employees.length; i += batchSize) {
        const batch = employees.slice(i, i + batchSize);
        // Transform: preserve legacy code in employee_code; allow DB to control employee_id
        const transformedBatch = batch.map((emp: any) => {
          const e: any = { ...emp };
          if (e.employee_id && !e.employee_code) {
            e.employee_code = String(e.employee_id);
          }
          // Remove employee_id since it's now a generated column
          delete e.employee_id;
          return e;
        });
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(employees.length/batchSize)}`);

        const { data, error } = await supabaseClient
          .from('employees')
          .upsert(transformedBatch, {
            onConflict: 'email',
            ignoreDuplicates: false
          })
          .select();

        if (error) {
          console.error(`Batch ${Math.floor(i/batchSize) + 1} error:`, error);
          // Try individual inserts for this batch
          for (const employee of transformedBatch) {
            const { data: singleData, error: singleError } = await supabaseClient
              .from('employees')
              .upsert(employee, { onConflict: 'email' })
              .select();

            if (singleError) {
              console.error(`Failed to insert ${employee.email}:`, singleError);
              errorCount++;
              errors.push({
                email: employee.email,
                error: singleError.message
              });
            } else {
              successCount++;
              console.log(`✅ Inserted ${employee.first_name} ${employee.last_name}`);
            }
          }
        } else {
          successCount += batch.length;
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} successful: ${batch.length} employees`);
        }
      }

      // Get final count
      const { count } = await supabaseClient
        .from('employees')
        .select('*', { count: 'exact', head: true });

      const result = {
        success: true,
        message: `Upload completed`,
        summary: {
          total_processed: successCount + errorCount,
          successful: successCount,
          failed: errorCount,
          total_in_database: count || 0
        },
        errors: errors.slice(0, 10) // Limit error details
      };

      console.log('Upload summary:', result.summary);

      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // GET request - return current employee count
    if (req.method === 'GET') {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { count } = await supabaseClient
        .from('employees')
        .select('*', { count: 'exact', head: true });

      return new Response(
        JSON.stringify({
          current_employee_count: count || 0,
          message: 'Employee upload endpoint ready'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in upload-employees function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
