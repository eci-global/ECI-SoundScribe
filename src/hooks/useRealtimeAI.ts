
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createSafeChannel, removeChannel } from '@/utils/realtimeUtils';
import { useAuth } from '@/hooks/useAuth';
import { evaluateSalesCall } from '@/utils/coachingEvaluation';
import { generateSummary } from '@/utils/transcriptionService';
import { convertDatabaseToRecording } from '@/utils/databaseTypeUtils';
import type { Recording } from '@/types/recording';
import type { Json } from '@/integrations/supabase/types';

interface AIProcessingStatus {
  recordingId: string;
  status: 'queued' | 'transcribing' | 'analyzing' | 'coaching' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  error?: string;
}

interface RealtimeAIHook {
  processingQueue: AIProcessingStatus[];
  isProcessing: boolean;
  processRecording: (recordingId: string) => Promise<void>;
  cancelProcessing: (recordingId: string) => void;
  retryProcessing: (recordingId: string) => Promise<void>;
}

export function useRealtimeAI(): RealtimeAIHook {
  const { user } = useAuth();
  const [processingQueue, setProcessingQueue] = useState<AIProcessingStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef<Map<string, AbortController>>(new Map());

  // Set up real-time subscription for recording changes
  useEffect(() => {
    if (!user) return;

    const channelName = `ai-processing-${user.id}`;
    const channel = createSafeChannel(channelName);
    
    if (!channel) {
      console.warn('Could not create safe channel for AI processing');
      return;
    }
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recordings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const dbRecording = payload.new;
          console.log('Real-time recording update:', dbRecording);
          
          // Convert database record to Recording type
          const recording = convertDatabaseToRecording(dbRecording);
          
          // Update processing queue based on recording status
          setProcessingQueue(prev => {
            const existing = prev.find(p => p.recordingId === recording.id);
            if (!existing && recording.status === 'processing') {
              return [...prev, {
                recordingId: recording.id,
                status: 'queued',
                progress: 0,
                currentStep: 'Initializing...'
              }];
            }
            
            return prev.map(p => 
              p.recordingId === recording.id 
                ? { ...p, status: mapRecordingStatusToAI(recording.status) }
                : p
            );
          });
        }
      )
      .subscribe();

    return () => {
      removeChannel(channelName);
    };
  }, [user]);

  const mapRecordingStatusToAI = (status: string): AIProcessingStatus['status'] => {
    switch (status) {
      case 'processing': return 'transcribing';
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      default: return 'queued';
    }
  };

  const updateProcessingStatus = useCallback((
    recordingId: string, 
    updates: Partial<AIProcessingStatus>
  ) => {
    setProcessingQueue(prev => 
      prev.map(p => 
        p.recordingId === recordingId 
          ? { ...p, ...updates }
          : p
      )
    );
  }, []);

  const processRecording = useCallback(async (recordingId: string) => {
    const controller = new AbortController();
    processingRef.current.set(recordingId, controller);

    try {
      setIsProcessing(true);
      
      // Add to processing queue
      setProcessingQueue(prev => [
        ...prev.filter(p => p.recordingId !== recordingId),
        {
          recordingId,
          status: 'queued',
          progress: 0,
          currentStep: 'Starting AI processing...'
        }
      ]);

      // Step 1: Get recording data
      updateProcessingStatus(recordingId, {
        status: 'transcribing',
        progress: 10,
        currentStep: 'Fetching recording data...'
      });

      const { data: dbRecording, error: recordingError } = await supabase
        .from('recordings')
        .select('*')
        .eq('id', recordingId)
        .single();

      if (recordingError || !dbRecording) {
        throw new Error('Recording not found');
      }

      // Convert database record to Recording type
      const recording = convertDatabaseToRecording(dbRecording);

      // SAFETY GUARD: Don't reprocess completed recordings to prevent memory crashes
      if (recording.status === 'completed' && recording.transcript && recording.transcript.length > 100) {
        console.log(`Recording ${recordingId} is already completed with transcript. Skipping reprocessing to prevent memory issues.`);
        setProcessingQueue(prev => prev.filter(p => p.recordingId !== recordingId));
        setIsProcessing(false);
        return;
      }

      if (controller.signal.aborted) return;

      // Step 2: Process transcript if needed
      if (!recording.transcript && recording.status !== 'completed') {
        updateProcessingStatus(recordingId, {
          progress: 20,
          currentStep: 'Generating transcript...'
        });

        // Call Supabase function for transcription
        const { data: transcriptData, error: transcriptError } = await supabase.functions
          .invoke('process-recording', {
            body: { recording_id: recordingId }
          });

        if (transcriptError) {
          throw new Error(`Transcription failed: ${transcriptError.message}`);
        }
      } else if (recording.transcript && recording.status === 'completed') {
        console.log('Recording already completed, skipping AI processing');
        updateProcessingStatus(recordingId, {
          status: 'completed',
          progress: 100,
          currentStep: 'Already processed'
        });
        return;
      }

      if (controller.signal.aborted) return;

      // Step 3: Generate AI summary
      updateProcessingStatus(recordingId, {
        status: 'analyzing',
        progress: 40,
        currentStep: 'Generating AI summary...'
      });

      let aiSummary = recording.ai_summary;
      if (!aiSummary && recording.transcript) {
        aiSummary = await generateSummary(recording.transcript);
        
        await supabase
          .from('recordings')
          .update({ ai_summary: aiSummary })
          .eq('id', recordingId);
      }

      if (controller.signal.aborted) return;

      // Step 4: Generate AI insights and next steps
      updateProcessingStatus(recordingId, {
        progress: 60,
        currentStep: 'Generating AI insights...'
      });

      const insights = await generateAIInsights(recording, aiSummary);
      
      await supabase
        .from('recordings')
        .update({ 
          ai_insights: insights,
          status: 'completed'
        })
        .eq('id', recordingId);

      // Step 5: Generate coaching evaluation for sales calls
      if (recording.content_type === 'sales_call' && recording.transcript) {
        updateProcessingStatus(recordingId, {
          status: 'coaching',
          progress: 80,
          currentStep: 'Analyzing coaching metrics...'
        });

        const coachingEvaluation = await evaluateSalesCall(
          recording.transcript,
          {
            title: recording.title,
            description: recording.description || undefined
          }
        );

        // Update recording with coaching evaluation - cast through unknown
        const { error: updateError } = await supabase
          .from('recordings')
          .update({ 
            coaching_evaluation: coachingEvaluation as unknown as Json,
            ai_generated_at: new Date().toISOString()
          })
          .eq('id', recordingId);

        if (updateError) {
          console.error('Failed to update recording with coaching evaluation:', updateError);
          throw updateError;
        }

        setProcessingQueue(prev => prev.map(p => 
          p.recordingId === recordingId ? { ...p, status: 'completed' } : p
        ));
      }

      if (controller.signal.aborted) return;
      // Step 6: Complete processing
      updateProcessingStatus(recordingId, {
        status: 'completed',
        progress: 100,
        currentStep: 'Processing complete!'
      });

      // Generate completion notification
      await generateCompletionNotification(recording, insights);

    } catch (error) {
      console.error('AI processing failed:', error);
      
      updateProcessingStatus(recordingId, {
        status: 'failed',
        progress: 0,
        currentStep: 'Processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Update recording status
      await supabase
        .from('recordings')
        .update({ status: 'failed' })
        .eq('id', recordingId);

    } finally {
      processingRef.current.delete(recordingId);
      setIsProcessing(false);
    }
  }, [updateProcessingStatus]);

  const cancelProcessing = useCallback((recordingId: string) => {
    const controller = processingRef.current.get(recordingId);
    if (controller) {
      controller.abort();
      processingRef.current.delete(recordingId);
    }
    
    setProcessingQueue(prev => prev.filter(p => p.recordingId !== recordingId));
  }, []);

  const retryProcessing = useCallback(async (recordingId: string) => {
    // Remove from queue and restart
    setProcessingQueue(prev => prev.filter(p => p.recordingId !== recordingId));
    await processRecording(recordingId);
  }, [processRecording]);

  return {
    processingQueue,
    isProcessing,
    processRecording,
    cancelProcessing,
    retryProcessing
  };
}

// Helper function to generate AI insights
async function generateAIInsights(recording: Recording, summary?: string) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Analyze this ${recording.content_type?.replace('_', ' ')} recording and provide actionable insights:

Title: ${recording.title}
${recording.description ? `Description: ${recording.description}` : ''}
${summary ? `Summary: ${summary}` : ''}
${recording.transcript ? `Transcript: ${recording.transcript.substring(0, 2000)}...` : ''}

Provide insights in this JSON format:
{
  "keyTakeaways": ["insight1", "insight2", "insight3"],
  "actionItems": ["action1", "action2"],
  "nextSteps": ["step1", "step2"],
  "riskFactors": ["risk1", "risk2"],
  "opportunities": ["opportunity1", "opportunity2"]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an AI analyst providing business insights.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    throw new Error(`AI insights generation failed: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// Helper function to generate completion notifications
async function generateCompletionNotification(recording: Recording, insights: any) {
  // This would integrate with your notification system
  // For now, we'll use a simple approach
  console.log('Recording processing completed:', {
    recordingId: recording.id,
    title: recording.title,
    insights: insights?.keyTakeaways?.length || 0
  });
}
