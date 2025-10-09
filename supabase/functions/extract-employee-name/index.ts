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

  console.log('🚀 Function started - method:', req.method, 'url:', req.url);

  try {
    // Parse request
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('📝 Request parsed successfully:', requestBody);
    } catch (parseError) {
      console.error('❌ Failed to parse request JSON:', parseError);
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    const { recording_id }: RequestBody = requestBody;
    console.log('📝 Recording ID extracted:', recording_id);

    if (!recording_id) {
      console.log('❌ No recording_id provided in request');
      return createErrorResponse('recording_id is required', 400);
    }

    // Test basic environment access
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    console.log('🔗 Supabase URL:', supabaseUrl ? 'Found' : 'Missing');

    // Verify environment variables
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
    console.log('🔧 Initializing Azure OpenAI client...');
    let chatClient;
    try {
      chatClient = createAzureOpenAIChatClient();
      console.log('✅ Azure OpenAI client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI client:', {
        error: error.message,
        stack: error.stack
      });
      return createErrorResponse(`Azure OpenAI initialization failed: ${error.message}`, 500);
    }

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

    const deployment = Deno.env.get('AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT') || 'gpt-4o-mini';
    console.log('🤖 Sending transcript to AI for employee identification...', {
      deployment,
      transcriptLength: recording.transcript.length,
      promptLength: prompt.length
    });

    let completion;
    try {
      completion = await chatClient.createChatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing business call transcripts to identify company employees vs customers. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.1
      });
      console.log('✅ Azure OpenAI API call successful');
    } catch (error) {
      console.error('❌ Azure OpenAI API call failed:', {
        error: error.message,
        stack: error.stack,
        status: error.status || 'unknown',
        code: error.code || 'unknown'
      });
      return createErrorResponse(`Azure OpenAI API failed: ${error.message}`, 500);
    }

    const aiResponse = completion.choices?.[0]?.message?.content;
    if (!aiResponse) {
      console.error('❌ No response content from Azure OpenAI');
      return createErrorResponse('No response from AI analysis', 500);
    }

    console.log('📝 Raw AI response received:', {
      length: aiResponse.length,
      preview: aiResponse.substring(0, 200) + '...'
    });

    // Parse AI response
    let analysis: EmployeeIdentification;
    try {
      analysis = extractJsonFromAIResponse(aiResponse);
      console.log('✅ AI response parsed successfully');
    } catch (error) {
      console.error('❌ Failed to parse AI response:', {
        error: error.message,
        rawResponse: aiResponse
      });
      return createErrorResponse(`Failed to parse AI response: ${error.message}`, 500);
    }

    console.log('🎯 Employee analysis result:', {
      employee_name: analysis.employee_name,
      confidence: analysis.confidence,
      detected_names: analysis.detected_names,
      reasoning: analysis.reasoning
    });

    // Update recording with identified employee name (only if high confidence)
    if (analysis.employee_name && analysis.confidence > 0.6) {
      console.log(`💾 Updating recording with employee name: ${analysis.employee_name} (confidence: ${analysis.confidence})`);

      const { error: updateError } = await supabase
        .from('recordings')
        .update({
          employee_name: analysis.employee_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', recording_id);

      if (updateError) {
        console.error('❌ Failed to update recording with employee name:', {
          error: updateError,
          message: updateError.message,
          details: updateError.details
        });
      } else {
        console.log(`✅ Successfully updated recording with employee name: ${analysis.employee_name}`);
      }
    } else {
      console.log(`⚠️ Skipping database update - low confidence (${analysis.confidence}) or no employee name identified`);
    }

    // NEW: Create employee_call_participation record to bridge AI detection with employee profiles
    if (analysis.employee_name && analysis.confidence > 0.6) {
      console.log(`🔗 Creating employee participation record for: ${analysis.employee_name}`);

      try {
        // Match AI-detected name against employees table to get UUID
        const employeeName = analysis.employee_name.trim();
        const nameParts = employeeName.split(' ');

        // Try different name matching strategies
        let matchedEmployee = null;

        // Strategy 1: Exact full name match
        const { data: exactMatch } = await supabase
          .from('employees')
          .select('id, first_name, last_name, employee_code')
          .eq('status', 'active')
          .or(`and(first_name.ilike.${nameParts[0]},last_name.ilike.${nameParts.slice(1).join(' ') || nameParts[0]})`);

        if (exactMatch && exactMatch.length > 0) {
          matchedEmployee = exactMatch[0];
          console.log(`✅ Found exact employee match: ${matchedEmployee.first_name} ${matchedEmployee.last_name} (${matchedEmployee.id})`);
        } else {
          // Strategy 2: Fuzzy name matching (first name + any part of last name)
          if (nameParts.length >= 2) {
            const { data: fuzzyMatch } = await supabase
              .from('employees')
              .select('id, first_name, last_name, employee_code')
              .eq('status', 'active')
              .ilike('first_name', `%${nameParts[0]}%`);

            if (fuzzyMatch && fuzzyMatch.length > 0) {
              // Find best match based on last name similarity
              const bestMatch = fuzzyMatch.find(emp =>
                nameParts.slice(1).some(part =>
                  emp.last_name.toLowerCase().includes(part.toLowerCase())
                )
              );

              if (bestMatch) {
                matchedEmployee = bestMatch;
                console.log(`✅ Found fuzzy employee match: ${matchedEmployee.first_name} ${matchedEmployee.last_name} (${matchedEmployee.id})`);
              }
            }
          }
        }

        if (matchedEmployee) {
          // Check if participation record already exists
          const { data: existingParticipation } = await supabase
            .from('employee_call_participation')
            .select('id')
            .eq('recording_id', recording_id)
            .eq('employee_id', matchedEmployee.id)
            .single();

          if (existingParticipation) {
            console.log(`ℹ️ Participation record already exists for ${matchedEmployee.first_name} ${matchedEmployee.last_name}`);
          } else {
            // Create new participation record
            const { data: participationRecord, error: participationError } = await supabase
              .from('employee_call_participation')
              .insert({
                recording_id: recording_id,
                employee_id: matchedEmployee.id,
                participation_type: 'primary', // AI detected as primary speaker
                talk_time_seconds: 0, // Will be calculated later if needed
                talk_time_percentage: 0, // Will be calculated later if needed
                confidence_score: analysis.confidence,
                manually_tagged: false, // Auto-detected by AI
                speaker_segments: null // Could be enhanced later with segment analysis
              })
              .select()
              .single();

            if (participationError) {
              console.error('❌ Failed to create participation record:', {
                error: participationError,
                message: participationError.message,
                employee_id: matchedEmployee.id,
                recording_id: recording_id
              });
            } else {
              console.log(`✅ Successfully created participation record for ${matchedEmployee.first_name} ${matchedEmployee.last_name}`);

              // Update the response to include participation info
              response.participation_created = {
                employee_id: matchedEmployee.id,
                employee_name: `${matchedEmployee.first_name} ${matchedEmployee.last_name}`,
                participation_id: participationRecord.id
              };
            }
          }
        } else {
          console.log(`⚠️ Could not match AI-detected name "${analysis.employee_name}" to any employee in database`);

          // Log for manual review - could be a new employee or name variation
          response.unmatched_employee = {
            detected_name: analysis.employee_name,
            confidence: analysis.confidence,
            suggestion: 'Consider adding this employee to the database or check for name variations'
          };
        }

      } catch (participationError) {
        console.error('❌ Error creating participation record:', {
          error: participationError.message,
          stack: participationError.stack,
          employee_name: analysis.employee_name
        });

        // Don't fail the entire function if participation creation fails
        response.participation_error = `Failed to create participation record: ${participationError.message}`;
      }
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

    console.log('🏁 Function execution completed successfully');

    const response: any = {
      recording_id,
      analysis,
      updated: analysis.employee_name && analysis.confidence > 0.6
    };

    console.log('📤 Returning successful response:', response);

    return createSuccessResponse(response);

  } catch (error) {
    console.error('💥 Unexpected error in extract-employee-name function:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });

    return createErrorResponse(
      `Failed to extract employee name: ${error.message}`,
      500
    );
  }
});