import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface VoiceTrainingRequest {
  employee_id: string;
  sample_recordings: string[]; // Array of recording IDs to use for training
  force_retrain?: boolean;
}

interface VoiceTrainingResult {
  success: boolean;
  employee_id: string;
  training_status: 'completed' | 'failed' | 'in_progress';
  confidence_scores: number[];
  training_quality_score: number;
  voice_characteristics: {
    pitch_range: [number, number];
    speaking_rate: number;
    voice_timbre: string;
    accent_characteristics: string[];
    unique_identifiers: string[];
  };
  sample_count: number;
  error?: string;
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

    const { employee_id, sample_recordings, force_retrain = false }: VoiceTrainingRequest = await req.json()

    if (!employee_id || !sample_recordings || sample_recordings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'employee_id and sample_recordings are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if employee exists
    const { data: employee, error: employeeError } = await supabaseClient
      .from('employees')
      .select('id, first_name, last_name')
      .eq('id', employee_id)
      .single()

    if (employeeError || !employee) {
      return new Response(
        JSON.stringify({ error: 'Employee not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if voice profile already exists
    const { data: existingProfile, error: profileError } = await supabaseClient
      .from('employee_voice_profiles')
      .select('*')
      .eq('employee_id', employee_id)
      .single()

    if (existingProfile && !force_retrain) {
      return new Response(
        JSON.stringify({ 
          error: 'Voice profile already exists. Use force_retrain=true to retrain.',
          existing_profile: existingProfile
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get speaker analysis data for all sample recordings
    const { data: recordings, error: recordingsError } = await supabaseClient
      .from('recordings')
      .select('id, ai_speaker_analysis, transcript')
      .in('id', sample_recordings)

    if (recordingsError || !recordings || recordings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid recordings found for training' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Process each recording to extract voice characteristics
    const voiceCharacteristics = await extractVoiceCharacteristics(recordings)
    
    if (!voiceCharacteristics) {
      return new Response(
        JSON.stringify({ error: 'Failed to extract voice characteristics from recordings' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Calculate training quality score
    const trainingQualityScore = calculateTrainingQuality(recordings, voiceCharacteristics)
    
    // Generate confidence scores for each sample
    const confidenceScores = recordings.map(recording => 
      calculateRecordingConfidence(recording, voiceCharacteristics)
    )

    // Create or update voice profile
    const voiceProfileData = {
      employee_id,
      voice_characteristics: voiceCharacteristics,
      sample_recordings: sample_recordings,
      confidence_threshold: Math.max(0.7, Math.min(...confidenceScores) - 0.1),
      training_status: 'completed',
      last_training_date: new Date().toISOString()
    }

    const { error: upsertError } = await supabaseClient
      .from('employee_voice_profiles')
      .upsert(voiceProfileData, { 
        onConflict: 'employee_id',
        ignoreDuplicates: false 
      })

    if (upsertError) {
      console.error('Error upserting voice profile:', upsertError)
      return new Response(
        JSON.stringify({ error: 'Failed to save voice profile' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result: VoiceTrainingResult = {
      success: true,
      employee_id,
      training_status: 'completed',
      confidence_scores: confidenceScores,
      training_quality_score: trainingQualityScore,
      voice_characteristics: voiceCharacteristics,
      sample_count: recordings.length
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Voice training error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function extractVoiceCharacteristics(recordings: any[]): Promise<any> {
  const allCharacteristics: any[] = []

  for (const recording of recordings) {
    const speakerAnalysis = recording.ai_speaker_analysis
    
    if (speakerAnalysis && speakerAnalysis.identified_speakers) {
      // Find the speaker that matches this employee (this would need more sophisticated logic)
      const primarySpeaker = speakerAnalysis.identified_speakers[0]
      
      if (primarySpeaker) {
        allCharacteristics.push({
          pitch_range: primarySpeaker.pitch_range || [100, 300],
          speaking_rate: primarySpeaker.speaking_rate || 150,
          voice_timbre: primarySpeaker.voice_timbre || 'neutral',
          accent_characteristics: primarySpeaker.accent_characteristics || [],
          unique_identifiers: primarySpeaker.unique_identifiers || []
        })
      }
    }
  }

  if (allCharacteristics.length === 0) {
    return null
  }

  // Aggregate characteristics from all samples
  return aggregateVoiceCharacteristics(allCharacteristics)
}

function aggregateVoiceCharacteristics(characteristics: any[]) {
  const pitchRanges = characteristics.map(c => c.pitch_range).filter(Boolean)
  const speakingRates = characteristics.map(c => c.speaking_rate).filter(Boolean)
  const voiceTimbres = characteristics.map(c => c.voice_timbre).filter(Boolean)
  const accentCharacteristics = characteristics.flatMap(c => c.accent_characteristics || [])
  const uniqueIdentifiers = characteristics.flatMap(c => c.unique_identifiers || [])

  // Calculate aggregated pitch range
  const allPitches = pitchRanges.flat()
  const pitchRange: [number, number] = allPitches.length > 0 
    ? [Math.min(...allPitches), Math.max(...allPitches)]
    : [100, 300]

  // Calculate average speaking rate
  const avgSpeakingRate = speakingRates.length > 0 
    ? speakingRates.reduce((sum, rate) => sum + rate, 0) / speakingRates.length
    : 150

  // Find most common voice timbre
  const timbreCounts = voiceTimbres.reduce((acc, timbre) => {
    acc[timbre] = (acc[timbre] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const mostCommonTimbre = Object.keys(timbreCounts).reduce((a, b) => 
    timbreCounts[a] > timbreCounts[b] ? a : b, 'neutral'
  )

  // Get unique accent characteristics
  const uniqueAccents = [...new Set(accentCharacteristics)]
  const uniqueIdentifiersSet = [...new Set(uniqueIdentifiers)]

  return {
    pitch_range: pitchRange,
    speaking_rate: avgSpeakingRate,
    voice_timbre: mostCommonTimbre,
    accent_characteristics: uniqueAccents,
    unique_identifiers: uniqueIdentifiersSet
  }
}

function calculateTrainingQuality(recordings: any[], voiceCharacteristics: any): number {
  // This is a simplified quality calculation
  // In practice, you'd analyze consistency, clarity, etc.
  
  let qualityScore = 0
  let factors = 0

  // Factor 1: Number of samples
  const sampleCount = recordings.length
  const sampleQuality = Math.min(1, sampleCount / 5) // Optimal at 5+ samples
  qualityScore += sampleQuality * 0.3
  factors += 0.3

  // Factor 2: Recording duration (longer is better)
  const totalDuration = recordings.reduce((sum, recording) => {
    // This would need actual duration calculation
    return sum + 300 // Mock duration
  }, 0)
  const durationQuality = Math.min(1, totalDuration / 1800) // Optimal at 30+ minutes
  qualityScore += durationQuality * 0.2
  factors += 0.2

  // Factor 3: Voice characteristic consistency
  const consistencyScore = calculateConsistencyScore(recordings, voiceCharacteristics)
  qualityScore += consistencyScore * 0.3
  factors += 0.3

  // Factor 4: Audio quality (this would need actual audio analysis)
  const audioQuality = 0.8 // Mock score
  qualityScore += audioQuality * 0.2
  factors += 0.2

  return factors > 0 ? qualityScore / factors : 0
}

function calculateConsistencyScore(recordings: any[], voiceCharacteristics: any): number {
  // Simplified consistency calculation
  // In practice, you'd compare voice characteristics across recordings
  
  const speakingRates = recordings.map(recording => {
    const analysis = recording.ai_speaker_analysis
    return analysis?.identified_speakers?.[0]?.speaking_rate || 150
  }).filter(Boolean)

  if (speakingRates.length < 2) return 0.5

  const mean = speakingRates.reduce((sum, rate) => sum + rate, 0) / speakingRates.length
  const variance = speakingRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / speakingRates.length
  const standardDeviation = Math.sqrt(variance)
  
  // Lower standard deviation = higher consistency
  const consistencyScore = Math.max(0, 1 - (standardDeviation / mean))
  
  return Math.min(1, consistencyScore)
}

function calculateRecordingConfidence(recording: any, voiceCharacteristics: any): number {
  // Simplified confidence calculation
  // In practice, you'd analyze audio quality, speaker clarity, etc.
  
  const speakerAnalysis = recording.ai_speaker_analysis
  if (!speakerAnalysis || !speakerAnalysis.identified_speakers) {
    return 0.3 // Low confidence for missing data
  }

  const primarySpeaker = speakerAnalysis.identified_speakers[0]
  if (!primarySpeaker) {
    return 0.3
  }

  // Calculate similarity to voice characteristics
  let confidence = 0.5 // Base confidence
  let factors = 0

  // Speaking rate similarity
  if (primarySpeaker.speaking_rate && voiceCharacteristics.speaking_rate) {
    const rateDiff = Math.abs(primarySpeaker.speaking_rate - voiceCharacteristics.speaking_rate)
    const rateSimilarity = Math.max(0, 1 - (rateDiff / voiceCharacteristics.speaking_rate))
    confidence += rateSimilarity * 0.3
    factors += 0.3
  }

  // Voice timbre similarity
  if (primarySpeaker.voice_timbre && voiceCharacteristics.voice_timbre) {
    const timbreSimilarity = primarySpeaker.voice_timbre === voiceCharacteristics.voice_timbre ? 1 : 0.5
    confidence += timbreSimilarity * 0.2
    factors += 0.2
  }

  // Audio quality factor (mock)
  const audioQuality = 0.8
  confidence += audioQuality * 0.3
  factors += 0.3

  return factors > 0 ? Math.min(1, confidence / factors) : 0.5
}
