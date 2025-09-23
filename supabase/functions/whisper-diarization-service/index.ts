// Whisper-Only Enhanced Speaker Detection
// This Edge Function triggers enhanced Whisper segment analysis for existing recordings
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { handleCORSPreflight, createSuccessResponse, createErrorResponse } from '../_shared/cors.ts';

declare const Deno: { env: { get(key: string): string | undefined } };

interface EnhancedAnalysisRequest {
  recording_id: string;
}

interface EnhancedAnalysisResult {
  recording_id: string;
  speakers_detected: number;
  confidence_score: number;
  analysis_method: string;
  segments_analyzed: number;
}

/**
 * Azure Speech Service client for real speaker diarization
 */
class AzureDiarizationClient {
  
  /**
   * Azure Speech Service Fast Transcription with Speaker Diarization
   * Uses the same Azure environment as Azure OpenAI for consistency
   */
  async processWithAzureSpeech(audioUrl: string): Promise<DiarizationResult> {
    console.log('🎤 Starting Azure Speech Service diarization...');

    // Create Azure Speech client
    const speechClient = createAzureSpeechClient();

    // Download audio file
    console.log('⬇️ Downloading audio file from:', audioUrl);
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`);
    }

    const audioBlob = await audioResponse.blob();
    console.log(`📁 Audio file downloaded: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

    // Configure diarization settings
    const diarizationConfig = {
      enabled: true,
      maxSpeakers: 8, // Reasonable maximum for business calls
      minSpeakers: 2, // Minimum for conversations
    };

    try {
      // Use Fast Transcription API for real-time processing
      console.log('🔄 Calling Azure Speech Fast Transcription with diarization...');
      const transcriptionResult = await speechClient.createFastTranscriptionWithDiarization({
        audio: audioBlob,
        definition: {
          locales: ['en-US'],
          diarization: diarizationConfig,
          wordLevelTimestampsEnabled: true,
        },
      });

      console.log('✅ Azure Speech diarization completed');
      
      // Process results into our format
      const processedResult = speechClient.processRealSpeakerDiarization(transcriptionResult, '');
      
      return this.convertAzureResultToStandardFormat(processedResult);

    } catch (fastError) {
      console.warn('⚠️ Fast transcription failed, trying batch transcription:', fastError);
      
      // Fallback to batch transcription for larger files
      return await this.processBatchTranscription(speechClient, audioUrl, diarizationConfig);
    }
  }

  /**
   * Fallback to Azure Speech Batch Transcription for larger files
   */
  private async processBatchTranscription(speechClient: any, audioUrl: string, diarizationConfig: any): Promise<DiarizationResult> {
    console.log('🔄 Using Azure Speech Batch Transcription...');

    // Submit batch transcription job
    const batchResult = await speechClient.createBatchTranscriptionWithDiarization({
      contentUrls: [audioUrl],
      locale: 'en-US',
      displayName: `Speaker Diarization - ${new Date().toISOString()}`,
      properties: {
        diarization: diarizationConfig,
        wordLevelTimestampsEnabled: true,
        timeToLiveHours: 1, // Auto-cleanup after 1 hour
      },
    });

    const transcriptionId = batchResult.transcriptionId;
    console.log(`📋 Batch transcription submitted: ${transcriptionId}`);

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      try {
        const transcriptionResult = await speechClient.getBatchTranscriptionResult(transcriptionId);
        console.log('✅ Azure Speech batch transcription completed');
        
        const processedResult = speechClient.processRealSpeakerDiarization(transcriptionResult, '');
        return this.convertAzureResultToStandardFormat(processedResult);
        
      } catch (pollError) {
        if (attempts === maxAttempts - 1) {
          throw new Error(`Azure Speech batch transcription timeout after ${maxAttempts * 5} seconds`);
        }
        
        attempts++;
        console.log(`⏳ Polling Azure Speech batch status (attempt ${attempts}/${maxAttempts})...`);
      }
    }

    throw new Error('Azure Speech batch transcription failed');
  }

  /**
   * Convert Azure Speech result to our standard format
   */
  private convertAzureResultToStandardFormat(azureResult: any): DiarizationResult {
    const segments: DiarizationSegment[] = azureResult.speakerSegments.map((segment: any) => ({
      start: segment.start_time,
      end: segment.end_time,
      speaker: segment.speaker_name,
      text: segment.text,
      confidence: segment.confidence,
    }));

    const speakers = azureResult.speakerAnalysis.identified_speakers.map((speaker: any) => ({
      id: speaker.name,
      total_speaking_time: speaker.characteristics.speaking_time,
      segment_count: speaker.characteristics.segment_count,
    }));

    return {
      segments,
      speakers,
      total_speakers: azureResult.speakerCount,
      confidence_score: azureResult.speakerAnalysis.confidence_score,
    };
  }

  /**
   * Legacy external service method (kept as fallback)
   */
  async callAssemblyAI(audioUrl: string): Promise<DiarizationResult> {
    const apiKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!apiKey) {
      throw new Error('AssemblyAI API key not configured');
    }

    console.log('🎤 Starting AssemblyAI diarization process...');

    // Step 1: Upload audio file
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/octet-stream',
      },
      body: await fetch(audioUrl).then(r => r.blob()),
    });

    if (!uploadResponse.ok) {
      throw new Error(`AssemblyAI upload failed: ${uploadResponse.statusText}`);
    }

    const uploadData = await uploadResponse.json();
    const uploadUrl = uploadData.upload_url;

    // Step 2: Request transcription with speaker diarization
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: uploadUrl,
        speaker_labels: true,
        speakers_expected: null, // Auto-detect speaker count
        language_code: 'en_us',
      }),
    });

    const transcriptData = await transcriptResponse.json();
    const transcriptId = transcriptData.id;

    // Step 3: Poll for completion
    console.log('⏳ Polling AssemblyAI for transcription completion...');
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { 'authorization': apiKey },
      });
      
      const statusData = await statusResponse.json();
      
      if (statusData.status === 'completed') {
        console.log('✅ AssemblyAI transcription completed');
        return this.parseAssemblyAIResult(statusData);
      } else if (statusData.status === 'error') {
        throw new Error(`AssemblyAI transcription failed: ${statusData.error}`);
      }
      
      attempts++;
      console.log(`⏳ AssemblyAI status: ${statusData.status} (attempt ${attempts}/${maxAttempts})`);
    }

    throw new Error('AssemblyAI transcription timeout');
  }

  /**
   * Deepgram API - High-quality Whisper-level transcription with Nova-2 model
   */
  async callDeepgram(audioUrl: string): Promise<DiarizationResult> {
    const apiKey = Deno.env.get('DEEPGRAM_API_KEY');
    if (!apiKey) {
      throw new Error('Deepgram API key not configured');
    }

    console.log('🎤 Starting Deepgram diarization process...');

    const response = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: audioUrl,
        model: 'nova-2', // Latest high-accuracy model
        diarize: true,
        smart_format: true,
        punctuate: true,
        paragraphs: true,
        utterances: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Deepgram API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Deepgram transcription completed');
    return this.parseDeepgramResult(data);
  }

  /**
   * Rev.ai API - Professional transcription service with speaker identification
   */
  async callRevAI(audioUrl: string): Promise<DiarizationResult> {
    const apiKey = Deno.env.get('REVAI_API_KEY');
    if (!apiKey) {
      throw new Error('Rev.ai API key not configured');
    }

    console.log('🎤 Starting Rev.ai diarization process...');

    // Step 1: Submit job
    const jobResponse = await fetch('https://api.rev.ai/speechtotext/v1/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_url: audioUrl,
        options: {
          language: 'en',
          speaker_channels_count: null, // Auto-detect
          diarization: {
            enabled: true,
          },
        },
      }),
    });

    const jobData = await jobResponse.json();
    const jobId = jobData.id;

    // Step 2: Poll for completion
    console.log('⏳ Polling Rev.ai for transcription completion...');
    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const statusResponse = await fetch(`https://api.rev.ai/speechtotext/v1/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      
      const statusData = await statusResponse.json();
      
      if (statusData.status === 'transcribed') {
        // Get transcript with speaker labels
        const transcriptResponse = await fetch(`https://api.rev.ai/speechtotext/v1/jobs/${jobId}/transcript`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        
        const transcriptData = await transcriptResponse.json();
        console.log('✅ Rev.ai transcription completed');
        return this.parseRevAIResult(transcriptData);
      } else if (statusData.status === 'failed') {
        throw new Error(`Rev.ai transcription failed: ${statusData.failure_detail}`);
      }
      
      attempts++;
      console.log(`⏳ Rev.ai status: ${statusData.status} (attempt ${attempts}/${maxAttempts})`);
    }

    throw new Error('Rev.ai transcription timeout');
  }

  private parseAssemblyAIResult(data: any): DiarizationResult {
    const segments: DiarizationSegment[] = [];
    const speakerStats = new Map<string, { time: number; count: number }>();

    if (data.utterances) {
      data.utterances.forEach((utterance: any) => {
        const speaker = utterance.speaker || 'Speaker A';
        segments.push({
          start: utterance.start / 1000, // Convert ms to seconds
          end: utterance.end / 1000,
          speaker: speaker,
          text: utterance.text,
          confidence: utterance.confidence || 0.8,
        });

        // Track speaker stats
        if (!speakerStats.has(speaker)) {
          speakerStats.set(speaker, { time: 0, count: 0 });
        }
        const stats = speakerStats.get(speaker)!;
        stats.time += (utterance.end - utterance.start) / 1000;
        stats.count += 1;
      });
    }

    const speakers = Array.from(speakerStats.entries()).map(([id, stats]) => ({
      id,
      total_speaking_time: stats.time,
      segment_count: stats.count,
    }));

    return {
      segments,
      speakers,
      total_speakers: speakers.length,
      confidence_score: data.confidence || 0.85,
    };
  }

  private parseDeepgramResult(data: any): DiarizationResult {
    const segments: DiarizationSegment[] = [];
    const speakerStats = new Map<string, { time: number; count: number }>();

    if (data.results?.utterances) {
      data.results.utterances.forEach((utterance: any) => {
        const speaker = `Speaker ${utterance.speaker || 0}`;
        segments.push({
          start: utterance.start,
          end: utterance.end,
          speaker: speaker,
          text: utterance.transcript,
          confidence: utterance.confidence || 0.8,
        });

        // Track speaker stats
        if (!speakerStats.has(speaker)) {
          speakerStats.set(speaker, { time: 0, count: 0 });
        }
        const stats = speakerStats.get(speaker)!;
        stats.time += utterance.end - utterance.start;
        stats.count += 1;
      });
    }

    const speakers = Array.from(speakerStats.entries()).map(([id, stats]) => ({
      id,
      total_speaking_time: stats.time,
      segment_count: stats.count,
    }));

    return {
      segments,
      speakers,
      total_speakers: speakers.length,
      confidence_score: 0.9, // Deepgram typically has high confidence
    };
  }

  private parseRevAIResult(data: any): DiarizationResult {
    const segments: DiarizationSegment[] = [];
    const speakerStats = new Map<string, { time: number; count: number }>();

    if (data.monologues) {
      data.monologues.forEach((monologue: any) => {
        const speaker = `Speaker ${monologue.speaker || 0}`;
        const elements = monologue.elements || [];
        
        if (elements.length > 0) {
          const text = elements.map((e: any) => e.value).join(' ');
          const start = elements[0].ts;
          const end = elements[elements.length - 1].end_ts || elements[elements.length - 1].ts;

          segments.push({
            start,
            end,
            speaker,
            text,
            confidence: 0.8, // Rev.ai doesn't provide per-segment confidence
          });

          // Track speaker stats
          if (!speakerStats.has(speaker)) {
            speakerStats.set(speaker, { time: 0, count: 0 });
          }
          const stats = speakerStats.get(speaker)!;
          stats.time += end - start;
          stats.count += 1;
        }
      });
    }

    const speakers = Array.from(speakerStats.entries()).map(([id, stats]) => ({
      id,
      total_speaking_time: stats.time,
      segment_count: stats.count,
    }));

    return {
      segments,
      speakers,
      total_speakers: speakers.length,
      confidence_score: 0.85,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    const { recording_id, audio_url } = await req.json() as DiarizationRequest;

    if (!recording_id || !audio_url) {
      return createErrorResponse('Missing recording_id or audio_url', 400);
    }

    console.log(`🎤 Starting real speaker diarization for recording: ${recording_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try different diarization services in order of preference
    const client = new DiarizationServiceClient();
    let result: DiarizationResult;
    let serviceUsed: string;

    try {
      // First try AssemblyAI (high quality, good diarization)
      if (Deno.env.get('ASSEMBLYAI_API_KEY')) {
        console.log('🔄 Attempting AssemblyAI diarization...');
        result = await client.callAssemblyAI(audio_url);
        serviceUsed = 'assemblyai';
      } else if (Deno.env.get('DEEPGRAM_API_KEY')) {
        console.log('🔄 Attempting Deepgram diarization...');
        result = await client.callDeepgram(audio_url);
        serviceUsed = 'deepgram';
      } else if (Deno.env.get('REVAI_API_KEY')) {
        console.log('🔄 Attempting Rev.ai diarization...');
        result = await client.callRevAI(audio_url);
        serviceUsed = 'revai';
      } else {
        throw new Error('No diarization service API keys configured. Please set ASSEMBLYAI_API_KEY, DEEPGRAM_API_KEY, or REVAI_API_KEY');
      }
    } catch (primaryError) {
      console.error('❌ Primary diarization service failed:', primaryError);
      
      // Try fallback services
      try {
        if (serviceUsed !== 'deepgram' && Deno.env.get('DEEPGRAM_API_KEY')) {
          console.log('🔄 Fallback to Deepgram...');
          result = await client.callDeepgram(audio_url);
          serviceUsed = 'deepgram';
        } else if (serviceUsed !== 'revai' && Deno.env.get('REVAI_API_KEY')) {
          console.log('🔄 Fallback to Rev.ai...');
          result = await client.callRevAI(audio_url);
          serviceUsed = 'revai';
        } else {
          throw primaryError;
        }
      } catch (fallbackError) {
        console.error('❌ All diarization services failed:', fallbackError);
        return createErrorResponse('All diarization services failed', 500, {
          primaryError: primaryError.message,
          fallbackError: fallbackError.message,
        });
      }
    }

    console.log(`✅ Diarization completed using ${serviceUsed}: ${result.total_speakers} speakers detected`);

    // Convert result to our database format
    const speakerAnalysis = {
      identified_speakers: result.speakers.map((speaker, index) => ({
        name: speaker.id,
        confidence: result.confidence_score,
        segments: result.segments
          .filter(seg => seg.speaker === speaker.id)
          .slice(0, 10) // Limit segments for storage
          .map(seg => ({
            start_time: seg.start,
            end_time: seg.end,
            text: seg.text.substring(0, 200), // Limit text length
          })),
        characteristics: {
          speaking_time: speaker.total_speaking_time,
          segment_count: speaker.segment_count,
          voice_analysis: true, // This is REAL voice-based diarization
          service_used: serviceUsed,
        },
      })),
      confidence_score: result.confidence_score,
      analysis_method: 'real_voice_diarization',
      total_speakers: result.total_speakers,
      processing_date: new Date().toISOString(),
      service_provider: serviceUsed,
    };

    // Store speaker segments in database
    const speakerSegments = result.segments.map(segment => ({
      recording_id,
      speaker_name: segment.speaker,
      start_time: segment.start,
      end_time: segment.end,
      text: segment.text,
      confidence: segment.confidence,
    }));

    // Update recording with real speaker analysis
    const { error: updateError } = await supabase
      .from('recordings')
      .update({
        ai_speaker_analysis: speakerAnalysis,
        ai_speakers_updated_at: new Date().toISOString(),
      })
      .eq('id', recording_id);

    if (updateError) {
      console.error('❌ Failed to update speaker analysis:', updateError);
      throw updateError;
    }

    // Store detailed speaker segments (optional - if table exists)
    try {
      const { error: segmentsError } = await supabase
        .from('speaker_segments')
        .insert(speakerSegments);
      
      if (segmentsError && !segmentsError.message.includes('does not exist')) {
        console.warn('⚠️ Failed to store speaker segments:', segmentsError);
      } else if (!segmentsError) {
        console.log('✅ Speaker segments stored successfully');
      }
    } catch (segmentError) {
      console.warn('⚠️ Speaker segments table not available:', segmentError);
    }

    console.log(`🎉 Real speaker diarization completed for recording ${recording_id}`);

    return createSuccessResponse({
      message: 'Real speaker diarization completed successfully',
      recording_id,
      service_used: serviceUsed,
      speakers_detected: result.total_speakers,
      confidence_score: result.confidence_score,
      segments_count: result.segments.length,
    });

  } catch (error) {
    console.error('❌ Whisper diarization service error:', error);
    return createErrorResponse(
      'Speaker diarization failed',
      500,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    );
  }
});