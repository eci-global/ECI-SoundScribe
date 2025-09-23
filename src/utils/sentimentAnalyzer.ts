import { AnalysisSentimentMoment, SentimentInsights, SpeakerSentiment } from '@/types/sentimentAnalysis';

// Calculate volatility of sentiment values
export const calculateVolatility = (values: number[]): number => {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

// Generate insights from sentiment data
export const generateSentimentInsights = (moments: AnalysisSentimentMoment[], recording: any): SentimentInsights => {
  const positiveMoments = moments.filter(m => m.sentiment === 'positive');
  const negativeMoments = moments.filter(m => m.sentiment === 'negative');
  
  // Determine overall tone
  let overallTone: 'positive' | 'negative' | 'neutral' | 'mixed' = 'neutral';
  if (positiveMoments.length > negativeMoments.length * 1.5) {
    overallTone = 'positive';
  } else if (negativeMoments.length > positiveMoments.length * 1.5) {
    overallTone = 'negative';
  } else if (positiveMoments.length > 0 && negativeMoments.length > 0) {
    overallTone = 'mixed';
  }

  // Calculate emotional volatility
  const sentimentValues = moments.map(m => 
    m.sentiment === 'positive' ? 1 : m.sentiment === 'negative' ? -1 : 0
  );
  const volatility = calculateVolatility(sentimentValues);

  // Get key moments (highest intensity)
  const keyMoments = moments
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 5);

  // Group by speaker
  const speakerGroups = moments.reduce((acc, moment) => {
    const speaker = moment.speaker || 'Unknown';
    if (!acc[speaker]) acc[speaker] = [];
    acc[speaker].push(moment);
    return acc;
  }, {} as Record<string, AnalysisSentimentMoment[]>);

  const speakerBreakdown: SpeakerSentiment[] = Object.entries(speakerGroups).map(([speaker, moments]) => {
    const avgSentiment = moments.reduce((sum, m) => 
      sum + (m.sentiment === 'positive' ? 1 : m.sentiment === 'negative' ? -1 : 0), 0) / moments.length;
    
    return {
      speaker,
      averageSentiment: avgSentiment,
      emotionalRange: Math.max(...moments.map(m => m.intensity)) - Math.min(...moments.map(m => m.intensity)),
      dominantEmotion: avgSentiment > 0.3 ? 'positive' : avgSentiment < -0.3 ? 'negative' : 'neutral',
      moments
    };
  });

  // Generate recommendations and risk flags
  const recommendations: string[] = [];
  const riskFlags: string[] = [];

  if (overallTone === 'negative') {
    recommendations.push('Consider addressing customer concerns more proactively');
    riskFlags.push('Overall negative sentiment detected');
  }

  if (volatility > 0.5) {
    recommendations.push('Work on maintaining consistent emotional tone');
    riskFlags.push('High emotional volatility detected');
  }

  // Check coaching evaluation for additional context
  if (recording.coaching_evaluation) {
    try {
      const evaluation = typeof recording.coaching_evaluation === 'string' 
        ? JSON.parse(recording.coaching_evaluation)
        : recording.coaching_evaluation;
      
      if (evaluation && typeof evaluation === 'object' && 'overallScore' in evaluation) {
        const score = evaluation.overallScore;
        if (typeof score === 'number' && score < 60) {
          riskFlags.push('Low coaching score correlates with sentiment issues');
        }
      }
    } catch (e) {
      console.warn('Could not parse coaching evaluation:', e);
    }
  }

  return {
    overallTone,
    emotionalVolatility: volatility,
    keyMoments,
    speakerBreakdown,
    recommendations,
    riskFlags
  };
};