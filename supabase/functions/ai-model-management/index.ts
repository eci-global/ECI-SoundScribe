import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ModelConfiguration {
  id?: string;
  name: string;
  service_type: 'azure_openai' | 'openai' | 'whisper' | 'custom';
  model_name: string;
  deployment_name?: string;
  endpoint_url?: string;
  api_version?: string;
  parameters?: any;
  rate_limits?: any;
  is_active?: boolean;
  is_default?: boolean;
  cost_per_1k_tokens?: number;
  monthly_budget_limit?: number;
  description?: string;
  tags?: string[];
}

interface ConnectionTestResult {
  success: boolean;
  response_time?: number;
  error?: string;
  details?: any;
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

    // Extract action from path (last segment after 'ai-model-management')
    const action = pathSegments[pathSegments.length - 1]

    switch (method) {
      case 'GET': {
        if (action === 'stats') {
          // Get configuration statistics
          const { data, error } = await supabase.rpc('get_model_configuration_stats')

          if (error) {
            console.error('Error getting model configuration stats:', error)
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
          // Get specific model configuration by ID
          const configId = url.searchParams.get('id')

          const { data, error } = await supabase.rpc('get_model_configuration_by_id', {
            p_config_id: configId
          })

          if (error) {
            console.error('Error getting model configuration:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ configuration: data[0] || null }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get all model configurations with optional filtering
        const serviceType = url.searchParams.get('service_type')
        const isActive = url.searchParams.get('is_active')
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const offset = parseInt(url.searchParams.get('offset') || '0')

        const { data, error } = await supabase.rpc('get_model_configurations', {
          p_service_type: serviceType,
          p_is_active: isActive ? isActive === 'true' : null,
          p_limit: limit,
          p_offset: offset
        })

        if (error) {
          console.error('Error getting model configurations:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ configurations: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'POST': {
        const body = await req.json() as ModelConfiguration & { test_connection?: boolean }

        if (action === 'test-connection') {
          // Test connection to AI service
          const { id } = body

          if (!id) {
            return new Response(
              JSON.stringify({ error: 'Configuration ID is required for connection test' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const testResult = await testModelConnection(id, supabase)

          return new Response(
            JSON.stringify({ test_result: testResult }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create new model configuration
        const {
          name,
          service_type,
          model_name,
          deployment_name,
          endpoint_url,
          api_version,
          parameters,
          rate_limits,
          is_active,
          is_default,
          cost_per_1k_tokens,
          monthly_budget_limit,
          description,
          tags
        } = body

        if (!name || !service_type || !model_name) {
          return new Response(
            JSON.stringify({ error: 'name, service_type, and model_name are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase.rpc('create_model_configuration', {
          p_name: name,
          p_service_type: service_type,
          p_model_name: model_name,
          p_deployment_name: deployment_name,
          p_endpoint_url: endpoint_url,
          p_api_version: api_version,
          p_parameters: parameters || {},
          p_rate_limits: rate_limits || {},
          p_is_active: is_active !== false,
          p_is_default: is_default === true,
          p_cost_per_1k_tokens: cost_per_1k_tokens,
          p_monthly_budget_limit: monthly_budget_limit,
          p_description: description,
          p_tags: tags || []
        })

        if (error) {
          console.error('Error creating model configuration:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ configuration_id: data }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'PUT': {
        const body = await req.json() as ModelConfiguration & { id: string }
        const {
          id,
          name,
          service_type,
          model_name,
          deployment_name,
          endpoint_url,
          api_version,
          parameters,
          rate_limits,
          is_active,
          is_default,
          cost_per_1k_tokens,
          monthly_budget_limit,
          description,
          tags
        } = body

        if (!id) {
          return new Response(
            JSON.stringify({ error: 'id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase.rpc('update_model_configuration', {
          p_config_id: id,
          p_name: name,
          p_service_type: service_type,
          p_model_name: model_name,
          p_deployment_name: deployment_name,
          p_endpoint_url: endpoint_url,
          p_api_version: api_version,
          p_parameters: parameters,
          p_rate_limits: rate_limits,
          p_is_active: is_active,
          p_is_default: is_default,
          p_cost_per_1k_tokens: cost_per_1k_tokens,
          p_monthly_budget_limit: monthly_budget_limit,
          p_description: description,
          p_tags: tags
        })

        if (error) {
          console.error('Error updating model configuration:', error)
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
        const configId = url.searchParams.get('id')

        if (!configId) {
          return new Response(
            JSON.stringify({ error: 'id parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabase
          .from('ai_model_configurations')
          .update({
            is_active: false,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', configId)

        if (error) {
          console.error('Error deleting model configuration:', error)
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
    console.error('Unexpected error in ai-model-management:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper function to test model connection
async function testModelConnection(configId: string, supabase: any): Promise<ConnectionTestResult> {
  try {
    // Get configuration (with full API key for super admins)
    const { data: config, error } = await supabase
      .from('ai_model_configurations')
      .select('*')
      .eq('id', configId)
      .single()

    if (error || !config) {
      return {
        success: false,
        error: 'Configuration not found'
      }
    }

    const startTime = Date.now()

    // Test connection based on provider
    let testResult: ConnectionTestResult

    switch (config.provider) {
      case 'azure_openai':
        testResult = await testAzureOpenAIConnection(config)
        break
      case 'openai':
        testResult = await testOpenAIConnection(config)
        break
      case 'anthropic':
        testResult = await testAnthropicConnection(config)
        break
      default:
        return {
          success: false,
          error: `Unsupported provider: ${config.provider}`
        }
    }

    const responseTime = Date.now() - startTime
    testResult.response_time = responseTime

    // Update health status based on test result
    await supabase
      .from('ai_model_configurations')
      .update({
        health_status: testResult.success ? 'healthy' : 'unhealthy',
        last_health_check: new Date().toISOString()
      })
      .eq('id', configId)

    return testResult

  } catch (error) {
    console.error('Error testing model connection:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Provider-specific connection test functions
async function testAzureOpenAIConnection(config: any): Promise<ConnectionTestResult> {
  try {
    const response = await fetch(`${config.endpoint_url}openai/models?api-version=${config.api_version}`, {
      method: 'GET',
      headers: {
        'api-key': config.api_key,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }

    const data = await response.json()

    return {
      success: true,
      details: {
        models_available: data.data?.length || 0,
        endpoint_healthy: true
      }
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testOpenAIConnection(config: any): Promise<ConnectionTestResult> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }

    return {
      success: true,
      details: {
        endpoint_healthy: true
      }
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testAnthropicConnection(config: any): Promise<ConnectionTestResult> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.api_key,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model_type,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Test' }]
      })
    })

    // Anthropic returns 200 for valid API keys, even with minimal requests
    return {
      success: response.status === 200 || response.status === 400, // 400 might be expected for test request
      details: {
        endpoint_healthy: true
      }
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/*
API Documentation:

GET /ai-model-management
- Query params: provider, is_active, limit, offset
- Returns: { configurations: ModelConfiguration[] }

GET /ai-model-management?id=uuid
- Returns: { configuration: ModelConfiguration }

GET /ai-model-management/health
- Returns: { health_status: HealthMetrics[] }

POST /ai-model-management
- Body: { name, provider, model_type, endpoint_url, ... }
- Returns: { configuration_id: string }

POST /ai-model-management/test-connection
- Body: { id: string }
- Returns: { test_result: ConnectionTestResult }

PUT /ai-model-management
- Body: { id, name?, provider?, ... }
- Returns: { success: true, configuration: ModelConfiguration }

DELETE /ai-model-management?id=uuid
- Returns: { success: true }
*/