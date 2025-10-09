import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'
import {
  ECIAnalysisResult,
  ECIBehaviorEvaluation,
  ECIBehaviorEvidence,
  ECI_BEHAVIOR_DEFINITIONS,
  createEmptyBehaviorEvaluation
} from '../_shared/eci-types.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface SupportAnalysisRequest {
  recording_id: string;
  transcript: string;
  duration: number;
  whisper_segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { recording_id, transcript, duration, whisper_segments }: SupportAnalysisRequest = await req.json()

    if (!recording_id || !transcript) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Recording ID and transcript are required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`🔄 Starting ECI support analysis for recording: ${recording_id}`)

    // Create Azure OpenAI client
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY')
    const azureApiVersion = '2024-10-01-preview'
    const deploymentName = Deno.env.get('AZURE_OPENAI_GPT4O_DEPLOYMENT') || 'gpt-4o'

    if (!azureEndpoint || !azureApiKey) {
      throw new Error('Azure OpenAI configuration missing')
    }

    const azureUrl = `${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${azureApiVersion}`

    // Create comprehensive ECI analysis prompt
    const prompt = `You are analyzing a customer support call using ECI's Quality Framework. Evaluate each behavior with YES/NO/UNCERTAIN and provide timestamped evidence.

TRANSCRIPT:
${transcript}

CALL DURATION: ${Math.round(duration / 60)} minutes

Analyze each ECI behavior and respond with JSON in this exact structure:
{
  "careForCustomer": {
    "extremeOwnershipAndHelpfulness": {
      "rating": "YES|NO|UNCERTAIN",
      "evidence": [{"timestamp": 123, "quote": "exact transcript quote", "context": "brief context", "type": "positive|negative"}],
      "briefTip": "1-2 sentence coaching tip",
      "detailedRecommendation": "comprehensive coaching guidance",
      "confidence": 0.85
    },
    "activeListening": { "rating": "...", "evidence": [...], "briefTip": "...", "detailedRecommendation": "...", "confidence": 0.0 },
    "empathy": { "rating": "...", "evidence": [...], "briefTip": "...", "detailedRecommendation": "...", "confidence": 0.0 },
    "toneAndPace": { "rating": "...", "evidence": [...], "briefTip": "...", "detailedRecommendation": "...", "confidence": 0.0 },
    "professionalism": { "rating": "...", "evidence": [...], "briefTip": "...", "detailedRecommendation": "...", "confidence": 0.0 },
    "customerConnection": { "rating": "...", "evidence": [...], "briefTip": "...", "detailedRecommendation": "...", "confidence": 0.0 }
  },
  "callResolution": {
    "followedProperProcedures": { "rating": "...", "evidence": [...], "briefTip": "...", "detailedRecommendation": "...", "confidence": 0.0 },
    "accurateInformation": { "rating": "...", "evidence": [...], "briefTip": "...", "detailedRecommendation": "...", "confidence": 0.0 }
  },
  "callFlow": {
    "opening": { "rating": "...", "evidence": [...], "briefTip": "...", "detailedRecommendation": "...", "confidence": 0.0 },
    "holdTransferProcedures": { "rating": "...", "evidence": [...], "briefTip": "...", "detailedRecommendation": "...", "confidence": 0.0 },
    "closing": { "rating": "...", "evidence": [...], "briefTip": "...", "detailedRecommendation": "...", "confidence": 0.0 },
    "documentation": { "rating": "...", "evidence": [...], "briefTip": "...", "detailedRecommendation": "...", "confidence": 0.0 }
  },
  "nonNegotiables": {
    "noDocumentation": { "violated": false, "evidence": [] },
    "securityVerification": { "violated": false, "evidence": [] },
    "unprofessionalism": { "violated": false, "evidence": [] }
  },
  "summary": {
    "strengths": ["list of demonstrated strengths"],
    "improvementAreas": ["list of areas needing work"],
    "briefOverallCoaching": "1-2 sentence overall coaching",
    "detailedOverallCoaching": "comprehensive overall analysis"
  }
}

BEHAVIOR DEFINITIONS:
- Extreme Ownership: Proactively works to resolve concerns, assures customer of steps taken
- Active Listening: Focused listening with verbal cues, paraphrasing, recalling details
- Empathy: Responds empathetically to emotions, validates concerns
- Tone and Pace: Reassuring, warm, sincere manner that builds trust, mirrors customer pace
- Professionalism: Courteous, polite, respectful, no interrupting, avoids jargon
- Customer Connection: Builds rapport, personable conversation, no awkward silences
- Proper Procedures: Uses available tools/systems, follows policies
- Accurate Information: Assesses full scope, provides correct/relevant info with timeframes
- Opening: Ready for call, uses proper greeting, applies company branding
- Hold/Transfer: Gets permission, thanks customer, follows procedures
- Closing: Offers additional help, outlines steps, warm pleasant close
- Documentation: Properly notates call with Problem, Action, Resolution (PAR)

EVALUATION RULES:
- YES: Clear evidence of behavior demonstrated well
- NO: Clear evidence behavior was absent or done poorly
- UNCERTAIN: Cannot determine confidently (manager review needed)
- Provide specific timestamps and quotes for evidence
- Brief tips should be actionable (1-2 sentences)
- Detailed recommendations should be comprehensive coaching
- Estimate timestamps if exact timing unavailable`

    // Make request to Azure OpenAI
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout for complex analysis

    let analysisResponse;
    try {
      const response = await fetch(azureUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': azureApiKey,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are an expert customer service analyst specializing in ECI Quality Framework evaluation. Provide detailed, evidence-based analysis with exact timestamps and quotes. Always respond in valid JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4000,
          temperature: 0, // Deterministic for consistent results
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Azure OpenAI API error:', response.status, errorText)
        throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`)
      }

      analysisResponse = await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('ECI analysis timed out after 60 seconds')
      }
      throw error
    }

    console.log('✅ Azure OpenAI ECI analysis completed')

    // Parse and validate the analysis result
    let analysisData;
    try {
      const content = analysisResponse.choices[0].message.content
      analysisData = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse analysis result:', parseError)
      throw new Error('Failed to parse AI analysis result')
    }

    // Create full ECI analysis result with metadata
    const processingTime = Date.now() - startTime
    const eciAnalysis: ECIAnalysisResult = {
      framework: 'ECI',
      analysisDate: new Date().toISOString(),
      recordingId: recording_id,
      careForCustomer: {
        extremeOwnershipAndHelpfulness: {
          ...analysisData.careForCustomer.extremeOwnershipAndHelpfulness,
          definition: ECI_BEHAVIOR_DEFINITIONS.extremeOwnershipAndHelpfulness
        },
        activeListening: {
          ...analysisData.careForCustomer.activeListening,
          definition: ECI_BEHAVIOR_DEFINITIONS.activeListening
        },
        empathy: {
          ...analysisData.careForCustomer.empathy,
          definition: ECI_BEHAVIOR_DEFINITIONS.empathy
        },
        toneAndPace: {
          ...analysisData.careForCustomer.toneAndPace,
          definition: ECI_BEHAVIOR_DEFINITIONS.toneAndPace
        },
        professionalism: {
          ...analysisData.careForCustomer.professionalism,
          definition: ECI_BEHAVIOR_DEFINITIONS.professionalism
        },
        customerConnection: {
          ...analysisData.careForCustomer.customerConnection,
          definition: ECI_BEHAVIOR_DEFINITIONS.customerConnection
        }
      },
      callResolution: {
        followedProperProcedures: {
          ...analysisData.callResolution.followedProperProcedures,
          definition: ECI_BEHAVIOR_DEFINITIONS.followedProperProcedures
        },
        accurateInformation: {
          ...analysisData.callResolution.accurateInformation,
          definition: ECI_BEHAVIOR_DEFINITIONS.accurateInformation
        }
      },
      callFlow: {
        opening: {
          ...analysisData.callFlow.opening,
          definition: ECI_BEHAVIOR_DEFINITIONS.opening
        },
        holdTransferProcedures: {
          ...analysisData.callFlow.holdTransferProcedures,
          definition: ECI_BEHAVIOR_DEFINITIONS.holdTransferProcedures
        },
        closing: {
          ...analysisData.callFlow.closing,
          definition: ECI_BEHAVIOR_DEFINITIONS.closing
        },
        documentation: {
          ...analysisData.callFlow.documentation,
          definition: ECI_BEHAVIOR_DEFINITIONS.documentation
        }
      },
      nonNegotiables: analysisData.nonNegotiables,
      summary: {
        ...analysisData.summary,
        managerReviewRequired: Object.values(analysisData.careForCustomer).concat(
          Object.values(analysisData.callResolution),
          Object.values(analysisData.callFlow)
        ).some((behavior: any) => behavior.rating === 'UNCERTAIN'),
        behaviorCounts: {
          yes: 0,
          no: 0,
          uncertain: 0
        }
      },
      metadata: {
        model: 'gpt-4o',
        processingTime,
        segmentsAnalyzed: whisper_segments?.length || 0,
        transcriptLength: transcript.length
      }
    };

    // Calculate behavior counts
    const allBehaviors = [
      ...Object.values(eciAnalysis.careForCustomer),
      ...Object.values(eciAnalysis.callResolution),
      ...Object.values(eciAnalysis.callFlow)
    ];

    eciAnalysis.summary.behaviorCounts = {
      yes: allBehaviors.filter(b => b.rating === 'YES').length,
      no: allBehaviors.filter(b => b.rating === 'NO').length,
      uncertain: allBehaviors.filter(b => b.rating === 'UNCERTAIN').length
    };

    // Store the analysis in the database
    const { error: updateError } = await supabase
      .from('recordings')
      .update({
        support_analysis: eciAnalysis,
        updated_at: new Date().toISOString()
      })
      .eq('id', recording_id)

    if (updateError) {
      console.error('Database update error:', updateError)
      throw new Error(`Failed to store ECI analysis: ${updateError.message}`)
    }

    console.log(`✅ ECI analysis stored for recording: ${recording_id} (${processingTime}ms)`)

    return new Response(
      JSON.stringify({
        success: true,
        analysis: eciAnalysis,
        message: 'ECI analysis completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ ECI analysis error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'ECI analysis failed',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})