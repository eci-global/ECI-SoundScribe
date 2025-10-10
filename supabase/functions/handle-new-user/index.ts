// Supabase Edge Function: handle-new-user
// Auth Hook that runs when a new user signs up (SSO or email/password)
// Automatically creates profile and assigns default 'user' role

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    email: string;
    raw_user_meta_data?: {
      full_name?: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      custom_claims?: {
        firstName?: string;
        lastName?: string;
      };
    };
  };
  schema: string;
  old_record: null | any;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const payload: WebhookPayload = await req.json();
    console.log("Webhook payload:", JSON.stringify(payload, null, 2));

    // Only process INSERT events on auth.users
    if (payload.type !== "INSERT" || payload.table !== "users") {
      return new Response(
        JSON.stringify({ message: "Not a user insert event" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const { id: userId, email, raw_user_meta_data } = payload.record;

    // Extract user name from metadata (check custom_claims first for Okta SSO)
    const fullName =
      raw_user_meta_data?.full_name ||
      raw_user_meta_data?.name ||
      (raw_user_meta_data?.custom_claims?.firstName && raw_user_meta_data?.custom_claims?.lastName
        ? `${raw_user_meta_data.custom_claims.firstName} ${raw_user_meta_data.custom_claims.lastName}`
        : null) ||
      (raw_user_meta_data?.firstName && raw_user_meta_data?.lastName
        ? `${raw_user_meta_data.firstName} ${raw_user_meta_data.lastName}`
        : null) ||
      raw_user_meta_data?.custom_claims?.firstName ||
      raw_user_meta_data?.firstName ||
      email.split("@")[0]; // fallback to email username

    console.log(`Processing new user: ${userId} (${email})`);

    // 1. Create or update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: email,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
          ignoreDuplicates: false,
        }
      );

    if (profileError) {
      console.error("Error creating profile:", profileError);
      throw profileError;
    }

    console.log(`Profile created for user: ${userId}`);

    // 2. Check if user already has a role
    const { data: existingRole, error: roleCheckError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleCheckError && roleCheckError.code !== "PGRST116") {
      // PGRST116 = no rows returned (expected for new users)
      console.error("Error checking existing role:", roleCheckError);
      throw roleCheckError;
    }

    // 3. Assign default 'user' role if no role exists
    if (!existingRole) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "user",
          created_at: new Date().toISOString(),
        });

      if (roleError) {
        console.error("Error assigning role:", roleError);
        throw roleError;
      }

      console.log(`Default 'user' role assigned to: ${userId}`);
    } else {
      console.log(`User ${userId} already has role: ${existingRole.role}`);
    }

    return new Response(
      JSON.stringify({
        message: "User profile and role created successfully",
        userId,
        email,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in handle-new-user:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
