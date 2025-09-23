export interface CoachingCriteria {
  talkTimeRatio: number; // 0-100% - rep vs customer talk time
  objectionHandling: number; // 0-10 score
  discoveryQuestions: number; // count of discovery questions asked
  valueArticulation: number; // 0-10 score
  activeListening: number; // 0-10 score
  nextSteps: boolean; // whether clear next steps were established
  rapport: number; // 0-10 score
}

export interface CoachingEvaluation {
  overallScore: number; // 0-100
  criteria: CoachingCriteria;
  strengths: string[];
  improvements: string[];
  suggestedResponses: {
    situation: string;
    currentResponse: string;
    improvedResponse: string;
  }[];
  actionItems: string[];
}

export const COACHING_PROMPT = `You are an expert sales coach analyzing a sales call transcript. Evaluate the call based on these specific criteria:

1. **Talk-Time Ratio**: Calculate the approximate percentage of time the sales rep talked vs the customer (aim for 30-40% rep, 60-70% customer)
2. **Objection Handling** (0-10): How well did the rep address concerns and objections?
3. **Discovery Questions**: Count how many open-ended discovery questions were asked
4. **Value Articulation** (0-10): How clearly did the rep communicate value propositions?
5. **Active Listening** (0-10): Evidence of acknowledging and building on customer responses
6. **Next Steps**: Were clear next steps established at the end?
7. **Rapport Building** (0-10): How well did the rep build connection and trust?

Provide your evaluation in this exact JSON format:
{
  "overallScore": [0-100 based on weighted criteria],
  "criteria": {
    "talkTimeRatio": [0-100 percentage],
    "objectionHandling": [0-10],
    "discoveryQuestions": [count],
    "valueArticulation": [0-10],
    "activeListening": [0-10],
    "nextSteps": [true/false],
    "rapport": [0-10]
  },
  "strengths": [
    "Specific things the rep did well"
  ],
  "improvements": [
    "Specific areas for improvement"
  ],
  "suggestedResponses": [
    {
      "situation": "When customer said X",
      "currentResponse": "Rep said Y",
      "improvedResponse": "Consider saying Z instead"
    }
  ],
  "actionItems": [
    "Specific actions for the next call"
  ]
}

IMPORTANT: Respond ONLY with valid JSON, no additional text.`;

export function calculateOverallScore(criteria: CoachingCriteria): number {
  // Weighted scoring based on importance
  const weights = {
    talkTimeRatio: 0.15,
    objectionHandling: 0.20,
    discoveryQuestions: 0.15,
    valueArticulation: 0.20,
    activeListening: 0.15,
    nextSteps: 0.05,
    rapport: 0.10
  };

  // Normalize talk time ratio (best is 30-40%)
  const talkTimeScore = criteria.talkTimeRatio >= 30 && criteria.talkTimeRatio <= 40 
    ? 10 
    : Math.max(0, 10 - Math.abs(criteria.talkTimeRatio - 35) / 5);

  // Normalize discovery questions (aim for 5-10)
  const discoveryScore = Math.min(10, criteria.discoveryQuestions * 2);

  // Calculate weighted score
  const score = 
    (talkTimeScore * weights.talkTimeRatio) +
    (criteria.objectionHandling * weights.objectionHandling) +
    (discoveryScore * weights.discoveryQuestions) +
    (criteria.valueArticulation * weights.valueArticulation) +
    (criteria.activeListening * weights.activeListening) +
    ((criteria.nextSteps ? 10 : 0) * weights.nextSteps) +
    (criteria.rapport * weights.rapport);

  return Math.round(score * 10); // Convert to 0-100 scale
}

export async function evaluateSalesCall(
  transcript: string,
  callMetadata?: { title?: string; duration?: number; description?: string }
): Promise<CoachingEvaluation> {
  const openAIKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!openAIKey) {
      throw new Error('OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your environment variables.');
  }

  try {
    const userPrompt = `Analyze this sales call transcript:
${callMetadata?.title ? `\nCall Title: ${callMetadata.title}` : ''}
${callMetadata?.description ? `\nContext: ${callMetadata.description}` : ''}

Transcript:
${transcript}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: COACHING_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const evaluation = JSON.parse(data.choices[0].message.content) as CoachingEvaluation;
    
    // Ensure overall score is calculated correctly
    evaluation.overallScore = calculateOverallScore(evaluation.criteria);
    
    return evaluation;
  } catch (error) {
    console.error('Coaching evaluation failed:', error);
    throw error;
  }
}

// Mock evaluation function removed for production