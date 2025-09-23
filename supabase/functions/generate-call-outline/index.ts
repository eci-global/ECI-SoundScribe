// @ts-nocheck
// @ts-ignore — Deno remote URL import is resolved at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { createAzureOpenAIChatClient } from '../_shared/azure-openai.ts';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

// -------------------------------------------------
//  Minimal Deno typing for the TypeScript compiler
// -------------------------------------------------
declare const Deno: { env: { get(key: string): string | undefined } };

interface RequestBody {
  recording_id: string;
  transcript?: string;
  content_type?: string;
}

interface TopicSegment {
  topic: string;
  start_time: number;
  end_time: number;
  confidence: number;
  key_points: string[];
  speakers: string[];
  summary?: string;
  is_ai_generated: boolean;
}

async function logUsage(
  supabase: any,
  userId: string,
  recordingId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  operation: string
) {
  try {
    // Calculate cost (Azure OpenAI pricing)
    const pricing = {
      'gpt-4o-mini-2024-07-18': { input: 0.00015, output: 0.0006 },
      'gpt-4o': { input: 0.005, output: 0.015 }
    };
    
    const modelPricing = pricing[model as keyof typeof pricing] || pricing['gpt-4o-mini-2024-07-18'];
    const cost = (promptTokens / 1000) * modelPricing.input + (completionTokens / 1000) * modelPricing.output;

    await supabase
      .from('ai_usage_logs')
      .insert({
        user_id: userId,
        recording_id: recordingId,
        operation: operation,
        model_used: model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        estimated_cost: cost,
        provider: 'azure-openai'
      });
  } catch (error) {
    console.error('Failed to log usage:', error);
  }
}

function getCallOutlinePrompt(contentType: string): string {
  const prompts = {
    sales_call: `Analyze this sales call transcript and create a detailed call outline. Focus on:
    - Opening/introduction phase
    - Discovery/needs assessment
    - Product demonstration or presentation
    - Objection handling or concerns
    - Pricing and negotiation discussions
    - Next steps and commitments
    - Closing and follow-up plans`,
    
    customer_support: `Analyze this customer support call and create a detailed outline. Focus on:
    - Issue identification and problem statement
    - Troubleshooting steps taken
    - Resolution provided or attempted
    - Customer satisfaction check
    - Follow-up requirements`,
    
    team_meeting: `Analyze this team meeting transcript and create a detailed outline. Focus on:
    - Agenda items discussed
    - Updates and status reports
    - Decisions made
    - Action items assigned
    - Next meeting planning`,
    
    training_session: `Analyze this training session and create a detailed outline. Focus on:
    - Learning objectives covered
    - Key concepts explained
    - Examples and demonstrations
    - Questions and clarifications
    - Assessment or evaluation`,
    
    default: `Analyze this business call transcript and create a detailed outline. Focus on:
    - Main topics and themes discussed
    - Key decisions or agreements
    - Action items and next steps
    - Important insights or takeaways`
  };
  
  return prompts[contentType as keyof typeof prompts] || prompts.default;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    console.log('Function started: generate-call-outline (Azure OpenAI)');
    
    const { recording_id, transcript, content_type }: RequestBody = await req.json();
    
    if (!recording_id) {
      console.error('Missing recording_id in request');
      return createErrorResponse('Recording ID is required', 400);
    }

    console.log(`Generating call outline for recording: ${recording_id}, content_type: ${content_type}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      return createErrorResponse('Supabase configuration missing', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recording with transcript if not provided
    let recordingTranscript = transcript;
    let recordingContentType = content_type;
    
    if (!recordingTranscript) {
      try {
        const { data: recording, error: recordingError } = await supabase
          .from('recordings')
          .select('transcript, title, content_type, user_id')
          .eq('id', recording_id)
          .single();

        if (recordingError) {
          console.error(`Error fetching recording: ${recordingError.message}`);
          return createErrorResponse(`Recording not found: ${recordingError.message}`, 404);
        }

        if (!recording || !recording.transcript) {
          console.log('No transcript available yet for recording:', recording_id);
          return createSuccessResponse({ 
            success: false, 
            message: 'Transcript not available yet. Please process the recording first.',
            needs_processing: true
          }, 202);
        }
        
        recordingTranscript = recording.transcript;
        recordingContentType = recording.content_type || 'default';
      } catch (dbError) {
        console.error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
        return createErrorResponse(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`, 500);
      }
    }

    // Check Azure OpenAI configuration
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    if (!azureEndpoint || !azureApiKey) {
      console.error('Azure OpenAI configuration missing');
      return createErrorResponse('Azure OpenAI configuration missing', 500);
    }

    // Generate call outline using AI
    try {
      console.log('Creating Azure OpenAI chat completion for call outline generation...');
      
      const azureClient = createAzureOpenAIChatClient();
      
      const callSpecificPrompt = getCallOutlinePrompt(recordingContentType || 'default');
      
      const messages = [
        {
          role: 'system' as const,
          content: `You are an expert meeting analyst. ${callSpecificPrompt}

          Return a JSON response with this exact structure:
          {
            "outline": [
              {
                "topic": "Introduction and Agenda",
                "start_time": 0,
                "end_time": 120,
                "confidence": 0.9,
                "key_points": [
                  "Participants introduced themselves",
                  "Meeting agenda was reviewed",
                  "Timeline and objectives established"
                ],
                "speakers": ["John Smith", "Sarah Wilson"],
                "summary": "Brief summary of what was discussed in this section",
                "category": "opening"
              }
            ],
            "meeting_flow": {
              "structure_quality": "high|medium|low",
              "total_topics": 5,
              "engagement_level": "high|medium|low",
              "outcome_clarity": "clear|moderate|unclear"
            },
            "key_insights": [
              "Main takeaway or insight from the call",
              "Important decision or agreement made"
            ]
          }

          Guidelines:
          - Create 4-8 topic segments that represent the natural flow of the conversation
          - Each topic should be 30 seconds to 10 minutes long
          - Extract 2-5 key points per topic that capture the essence of what was discussed
          - Identify actual speaker names when mentioned, otherwise use descriptive roles
          - Assign confidence scores: 0.8-0.9 for clear topics, 0.6-0.8 for moderate, 0.4-0.6 for inferred
          - Categories can be: opening, discovery, presentation, discussion, objection, negotiation, decision, action_items, closing
          - Key insights should be high-level takeaways that would be valuable for review`
        },
        {
          role: 'user' as const,
          content: `Analyze this business call transcript and create a detailed outline:\n\n${recordingTranscript}`
        }
      ];

      const response = await azureClient.createChatCompletion({
        messages,
        max_tokens: 1500,
        temperature: 0.2,
      });

      const analysisText = response.choices[0]?.message?.content?.trim();

      if (!analysisText) {
        console.error('Failed to generate outline: Empty response');
        return createErrorResponse('Failed to generate outline: Empty response', 500);
      }

      let analysis: any = {};
      try {
        analysis = JSON.parse(analysisText || '{}');
      } catch (parseError) {
        console.warn('Failed to parse outline JSON, using fallback');
        analysis = {
          outline: [{
            topic: "General Discussion",
            start_time: 0,
            end_time: 300,
            confidence: 0.5,
            key_points: ["Topics discussed during the call"],
            speakers: ["Participant 1", "Participant 2"],
            summary: "Call outline generation failed, manual review needed",
            category: "discussion"
          }],
          meeting_flow: {
            structure_quality: "low",
            total_topics: 1,
            engagement_level: "unknown",
            outcome_clarity: "unclear"
          },
          key_insights: ["Manual analysis required due to processing error"]
        };
      }

      // Ensure analysis has required structure
      if (!analysis.outline || !Array.isArray(analysis.outline)) {
        analysis.outline = [];
      }

      // Save enhanced topic segments to database
      try {
        // Clear existing topic segments for this recording
        await supabase
          .from('topic_segments')
          .delete()
          .eq('recording_id', recording_id);

        // Insert enhanced topic segments with additional data
        if (analysis.outline && Array.isArray(analysis.outline)) {
          const topicSegments = analysis.outline.map((segment: any, index: number) => ({
            recording_id: recording_id,
            topic: segment.topic || `Topic ${index + 1}`,
            start_time: segment.start_time || (index * 60),
            end_time: segment.end_time || ((index + 1) * 60),
            confidence: segment.confidence || 0.5,
            // Store additional outline data as JSON
            metadata: {
              key_points: segment.key_points || [],
              speakers: segment.speakers || [],
              summary: segment.summary || '',
              category: segment.category || 'discussion',
              is_ai_generated: true
            }
          }));

          const { error: topicError } = await supabase
            .from('topic_segments')
            .insert(topicSegments);

          if (topicError) {
            console.warn('Error inserting topic segments:', topicError);
          } else {
            console.log(`Inserted ${topicSegments.length} topic segments`);
          }
        }

        // Update recordings table with outline metadata
        const { error: updateError } = await supabase
          .from('recordings')
          .update({
            ai_generated_at: new Date().toISOString(),
            // Store meeting flow analysis in ai_insights
            ai_insights: {
              ...analysis.meeting_flow,
              key_insights: analysis.key_insights,
              outline_generated_at: new Date().toISOString(),
              outline_quality: analysis.meeting_flow?.structure_quality || 'medium'
            }
          })
          .eq('id', recording_id);

        if (updateError) {
          console.error('Error updating recording with outline metadata:', updateError);
        }

      } catch (dbError) {
        console.error(`Database error saving outline: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
        return createErrorResponse('Failed to save outline to database', 500);
      }

      // Log usage
      const promptTokens = Math.ceil((messages[0].content.length + messages[1].content.length) / 4);
      const completionTokens = Math.ceil(analysisText.length / 4);
      await logUsage(supabase, 'system', recording_id, 'gpt-4o-mini-2024-07-18', promptTokens, completionTokens, 'generate-call-outline');

      console.log(`Successfully generated call outline for recording ${recording_id} using Azure OpenAI`);

      return createSuccessResponse({
        success: true,
        outline: analysis.outline,
        meeting_flow: analysis.meeting_flow,
        key_insights: analysis.key_insights,
        content_type: recordingContentType,
        provider: 'azure-openai',
        model: 'gpt-4o-mini-2024-07-18',
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens
        }
      });

    } catch (azureError) {
      console.error(`Azure OpenAI API error: ${azureError instanceof Error ? azureError.message : 'Unknown error'}`);
      return createErrorResponse('Call outline generation failed', 500, azureError instanceof Error ? azureError.message : 'Unknown error');
    }

  } catch (error) {
    console.error('Error in generate-call-outline:', error);
    return createErrorResponse('An unexpected error occurred', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});