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

/**
 * Extract sentiment moments from AI analysis and transcript
 */
function extractSentimentMoments(analysis: any, transcript: string) {
  const moments = [];
  
  // First, extract direct sentiment moments from AI analysis
  if (analysis.sentiment_moments && Array.isArray(analysis.sentiment_moments)) {
    analysis.sentiment_moments.forEach((moment: any) => {
      moments.push({
        recording_id: '', // Will be set when inserting
        type: moment.type || 'emotional_moment',
        start_time: moment.start_time || 0,
        end_time: moment.end_time || moment.start_time + 5,
        label: moment.text ? `"${moment.text.substring(0, 50)}..."` : 'Sentiment Moment',
        description: moment.reason || moment.text || 'Emotional moment detected',
        tooltip: `${moment.speaker || 'Speaker'}: ${moment.reason || 'Sentiment shift'}`,
        metadata: {
          confidence: moment.confidence || 0.8,
          sentiment_score: moment.sentiment_score || 0,
          intensity: Math.abs(moment.sentiment_score || 0),
          speaker: moment.speaker || 'Unknown',
          text: moment.text,
          source: 'ai_sentiment_analysis'
        }
      });
    });
  }
  
  // Extract sentiment moments from topics as backup
  if (analysis.topics && Array.isArray(analysis.topics)) {
    analysis.topics.forEach((topic: any, index: number) => {
      const sentiment = topic.sentiment || 'neutral';
      const confidence = topic.confidence || 0.5;
      
      // Lower threshold for better detection, but prioritize high-confidence moments
      if (sentiment === 'positive' && confidence > 0.4) {
        moments.push({
          recording_id: '', // Will be set when inserting
          type: 'positive_peak',
          start_time: topic.start_time || 0,
          end_time: topic.end_time || topic.start_time + 15,
          label: `${topic.name || 'Positive Discussion'}`,
          description: topic.summary || `Positive sentiment in ${topic.name}`,
          tooltip: `Positive discussion about ${topic.name}`,
          metadata: {
            confidence: confidence,
            sentiment_score: 0.6,
            intensity: confidence,
            speaker: topic.speakers?.[0] || 'Unknown',
            topic_id: index,
            source: 'ai_topic_analysis'
          }
        });
      } else if (sentiment === 'negative' && confidence > 0.4) {
        moments.push({
          recording_id: '', // Will be set when inserting
          type: 'sentiment_neg',
          start_time: topic.start_time || 0,
          end_time: topic.end_time || topic.start_time + 15,
          label: `${topic.name || 'Concern Raised'}`,
          description: topic.summary || `Concern about ${topic.name}`,
          tooltip: `Negative feedback about ${topic.name}`,
          metadata: {
            confidence: confidence,
            sentiment_score: -0.6,
            intensity: confidence,
            speaker: topic.speakers?.[0] || 'Unknown',
            topic_id: index,
            source: 'ai_topic_analysis'
          }
        });
      }
      
      // Extract objections as negative sentiment
      if (topic.objections && Array.isArray(topic.objections) && topic.objections.length > 0) {
        moments.push({
          recording_id: '', // Will be set when inserting
          type: 'negative_dip',
          start_time: topic.start_time || 0,
          end_time: topic.end_time || topic.start_time + 20,
          label: `Objection: ${topic.name}`,
          description: `Customer objection raised: ${topic.objections[0]}`,
          tooltip: `Objection needs addressing: ${topic.objections[0]}`,
          metadata: {
            confidence: 0.8,
            sentiment_score: -0.6,
            intensity: 0.8,
            speaker: topic.speakers?.[0] || 'Customer',
            objections: topic.objections,
            source: 'ai_objection_detection'
          }
        });
      }
      
      // Extract action items as positive momentum
      if (topic.action_items && Array.isArray(topic.action_items) && topic.action_items.length > 0) {
        moments.push({
          recording_id: '', // Will be set when inserting
          type: 'positive_peak',
          start_time: topic.start_time || 0,
          end_time: topic.end_time || topic.start_time + 15,
          label: `Next Steps Agreed`,
          description: `Action items defined: ${topic.action_items[0]}`,
          tooltip: `Progress made with clear next steps`,
          metadata: {
            confidence: 0.9,
            sentiment_score: 0.8,
            intensity: 0.7,
            speaker: 'Both',
            action_items: topic.action_items,
            source: 'ai_action_detection'
          }
        });
      }
      
      // Extract decisions as high-value moments
      if (topic.decisions && Array.isArray(topic.decisions) && topic.decisions.length > 0) {
        moments.push({
          recording_id: '', // Will be set when inserting
          type: 'positive_peak',
          start_time: topic.start_time || 0,
          end_time: topic.end_time || topic.start_time + 10,
          label: `Decision Made`,
          description: `Key decision: ${topic.decisions[0]}`,
          tooltip: `Important decision point in the conversation`,
          metadata: {
            confidence: 0.95,
            sentiment_score: 0.9,
            intensity: 1.0,
            speaker: topic.speakers?.[0] || 'Decision Maker',
            decisions: topic.decisions,
            source: 'ai_decision_detection'
          }
        });
      }
    });
  }
  
  // Extract emotional moments from overall sentiment
  if (analysis.overall_sentiment) {
    const overallScore = analysis.overall_sentiment.score || 0;
    const reasoning = analysis.overall_sentiment.reasoning || '';
    
    if (Math.abs(overallScore) > 0.5) {
      moments.push({
        recording_id: '', // Will be set when inserting
        type: overallScore > 0 ? 'positive_peak' : 'negative_dip',
        start_time: 0,
        end_time: 30,
        label: `Overall ${overallScore > 0 ? 'Positive' : 'Negative'} Call`,
        tooltip: `Overall sentiment: ${reasoning}`,
        metadata: {
          confidence: 0.9,
          sentiment_score: overallScore,
          source: 'ai_overall_sentiment'
        }
      });
    }
  }
  
  // Enhanced keyword-based emotion detection as fallback
  const emotionalKeywords = [
    { words: ['love it', 'perfect', 'exactly what we need', 'fantastic', 'amazing', 'outstanding'], sentiment: 0.9, type: 'positive_peak', intensity: 1.0 },
    { words: ['excited', 'thrilled', 'excellent', 'great job', 'impressed'], sentiment: 0.8, type: 'positive_peak', intensity: 0.9 },
    { words: ['good', 'nice', 'pleased', 'happy', 'sounds good', 'makes sense'], sentiment: 0.6, type: 'positive_peak', intensity: 0.6 },
    { words: ['interested', 'intrigued', 'curious'], sentiment: 0.4, type: 'positive_peak', intensity: 0.4 },
    { words: ['not interested', 'too expensive', "won't work", 'unacceptable', 'terrible'], sentiment: -0.9, type: 'negative_dip', intensity: 0.9 },
    { words: ['concerned', 'worried', 'problem', 'issue', 'disappointed'], sentiment: -0.7, type: 'sentiment_neg', intensity: 0.7 },
    { words: ['not sure', 'uncertain', 'confused', 'hesitant', 'doubt'], sentiment: -0.4, type: 'sentiment_neg', intensity: 0.5 },
    { words: ['approved', 'let\'s do it', 'moving forward', 'let\'s proceed', 'deal'], sentiment: 0.9, type: 'positive_peak', intensity: 1.0 },
    { words: ['budget', 'cost', 'price', 'expensive', 'cheap'], sentiment: 0, type: 'emotional_moment', intensity: 0.6 },
    { words: ['timeline', 'urgent', 'asap', 'quickly', 'deadline'], sentiment: 0, type: 'emotional_moment', intensity: 0.7 }
  ];
  
  emotionalKeywords.forEach(keyword => {
    keyword.words.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = transcript.match(regex);
      if (matches && matches.length > 0) {
        // Find all occurrences and create moments for significant ones
        let lastIndex = 0;
        const wordOccurrences = [];
        
        while (true) {
          const wordIndex = transcript.toLowerCase().indexOf(word.toLowerCase(), lastIndex);
          if (wordIndex === -1) break;
          wordOccurrences.push(wordIndex);
          lastIndex = wordIndex + word.length;
        }
        
        // Only create moments from first few occurrences to avoid spam
        wordOccurrences.slice(0, 2).forEach((wordIndex, occurrenceIndex) => {
          const estimatedTime = Math.floor((wordIndex / transcript.length) * 300); // Assume max 5min calls
          
          moments.push({
            recording_id: '', // Will be set when inserting
            type: keyword.type,
            start_time: estimatedTime,
            end_time: estimatedTime + 15,
            label: keyword.sentiment > 0.5 ? `Positive Signal` : keyword.sentiment < -0.5 ? `Concern Raised` : `Key Topic`,
            description: `"${word}" - ${keyword.sentiment > 0 ? 'Positive language detected' : keyword.sentiment < 0 ? 'Concern or objection noted' : 'Important topic mentioned'}`,
            tooltip: `Emotional language detected: "${word}"`,
            metadata: {
              confidence: 0.7,
              sentiment_score: keyword.sentiment,
              intensity: keyword.intensity,
              keyword: word,
              speaker: 'Unknown',
              source: 'keyword_detection'
            }
          });
        });
      }
    });
  });
  
  // Remove duplicates and limit to reasonable number
  const uniqueMoments = moments
    .filter((moment, index, array) => 
      index === array.findIndex(m => Math.abs(m.start_time - moment.start_time) < 10)
    )
    .slice(0, 15); // Limit to 15 moments max
  
  return uniqueMoments;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    console.log('Function started: analyze-speakers-topics (Azure OpenAI)');
    
    const { recording_id, transcript }: RequestBody = await req.json();
    
    if (!recording_id) {
      console.error('Missing recording_id in request');
      return createErrorResponse('Recording ID is required', 400);
    }

    console.log(`Analyzing speakers and topics for recording: ${recording_id}`);

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
    if (!recordingTranscript) {
      try {
        const { data: recording, error: recordingError } = await supabase
          .from('recordings')
          .select('transcript, title')
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
          }, 202); // Accepted but not yet processed
        }
        
        recordingTranscript = recording.transcript;
      } catch (dbError) {
        console.error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
        return createErrorResponse(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`, 500);
      }
    }

    // Check Azure OpenAI configuration
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    const azureApiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION');
    const gptDeployment = Deno.env.get('AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT');
    
    console.log('Azure OpenAI configuration check:', {
      hasEndpoint: !!azureEndpoint,
      hasApiKey: !!azureApiKey,
      hasApiVersion: !!azureApiVersion,
      hasGptDeployment: !!gptDeployment,
      endpoint: azureEndpoint ? azureEndpoint.substring(0, 30) + '...' : 'undefined'
    });
    
    if (!azureEndpoint || !azureApiKey) {
      const missingVars = [];
      if (!azureEndpoint) missingVars.push('AZURE_OPENAI_ENDPOINT');
      if (!azureApiKey) missingVars.push('AZURE_OPENAI_API_KEY');
      
      console.error(`Azure OpenAI configuration missing: ${missingVars.join(', ')}`);
      return createErrorResponse(`Azure OpenAI configuration missing: ${missingVars.join(', ')}. Please set these environment variables.`, 500);
    }

    // Analyze speakers and topics using the transcript
    try {
      console.log('Creating Azure OpenAI chat completion for speaker/topic analysis...');
      
      // Create Azure OpenAI client and analyze content
      const azureClient = createAzureOpenAIChatClient();
      
      const messages = [
        {
          role: 'system' as const,
          content: `You are an expert conversation analyst. Analyze this business call transcript to identify speakers, key topics, and sentiment moments.

          CRITICAL: Return ONLY valid JSON with no additional text, explanations, or markdown formatting.

          JSON Structure:
          {
            "speakers": [
              {
                "name": "Speaker Name", 
                "role": "Sales Rep/Customer/Decision Maker",
                "start_time": 0, 
                "end_time": 60,
                "text": "Key quote from this speaker"
              }
            ],
            "topics": [
              {
                "name": "Topic Name",
                "category": "discovery/pricing/demo/objections/next_steps",
                "start_time": 120,
                "end_time": 300, 
                "confidence": 0.85,
                "summary": "Brief topic summary",
                "key_points": ["Point 1", "Point 2"],
                "speakers": ["Speaker names"],
                "decisions": ["Any decisions made"],
                "questions": ["Questions asked"],
                "objections": ["Concerns raised"],
                "action_items": ["Next steps"],
                "sentiment": "positive/negative/neutral"
              }
            ],
            "sentiment_moments": [
              {
                "type": "positive_peak/negative_dip/neutral_shift",
                "start_time": 180,
                "end_time": 200,
                "speaker": "Customer",
                "text": "Exact quote showing sentiment",
                "sentiment_score": 0.8,
                "confidence": 0.9,
                "reason": "Why this moment is significant"
              }
            ],
            "overall_sentiment": {"score": 0.7, "reasoning": "Brief explanation"}
          }

          FOCUS ON ACCURACY:
          1. SPEAKERS: Identify actual names when mentioned, otherwise use roles
          2. TOPICS: Group conversation into logical segments (3-5 main topics)
          3. SENTIMENT MOMENTS: Look for clear emotional shifts, strong reactions, objections, excitement, agreements
          4. SENTIMENT SCORING: Use -1.0 (very negative) to +1.0 (very positive)
          5. TIME ESTIMATES: Base on natural conversation flow
          
          SENTIMENT MOMENT DETECTION:
          - Strong positive: "love it", "perfect", "exactly what we need", "let's do it"
          - Strong negative: "not interested", "too expensive", "won't work", "concerned"
          - Decision points: "approved", "moving forward", "let's proceed"
          - Objections: "but", "however", "worried about", "not sure"
          
          Return ONLY the JSON object.`
        },
        {
          role: 'user' as const,
          content: `Analyze this business call transcript for speakers and topics. Respond with ONLY valid JSON:\n\n${recordingTranscript}`
        }
      ];

      // Add timeout to the Azure OpenAI call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await azureClient.createChatCompletion({
          messages,
          max_tokens: 1800,
          temperature: 0, // Deterministic output for consistent sentiment analysis
        });

        clearTimeout(timeoutId);

        const analysisText = response.choices[0]?.message?.content?.trim();

        if (!analysisText) {
          console.error('Failed to generate analysis: Empty response');
          return createErrorResponse('Failed to generate analysis: Empty response', 500);
        }

        let analysis = {};
        try {
          // First, try to parse the response as-is
          analysis = JSON.parse(analysisText || '{}');
        } catch (parseError) {
          console.warn('Failed to parse analysis JSON, attempting to extract JSON from response');
          console.log('Raw AI response length:', analysisText.length);
          console.log('Raw AI response preview:', analysisText.substring(0, 500));
          
          // Try to extract JSON from markdown code blocks or other formatting
          let jsonString = analysisText;
          
          // Remove markdown code blocks
          jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          
          // Try to find JSON object boundaries
          const jsonStart = jsonString.indexOf('{');
          const jsonEnd = jsonString.lastIndexOf('}');
          
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
            
            try {
              analysis = JSON.parse(jsonString);
              console.log('Successfully extracted and parsed JSON from AI response');
            } catch (secondParseError) {
              console.error('Second parse attempt also failed:', secondParseError);
              console.log('Extracted JSON string:', jsonString.substring(0, 300));
              
              // Use enhanced fallback with basic transcript analysis
              analysis = {
                speakers: [{ id: 'speaker_1', name: 'Speaker 1', role: 'Unknown', speaking_time: 0 }],
                topics: [],
                overall_sentiment: { 
                  score: 0.5, 
                  reasoning: 'AI response parsing failed - using fallback analysis' 
                }
              };
            }
          } else {
            console.error('Could not find valid JSON boundaries in AI response');
            analysis = {
              speakers: [{ id: 'speaker_1', name: 'Speaker 1', role: 'Unknown', speaking_time: 0 }],
              topics: [],
              overall_sentiment: { 
                score: 0.5, 
                reasoning: 'AI response format invalid - no JSON boundaries found' 
              }
            };
          }
        }

        // Ensure analysis has required structure with enhanced fallbacks
        if (!analysis.speakers) analysis.speakers = [];
        if (!analysis.topics) analysis.topics = [];
        if (!analysis.overall_sentiment) analysis.overall_sentiment = { score: 0.5, reasoning: 'No clear sentiment detected' };
        
        // Validate and enhance topic data
        if (analysis.topics && Array.isArray(analysis.topics)) {
          analysis.topics = analysis.topics.map((topic: any) => ({
            ...topic,
            key_points: Array.isArray(topic.key_points) ? topic.key_points : [],
            speakers: Array.isArray(topic.speakers) ? topic.speakers : [],
            decisions: Array.isArray(topic.decisions) ? topic.decisions : [],
            questions: Array.isArray(topic.questions) ? topic.questions : [],
            objections: Array.isArray(topic.objections) ? topic.objections : [],
            action_items: Array.isArray(topic.action_items) ? topic.action_items : [],
            category: topic.category || 'discussion',
            summary: topic.summary || '',
            sentiment: topic.sentiment || 'neutral',
            confidence: typeof topic.confidence === 'number' ? topic.confidence : 0.5
          }));
        }

        // Generate sentiment moments from the analysis
        const sentimentMoments = extractSentimentMoments(analysis, recordingTranscript);
        console.log(`Generated ${sentimentMoments.length} sentiment moments`);

        // Save analysis to database tables
        try {
          console.log('Starting database operations for recording:', recording_id);
          console.log('Using service role key:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
          
          // Clear existing segments and moments for this recording
          const [speakerDeleteResult, topicDeleteResult, momentsDeleteResult] = await Promise.all([
            supabase.from('speaker_segments').delete().eq('recording_id', recording_id),
            supabase.from('topic_segments').delete().eq('recording_id', recording_id),
            supabase.from('ai_moments').delete().eq('recording_id', recording_id).in('type', ['sentiment_neg', 'positive_peak', 'negative_dip', 'emotional_moment'])
          ]);
          
          console.log('Delete results:', { 
            speakerDeleteError: speakerDeleteResult.error, 
            topicDeleteError: topicDeleteResult.error,
            momentsDeleteError: momentsDeleteResult.error
          });

          // Insert speaker segments with enhanced data
          if (analysis.speakers && Array.isArray(analysis.speakers)) {
            const speakerSegments = analysis.speakers.map((speaker: any, index: number) => ({
              recording_id: recording_id,
              speaker_name: speaker.name || `Speaker ${index + 1}`,
              start_time: speaker.start_time || 0,
              end_time: speaker.end_time || 60,
              text: speaker.text || speaker.sample_text || '',
              // Note: We could add a role field to speaker_segments table in future migration
              // For now, include role in the text field as metadata
            }));

            console.log('Attempting to insert speaker segments:', speakerSegments.length);
            console.log('Sample speaker segment:', JSON.stringify(speakerSegments[0], null, 2));
            
            const { data: speakerData, error: speakerError } = await supabase
              .from('speaker_segments')
              .insert(speakerSegments)
              .select();

            if (speakerError) {
              console.error('Error inserting speaker segments:', speakerError);
              console.error('Error details:', JSON.stringify(speakerError, null, 2));
              throw new Error(`Failed to insert speaker segments: ${speakerError.message}`);
            } else {
              console.log(`Successfully inserted ${speakerSegments.length} speaker segments`);
              console.log('Inserted speaker data:', speakerData);
            }
          }

          // Insert topic segments with enhanced metadata
          if (analysis.topics && Array.isArray(analysis.topics)) {
            const topicSegments = analysis.topics.map((topic: any) => {
              // Build comprehensive metadata object
              const metadata = {
                key_points: topic.key_points || [],
                speakers: topic.speakers || [],
                decisions: topic.decisions || [],
                questions: topic.questions || [],
                objections: topic.objections || [],
                action_items: topic.action_items || [],
                sentiment: topic.sentiment || 'neutral',
                is_ai_generated: true,
                outline_quality: topic.confidence > 0.7 ? 'high' : topic.confidence > 0.5 ? 'medium' : 'low'
              };
              
              return {
                recording_id: recording_id,
                topic: topic.name || topic.topic || 'General Discussion',
                start_time: topic.start_time || 0,
                end_time: topic.end_time || 60,
                confidence: topic.confidence || 0.5,
                category: topic.category || 'discussion',
                summary: topic.summary || '',
                metadata: metadata
              };
            });

            console.log('Attempting to insert topic segments:', topicSegments.length);
            console.log('Sample topic segment:', JSON.stringify(topicSegments[0], null, 2));
            
            const { data: topicData, error: topicError } = await supabase
              .from('topic_segments')
              .insert(topicSegments)
              .select();

            if (topicError) {
              console.error('Error inserting topic segments:', topicError);
              console.error('Error details:', JSON.stringify(topicError, null, 2));
              throw new Error(`Failed to insert topic segments: ${topicError.message}`);
            } else {
              console.log(`Successfully inserted ${topicSegments.length} topic segments`);
              console.log('Inserted topic data:', topicData);
            }
          }

          // Insert sentiment moments
          if (sentimentMoments.length > 0) {
            console.log('Attempting to insert sentiment moments:', sentimentMoments.length);
            
            // Set the recording_id for all moments
            const momentsWithRecordingId = sentimentMoments.map(moment => ({
              ...moment,
              recording_id: recording_id
            }));
            
            const { data: momentsData, error: momentsError } = await supabase
              .from('ai_moments')
              .insert(momentsWithRecordingId)
              .select();

            if (momentsError) {
              console.error('Error inserting sentiment moments:', momentsError);
              console.error('Error details:', JSON.stringify(momentsError, null, 2));
            } else {
              console.log(`Successfully inserted ${sentimentMoments.length} sentiment moments`);
              console.log('Inserted moments data:', momentsData);
            }
          }

          // Update recordings table with metadata
          const { error: updateError } = await supabase
            .from('recordings')
            .update({
              ai_generated_at: new Date().toISOString()
            })
            .eq('id', recording_id);

          if (updateError) {
            console.error('Error updating recording timestamp:', updateError);
            return createErrorResponse('Failed to update recording', 500);
          }
        } catch (dbError) {
          console.error(`Database error saving analysis: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
          return createErrorResponse('Failed to save analysis to database', 500);
        }

        // Log usage
        const promptTokens = Math.ceil((messages[0].content.length + messages[1].content.length) / 4);
        const completionTokens = Math.ceil(analysisText.length / 4);
        await logUsage(supabase, 'system', recording_id, 'gpt-4o-mini-2024-07-18', promptTokens, completionTokens, 'analyze-speakers-topics');

        console.log(`Successfully analyzed speakers and topics for recording ${recording_id} using Azure OpenAI`);

        return createSuccessResponse({
          success: true,
          analysis: analysis,
          speakers: analysis.speakers,
          topics: analysis.topics,
          topics_count: analysis.topics?.length || 0,
          sentiment: analysis.overall_sentiment,
          provider: 'azure-openai',
          model: 'gpt-4o-mini-2024-07-18',
          enhanced_features: {
            rich_metadata: true,
            comprehensive_analysis: true,
            action_items: true,
            speaker_roles: true
          },
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: promptTokens + completionTokens
          }
        });

      } catch (timeoutError) {
        clearTimeout(timeoutId);
        if (timeoutError.name === 'AbortError') {
          console.error('Azure OpenAI request timed out after 30 seconds');
          return createErrorResponse('AI analysis timed out. Please try again.', 408);
        }
        throw timeoutError;
      }

    } catch (azureError) {
      console.error(`Azure OpenAI API error:`, {
        message: azureError instanceof Error ? azureError.message : 'Unknown error',
        stack: azureError instanceof Error ? azureError.stack : undefined,
        name: azureError instanceof Error ? azureError.name : 'UnknownError'
      });
      
      let errorMessage = 'Speaker/topic analysis failed';
      let statusCode = 500;
      
      if (azureError instanceof Error) {
        const errorText = azureError.message.toLowerCase();
        
        if (errorText.includes('rate limit') || errorText.includes('429')) {
          errorMessage = 'AI service rate limit exceeded. Please try again in a few moments.';
          statusCode = 429;
        } else if (errorText.includes('authentication') || errorText.includes('401')) {
          errorMessage = 'AI service authentication failed. Please check configuration.';
          statusCode = 401;
        } else if (errorText.includes('timeout')) {
          errorMessage = 'AI analysis timed out. Please try again with a shorter recording.';
          statusCode = 408;
        } else if (errorText.includes('bad request') || errorText.includes('400')) {
          errorMessage = 'Invalid request to AI service. Please check your input.';
          statusCode = 400;
        } else if (errorText.includes('service error') || errorText.includes('500')) {
          errorMessage = 'AI service is temporarily unavailable. Please try again later.';
          statusCode = 502;
        } else {
          errorMessage = `AI analysis failed: ${azureError.message}`;
        }
      }
      
      return createErrorResponse(errorMessage, statusCode, {
        originalError: azureError instanceof Error ? azureError.message : 'Unknown error',
        suggestion: 'Check the browser console for more details, or contact support if the issue persists.'
      });
    }

  } catch (error) {
    console.error('Error in analyze-speakers-topics:', error);
    return createErrorResponse('An unexpected error occurred', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});
