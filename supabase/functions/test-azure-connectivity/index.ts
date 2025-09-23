import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Testing Azure backend connectivity...')
    
    // Test different Azure backend URLs
    const azureUrls = [
      'https://soundscribe-backend.azurewebsites.net',
      'https://soundscribe-backend.onrender.com',
      'http://localhost:3001'
    ]
    
    const results = []
    
    for (const url of azureUrls) {
      try {
        console.log(`Testing ${url}...`)
        
        // Test health endpoint
        const healthResponse = await fetch(`${url}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        })
        
        const healthData = healthResponse.ok ? await healthResponse.text() : 'Failed'
        
        results.push({
          url,
          health: {
            status: healthResponse.status,
            ok: healthResponse.ok,
            data: healthData
          }
        })
        
        console.log(`${url} health check: ${healthResponse.status} - ${healthData}`)
        
      } catch (error) {
        console.error(`${url} failed:`, error.message)
        results.push({
          url,
          health: {
            status: 'error',
            ok: false,
            error: error.message
          }
        })
      }
    }
    
    // Also test a sample process-audio endpoint
    const workingBackend = results.find(r => r.health.ok)
    if (workingBackend) {
      try {
        console.log(`Testing process-audio endpoint on ${workingBackend.url}...`)
        
        const testResponse = await fetch(`${workingBackend.url}/api/process-audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recording_id: 'test-id',
            file_url: 'test-url',
            test_mode: true
          })
        })
        
        const testData = await testResponse.text()
        results.push({
          url: workingBackend.url,
          processAudio: {
            status: testResponse.status,
            data: testData
          }
        })
        
      } catch (error) {
        console.error('Process audio test failed:', error.message)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        summary: {
          totalTested: azureUrls.length,
          working: results.filter(r => r.health?.ok).length,
          failed: results.filter(r => !r.health?.ok).length
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Azure connectivity test error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})