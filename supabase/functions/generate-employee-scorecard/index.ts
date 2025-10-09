// Generate Employee Performance Scorecard from Recording Analysis
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {
  createAzureOpenAIChatClient,
  extractJsonFromAIResponse
} from '../_shared/azure-openai.ts';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

declare const Deno: { env: { get(key: string): string | undefined } };

interface RequestBody {
  recording_id: string;
  participation_id?: string;
}

interface ScorecardAnalysis {
  overall_score: number;
  criteria_scores: {
    communication: number;
    product_knowledge: number;
    objection_handling: number;
    closing_technique: number;
    rapport_building: number;
    active_listening: number;
  };
  strengths: string[];
  improvements: string[];
  feedback: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight(req);
  }

  console.log('📊 Scorecard generation request received');

  try {
    // Parse request body
    const body: RequestBody = await req.json();
    const { recording_id, participation_id } = body;

    if (!recording_id) {
      return createErrorResponse('recording_id is required', 400);
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return createErrorResponse('Supabase configuration missing', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`🔍 Generating scorecard for recording: ${recording_id}`);

    // Fetch recording with transcript and AI analysis
    const { data: recording, error: fetchError } = await supabase
      .from('recordings')
      .select('id, title, transcript, ai_summary, coaching_evaluation, content_type, user_id')
      .eq('id', recording_id)
      .single();

    if (fetchError || !recording) {
      console.error('❌ Recording not found:', fetchError);
      return createErrorResponse('Recording not found', 404);
    }

    if (!recording.transcript) {
      console.log('⚠️ No transcript available');
      return createErrorResponse('No transcript available for analysis', 400);
    }

    console.log(`✅ Recording found: ${recording.title}`);

    // Get employee participation record(s)
    let participationRecords;
    if (participation_id) {
      // Specific participation ID provided
      const { data, error } = await supabase
        .from('employee_call_participation')
        .select(`
          id,
          employee_id,
          recording_id,
          confidence_score,
          employees!inner(id, first_name, last_name, email)
        `)
        .eq('id', participation_id)
        .single();

      participationRecords = data ? [data] : [];
      if (error) console.error('⚠️ Participation record not found:', error);
    } else {
      // Find all employee participants for this recording
      const { data, error } = await supabase
        .from('employee_call_participation')
        .select(`
          id,
          employee_id,
          recording_id,
          confidence_score,
          participation_type,
          employees!inner(id, first_name, last_name, email)
        `)
        .eq('recording_id', recording_id)
        .eq('participation_type', 'primary'); // Only primary participants

      participationRecords = data || [];
      if (error) console.error('⚠️ Error fetching participation records:', error);
    }

    if (!participationRecords || participationRecords.length === 0) {
      console.log('❌ No employee participation records found');
      return createErrorResponse('No employee linked to this recording', 400);
    }

    console.log(`👥 Found ${participationRecords.length} employee participant(s)`);

    // Initialize Azure OpenAI client
    const chatClient = createAzureOpenAIChatClient();

    const createdScorecards = [];

    // Generate scorecard for each participant
    for (const participation of participationRecords) {
      const employee = participation.employees;
      const employeeName = `${employee.first_name} ${employee.last_name}`;

      console.log(`📋 Generating scorecard for: ${employeeName}`);

      // Check if scorecard already exists
      const { data: existingScorecard } = await supabase
        .from('employee_scorecards')
        .select('id')
        .eq('recording_id', recording_id)
        .eq('employee_id', participation.employee_id)
        .single();

      if (existingScorecard) {
        console.log(`ℹ️ Scorecard already exists for ${employeeName}, skipping`);
        continue;
      }

      // Prepare AI prompt to analyze performance
      const prompt = `Analyze this call transcript and provide a detailed performance evaluation for ${employeeName}, the ${recording.content_type === 'sales_call' ? 'sales representative' : 'support agent'}.

TRANSCRIPT:
"""
${recording.transcript.substring(0, 8000)}${recording.transcript.length > 8000 ? '...[truncated]' : ''}
"""

${recording.ai_summary ? `\nAI SUMMARY:\n${recording.ai_summary}\n` : ''}

EVALUATION CRITERIA:
1. **Communication** (0-100): Clarity, articulation, professionalism
2. **Product Knowledge** (0-100): Understanding of product/service, accurate information
3. **Objection Handling** (0-100): Addressing concerns, overcoming resistance
4. **Closing Technique** (0-100): Call-to-action, next steps, commitment
5. **Rapport Building** (0-100): Connection with customer, empathy, trust
6. **Active Listening** (0-100): Understanding needs, asking questions, acknowledging

Provide a JSON response with:
{
  "overall_score": <average of all criteria scores, 0-100>,
  "criteria_scores": {
    "communication": <score>,
    "product_knowledge": <score>,
    "objection_handling": <score>,
    "closing_technique": <score>,
    "rapport_building": <score>,
    "active_listening": <score>
  },
  "strengths": ["<3-5 specific behaviors or skills demonstrated well>"],
  "improvements": ["<3-5 specific areas for development>"],
  "feedback": "<2-3 sentence summary of overall performance and key coaching points>"
}

Base your evaluation on REAL behaviors observed in the transcript. Do NOT use generic placeholders.`;

      console.log('🤖 Sending transcript to AI for performance analysis...');

      const completion = await chatClient.createChatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are an expert call quality analyst specializing in sales and customer service performance evaluation. Provide honest, data-driven assessments based on observed behaviors. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.3 // More focused, less creative
      });

      const aiResponse = completion.choices?.[0]?.message?.content;
      if (!aiResponse) {
        console.error('❌ No response from AI analysis');
        continue;
      }

      console.log('✅ AI analysis completed');

      // Parse AI response
      let analysis: ScorecardAnalysis;
      try {
        analysis = extractJsonFromAIResponse(aiResponse);
      } catch (error) {
        console.error('❌ Failed to parse AI response:', error);
        continue;
      }

      console.log(`📊 Analysis result: Overall score ${analysis.overall_score}/100`);

      // Insert scorecard into database
      // Store strengths/improvements inside criteria_scores JSONB
      const extendedCriteriaScores = {
        ...analysis.criteria_scores,
        strengths: analysis.strengths,
        improvements: analysis.improvements
      };

      const { data: scorecard, error: insertError } = await supabase
        .from('employee_scorecards')
        .insert({
          employee_id: participation.employee_id,
          recording_id: recording_id,
          scorecard_type: 'sales_call', // or recording.content_type
          overall_score: analysis.overall_score,
          criteria_scores: extendedCriteriaScores,
          feedback: analysis.feedback,
          evaluated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Failed to insert scorecard:', insertError);
        continue;
      }

      console.log(`✅ Scorecard created for ${employeeName}`);

      createdScorecards.push({
        employee_id: participation.employee_id,
        employee_name: employeeName,
        scorecard_id: scorecard.id,
        overall_score: analysis.overall_score,
        strengths_count: analysis.strengths.length,
        improvements_count: analysis.improvements.length
      });
    }

    if (createdScorecards.length === 0) {
      return createErrorResponse('No scorecards were created (may already exist or errors occurred)', 400);
    }

    console.log(`🏁 Successfully created ${createdScorecards.length} scorecard(s)`);

    return createSuccessResponse({
      recording_id,
      scorecards_created: createdScorecards.length,
      details: createdScorecards
    });

  } catch (error: any) {
    console.error('💥 Error generating scorecard:', error);
    return createErrorResponse(`Failed to generate scorecard: ${error.message}`, 500);
  }
});
