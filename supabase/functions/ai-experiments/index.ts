import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AIExperiment {
  id?: string;
  name: string;
  description: string;
  experiment_type: 'prompt_optimization' | 'model_comparison' | 'parameter_tuning' | 'response_format' | 'custom';
  status?: 'draft' | 'running' | 'completed' | 'paused' | 'archived' | 'promoting';
  config_a: any;
  config_b: any;
  traffic_split?: number;
  start_date?: string;
  end_date?: string;
  sample_size?: number;
  current_participants?: number;
  success_metric?: string;
  statistical_significance?: number;
  confidence_level?: number;
  results?: any;
  winner?: 'A' | 'B' | 'inconclusive';
  auto_promote?: boolean;
  hypothesis?: string;
  notes?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

interface ExperimentParticipant {
  experiment_id: string;
  variant: 'A' | 'B';
  user_id?: string;
  session_id?: string;
  metadata?: any;
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

    // Extract action from path (last segment after 'ai-experiments')
    const action = pathSegments[pathSegments.length - 1]

    switch (method) {
      case 'GET': {
        if (action === 'stats') {
          // Get AI experiments statistics
          const { data, error } = await supabase.rpc('get_ai_experiments_stats')

          if (error) {
            console.error('Error getting AI experiments stats:', error)
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

        if (action === 'performance-data') {
          // Get experiment performance data
          const experimentId = url.searchParams.get('experiment_id')

          if (!experimentId) {
            return new Response(
              JSON.stringify({ error: 'experiment_id parameter is required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const { data, error } = await supabase.rpc('get_experiment_performance_data', {
            p_experiment_id: experimentId
          })

          if (error) {
            console.error('Error getting experiment performance data:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ performance_data: data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (url.searchParams.has('id')) {
          // Get specific AI experiment by ID
          const experimentId = url.searchParams.get('id')

          const { data, error } = await supabase.rpc('get_ai_experiment_by_id', {
            p_experiment_id: experimentId
          })

          if (error) {
            console.error('Error getting AI experiment:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ experiment: data[0] || null }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get all AI experiments with optional filtering
        const status = url.searchParams.get('status')
        const experimentType = url.searchParams.get('experiment_type')
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const offset = parseInt(url.searchParams.get('offset') || '0')

        const { data, error } = await supabase.rpc('get_ai_experiments', {
          p_status: status,
          p_experiment_type: experimentType,
          p_limit: limit,
          p_offset: offset
        })

        if (error) {
          console.error('Error getting AI experiments:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ experiments: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'POST': {
        const body = await req.json()

        if (action === 'start') {
          // Start an experiment
          const { experiment_id } = body

          if (!experiment_id) {
            return new Response(
              JSON.stringify({ error: 'experiment_id is required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const { data, error } = await supabase.rpc('start_ai_experiment', {
            p_experiment_id: experiment_id
          })

          if (error) {
            console.error('Error starting experiment:', error)
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

        if (action === 'stop') {
          // Stop an experiment
          const { experiment_id, reason } = body

          if (!experiment_id) {
            return new Response(
              JSON.stringify({ error: 'experiment_id is required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const { data, error } = await supabase.rpc('stop_ai_experiment', {
            p_experiment_id: experiment_id,
            p_reason: reason || 'manual_stop'
          })

          if (error) {
            console.error('Error stopping experiment:', error)
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

        if (action === 'record-participant') {
          // Record experiment participant
          const {
            experiment_id,
            variant,
            user_id,
            session_id,
            metadata
          } = body as ExperimentParticipant

          if (!experiment_id || !variant) {
            return new Response(
              JSON.stringify({ error: 'experiment_id and variant are required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const { data, error } = await supabase.rpc('record_experiment_participant', {
            p_experiment_id: experiment_id,
            p_variant: variant,
            p_user_id: user_id,
            p_session_id: session_id,
            p_metadata: metadata || {}
          })

          if (error) {
            console.error('Error recording participant:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ participant_id: data }),
            { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (action === 'update-results') {
          // Update experiment results
          const {
            experiment_id,
            results,
            statistical_significance,
            winner
          } = body

          if (!experiment_id || !results) {
            return new Response(
              JSON.stringify({ error: 'experiment_id and results are required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const { data, error } = await supabase.rpc('update_experiment_results', {
            p_experiment_id: experiment_id,
            p_results: results,
            p_statistical_significance: statistical_significance,
            p_winner: winner
          })

          if (error) {
            console.error('Error updating experiment results:', error)
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

        // Create new AI experiment
        const {
          name,
          description,
          experiment_type,
          config_a,
          config_b,
          traffic_split,
          sample_size,
          success_metric,
          confidence_level,
          auto_promote,
          hypothesis,
          notes,
          tags
        } = body as AIExperiment

        if (!name || !description || !experiment_type || !config_a || !config_b) {
          return new Response(
            JSON.stringify({ error: 'name, description, experiment_type, config_a, and config_b are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase.rpc('create_ai_experiment', {
          p_name: name,
          p_description: description,
          p_experiment_type: experiment_type,
          p_config_a: config_a,
          p_config_b: config_b,
          p_traffic_split: traffic_split || 50,
          p_sample_size: sample_size || 1000,
          p_success_metric: success_metric || 'accuracy',
          p_confidence_level: confidence_level || 0.95,
          p_auto_promote: auto_promote || false,
          p_hypothesis: hypothesis,
          p_notes: notes,
          p_tags: tags || []
        })

        if (error) {
          console.error('Error creating AI experiment:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ experiment_id: data }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'PUT': {
        const body = await req.json() as AIExperiment & { id: string }

        if (!body.id) {
          return new Response(
            JSON.stringify({ error: 'id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const {
          id,
          name,
          description,
          config_a,
          config_b,
          traffic_split,
          sample_size,
          success_metric,
          confidence_level,
          auto_promote,
          hypothesis,
          notes,
          tags
        } = body

        const { data, error } = await supabase.rpc('update_ai_experiment', {
          p_experiment_id: id,
          p_name: name,
          p_description: description,
          p_config_a: config_a,
          p_config_b: config_b,
          p_traffic_split: traffic_split,
          p_sample_size: sample_size,
          p_success_metric: success_metric,
          p_confidence_level: confidence_level,
          p_auto_promote: auto_promote,
          p_hypothesis: hypothesis,
          p_notes: notes,
          p_tags: tags
        })

        if (error) {
          console.error('Error updating AI experiment:', error)
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
        const experimentId = url.searchParams.get('id')

        if (!experimentId) {
          return new Response(
            JSON.stringify({ error: 'id parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase.rpc('delete_ai_experiment', {
          p_experiment_id: experimentId
        })

        if (error) {
          console.error('Error deleting AI experiment:', error)
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
    console.error('Unexpected error in ai-experiments:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/*
API Documentation:

GET /ai-experiments
- Query params: status, experiment_type, limit, offset
- Returns: { experiments: AIExperiment[] }

GET /ai-experiments?id=uuid
- Returns: { experiment: AIExperiment }

GET /ai-experiments/stats
- Returns: { stats: ExperimentStatistics }

GET /ai-experiments/performance-data?experiment_id=uuid
- Returns: { performance_data: ExperimentPerformanceData }

POST /ai-experiments
- Body: { name, description, experiment_type, config_a, config_b, ... }
- Returns: { experiment_id: string }

POST /ai-experiments/start
- Body: { experiment_id: string }
- Returns: { success: boolean }

POST /ai-experiments/stop
- Body: { experiment_id: string, reason?: string }
- Returns: { success: boolean }

POST /ai-experiments/record-participant
- Body: { experiment_id: string, variant: 'A'|'B', user_id?, session_id?, metadata? }
- Returns: { participant_id: string }

POST /ai-experiments/update-results
- Body: { experiment_id: string, results: object, statistical_significance?, winner? }
- Returns: { success: boolean }

PUT /ai-experiments
- Body: { id, name?, description?, ... }
- Returns: { success: true }

DELETE /ai-experiments?id=uuid
- Returns: { success: true }
*/

