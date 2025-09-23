import { supabase } from '@/integrations/supabase/client';
import type { Recording } from '@/types/recording';

export interface AIFeatureStatus {
  feature: string;
  status: 'working' | 'missing_data' | 'error' | 'not_configured';
  message: string;
  data?: any;
}

export interface DiagnosticResult {
  recordingId: string;
  recordingTitle: string;
  overallStatus: 'healthy' | 'partial' | 'broken';
  features: AIFeatureStatus[];
  recommendations: string[];
}

export async function diagnoseAIFeatures(recordingId: string): Promise<DiagnosticResult> {
  const features: AIFeatureStatus[] = [];
  const recommendations: string[] = [];
  
  try {
    // 1. Check recording data
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single();

    if (recordingError || !recording) {
      return {
        recordingId,
        recordingTitle: 'Unknown',
        overallStatus: 'broken',
        features: [{
          feature: 'Recording Data',
          status: 'error',
          message: `Recording not found: ${recordingError?.message || 'Unknown error'}`
        }],
        recommendations: ['Check if the recording ID is correct and the recording exists in the database.']
      };
    }

    // 2. Check transcript
    if (!recording.transcript) {
      features.push({
        feature: 'Transcript',
        status: 'missing_data',
        message: 'No transcript available - AI features require transcript data'
      });
      recommendations.push('Process the recording to generate a transcript first.');
    } else {
      features.push({
        feature: 'Transcript',
        status: 'working',
        message: `Transcript available (${recording.transcript.length} characters)`,
        data: { length: recording.transcript.length }
      });
    }

    // 3. Check AI Summary
    const recordingData = recording as any; // Type assertion for extended fields
    if (!recordingData.ai_summary && !recording.summary) {
      features.push({
        feature: 'AI Summary',
        status: 'missing_data',
        message: 'No AI summary or regular summary available'
      });
      recommendations.push('Generate AI summary using the process-recording function.');
    } else if (recordingData.ai_summary) {
      features.push({
        feature: 'AI Summary',
        status: 'working',
        message: `AI summary available (${recordingData.ai_summary.length} characters)`,
        data: { ai_summary: true, length: recordingData.ai_summary.length }
      });
    } else {
      features.push({
        feature: 'AI Summary',
        status: 'missing_data',
        message: `Regular summary available but no AI summary (${recording.summary?.length || 0} characters)`,
        data: { ai_summary: false, length: recording.summary?.length || 0 }
      });
    }

    // 4. Check AI Next Steps
    if (!recordingData.ai_next_steps || !Array.isArray(recordingData.ai_next_steps) || recordingData.ai_next_steps.length === 0) {
      features.push({
        feature: 'AI Next Steps',
        status: 'missing_data',
        message: 'No AI next steps available'
      });
      recommendations.push('Generate AI next steps using the generate-next-steps function.');
    } else {
      features.push({
        feature: 'AI Next Steps',
        status: 'working',
        message: `AI next steps available (${recordingData.ai_next_steps.length} items)`,
        data: { count: recordingData.ai_next_steps.length, items: recordingData.ai_next_steps }
      });
    }

    // 5. Check Coaching Evaluation
    if (!recording.coaching_evaluation) {
      features.push({
        feature: 'Coaching Evaluation',
        status: 'missing_data',
        message: 'No coaching evaluation available'
      });
      if (recording.enable_coaching) {
        recommendations.push('Generate coaching evaluation using the reprocess-coaching function.');
      } else {
        recommendations.push('Enable coaching for this recording to generate coaching evaluation.');
      }
    } else {
      const coachingData = typeof recording.coaching_evaluation === 'string' 
        ? JSON.parse(recording.coaching_evaluation) 
        : recording.coaching_evaluation;
      
      features.push({
        feature: 'Coaching Evaluation',
        status: 'working',
        message: `Coaching evaluation available`,
        data: { 
          hasActionItems: !!coachingData.actionItems,
          hasScores: !!coachingData.scores,
          hasInsights: !!coachingData.insights
        }
      });
    }

    // 6. Check Speaker Segments
    const { data: speakerSegments, error: speakerError } = await supabase
      .from('speaker_segments')
      .select('*')
      .eq('recording_id', recordingId);

    if (speakerError) {
      features.push({
        feature: 'Speaker Segments',
        status: 'error',
        message: `Error loading speaker segments: ${speakerError.message}`
      });
    } else if (!speakerSegments || speakerSegments.length === 0) {
      features.push({
        feature: 'Speaker Segments',
        status: 'missing_data',
        message: 'No speaker segments available'
      });
      recommendations.push('Generate speaker analysis using the analyze-speakers-topics function.');
    } else {
      features.push({
        feature: 'Speaker Segments',
        status: 'working',
        message: `Speaker segments available (${speakerSegments.length} segments)`,
        data: { count: speakerSegments.length }
      });
    }

    // 7. Check Topic Segments
    const { data: topicSegments, error: topicError } = await supabase
      .from('topic_segments')
      .select('*')
      .eq('recording_id', recordingId);

    if (topicError) {
      features.push({
        feature: 'Topic Segments',
        status: 'error',
        message: `Error loading topic segments: ${topicError.message}`
      });
    } else if (!topicSegments || topicSegments.length === 0) {
      features.push({
        feature: 'Topic Segments',
        status: 'missing_data',
        message: 'No topic segments available'
      });
      recommendations.push('Generate topic analysis using the analyze-speakers-topics function.');
    } else {
      features.push({
        feature: 'Topic Segments',
        status: 'working',
        message: `Topic segments available (${topicSegments.length} segments)`,
        data: { count: topicSegments.length }
      });
    }

    // 8. Check AI Moments (stored in recordings table ai_moments JSONB column)
    const aiMomentsFromRecording = (recording as any).ai_moments;
    const aiMoments = Array.isArray(aiMomentsFromRecording) ? aiMomentsFromRecording : [];

    if (!aiMoments || aiMoments.length === 0) {
      features.push({
        feature: 'AI Moments',
        status: 'missing_data',
        message: 'No AI moments available'
      });
      recommendations.push('Generate AI moments using the generate-ai-moments function.');
    } else {
      features.push({
        feature: 'AI Moments',
        status: 'working',
        message: `AI moments available (${aiMoments.length} moments)`,
        data: { count: aiMoments.length }
      });
    }

    // Determine overall status
    const errorCount = features.filter(f => f.status === 'error').length;
    const missingCount = features.filter(f => f.status === 'missing_data').length;
    const workingCount = features.filter(f => f.status === 'working').length;

    let overallStatus: 'healthy' | 'partial' | 'broken';
    if (errorCount > 0) {
      overallStatus = 'broken';
    } else if (missingCount > workingCount) {
      overallStatus = 'broken';
    } else if (missingCount > 0) {
      overallStatus = 'partial';
    } else {
      overallStatus = 'healthy';
    }

    // Add general recommendations
    if (overallStatus !== 'healthy') {
      recommendations.unshift('Run the complete AI processing pipeline to generate all missing data.');
    }

    return {
      recordingId,
      recordingTitle: recording.title || 'Untitled Recording',
      overallStatus,
      features,
      recommendations
    };

  } catch (error) {
    return {
      recordingId,
      recordingTitle: 'Unknown',
      overallStatus: 'broken',
      features: [{
        feature: 'System Error',
        status: 'error',
        message: `Diagnostic failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      recommendations: ['Check database connection and API configuration.']
    };
  }
}

export async function runFullAIProcessing(recordingId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Starting full AI processing for recording:', recordingId);

    // Step 1: Process recording (transcript + summary)
    const { data: processData, error: processError } = await supabase.functions.invoke('process-recording', {
      body: { recording_id: recordingId }
    });

    if (processError) {
      throw new Error(`Process recording failed: ${processError.message}`);
    }

    // Step 2: Generate AI moments
    const { data: momentsData, error: momentsError } = await supabase.functions.invoke('generate-ai-moments', {
      body: { recording_id: recordingId }
    });

    if (momentsError) {
      console.warn('AI moments generation failed:', momentsError);
    }

    // Step 3: Analyze speakers and topics
    const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-speakers-topics', {
      body: { recording_id: recordingId }
    });

    if (analysisError) {
      console.warn('Speaker/topic analysis failed:', analysisError);
    }

    // Step 4: Generate coaching evaluation
    const { data: coachingData, error: coachingError } = await supabase.functions.invoke('reprocess-coaching', {
      body: { recordingId: recordingId }
    });

    if (coachingError) {
      console.warn('Coaching generation failed:', coachingError);
    }

    return {
      success: true,
      message: 'AI processing completed. Some features may have warnings - check the diagnostic for details.'
    };

  } catch (error) {
    console.error('Full AI processing failed:', error);
    return {
      success: false,
      message: `AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export function formatDiagnosticReport(result: DiagnosticResult): string {
  const statusEmoji = {
    healthy: '✅',
    partial: '⚠️',
    broken: '❌'
  };

  const featureEmoji = {
    working: '✅',
    partial: '⚠️',
    missing_data: '❌',
    error: '🔥',
    not_configured: '⚙️'
  };

  let report = `
## AI Features Diagnostic Report

**Recording:** ${result.recordingTitle}
**Overall Status:** ${statusEmoji[result.overallStatus]} ${result.overallStatus.toUpperCase()}

### Feature Status:
`;

  result.features.forEach(feature => {
    report += `${featureEmoji[feature.status]} **${feature.feature}**: ${feature.message}\n`;
  });

  if (result.recommendations.length > 0) {
    report += `\n### Recommendations:\n`;
    result.recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });
  }

  return report;
} 