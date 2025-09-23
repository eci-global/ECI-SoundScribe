import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PromptTemplate {
  id?: string;
  name: string;
  category: string;
  description: string;
  template_content: string;
  variables?: any[];
  is_active?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the Authorization header and validate admin access
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Create authenticated Supabase client for admin validation
    const authSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Set the user session for proper auth context
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create service role client for admin validation (more reliable than setting session)
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check admin role directly using service role client and user ID
    const { data: adminCheck, error: adminError } = await serviceSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (adminError || !adminCheck) {
      console.error('Admin check failed:', adminError || 'User is not an admin')
      return new Response(
        JSON.stringify({ error: 'Admin access required for AI Control Center' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create service role Supabase client for actual operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const url = new URL(req.url)
    const method = req.method
    const pathSegments = url.pathname.split('/').filter(Boolean)

    // Extract action from path (last segment after 'ai-prompt-management')
    const action = pathSegments[pathSegments.length - 1]

    switch (method) {
      case 'GET': {
        if (action === 'categories') {
          // Get prompt categories using direct query
          const { data, error } = await supabase
            .from('ai_prompt_templates')
            .select('category')
            .neq('category', null)

          if (error) {
            console.error('Error getting prompt categories:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Group by category and count
          const categoryGroups = data.reduce((acc: any, item: any) => {
            if (!acc[item.category]) {
              acc[item.category] = 0;
            }
            acc[item.category]++;
            return acc;
          }, {});

          const categories = Object.entries(categoryGroups).map(([category, count]) => ({
            category,
            template_count: count
          }));

          return new Response(
            JSON.stringify({ categories }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (url.searchParams.has('id')) {
          // Get specific template by ID
          const templateId = url.searchParams.get('id')
          const { data, error } = await supabase
            .from('ai_prompt_templates')
            .select('*')
            .eq('id', templateId)
            .single()

          if (error) {
            console.error('Error getting prompt template:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ template: data || null }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get all templates with optional filtering
        const category = url.searchParams.get('category')
        const isActive = url.searchParams.get('is_active')
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const offset = parseInt(url.searchParams.get('offset') || '0')

        let query = supabase
          .from('ai_prompt_templates')
          .select('*')

        if (category) {
          query = query.eq('category', category)
        }

        if (isActive !== null) {
          query = query.eq('is_active', isActive === 'true')
        }

        query = query
          .range(offset, offset + limit - 1)
          .order('created_at', { ascending: false })

        const { data, error } = await query

        if (error) {
          console.error('Error getting prompt templates:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ templates: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'POST': {
        const body = await req.json() as PromptTemplate & { template_id?: string; variable_values?: Record<string, string> }

        if (action === 'render') {
          // Render template with variables
          const { template_id, variable_values } = body

          if (!template_id) {
            return new Response(
              JSON.stringify({ error: 'template_id is required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Get template and render variables
          const { data: template, error } = await supabase
            .from('ai_prompt_templates')
            .select('template')
            .eq('id', template_id)
            .single()

          if (error) {
            console.error('Error getting template for rendering:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Simple variable replacement
          let renderedContent = template.template;
          if (variable_values) {
            Object.entries(variable_values).forEach(([key, value]) => {
              const regex = new RegExp(`{{${key}}}`, 'g');
              renderedContent = renderedContent.replace(regex, value);
            });
          }

          return new Response(
            JSON.stringify({ rendered_content: renderedContent }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (action === 'duplicate') {
          // Duplicate template
          const { template_id, name } = body

          if (!template_id || !name) {
            return new Response(
              JSON.stringify({ error: 'template_id and name are required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const { data, error } = await supabase.rpc('duplicate_prompt_template', {
            p_template_id: template_id,
            p_new_name: name
          })

          if (error) {
            console.error('Error duplicating prompt template:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ template_id: data }),
            { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create new template
        const { name, category, description, template_content, variables, is_active } = body

        if (!name || !category || !description || !template_content) {
          return new Response(
            JSON.stringify({ error: 'name, category, description, and template_content are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase.rpc('create_prompt_template', {
          p_name: name,
          p_category: category,
          p_description: description,
          p_template_content: template_content,
          p_variables: variables || [],
          p_is_active: is_active !== false
        })

        if (error) {
          console.error('Error creating prompt template:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ template_id: data }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'PUT': {
        const body = await req.json() as PromptTemplate & { id: string }
        const { id, name, category, description, template_content, variables, is_active } = body

        if (!id) {
          return new Response(
            JSON.stringify({ error: 'id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase.rpc('update_prompt_template', {
          p_template_id: id,
          p_name: name,
          p_category: category,
          p_description: description,
          p_template_content: template_content,
          p_variables: variables,
          p_is_active: is_active
        })

        if (error) {
          console.error('Error updating prompt template:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'DELETE': {
        const templateId = url.searchParams.get('id')

        if (!templateId) {
          return new Response(
            JSON.stringify({ error: 'id parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase.rpc('delete_prompt_template', {
          p_template_id: templateId
        })

        if (error) {
          console.error('Error deleting prompt template:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Unexpected error in ai-prompt-management:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/*
API Documentation:

GET /ai-prompt-management
- Query params: category, is_active, limit, offset
- Returns: { templates: PromptTemplate[] }

GET /ai-prompt-management?id=uuid
- Returns: { template: PromptTemplate }

GET /ai-prompt-management/categories
- Returns: { categories: { category: string, template_count: number }[] }

POST /ai-prompt-management
- Body: { name, category, description, template_content, variables?, is_active? }
- Returns: { template_id: string }

POST /ai-prompt-management/render
- Body: { template_id, variable_values }
- Returns: { rendered_content: string }

POST /ai-prompt-management/duplicate
- Body: { template_id, name }
- Returns: { template_id: string }

PUT /ai-prompt-management
- Body: { id, name?, category?, description?, template_content?, variables?, is_active? }
- Returns: { success: true }

DELETE /ai-prompt-management?id=uuid
- Returns: { success: true }
*/