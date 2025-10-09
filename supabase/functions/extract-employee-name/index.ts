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
  name_type?: 'full_name' | 'first_name_only' | 'unclear';
}

/**
 * Extract potential employee names from recording title/filename
 * Looks for common patterns like "Call with John Smith", "John-Sales-Call", etc.
 */
function extractNamesFromTitle(title: string): string[] {
  if (!title) return [];

  const names: string[] = [];

  // Common patterns for names in titles
  const patterns = [
    // "Call with John Smith and Jane Doe"
    /(?:call|meeting|interview|conversation)\s+(?:with|between)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s+and\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*))?/i,
    // "John Smith - Sales Call"
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[-–]\s*/,
    // "Interview: John Smith"
    /(?:interview|call|meeting):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    // "John Smith, Jane Doe - Call"
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[-–]/,
    // "John_Smith_Sales_Call" or "John-Smith-Call"
    /^([A-Z][a-z]+)[-_]([A-Z][a-z]+)(?:[-_]|$)/,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      for (let i = 1; i < match.length; i++) {
        if (match[i]) {
          const name = match[i].trim().replace(/[-_]/g, ' ');
          if (isValidName(name) && !names.includes(name)) {
            names.push(name);
          }
        }
      }
    }
  }

  // Additional extraction for common separators
  const separatorPatterns = [
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[,&]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+and\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
  ];

  for (const pattern of separatorPatterns) {
    let match;
    while ((match = pattern.exec(title)) !== null) {
      for (let i = 1; i < match.length; i++) {
        if (match[i]) {
          const name = match[i].trim();
          if (isValidName(name) && !names.includes(name)) {
            names.push(name);
          }
        }
      }
    }
  }

  return names;
}

/**
 * Validate if a string looks like a person's name
 */
function isValidName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 50) return false;

  // Must start with capital letter
  if (!/^[A-Z]/.test(name)) return false;

  // Should contain only letters, spaces, hyphens, and apostrophes
  if (!/^[A-Za-z\s\-']+$/.test(name)) return false;

  // Exclude common words that might be mistaken for names
  const excludeWords = new Set([
    'Call', 'Meeting', 'Interview', 'Conversation', 'Sales', 'Support', 'Customer',
    'Client', 'User', 'Demo', 'Presentation', 'Training', 'Session', 'Review',
    'Team', 'Group', 'Department', 'Company', 'Organization', 'Business'
  ]);

  const words = name.split(/\s+/);
  for (const word of words) {
    if (excludeWords.has(word)) return false;
  }

  return true;
}

/**
 * Calculate Levenshtein distance between two strings (edit distance)
 * Used for fuzzy name matching to handle typos and speech-to-text errors
 */
function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const len1 = s1.length;
  const len2 = s2.length;

  // Create a matrix to store distances
  const matrix: number[][] = [];

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Check if two names are similar enough (for fuzzy matching)
 * Handles common typos like "Milan" vs "Millan", "Sara" vs "Sarah"
 */
function areNamesSimilar(name1: string, name2: string, maxDistance: number = 1): boolean {
  const distance = levenshteinDistance(name1, name2);
  return distance <= maxDistance;
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
2. Look for these common introduction patterns:
   - "Hi, this is [FirstName]" or "My name is [Name]"
   - "[FirstName] from ECI" or "This is [Name] with ECI Global"
   - "[FirstName] calling" or "[Name] here from ECI"
   - Speaker labels like "AGENT:" or "REP:" followed by name
3. Distinguish between ECI employees vs customers/prospects/external parties
4. If multiple ECI employees are present, identify the primary one (most talk time)
5. Match against known employees if possible, but also detect new names
6. IMPORTANT: Many employees introduce themselves by FIRST NAME ONLY - capture this!
   - If only first name detected, include it with note in reasoning
   - Examples: "Hi, this is Sarah", "Michael calling from ECI"

Return a JSON response with:
{
  "employee_name": "Full name or first name of the primary ECI employee" or null,
  "confidence": 0.0 to 1.0 confidence score,
  "reasoning": "Brief explanation of how you identified this employee (mention if first name only)",
  "detected_names": ["list", "of", "all", "employee", "names", "detected"],
  "name_type": "full_name" or "first_name_only" or "unclear"
}

Focus on accuracy - if unsure, set confidence low and explain why.`;

    const deployment = Deno.env.get('AZURE_OPENAI_GPT4O_DEPLOYMENT') || 'gpt-4o';
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

    // ENHANCEMENT: If AI confidence is low or no employee detected, try extracting from recording title
    if ((!analysis.employee_name || analysis.confidence < 0.7) && recording.title) {
      console.log('🏷️ Attempting to extract employee name from recording title:', recording.title);

      const titleNames = extractNamesFromTitle(recording.title);
      console.log(`📋 Found ${titleNames.length} potential names in title:`, titleNames);

      if (titleNames.length > 0) {
        // Cross-reference title names with employees table
        for (const titleName of titleNames) {
          const { data: titleMatches } = await supabase
            .from('employees')
            .select('id, first_name, last_name, employee_code')
            .eq('status', 'active')
            .or(`first_name.ilike.${titleName.split(' ')[0]},last_name.ilike.${titleName.split(' ').slice(-1)[0]},and(first_name.ilike.${titleName.split(' ')[0]},last_name.ilike.${titleName.split(' ').slice(-1)[0]})`);

          if (titleMatches && titleMatches.length > 0) {
            const matchedEmployee = titleMatches[0];
            const fullName = `${matchedEmployee.first_name} ${matchedEmployee.last_name}`;

            // Boost confidence if title matches an employee
            if (!analysis.employee_name) {
              analysis.employee_name = fullName;
              analysis.confidence = 0.65; // Medium confidence for title-based detection
              analysis.reasoning = `Extracted from recording title: "${recording.title}"`;
              analysis.name_type = titleName.split(' ').length > 1 ? 'full_name' : 'first_name_only';
              console.log(`✅ Extracted employee from title: ${fullName} (confidence: 0.65)`);
            } else if (fullName.toLowerCase().includes(analysis.employee_name.toLowerCase())) {
              // Title confirms AI detection - boost confidence
              analysis.confidence = Math.min(1.0, analysis.confidence + 0.15);
              analysis.reasoning += ` [Confirmed by title]`;
              console.log(`✅ Title confirmed AI detection: ${analysis.employee_name} (confidence boosted to ${analysis.confidence})`);
            }
            break; // Use first match
          }
        }
      }
    }

    // Update recording with identified employee name (only if high confidence)
    if (analysis.employee_name) {
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
        let detectionMethod = 'exact_match'; // Track how employee was detected

        // Strategy 1: Exact full name match
        const { data: exactMatch } = await supabase
          .from('employees')
          .select('id, first_name, last_name, employee_code, department, team_id')
          .eq('status', 'active')
          .or(`and(first_name.ilike.${nameParts[0]},last_name.ilike.${nameParts.slice(1).join(' ') || nameParts[0]})`);

        if (exactMatch && exactMatch.length > 0) {
          matchedEmployee = exactMatch[0];
          detectionMethod = 'exact_match';
          console.log(`✅ Found exact employee match: ${matchedEmployee.first_name} ${matchedEmployee.last_name} (${matchedEmployee.id})`);
        } else {
          // Strategy 2: Fuzzy name matching with Levenshtein distance (handles typos like "Milan" vs "Millan")
          if (nameParts.length >= 2) {
            console.log(`🔍 Attempting fuzzy match for: ${nameParts[0]} ${nameParts.slice(1).join(' ')}`);

            // Get all active employees to compare against
            const { data: allEmployees } = await supabase
              .from('employees')
              .select('id, first_name, last_name, employee_code, department, team_id')
              .eq('status', 'active');

            if (allEmployees && allEmployees.length > 0) {
              // Find employees with similar first names (Levenshtein distance <= 1)
              const fuzzyFirstNameMatches = allEmployees.filter(emp =>
                areNamesSimilar(emp.first_name, nameParts[0], 1)
              );

              console.log(`📋 Found ${fuzzyFirstNameMatches.length} employees with similar first name to "${nameParts[0]}"`);

              if (fuzzyFirstNameMatches.length > 0) {
                // If we have a last name, match it too
                const lastName = nameParts.slice(1).join(' ');
                const bestMatch = fuzzyFirstNameMatches.find(emp =>
                  areNamesSimilar(emp.last_name, lastName, 1) ||
                  emp.last_name.toLowerCase().includes(lastName.toLowerCase())
                );

                if (bestMatch) {
                  matchedEmployee = bestMatch;
                  detectionMethod = 'fuzzy_match';
                  console.log(`✅ Found fuzzy employee match: ${matchedEmployee.first_name} ${matchedEmployee.last_name} (${matchedEmployee.id})`);
                  console.log(`   - Detected: "${nameParts.join(' ')}" -> Matched: "${matchedEmployee.first_name} ${matchedEmployee.last_name}"`);
                } else if (fuzzyFirstNameMatches.length === 1) {
                  // Only one match with similar first name - use it even without last name match
                  matchedEmployee = fuzzyFirstNameMatches[0];
                  detectionMethod = 'fuzzy_match';
                  console.log(`✅ Found single fuzzy first name match: ${matchedEmployee.first_name} ${matchedEmployee.last_name} (${matchedEmployee.id})`);
                }
              }
            }
          }

          // Strategy 3: First name only matching with fuzzy logic (for cases like "Hi, this is Sarah" or "Millan speaking")
          if (!matchedEmployee && (nameParts.length === 1 || analysis.name_type === 'first_name_only')) {
            const firstName = nameParts[0];
            console.log(`🔍 Attempting first-name-only match for: ${firstName}`);

            // Get all active employees
            const { data: allEmployees } = await supabase
              .from('employees')
              .select('id, first_name, last_name, employee_code, department, team_id')
              .eq('status', 'active');

            if (allEmployees && allEmployees.length > 0) {
              // Find employees with exact OR similar first names (Levenshtein distance <= 1)
              const firstNameMatches = allEmployees.filter(emp =>
                emp.first_name.toLowerCase() === firstName.toLowerCase() ||
                areNamesSimilar(emp.first_name, firstName, 1)
              );

              console.log(`📋 Found ${firstNameMatches.length} employees with first name matching "${firstName}" (exact or similar)`);

              if (firstNameMatches && firstNameMatches.length > 0) {
                if (firstNameMatches.length === 1) {
                  // Unique first name - high confidence
                  matchedEmployee = firstNameMatches[0];
                  detectionMethod = 'first_name_unique';
                  console.log(`✅ Found unique first-name match: ${matchedEmployee.first_name} ${matchedEmployee.last_name} (${matchedEmployee.id})`);
                } else {
                  // Multiple matches - try disambiguation using context
                  console.log(`⚠️ Found ${firstNameMatches.length} employees with first name "${firstName}", attempting disambiguation...`);

                  // Disambiguation strategy: Check recent call history for this recording's user
                  if (recording.user_id) {
                    const { data: recentCalls } = await supabase
                      .from('employee_call_participation')
                      .select('employee_id, employees!inner(id, first_name, last_name)')
                      .in('employee_id', firstNameMatches.map(e => e.id))
                      .order('created_at', { ascending: false })
                      .limit(5);

                    if (recentCalls && recentCalls.length > 0) {
                      // Pick the most recently active employee with this first name
                      matchedEmployee = firstNameMatches.find(e => e.id === recentCalls[0].employee_id) || firstNameMatches[0];
                      detectionMethod = 'first_name_context';
                      console.log(`✅ Selected employee via context: ${matchedEmployee.first_name} ${matchedEmployee.last_name} (recent history)`);
                    } else {
                      // No recent history - pick first match but lower confidence
                      matchedEmployee = firstNameMatches[0];
                      detectionMethod = 'first_name_ambiguous';
                      analysis.confidence = Math.min(analysis.confidence, 0.55); // Lower confidence for ambiguous match
                      console.log(`⚠️ Selected first match (ambiguous): ${matchedEmployee.first_name} ${matchedEmployee.last_name} - confidence reduced`);
                    }
                  } else {
                    // No user_id - pick first match but lower confidence
                    matchedEmployee = firstNameMatches[0];
                    detectionMethod = 'first_name_ambiguous';
                    analysis.confidence = Math.min(analysis.confidence, 0.55);
                    console.log(`⚠️ Selected first match (no context): ${matchedEmployee.first_name} ${matchedEmployee.last_name} - confidence reduced`);
                  }
                }
              } else {
                console.log(`❌ No employees found with first name: ${firstName}`);
              }
            }
          }
        }

        if (matchedEmployee) {
          // Derive a confidence score for participation based on detection method
          let confidenceForParticipation = typeof analysis.confidence === 'number' ? analysis.confidence : 0.6;
          if (detectionMethod === 'exact_match') confidenceForParticipation = 0.95;
          else if (detectionMethod === 'fuzzy_match') confidenceForParticipation = Math.max(confidenceForParticipation, 0.75);
          else if (detectionMethod === 'first_name_unique' || detectionMethod === 'first_name_context') confidenceForParticipation = Math.max(confidenceForParticipation, 0.70);
          else if (detectionMethod === 'first_name_ambiguous') confidenceForParticipation = Math.min(confidenceForParticipation || 0.55, 0.60);
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
                confidence_score: confidenceForParticipation,
                manually_tagged: false, // Auto-detected by AI
                speaker_segments: {
                  detection_method: detectionMethod, // Track how employee was matched
                  name_type: analysis.name_type || 'unclear',
                  detected_name: analysis.employee_name,
                  reasoning: analysis.reasoning
                } // Store detection metadata
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
                participation_id: participationRecord.id,
                detection_method: detectionMethod,
                confidence_score: confidenceForParticipation
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
