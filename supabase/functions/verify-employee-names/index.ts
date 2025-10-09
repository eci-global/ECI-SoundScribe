// Verify Employee Names - Compare stored names against fresh AI analysis
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
  recording_id?: string;
  batch_size?: number;
  verify_all?: boolean;
}

interface VerificationResult {
  recording_id: string;
  stored_name: string | null;
  ai_detected_name: string | null;
  confidence: number;
  match_status: 'exact' | 'similar' | 'different' | 'missing' | 'error';
  should_update: boolean;
  reasoning: string;
  detected_names: string[];
}

interface EmployeeNameAnalysis {
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

  console.log('🔍 Employee name verification started');

  try {
    // Parse request
    const requestBody: RequestBody = await req.json().catch(() => ({}));
    const { recording_id, batch_size = 10, verify_all = false } = requestBody;

    // Initialize Supabase client
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

    // Get recordings to verify
    let recordings: any[] = [];

    if (recording_id) {
      // Single recording verification
      const { data, error } = await supabase
        .from('recordings')
        .select('id, title, transcript, employee_name')
        .eq('id', recording_id)
        .single();

      if (error || !data) {
        return createErrorResponse('Recording not found', 404);
      }
      recordings = [data];
      console.log(`📋 Verifying single recording: ${recording_id}`);
    } else {
      // Batch verification
      let query = supabase
        .from('recordings')
        .select('id, title, transcript, employee_name')
        .not('transcript', 'is', null)
        .neq('transcript', '')
        .order('created_at', { ascending: false })
        .limit(batch_size);

      if (!verify_all) {
        // Only verify recordings that already have employee names
        query = query.not('employee_name', 'is', null);
      }

      const { data, error } = await query;

      if (error) {
        return createErrorResponse(`Database error: ${error.message}`, 500);
      }

      recordings = data || [];
      console.log(`📋 Found ${recordings.length} recordings to verify`);
    }

    if (recordings.length === 0) {
      return createSuccessResponse({
        verified_count: 0,
        results: [],
        summary: { exact: 0, similar: 0, different: 0, missing: 0, errors: 0 }
      });
    }

    // Get known employees for context
    const { data: employees } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_code, status')
      .eq('status', 'active');

    const knownEmployeeNames = employees?.map(emp => `${emp.first_name} ${emp.last_name}`) || [];
    console.log(`👥 Found ${knownEmployeeNames.length} known employees in system`);

    // Initialize Azure OpenAI
    const chatClient = createAzureOpenAIChatClient();

    // Verify each recording
    const results: VerificationResult[] = [];
    const summary = { exact: 0, similar: 0, different: 0, missing: 0, errors: 0 };

    for (const recording of recordings) {
      console.log(`🔍 Verifying recording: ${recording.id}`);

      try {
        const verificationResult = await verifyRecordingEmployeeName(
          recording,
          knownEmployeeNames,
          chatClient
        );

        results.push(verificationResult);
        summary[verificationResult.match_status]++;

        // Log significant discrepancies
        if (verificationResult.match_status === 'different' && verificationResult.should_update) {
          console.log(`⚠️ Discrepancy found in ${recording.id}: "${verificationResult.stored_name}" → "${verificationResult.ai_detected_name}"`);
        }
      } catch (error) {
        console.error(`❌ Error verifying ${recording.id}:`, error);
        results.push({
          recording_id: recording.id,
          stored_name: recording.employee_name,
          ai_detected_name: null,
          confidence: 0,
          match_status: 'error',
          should_update: false,
          reasoning: `Verification failed: ${error.message}`,
          detected_names: []
        });
        summary.errors++;
      }
    }

    console.log('📊 Verification summary:', summary);

    return createSuccessResponse({
      verified_count: results.length,
      results,
      summary,
      recommendations: generateRecommendations(results)
    });

  } catch (error) {
    console.error('💥 Unexpected error in verify-employee-names:', error);
    return createErrorResponse(`Verification failed: ${error.message}`, 500);
  }
});

async function verifyRecordingEmployeeName(
  recording: any,
  knownEmployeeNames: string[],
  chatClient: any
): Promise<VerificationResult> {

  if (!recording.transcript || recording.transcript.length < 50) {
    return {
      recording_id: recording.id,
      stored_name: recording.employee_name,
      ai_detected_name: null,
      confidence: 0,
      match_status: 'error',
      should_update: false,
      reasoning: 'Transcript too short for analysis',
      detected_names: []
    };
  }

  // Run fresh AI analysis
  const prompt = `Analyze this call transcript to identify the company employee speaking on the call.

TRANSCRIPT:
"""
${recording.transcript.substring(0, 4000)} ${recording.transcript.length > 4000 ? '...[truncated]' : ''}
"""

KNOWN EMPLOYEES (for reference):
${knownEmployeeNames.slice(0, 20).map(name => `- ${name}`).join('\n')}

INSTRUCTIONS:
1. Identify who is the company employee/representative on this call
2. Look for names mentioned in introduction, speaker labels, or conversation context
3. If multiple employees are present, identify the primary one
4. Match against known employees if possible, but also detect new names

Return a JSON response with:
{
  "employee_name": "Full name of the primary employee" or null,
  "confidence": 0.0 to 1.0 confidence score,
  "reasoning": "Brief explanation of how you identified this employee",
  "detected_names": ["list", "of", "all", "employee", "names", "detected"]
}

Focus on accuracy - if unsure, set confidence low and explain why.`;

  const completion = await chatClient.createChatCompletion({
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

  const aiResponse = completion.choices?.[0]?.message?.content;
  if (!aiResponse) {
    throw new Error('No response from AI analysis');
  }

  const analysis: EmployeeNameAnalysis = extractJsonFromAIResponse(aiResponse);

  // Compare stored vs AI detected name
  const storedName = recording.employee_name;
  const aiName = analysis.employee_name;

  let matchStatus: VerificationResult['match_status'] = 'missing';
  let shouldUpdate = false;
  let reasoning = analysis.reasoning;

  if (!storedName && !aiName) {
    matchStatus = 'missing';
    reasoning = 'No employee identified by either stored data or AI';
  } else if (!storedName && aiName) {
    matchStatus = 'missing';
    shouldUpdate = analysis.confidence > 0.6;
    reasoning = `AI detected "${aiName}" but no stored name exists`;
  } else if (storedName && !aiName) {
    matchStatus = 'different';
    shouldUpdate = analysis.confidence < 0.3; // Only remove if AI is confident there's no employee
    reasoning = `Stored name "${storedName}" but AI found no employee (confidence: ${analysis.confidence})`;
  } else if (storedName && aiName) {
    // Both have names - compare them
    if (normalizeEmployeeName(storedName) === normalizeEmployeeName(aiName)) {
      matchStatus = 'exact';
      reasoning = `Exact match confirmed: "${storedName}"`;
    } else if (areNamesSimilar(storedName, aiName)) {
      matchStatus = 'similar';
      shouldUpdate = analysis.confidence > 0.8; // Only update if very confident
      reasoning = `Similar names: "${storedName}" vs "${aiName}" (confidence: ${analysis.confidence})`;
    } else {
      matchStatus = 'different';
      shouldUpdate = analysis.confidence > 0.7; // Update if reasonably confident
      reasoning = `Different names: "${storedName}" vs "${aiName}" (confidence: ${analysis.confidence})`;
    }
  }

  return {
    recording_id: recording.id,
    stored_name: storedName,
    ai_detected_name: aiName,
    confidence: analysis.confidence,
    match_status: matchStatus,
    should_update: shouldUpdate,
    reasoning,
    detected_names: analysis.detected_names
  };
}

function normalizeEmployeeName(name: string): string {
  return name.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize spaces
    .trim();
}

function areNamesSimilar(name1: string, name2: string): boolean {
  const norm1 = normalizeEmployeeName(name1);
  const norm2 = normalizeEmployeeName(name2);

  // Check if one is a subset of the other (e.g., "John" vs "John Smith")
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return true;
  }

  // Check for common name variations
  const parts1 = norm1.split(' ');
  const parts2 = norm2.split(' ');

  // If they share at least 2 name parts, consider similar
  const commonParts = parts1.filter(part => parts2.includes(part));
  return commonParts.length >= Math.min(2, Math.min(parts1.length, parts2.length));
}

function generateRecommendations(results: VerificationResult[]): string[] {
  const recommendations: string[] = [];

  const updateNeeded = results.filter(r => r.should_update).length;
  const highConfidenceUpdates = results.filter(r => r.should_update && r.confidence > 0.8).length;
  const discrepancies = results.filter(r => r.match_status === 'different').length;

  if (updateNeeded > 0) {
    recommendations.push(`${updateNeeded} recordings need employee name updates`);
  }

  if (highConfidenceUpdates > 0) {
    recommendations.push(`${highConfidenceUpdates} high-confidence updates can be auto-applied`);
  }

  if (discrepancies > 0) {
    recommendations.push(`${discrepancies} discrepancies found - manual review recommended`);
  }

  if (results.length > 0) {
    const accuracy = ((results.length - discrepancies) / results.length * 100).toFixed(1);
    recommendations.push(`Overall data accuracy: ${accuracy}%`);
  }

  return recommendations;
}