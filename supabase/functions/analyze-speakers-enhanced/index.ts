// @ts-nocheck
// @ts-ignore — Deno remote URL import is resolved at runtime
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { createAzureOpenAIChatClient } from '../_shared/azure-openai.ts';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

// -------------------------------------------------
//  Minimal Deno typing for the TypeScript compiler
// -------------------------------------------------
declare const Deno: { env: { get(key: string): string | undefined } };

interface SpeakerAnalysis {
  identified_speakers: Array<{
    name: string;
    confidence: number;
    segments: Array<{
      start_time: number;
      end_time: number;
      text: string;
    }>;
    characteristics: {
      role?: string;
      organization?: string;
      introduction_method?: string;
    };
  }>;
  unidentified_segments: Array<{
    speaker_label: string;
    segments: Array<{
      start_time: number;
      end_time: number;
      text: string;
    }>;
  }>;
  confidence_score: number;
  analysis_method: string;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    console.log('Function started: analyze-speakers-enhanced');
    
    const { recordingId, transcript, userId } = await req.json();
    
    if (!recordingId || !transcript || !userId) {
      return createErrorResponse('Recording ID, transcript, and user ID are required', 400);
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get recording details for context
    const { data: recording, error: fetchError } = await supabaseClient
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single();

    if (fetchError || !recording) {
      return createErrorResponse('Recording not found', 404);
    }

    // Create AI client
    const azureClient = createAzureOpenAIChatClient();

    // Enhanced speaker identification prompt
    const speakerAnalysisPrompt = `You are an expert at analyzing business call transcripts to identify speakers by their real names. Your task is to carefully analyze the transcript and extract speaker identities with high confidence.

TRANSCRIPT TO ANALYZE:
${transcript}

ANALYSIS INSTRUCTIONS:
1. Look for explicit introductions: "Hi, this is [Name]", "My name is [Name]", "[Name] here"
2. Look for others addressing speakers: "Thanks [Name]", "What do you think, [Name]?", "[Name], could you..."
3. Look for role/title mentions: "As the [title], I...", "Speaking for [department]..."
4. Look for organization mentions: "[Name] from [Company]", "I'm [Name] at [Organization]"
5. Analyze conversation patterns to match generic "Speaker X" labels with actual names
6. Consider email signatures, phone greetings, or meeting context clues

CONFIDENCE SCORING:
- HIGH (0.8-1.0): Multiple explicit mentions, clear introductions
- MEDIUM (0.5-0.79): Contextual clues, others addressing them by name
- LOW (0.3-0.49): Inferred from role/organization context
- VERY LOW (0.1-0.29): Weak contextual evidence

OUTPUT FORMAT (JSON):
{
  "identified_speakers": [
    {
      "name": "John Smith",
      "confidence": 0.9,
      "segments": [
        {
          "start_time": 0,
          "end_time": 30,
          "text": "Hi everyone, this is John Smith from ACME Corp."
        }
      ],
      "characteristics": {
        "role": "Sales Manager",
        "organization": "ACME Corp",
        "introduction_method": "self_introduction"
      }
    }
  ],
  "unidentified_segments": [
    {
      "speaker_label": "Speaker 2",
      "segments": [
        {
          "start_time": 45,
          "end_time": 60,
          "text": "Thank you for the presentation."
        }
      ]
    }
  ],
  "confidence_score": 0.8,
  "analysis_method": "ai_pattern_recognition"
}

IMPORTANT:
- Only include speakers you can identify with reasonable confidence (>0.3)
- Preserve original segment timings if available
- Include ALL segments for each identified speaker
- Be conservative - it's better to leave someone unidentified than to guess incorrectly
- Look for patterns where "Speaker 1" consistently represents the same person throughout the call`;

    console.log('Analyzing speakers with AI...');
    
    const aiResponse = await azureClient.createChatCompletion({
      messages: [
        {
          role: 'system',
          content: 'You are an expert transcript analyst specializing in speaker identification. Respond only with valid JSON.'
        },
        {
          role: 'user',
          content: speakerAnalysisPrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.1, // Low temperature for consistent analysis
    });

    const analysisResult = aiResponse.choices[0]?.message?.content;

    if (!analysisResult) {
      return createErrorResponse('Failed to generate speaker analysis', 500);
    }

    // Parse AI response
    let speakerAnalysis: SpeakerAnalysis;
    try {
      speakerAnalysis = JSON.parse(analysisResult);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return createErrorResponse('Failed to parse speaker analysis', 500);
    }

    // Update recording with enhanced speaker data
    const { error: updateError } = await supabaseClient
      .from('recordings')
      .update({ 
        ai_speaker_analysis: speakerAnalysis,
        ai_speakers_updated_at: new Date().toISOString()
      })
      .eq('id', recordingId);

    if (updateError) {
      console.error('Failed to update recording with speaker analysis:', updateError);
      return createErrorResponse('Failed to save speaker analysis', 500);
    }

    // Log usage
    const promptTokens = Math.ceil(speakerAnalysisPrompt.length / 4);
    const completionTokens = Math.ceil(analysisResult.length / 4);
    await logUsage(supabaseClient, userId, recordingId, 'gpt-4o-mini-2024-07-18', promptTokens, completionTokens, 'speaker-analysis');

    console.log(`Speaker analysis completed for recording ${recordingId}`);

    return createSuccessResponse({ 
      success: true,
      speaker_analysis: speakerAnalysis,
      identified_count: speakerAnalysis.identified_speakers.length,
      confidence_score: speakerAnalysis.confidence_score,
      model: 'gpt-4o-mini-2024-07-18',
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      }
    });

  } catch (error) {
    console.error('Error in speaker analysis function:', error);
    return createErrorResponse(
      'Speaker analysis failed', 
      500, 
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});