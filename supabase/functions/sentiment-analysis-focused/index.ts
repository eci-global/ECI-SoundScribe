// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { createAzureOpenAIChatClient } from '../_shared/azure-openai.ts';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

interface RequestBody {
  recording_id: string;
  transcript?: string;
}

/**
 * Focused sentiment analysis - ONLY sentiment detection, no topics or speakers
 */
function extractPureSentimentMoments(analysis: any) {
  console.log('🔍 Extracting sentiment moments from analysis:', {
    hasAnalysis: !!analysis,
    analysisKeys: analysis ? Object.keys(analysis) : [],
    sentimentMomentsCount: analysis?.sentiment_moments?.length || 0
  });
  
  const moments = [];
  
  // Only process direct sentiment moments from AI
  if (analysis.sentiment_moments && Array.isArray(analysis.sentiment_moments)) {
    analysis.sentiment_moments.forEach((moment: any, index: number) => {
      console.log(`📝 Processing moment ${index}:`, {
        hasText: !!moment.text,
        hasSentimentScore: typeof moment.sentiment_score === 'number',
        confidence: moment.confidence,
        type: moment.type
      });
      
      // Validate moment has required fields
      if (!moment.text || !moment.sentiment_score || moment.confidence < 0.6) {
        console.warn(`⚠️ Skipping moment ${index} - missing required fields:`, moment);
        return; // Skip low-quality moments
      }
      
      moments.push({
        recording_id: '', // Will be set when inserting
        type: determineMomentType(moment.sentiment_score),
        start_time: moment.start_time || 0,
        end_time: moment.end_time || moment.start_time + 5,
        label: `"${moment.text.substring(0, 40)}..."`,
        description: moment.text,
        tooltip: `${moment.speaker || 'Speaker'}: ${moment.reason || 'Sentiment detected'}`,
        metadata: {
          confidence: moment.confidence,
          sentiment_score: moment.sentiment_score,
          intensity: Math.abs(moment.sentiment_score),
          speaker: moment.speaker || 'Unknown',
          text: moment.text,
          sentiment: moment.sentiment_score > 0.2 ? 'positive' : moment.sentiment_score < -0.2 ? 'negative' : 'neutral',
          source: 'ai_focused_sentiment_analysis'
        }
      });
    });
  }
  
  console.log(`✅ Extracted ${moments.length} valid sentiment moments`);
  return moments;
}

function determineMomentType(sentimentScore: number): string {
  if (sentimentScore > 0.5) return 'positive_peak';
  if (sentimentScore < -0.5) return 'negative_dip';
  if (sentimentScore > 0.2) return 'positive_moment';
  if (sentimentScore < -0.2) return 'sentiment_neg';
  return 'emotional_moment';
}

Deno.serve(async (req: Request) => {
  console.log('🎯 Sentiment Analysis Focused function called with method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    console.log('Function started: sentiment-analysis-focused');
    
    const { recording_id, transcript }: RequestBody = await req.json();
    
    if (!recording_id) {
      console.error('Missing recording_id in request');
      return createErrorResponse('Recording ID is required', 400);
    }

    console.log(`Focused sentiment analysis for recording: ${recording_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('🔧 Supabase configuration check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseKey?.length || 0
    });
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      return createErrorResponse('Supabase configuration missing', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recording with transcript if not provided
    let recordingTranscript = transcript;
    if (!recordingTranscript) {
      try {
        console.log('📖 Fetching transcript from database...');
        const { data: recording, error: recordingError } = await supabase
          .from('recordings')
          .select('transcript, title')
          .eq('id', recording_id)
          .single();

        if (recordingError) {
          console.error(`Error fetching recording: ${recordingError.message}`);
          return createErrorResponse(`Recording not found: ${recordingError.message}`, 404);
        }

        console.log('📄 Recording data:', {
          hasRecording: !!recording,
          hasTranscript: !!recording?.transcript,
          transcriptLength: recording?.transcript?.length || 0,
          title: recording?.title
        });

        if (!recording || !recording.transcript) {
          console.log('No transcript available yet for recording:', recording_id);
          return createSuccessResponse({ 
            success: false, 
            message: 'Transcript not available yet. Please process the recording first.',
            needs_processing: true
          }, 202);
        }
        
        recordingTranscript = recording.transcript;
      } catch (dbError) {
        console.error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
        return createErrorResponse(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`, 500);
      }
    }

    console.log('📝 Transcript details:', {
      hasTranscript: !!recordingTranscript,
      transcriptLength: recordingTranscript?.length || 0,
      transcriptPreview: recordingTranscript?.substring(0, 100) + '...'
    });

    // Check Azure OpenAI configuration
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    
    console.log('🔧 Azure OpenAI configuration check:', {
      hasEndpoint: !!azureEndpoint,
      hasApiKey: !!azureApiKey,
      endpointLength: azureEndpoint?.length || 0,
      keyLength: azureApiKey?.length || 0
    });
    
    if (!azureEndpoint || !azureApiKey) {
      console.error('Azure OpenAI configuration missing');
      return createErrorResponse('Azure OpenAI configuration missing', 500);
    }

    // Focused sentiment analysis with improved prompt
    try {
      console.log('🤖 Creating focused sentiment analysis...');
      
      const azureClient = createAzureOpenAIChatClient();
      
      const messages = [
        {
          role: 'system' as const,
          content: `You are a specialized sentiment analysis expert. Analyze this business conversation transcript ONLY for emotional moments and sentiment shifts.

          CRITICAL: Return ONLY valid JSON with no additional text.

          JSON Structure:
          {
            "sentiment_moments": [
              {
                "start_time": 120,
                "end_time": 140,
                "speaker": "Customer",
                "text": "Exact quote showing the emotional moment",
                "sentiment_score": 0.8,
                "confidence": 0.9,
                "reason": "Brief explanation why this moment is emotionally significant"
              }
            ]
          }

          DETECTION CRITERIA:
          1. STRONG EMOTIONS: Excitement, frustration, surprise, disappointment, enthusiasm
          2. CLEAR REACTIONS: "Love it!", "This won't work", "Perfect!", "I'm concerned"
          3. SENTIMENT SHIFTS: Moving from negative to positive or vice versa
          4. DECISION LANGUAGE: "Let's do it", "Not interested", "We'll proceed"
          
          SENTIMENT SCORING (-1.0 to +1.0):
          - +0.8 to +1.0: Very positive (excited, thrilled, "love it")
          - +0.3 to +0.7: Positive (pleased, satisfied, "sounds good")
          - -0.3 to +0.3: Neutral (factual discussion)
          - -0.3 to -0.7: Negative (concerned, disappointed, "not sure")
          - -0.8 to -1.0: Very negative (angry, frustrated, "won't work")

          QUALITY REQUIREMENTS:
          - Only include moments with clear emotional content
          - Confidence must be 0.6 or higher
          - Text must be actual quotes from the conversation
          - Focus on customer emotional reactions and decision points
          - Maximum 8 moments total

          Return ONLY the JSON object.`
        },
        {
          role: 'user' as const,
          content: `Analyze this conversation for emotional moments and sentiment shifts. Return ONLY JSON:\n\n${recordingTranscript}`
        }
      ];

      console.log('📤 Sending request to Azure OpenAI...');
      console.log('📊 Request details:', {
        messageCount: messages.length,
        systemMessageLength: messages[0].content.length,
        userMessageLength: messages[1].content.length,
        totalLength: messages[0].content.length + messages[1].content.length
      });

      const response = await azureClient.createChatCompletion({
        messages,
        max_tokens: 1200,
        temperature: 0.1, // Very low for consistent sentiment detection
      });

      console.log('📥 Received response from Azure OpenAI');
      console.log('📊 Response details:', {
        hasChoices: !!response.choices,
        choicesLength: response.choices?.length || 0,
        hasMessage: !!response.choices?.[0]?.message,
        hasContent: !!response.choices?.[0]?.message?.content
      });

      const analysisText = response.choices[0]?.message?.content?.trim();
      
      if (!analysisText) {
        console.error('No response from Azure OpenAI');
        return createErrorResponse('Failed to get response from Azure OpenAI', 500);
      }

      console.log('Raw Azure OpenAI response length:', analysisText.length);
      console.log('Raw Azure OpenAI response preview:', analysisText.substring(0, 200) + '...');

      // Parse the JSON response
      let analysis;
      try {
        // Clean the response to ensure it's valid JSON
        const cleanedResponse = analysisText
          .replace(/^```json\s*/, '')
          .replace(/\s*```$/, '')
          .replace(/^```\s*/, '')
          .trim();
        
        console.log('🧹 Cleaned response preview:', cleanedResponse.substring(0, 200) + '...');
        
        analysis = JSON.parse(cleanedResponse);
        console.log('✅ Parsed analysis successfully:', {
          sentimentMoments: analysis.sentiment_moments?.length || 0,
          analysisKeys: Object.keys(analysis)
        });
      } catch (parseError) {
        console.error('❌ JSON parsing error:', parseError);
        console.error('Response was:', analysisText);
        return createErrorResponse(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`, 500);
      }

      // Extract sentiment moments
      const sentimentMoments = extractPureSentimentMoments(analysis);
      
      console.log(`🎯 Extracted ${sentimentMoments.length} high-quality sentiment moments`);

      // Clear existing sentiment moments to avoid duplication
      console.log('🗑️ Clearing existing sentiment moments...');
      const { error: deleteError } = await supabase
        .from('ai_moments')
        .delete()
        .eq('recording_id', recording_id)
        .in('type', ['sentiment_neg', 'positive_peak', 'negative_dip', 'emotional_moment', 'sentiment_shift']);

      if (deleteError) {
        console.error('❌ Error clearing existing moments:', deleteError);
      } else {
        console.log('✅ Cleared existing sentiment moments');
      }

      // Insert new sentiment moments
      if (sentimentMoments.length > 0) {
        console.log('💾 Inserting new sentiment moments...');
        const momentsToInsert = sentimentMoments.map(moment => ({
          ...moment,
          recording_id: recording_id
        }));

        const { data: insertedMoments, error: insertError } = await supabase
          .from('ai_moments')
          .insert(momentsToInsert);

        if (insertError) {
          console.error('❌ Error inserting sentiment moments:', insertError);
          return createErrorResponse(`Failed to save sentiment moments: ${insertError.message}`, 500);
        }

        console.log(`✅ Successfully inserted ${insertedMoments?.length || 0} sentiment moments`);
      } else {
        console.log('ℹ️ No sentiment moments to insert');
      }

      // Update recording status
      console.log('📝 Updating recording status...');
      const { error: updateError } = await supabase
        .from('recordings')
        .update({ 
          ai_speakers_updated_at: new Date().toISOString(),
          ai_speaker_analysis: {
            ...analysis,
            sentiment_analysis_complete: true,
            analysis_type: 'focused_sentiment',
            processed_at: new Date().toISOString()
          }
        })
        .eq('id', recording_id);

      if (updateError) {
        console.error('❌ Error updating recording status:', updateError);
      } else {
        console.log('✅ Updated recording status');
      }

      console.log('🎉 Focused sentiment analysis completed successfully');

      return createSuccessResponse({
        success: true,
        recording_id: recording_id,
        sentiment_moments_count: sentimentMoments.length,
        message: 'Focused sentiment analysis completed successfully'
      });

    } catch (aiError) {
      console.error('❌ Azure OpenAI analysis error:', aiError);
      console.error('Error details:', {
        name: aiError.name,
        message: aiError.message,
        stack: aiError.stack
      });
      return createErrorResponse(`AI analysis failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`, 500);
    }

  } catch (error) {
    console.error('💥 Function error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return createErrorResponse(`Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
});