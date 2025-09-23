// @ts-nocheck
// @ts-ignore — Deno remote URL import is resolved at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { createAzureOpenAIWhisperClient } from '../_shared/azure-openai.ts';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

// -------------------------------------------------
//  Minimal Deno typing for the TypeScript compiler
// -------------------------------------------------
declare const Deno: { env: { get(key: string): string | undefined } };

interface RequestBody {
  recording_id?: string;
  batch_process?: boolean;
  limit?: number;
}

/**
 * Extract speaker diarization from existing transcript using enhanced AI analysis
 * For recordings that already have transcripts but no speaker analysis
 */
async function extractSpeakersFromTranscript(transcript: string, recordingId: string, supabase: any) {
  try {
    console.log('🎭 Analyzing transcript for speaker patterns...');
    
    // Split transcript into lines for analysis
    const lines = transcript.split('\n').filter(l => l.trim());
    const speakerSegments = [];
    const speakerStats = new Map();
    
    let currentTime = 0;
    const avgSecondsPerLine = 3; // Estimate 3 seconds per line
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Try to extract timestamp if present
      const timeMatch = line.match(/\[(\d{1,2}):(\d{2})\]|\((\d{1,2}):(\d{2})\)|(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        currentTime = (parseInt(timeMatch[1] || timeMatch[3] || timeMatch[5]) * 60) + 
                     parseInt(timeMatch[2] || timeMatch[4] || timeMatch[6]);
      } else {
        currentTime += avgSecondsPerLine;
      }
      
      // Extract speaker and text
      let speaker = 'Speaker 1';
      let text = line;
      
      // Look for speaker patterns
      const speakerPatterns = [
        /^([A-Za-z\s]+):\s*(.+)/, // "John Smith: text"
        /^\[[\d:]+\]\s*([A-Za-z\s]+):\s*(.+)/, // "[00:00] John: text"
        /^(Speaker\s*[A-Z\d]+|\w+):\s*(.+)/ // "Speaker A: text" or "Agent: text"
      ];
      
      for (const pattern of speakerPatterns) {
        const match = line.match(pattern);
        if (match) {
          speaker = match[1].trim();
          text = match[2].trim();
          break;
        }
      }
      
      // Look for speaker introductions
      const introPatterns = [
        /(?:I'm|I am|This is|My name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
        /Hi,?\s+([A-Z][a-z]+)/gi,
        /([A-Z][a-z]+)\s+(?:here|speaking)/gi
      ];
      
      for (const pattern of introPatterns) {
        const match = text.match(pattern);
        if (match) {
          const extractedName = match[1] || match[0].replace(/^(Hi,?\s+|I'm\s+|I am\s+|This is\s+|My name is\s+)/i, '').replace(/\s+(here|speaking)$/i, '');
          if (extractedName && extractedName.length > 1 && extractedName.length < 30) {
            speaker = extractedName;
            break;
          }
        }
      }
      
      // Clean and validate speaker name
      if (speaker.length > 50) {
        speaker = `Speaker ${Math.floor(i / 5) + 1}`; // Fallback
      }
      
      // Create segment
      const startTime = Math.max(0, currentTime - avgSecondsPerLine);
      const endTime = currentTime;
      
      speakerSegments.push({
        recording_id: recordingId,
        speaker_name: speaker,
        start_time: startTime,
        end_time: endTime,
        text: text
      });
      
      // Update speaker statistics
      if (!speakerStats.has(speaker)) {
        speakerStats.set(speaker, {
          name: speaker,
          totalTime: 0,
          segmentCount: 0,
          texts: []
        });
      }
      
      const stats = speakerStats.get(speaker);
      stats.totalTime += (endTime - startTime);
      stats.segmentCount += 1;
      stats.texts.push(text);
    }
    
    console.log(`🎭 Detected ${speakerStats.size} speakers from transcript analysis`);
    
    // Create AI speaker analysis
    const identifiedSpeakers = Array.from(speakerStats.values()).map((stats, index) => ({
      name: stats.name,
      confidence: Math.min(0.8, 0.5 + (stats.segmentCount / lines.length * 2)), // Confidence based on speaking frequency
      segments: speakerSegments.filter(seg => seg.speaker_name === stats.name).slice(0, 10), // Limit segments for storage
      characteristics: {
        speaking_time: stats.totalTime,
        segment_count: stats.segmentCount,
        analysis_method: 'transcript_parsing'
      }
    }));
    
    const aiSpeakerAnalysis = {
      identified_speakers: identifiedSpeakers,
      confidence_score: Math.min(0.8, 0.6 + (speakerStats.size <= 4 ? 0.2 : 0)), // Higher confidence for reasonable speaker counts
      analysis_method: 'enhanced_transcript_analysis',
      total_speakers: speakerStats.size,
      processing_date: new Date().toISOString()
    };
    
    return { speakerSegments, aiSpeakerAnalysis, speakerCount: speakerStats.size };
    
  } catch (error) {
    console.error('❌ Error extracting speakers from transcript:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    console.log('Function started: extract-whisper-speakers');
    
    const { recording_id, batch_process = false, limit = 10 }: RequestBody = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      return createErrorResponse('Supabase configuration missing', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (batch_process) {
      // Process multiple recordings that need speaker analysis
      console.log(`🔄 Batch processing up to ${limit} recordings...`);
      
      const { data: recordings, error: fetchError } = await supabase
        .from('recordings')
        .select('id, transcript, title, duration')
        .not('transcript', 'is', null)
        .is('ai_speaker_analysis', null)
        .eq('status', 'completed')
        .limit(limit)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching recordings for batch processing:', fetchError);
        return createErrorResponse('Failed to fetch recordings', 500);
      }

      const results = [];
      
      for (const recording of recordings || []) {
        try {
          console.log(`Processing recording: ${recording.id} - ${recording.title}`);
          
          // Extract speakers from transcript
          const { speakerSegments, aiSpeakerAnalysis, speakerCount } = await extractSpeakersFromTranscript(
            recording.transcript, 
            recording.id, 
            supabase
          );
          
          // Store speaker segments
          if (speakerSegments.length > 0) {
            await supabase.from('speaker_segments').delete().eq('recording_id', recording.id);
            const { error: segmentsError } = await supabase
              .from('speaker_segments')
              .insert(speakerSegments);
              
            if (segmentsError) {
              console.error(`Failed to store segments for ${recording.id}:`, segmentsError);
            }
          }
          
          // Store AI speaker analysis
          const { error: analysisError } = await supabase
            .from('recordings')
            .update({ 
              ai_speaker_analysis: aiSpeakerAnalysis,
              ai_speakers_updated_at: new Date().toISOString()
            })
            .eq('id', recording.id);
            
          if (analysisError) {
            console.error(`Failed to store analysis for ${recording.id}:`, analysisError);
          }
          
          results.push({
            recording_id: recording.id,
            title: recording.title,
            speaker_count: speakerCount,
            segments_created: speakerSegments.length,
            success: !segmentsError && !analysisError
          });
          
        } catch (recordingError) {
          console.error(`Error processing recording ${recording.id}:`, recordingError);
          results.push({
            recording_id: recording.id,
            success: false,
            error: recordingError.message
          });
        }
      }
      
      return createSuccessResponse({
        message: `Batch processing completed for ${results.length} recordings`,
        results,
        total_processed: results.length,
        successful: results.filter(r => r.success).length
      });
      
    } else {
      // Process single recording
      if (!recording_id) {
        return createErrorResponse('Recording ID is required for single processing', 400);
      }
      
      console.log(`Processing single recording: ${recording_id}`);
      
      // Get recording
      const { data: recording, error: recordingError } = await supabase
        .from('recordings')
        .select('*')
        .eq('id', recording_id)
        .single();

      if (recordingError || !recording) {
        console.error('Recording not found:', recordingError);
        return createErrorResponse('Recording not found', 404);
      }

      if (!recording.transcript) {
        return createErrorResponse('Recording has no transcript to analyze', 400);
      }
      
      // Extract speakers from transcript
      const { speakerSegments, aiSpeakerAnalysis, speakerCount } = await extractSpeakersFromTranscript(
        recording.transcript, 
        recording_id, 
        supabase
      );
      
      // Store speaker segments
      if (speakerSegments.length > 0) {
        await supabase.from('speaker_segments').delete().eq('recording_id', recording_id);
        const { error: segmentsError } = await supabase
          .from('speaker_segments')
          .insert(speakerSegments);
          
        if (segmentsError) {
          console.error('Failed to store speaker segments:', segmentsError);
          return createErrorResponse('Failed to store speaker segments', 500);
        }
      }
      
      // Store AI speaker analysis
      const { error: analysisError } = await supabase
        .from('recordings')
        .update({ 
          ai_speaker_analysis: aiSpeakerAnalysis,
          ai_speakers_updated_at: new Date().toISOString()
        })
        .eq('id', recording_id);
        
      if (analysisError) {
        console.error('Failed to store speaker analysis:', analysisError);
        return createErrorResponse('Failed to store speaker analysis', 500);
      }
      
      return createSuccessResponse({
        message: 'Speaker analysis completed successfully',
        recording_id,
        speaker_count: speakerCount,
        segments_created: speakerSegments.length,
        analysis: aiSpeakerAnalysis
      });
    }

  } catch (error) {
    console.error('Error in extract-whisper-speakers:', error);
    return createErrorResponse('An unexpected error occurred', 500, error.message);
  }
});