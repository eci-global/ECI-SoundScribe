import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScoringRubric {
  id?: string;
  name: string;
  category: 'bdr_criteria' | 'coaching_framework' | 'quality_assessment' | 'performance_evaluation' | 'custom';
  description?: string;
  criteria: any;
  scale_type: '0-4' | '1-5' | 'percentage' | 'binary' | 'custom';
  scale_definition: any;
  is_active?: boolean;
  is_default?: boolean;
  usage_count?: number;
  validation_rules?: any;
  accuracy_metrics?: any;
  version?: number;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

interface RubricValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  total_weight?: number;
  criteria_count?: number;
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

    // Create Supabase client with service role key for admin operations and user context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    )

    // Set the auth context for RLS
    const { data: user, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate admin access using our security function
    const { data: hasAccess, error: accessError } = await supabase.rpc('validate_admin_api_access', {
      required_permission: 'admin'
    })

    if (accessError || !hasAccess) {
      console.error('Access validation error:', accessError)
      return new Response(
        JSON.stringify({ error: 'Admin access required for AI Control Center' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const method = req.method
    const pathSegments = url.pathname.split('/').filter(Boolean)

    // Extract action from path (last segment after 'ai-scoring-rubrics')
    const action = pathSegments[pathSegments.length - 1]

    switch (method) {
      case 'GET': {
        if (action === 'stats') {
          // Get scoring rubric statistics
          const { data, error } = await supabase.rpc('get_scoring_rubrics_stats')

          if (error) {
            console.error('Error getting scoring rubric stats:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ stats: data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (url.searchParams.has('id')) {
          // Get specific scoring rubric by ID
          const rubricId = url.searchParams.get('id')

          const { data, error } = await supabase.rpc('get_scoring_rubric_by_id', {
            p_rubric_id: rubricId
          })

          if (error) {
            console.error('Error getting scoring rubric:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ rubric: data[0] || null }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get all scoring rubrics with optional filtering
        const category = url.searchParams.get('category')
        const isActive = url.searchParams.get('is_active')
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const offset = parseInt(url.searchParams.get('offset') || '0')

        const { data, error } = await supabase.rpc('get_scoring_rubrics', {
          p_category: category,
          p_is_active: isActive ? isActive === 'true' : null,
          p_limit: limit,
          p_offset: offset
        })

        if (error) {
          console.error('Error getting scoring rubrics:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ rubrics: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'POST': {
        const body = await req.json()

        if (action === 'validate-criteria') {
          // Validate rubric criteria structure
          const { criteria, scale_type } = body

          if (!criteria) {
            return new Response(
              JSON.stringify({ error: 'Criteria is required for validation' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const { data, error } = await supabase.rpc('validate_rubric_criteria', {
            p_criteria: criteria,
            p_scale_type: scale_type || '0-4'
          })

          if (error) {
            console.error('Error validating criteria:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ validation_result: data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create new scoring rubric
        const {
          name,
          category,
          description,
          criteria,
          scale_type,
          scale_definition,
          is_active,
          is_default,
          validation_rules,
          tags
        } = body as ScoringRubric

        if (!name || !category) {
          return new Response(
            JSON.stringify({ error: 'name and category are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase.rpc('create_scoring_rubric', {
          p_name: name,
          p_category: category,
          p_description: description,
          p_criteria: criteria || {},
          p_scale_type: scale_type || '0-4',
          p_scale_definition: scale_definition || {},
          p_is_active: is_active !== false,
          p_is_default: is_default === true,
          p_validation_rules: validation_rules || {},
          p_tags: tags || []
        })

        if (error) {
          console.error('Error creating scoring rubric:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ rubric_id: data }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'PUT': {
        const body = await req.json() as ScoringRubric & { id: string }

        if (action === 'increment-usage') {
          // Increment usage count for a rubric
          const { id } = body

          if (!id) {
            return new Response(
              JSON.stringify({ error: 'Rubric ID is required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const { data, error } = await supabase.rpc('increment_rubric_usage', {
            p_rubric_id: id
          })

          if (error) {
            console.error('Error incrementing rubric usage:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ success: data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (action === 'update-accuracy') {
          // Update accuracy metrics for a rubric
          const { id, accuracy_metrics } = body

          if (!id || !accuracy_metrics) {
            return new Response(
              JSON.stringify({ error: 'Rubric ID and accuracy_metrics are required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const { data, error } = await supabase.rpc('update_rubric_accuracy', {
            p_rubric_id: id,
            p_accuracy_metrics: accuracy_metrics
          })

          if (error) {
            console.error('Error updating rubric accuracy:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ success: data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update existing scoring rubric
        const {
          id,
          name,
          category,
          description,
          criteria,
          scale_type,
          scale_definition,
          is_active,
          is_default,
          validation_rules,
          tags
        } = body

        if (!id) {
          return new Response(
            JSON.stringify({ error: 'id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase.rpc('update_scoring_rubric', {
          p_rubric_id: id,
          p_name: name,
          p_category: category,
          p_description: description,
          p_criteria: criteria,
          p_scale_type: scale_type,
          p_scale_definition: scale_definition,
          p_is_active: is_active,
          p_is_default: is_default,
          p_validation_rules: validation_rules,
          p_tags: tags
        })

        if (error) {
          console.error('Error updating scoring rubric:', error)
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
        const rubricId = url.searchParams.get('id')

        if (!rubricId) {
          return new Response(
            JSON.stringify({ error: 'id parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase.rpc('delete_scoring_rubric', {
          p_rubric_id: rubricId
        })

        if (error) {
          console.error('Error deleting scoring rubric:', error)
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
    console.error('Unexpected error in ai-scoring-rubrics:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/*
API Documentation:

GET /ai-scoring-rubrics
- Query params: category, is_active, limit, offset
- Returns: { rubrics: ScoringRubric[] }

GET /ai-scoring-rubrics?id=uuid
- Returns: { rubric: ScoringRubric }

GET /ai-scoring-rubrics/stats
- Returns: { stats: RubricStatistics }

POST /ai-scoring-rubrics
- Body: { name, category, description?, criteria?, scale_type?, ... }
- Returns: { rubric_id: string }

POST /ai-scoring-rubrics/validate-criteria
- Body: { criteria: object, scale_type?: string }
- Returns: { validation_result: RubricValidationResult }

PUT /ai-scoring-rubrics
- Body: { id, name?, category?, ... }
- Returns: { success: true }

PUT /ai-scoring-rubrics/increment-usage
- Body: { id: string }
- Returns: { success: boolean }

PUT /ai-scoring-rubrics/update-accuracy
- Body: { id: string, accuracy_metrics: object }
- Returns: { success: boolean }

DELETE /ai-scoring-rubrics?id=uuid
- Returns: { success: true }
*/

