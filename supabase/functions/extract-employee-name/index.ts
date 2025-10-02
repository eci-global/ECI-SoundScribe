// Extract ECI Employee Name from Call Transcripts
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {
  createAzureOpenAIChatClient,
  extractJsonFromAIResponse
} from '../_shared/azure-openai.ts';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

declare const Deno: { env: { get(key: string): string | undefined } };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  recording_id: string;
}

interface EmployeeIdentification {
  employee_name: string | null;
  confidence: number;
  reasoning: string;
  detected_names: string[];
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight(req);
  }

  try {
    console.log('🚀 Starting extract-employee-name function');

    // Parse request
    const { recording_id }: RequestBody = await req.json();
    console.log('📝 Request parsed, recording_id:', recording_id);

    if (!recording_id) {
      console.log('❌ No recording_id provided');
      return createErrorResponse('recording_id is required', 400);
    }

    // Verify environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    const azureDeployment = Deno.env.get('AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT');

    console.log('🔑 Environment variables check:', {
      supabaseUrl: supabaseUrl ? '✅ Set' : '❌ Missing',
      supabaseServiceKey: supabaseServiceKey ? '✅ Set' : '❌ Missing',
      azureEndpoint: azureEndpoint ? '✅ Set' : '❌ Missing',
      azureApiKey: azureApiKey ? '✅ Set' : '❌ Missing',
      azureDeployment: azureDeployment ? '✅ Set' : '❌ Missing',
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('❌ Missing Supabase credentials');
      return createErrorResponse('Supabase configuration missing', 500);
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`🔍 Extracting employee name for recording: ${recording_id}`);

    // Fetch recording with transcript
    console.log('📊 Querying recordings table for ID:', recording_id);
    const { data: recording, error: fetchError } = await supabase
      .from('recordings')
      .select('id, title, transcript, employee_name, user_id')
      .eq('id', recording_id)
      .single();

    if (fetchError) {
      console.error('❌ Database fetch error:', {
        error: fetchError,
        message: fetchError.message,
        details: fetchError.details,
        hint: fetchError.hint,
        code: fetchError.code
      });
      return createErrorResponse(`Database error: ${fetchError.message}`, 404);
    }

    if (!recording) {
      console.error('❌ No recording found with ID:', recording_id);
      return createErrorResponse('Recording not found', 404);
    }

    console.log('✅ Recording found:', {
      id: recording.id,
      title: recording.title,
      hasTranscript: !!recording.transcript,
      transcriptLength: recording.transcript?.length || 0,
      currentEmployee: recording.employee_name
    });

    if (!recording.transcript) {
      console.log('⚠️ No transcript available for employee extraction');
      return createErrorResponse('No transcript available for analysis', 400);
    }

    if (recording.transcript.length < 50) {
      console.log('⚠️ Transcript too short for analysis:', recording.transcript.length);
      return createErrorResponse('Transcript too short for meaningful analysis', 400);
    }

    // Get known team members for context (optional - handle missing table gracefully)
    let teamMembers: any[] | null = null;
    let knownEmployees: string[] = [];

    try {
      const { data } = await supabase
        .from('team_members')
        .select('employee_name, email, role')
        .eq('is_active', true);
      teamMembers = data;
      knownEmployees = teamMembers?.map(tm => tm.employee_name).filter(Boolean) || [];
    } catch (error) {
      console.log('⚠️ team_members table not found, continuing without known employees list');
    }

    console.log(`📋 Found ${knownEmployees.length} known employees in system`);

    // Initialize Azure OpenAI
    const chatClient = createAzureOpenAIChatClient();

    // Analyze transcript for employee identification
    const prompt = `Analyze this call transcript to identify the ECI employee (company representative) speaking on the call.

TRANSCRIPT:
"""
${recording.transcript.substring(0, 4000)} ${recording.transcript.length > 4000 ? '...[truncated]' : ''}
"""

KNOWN ECI EMPLOYEES (for reference):
${knownEmployees.slice(0, 20).map(name => `- ${name}`).join('\n')}

INSTRUCTIONS:
1. Identify who is the ECI employee/representative on this call
2. Look for names mentioned in introduction, speaker labels, or conversation context
3. Distinguish between ECI employees vs customers/prospects
4. If multiple ECI employees are present, identify the primary one
5. Match against known employees if possible, but also detect new names

Return a JSON response with:
{
  "employee_name": "Full name of the primary ECI employee" or null,
  "confidence": 0.0 to 1.0 confidence score,
  "reasoning": "Brief explanation of how you identified this employee",
  "detected_names": ["list", "of", "all", "employee", "names", "detected"]
}

Focus on accuracy - if unsure, set confidence low and explain why.`;

    console.log('🤖 Sending transcript to AI for employee identification...');

    const completion = await chatClient.getChatCompletions(
      Deno.env.get('AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT') || 'gpt-4o-mini',
      [
        {
          role: 'system',
          content: 'You are an expert at analyzing business call transcripts to identify company employees vs customers. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        temperature: 0.1,
        maxTokens: 800,
        responseFormat: { type: 'json_object' }
      }
    );

    const aiResponse = completion.choices?.[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from AI analysis');
    }

    console.log('📝 Raw AI response:', aiResponse);

    // Parse AI response
    const analysis: EmployeeIdentification = extractJsonFromAIResponse(aiResponse);

    console.log('🎯 Employee analysis result:', {
      employee_name: analysis.employee_name,
      confidence: analysis.confidence,
      detected_names: analysis.detected_names
    });

    // Update recording with identified employee name (only if high confidence)
    if (analysis.employee_name && analysis.confidence > 0.6) {
      const { error: updateError } = await supabase
        .from('recordings')
        .update({
          employee_name: analysis.employee_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', recording_id);

      if (updateError) {
        console.error('❌ Failed to update recording with employee name:', updateError);
      } else {
        console.log(`✅ Updated recording with employee name: ${analysis.employee_name}`);
      }

      // Try to assign recording to appropriate team based on employee (only if team tables exist)
      if (teamMembers && analysis.employee_name) {
        try {
          const matchingMember = teamMembers.find(tm =>
            tm.employee_name.toLowerCase() === analysis.employee_name.toLowerCase()
          );

          if (matchingMember) {
            const { data: memberWithTeam } = await supabase
              .from('team_members')
              .select('team_id, team:teams(id, name)')
              .eq('employee_name', matchingMember.employee_name)
              .eq('is_active', true)
              .single();

            if (memberWithTeam?.team_id) {
              await supabase
                .from('recordings')
                .update({ team_id: memberWithTeam.team_id })
                .eq('id', recording_id);

              console.log(`🏢 Assigned recording to team: ${(memberWithTeam.team as any)?.name}`);
            }
          }
        } catch (error) {
          console.log('⚠️ Could not assign team (team tables not found)');
        }
      }
    }

    return createSuccessResponse({
      recording_id,
      analysis,
      updated: analysis.employee_name && analysis.confidence > 0.6
    });

  } catch (error) {
    console.error('💥 Error in extract-employee-name:', error);
    return createErrorResponse(
      `Failed to extract employee name: ${error.message}`,
      500
    );
  }
});