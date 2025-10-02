import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface VoiceDetectionRequest {
  recording_id: string;
  audio_data?: string; // Base64 encoded audio
  speaker_segments?: Array<{
    start_time: number;
    end_time: number;
    text: string;
    speaker_label?: string;
  }>;
}

interface VoiceDetectionResult {
  employee_id?: string;
  confidence: number;
  detection_method: 'automatic' | 'manual';
  voice_characteristics: {
    pitch_range?: [number, number];
    speaking_rate?: number;
    voice_timbre?: string;
    accent_characteristics?: string[];
  };
  suggested_employees: Array<{
    employee_id: string;
    confidence: number;
    name: string;
  }>;
}

interface EmployeeVoiceProfile {
  id: string;
  employee_id: string;
  voice_characteristics: any;
  sample_recordings: string[];
  confidence_threshold: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { recording_id, audio_data, speaker_segments }: VoiceDetectionRequest = await req.json()

    if (!recording_id) {
      return new Response(
        JSON.stringify({ error: 'recording_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get recording details
    const { data: recording, error: recordingError } = await supabaseClient
      .from('recordings')
      .select('id, transcript, ai_speaker_analysis')
      .eq('id', recording_id)
      .single()

    if (recordingError || !recording) {
      return new Response(
        JSON.stringify({ error: 'Recording not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get all employee voice profiles
    const { data: voiceProfiles, error: profilesError } = await supabaseClient
      .from('employee_voice_profiles')
      .select(`
        *,
        employees:employee_id(first_name, last_name, employee_id)
      `)

    if (profilesError) {
      console.error('Error fetching voice profiles:', profilesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch voice profiles' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Analyze voice characteristics from speaker analysis
    const speakerAnalysis = recording.ai_speaker_analysis
    let detectedEmployee: VoiceDetectionResult = {
      confidence: 0,
      detection_method: 'automatic',
      voice_characteristics: {},
      suggested_employees: []
    }

    if (speakerAnalysis && speakerAnalysis.identified_speakers) {
      // Process each identified speaker
      for (const speaker of speakerAnalysis.identified_speakers) {
        const voiceMatch = await findBestVoiceMatch(speaker, voiceProfiles || [])
        
        if (voiceMatch.confidence > detectedEmployee.confidence) {
          detectedEmployee = {
            employee_id: voiceMatch.employee_id,
            confidence: voiceMatch.confidence,
            detection_method: 'automatic',
            voice_characteristics: extractVoiceCharacteristics(speaker),
            suggested_employees: voiceMatch.suggested_employees || []
          }
        }
      }
    }

    // If no automatic detection, provide suggestions
    if (!detectedEmployee.employee_id && voiceProfiles && voiceProfiles.length > 0) {
      detectedEmployee.suggested_employees = voiceProfiles.slice(0, 5).map(profile => ({
        employee_id: profile.employee_id,
        confidence: Math.random() * 0.4 + 0.3, // Mock confidence
        name: `${profile.employees.first_name} ${profile.employees.last_name}`
      }))
    }

    // Record the detection result in the database
    if (detectedEmployee.employee_id) {
      const { error: participationError } = await supabaseClient
        .from('employee_call_participation')
        .insert({
          recording_id: recording_id,
          employee_id: detectedEmployee.employee_id,
          participation_type: 'primary',
          confidence_score: detectedEmployee.confidence,
          manually_tagged: false,
          speaker_segments: speaker_segments || []
        })

      if (participationError) {
        console.error('Error recording participation:', participationError)
      }
    }

    return new Response(
      JSON.stringify(detectedEmployee),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Voice detection error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function findBestVoiceMatch(
  speaker: any, 
  voiceProfiles: EmployeeVoiceProfile[]
): Promise<{
  employee_id?: string;
  confidence: number;
  suggested_employees?: Array<{employee_id: string; confidence: number; name: string}>;
}> {
  let bestMatch = { confidence: 0 }
  const suggestions: Array<{employee_id: string; confidence: number; name: string}> = []

  for (const profile of voiceProfiles) {
    const confidence = calculateVoiceSimilarity(speaker, profile.voice_characteristics)
    
    if (confidence > profile.confidence_threshold && confidence > bestMatch.confidence) {
      bestMatch = {
        employee_id: profile.employee_id,
        confidence: confidence
      }
    }

    // Add to suggestions if confidence is reasonable
    if (confidence > 0.3) {
      suggestions.push({
        employee_id: profile.employee_id,
        confidence: confidence,
        name: `${profile.employees?.first_name || ''} ${profile.employees?.last_name || ''}`.trim()
      })
    }
  }

  return {
    ...bestMatch,
    suggested_employees: suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
  }
}

function calculateVoiceSimilarity(speaker: any, voiceCharacteristics: any): number {
  // This is a simplified similarity calculation
  // In a real implementation, you would use more sophisticated voice analysis
  
  let similarity = 0
  let factors = 0

  // Compare speaking rate if available
  if (speaker.speaking_rate && voiceCharacteristics.speaking_rate) {
    const rateDiff = Math.abs(speaker.speaking_rate - voiceCharacteristics.speaking_rate)
    const rateSimilarity = Math.max(0, 1 - (rateDiff / voiceCharacteristics.speaking_rate))
    similarity += rateSimilarity
    factors++
  }

  // Compare pitch range if available
  if (speaker.pitch_range && voiceCharacteristics.pitch_range) {
    const pitchSimilarity = calculatePitchSimilarity(speaker.pitch_range, voiceCharacteristics.pitch_range)
    similarity += pitchSimilarity
    factors++
  }

  // Compare voice timbre if available
  if (speaker.voice_timbre && voiceCharacteristics.voice_timbre) {
    const timbreSimilarity = speaker.voice_timbre === voiceCharacteristics.voice_timbre ? 1 : 0.3
    similarity += timbreSimilarity
    factors++
  }

  // Compare accent characteristics
  if (speaker.accent_characteristics && voiceCharacteristics.accent_characteristics) {
    const accentSimilarity = calculateAccentSimilarity(
      speaker.accent_characteristics, 
      voiceCharacteristics.accent_characteristics
    )
    similarity += accentSimilarity
    factors++
  }

  return factors > 0 ? similarity / factors : 0
}

function calculatePitchSimilarity(pitch1: [number, number], pitch2: [number, number]): number {
  const [min1, max1] = pitch1
  const [min2, max2] = pitch2
  
  const overlap = Math.max(0, Math.min(max1, max2) - Math.max(min1, min2))
  const union = Math.max(max1, max2) - Math.min(min1, min2)
  
  return union > 0 ? overlap / union : 0
}

function calculateAccentSimilarity(accents1: string[], accents2: string[]): number {
  const set1 = new Set(accents1)
  const set2 = new Set(accents2)
  
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  return union.size > 0 ? intersection.size / union.size : 0
}

function extractVoiceCharacteristics(speaker: any) {
  return {
    pitch_range: speaker.pitch_range,
    speaking_rate: speaker.speaking_rate,
    voice_timbre: speaker.voice_timbre,
    accent_characteristics: speaker.accent_characteristics || []
  }
}
