// OpenAI Whisper transcription service

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
}

export interface DetailedTranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  words?: TranscriptionWord[];
}

export interface TranscriptionResult {
  success: boolean;
  transcript?: string;
  detailedTranscript?: DetailedTranscriptionResult;
  error?: string;
  duration?: number;
  processingTime?: number;
  model?: string;
}

function getFileExtension(mimeType: string): string {
  const extensions: { [key: string]: string } = {
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov'
  };
  return extensions[mimeType] || 'wav';
}

export async function transcribeAudio(audioFile: File | Blob): Promise<TranscriptionResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  console.log('Transcription service called with:', {
    fileType: audioFile.type,
    fileSize: audioFile.size,
    hasApiKey: !!apiKey
  });
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your environment variables.');
  }

  try {
    console.log('Starting Whisper transcription with API...');
    
    // Create FormData for the API request
    const formData = new FormData();
    
    // Determine file extension based on type
    const fileName = audioFile instanceof File ? audioFile.name : `audio.${getFileExtension(audioFile.type)}`;
    formData.append('file', audioFile, fileName);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');
    // Remove language to let Whisper auto-detect
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Whisper API error ${response.status}: ${errorData}`);
    }

    const result = await response.json();
    
    console.log('Whisper transcription completed with timestamps');
    console.log('Segments found:', result.segments?.length || 0);
    
    // Convert segments to our format
    const segments: TranscriptionSegment[] = (result.segments || []).map((seg: any, index: number) => ({
      id: index,
      start: seg.start,
      end: seg.end,
      text: seg.text.trim()
    }));

    const detailedTranscript: DetailedTranscriptionResult = {
      text: result.text,
      segments: segments,
      words: result.words || undefined
    };
    
    return {
      success: true,
      transcript: result.text,
      detailedTranscript: detailedTranscript,
      duration: result.duration || undefined
    };
    
  } catch (error) {
    console.error('Whisper transcription failed:', error);
    
    // Check if it's a quota error
    if (error instanceof Error && error.message.includes('429')) {
      throw new Error('OpenAI API quota exceeded. Please check your billing and usage limits.');
    }
    
    if (error instanceof Error && error.message.includes('401')) {
      throw new Error('OpenAI API key is invalid. Please check your API key configuration.');
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transcription failed'
    };
  }
}

export async function generateSummary(transcript: string): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your environment variables.');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional assistant that creates concise, informative summaries of audio/video recordings.

REQUIREMENTS:
- Write 2-3 sentences maximum
- Include the main topic and key outcomes
- Use clear, professional language
- No bullet points or special formatting
- Focus on what was accomplished or decided

Create a brief but complete summary that captures the essential value of this recording.`
          },
          {
            role: 'user',
            content: `Create a brief summary of this transcript in 2-3 sentences:\n\n${transcript}`
          }
        ],
        max_tokens: 150,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Summary generation failed: ${response.status}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;
    
  } catch (error) {
    console.error('Summary generation failed:', error);
    throw error;
  }
}

