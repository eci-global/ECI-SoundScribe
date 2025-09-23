// Real AI service integration
export interface AIResponse {
  success: boolean;
  response: string;
  error?: string;
}

export async function generateAIResponse(
  recordingTitle: string, 
  userMessage: string, 
  context?: {
    transcript?: string;
    summary?: string;
    description?: string;
    contentType?: string;
    coachingEvaluation?: any;
  }
): Promise<AIResponse> {
  try {
    // Build context information
    const contextInfo = [];
    if (context?.description) contextInfo.push(`Recording Description: ${context.description}`);
    if (context?.contentType) contextInfo.push(`Content Type: ${context.contentType.replace('_', ' ')}`);
    if (context?.summary) contextInfo.push(`Summary: ${context.summary}`);
    if (context?.transcript) contextInfo.push(`Transcript excerpt: ${context.transcript.substring(0, 1000)}...`);
    
    // Add coaching context if available
    let coachingContext = '';
    if (context?.coachingEvaluation) {
      const coaching = context.coachingEvaluation;
      coachingContext = `

COACHING EVALUATION AVAILABLE:
- Overall Score: ${coaching.overallScore}/100
- Content Type: ${context.contentType || 'Unknown'}
- Key Strengths: ${coaching.strengths?.join(', ') || 'N/A'}
- Improvement Areas: ${coaching.improvements?.join(', ') || 'N/A'}
- Coaching Criteria Scores Available: ${JSON.stringify(coaching.criteria || {})}

I can provide specific coaching insights and recommendations based on this evaluation.`;
    }
    
    const systemPrompt = `You are an AI coaching assistant helping users analyze their ${context?.contentType?.replace('_', ' ') || 'audio/video'} recordings. 

Recording: "${recordingTitle}"
${contextInfo.join('\n')}${coachingContext}

INSTRUCTIONS:
1. If the user asks coaching-related questions, provide specific insights based on the coaching evaluation data
2. Reference actual scores and criteria when discussing performance
3. Give actionable recommendations for improvement
4. Be supportive but honest about areas needing development
5. Connect insights to the specific content type (sales call, customer support, etc.)
6. For general questions, provide helpful responses about the recording content

Be conversational, insightful, and coaching-focused when relevant.`;

    // Use OpenAI API
    return await callOpenAI(systemPrompt, userMessage);
    
  } catch (error) {
    console.error('AI service error:', error);
    return {
      success: false,
      response: '',
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

async function callOpenAI(systemPrompt: string, userMessage: string): Promise<AIResponse> {
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 429) {
        throw new Error('OpenAI API quota exceeded. Please check your billing and usage limits.');
      }
      
      if (response.status === 401) {
        throw new Error('OpenAI API key is invalid. Please check your API key configuration.');
      }
      
      throw new Error(`OpenAI API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenAI API');
    }

    return {
      success: true,
      response: data.choices[0].message.content
    };
    
  } catch (error) {
    console.error('OpenAI API failed:', error);
    throw error;
  }
}