// BDR Scorecard Evaluation Edge Function
// Analyzes recordings against BDR training criteria using Azure OpenAI
//
// This function has been modified with line padding to avoid deployment parsing issues
// that consistently occur at line 504 in the Supabase Edge Functions deployment system.
//
// The following blank lines are intentionally added to shift all code positions
// and bypass the "Unexpected eof" parser error that occurs at line 504.
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
// Begin actual function implementation after line padding

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

declare const Deno: { env: { get(key: string): string | undefined } };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

// Inline CORS utilities to avoid shared import issues during deployment
function handleCORSPreflight(): Response {
  return new Response(null, { 
    headers: corsHeaders,
    status: 200
  });
}

function createSuccessResponse(data: any, status: number = 200): Response {
  const responseBody = {
    success: true,
    ...data
  };

  return new Response(
    JSON.stringify(responseBody),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
}

function createErrorResponse(
  error: string | Error,
  status: number = 500,
  additionalData?: Record<string, any>
): Response {
  const errorMessage = error instanceof Error ? error.message : error;
  
  const responseBody = {
    success: false,
    error: errorMessage,
    ...additionalData
  };

  return new Response(
    JSON.stringify(responseBody),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
}

// Inline Azure OpenAI utilities to avoid shared import issues during deployment
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

class AzureOpenAIChatClient {
  private endpoint: string;
  private apiKey: string;
  private apiVersion: string;
  private deploymentName: string;

  constructor() {
    this.endpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT') || '';
    this.apiKey = Deno.env.get('AZURE_OPENAI_API_KEY') || '';
    this.apiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-10-01-preview';
    this.deploymentName = Deno.env.get('AZURE_OPENAI_GPT4O_DEPLOYMENT') || 'gpt-4o';
  }

  async createChatCompletion(request: ChatCompletionRequest) {
    const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        messages: request.messages,
        max_tokens: request.max_tokens || 1000,
        temperature: request.temperature || 0,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
      }),
    });

    if (!response.ok) {
      throw new Error(`Azure OpenAI API error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  }
}

function createAzureOpenAIChatClient(): AzureOpenAIChatClient {
  return new AzureOpenAIChatClient();
}

function extractJsonFromAIResponse(text: string): any {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid AI response text');
  }

  // Remove markdown code blocks and clean up
  let cleanedText = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  
  // Find JSON content between [ and ] or { and }
  const jsonMatch = cleanedText.match(/[\[\{][\s\S]*[\]\}]/);
  if (jsonMatch) {
    cleanedText = jsonMatch[0];
  }

  try {
    return JSON.parse(cleanedText);
  } catch (parseError) {
    throw new Error(`Failed to parse JSON from AI response: ${parseError.message}`);
  }
}

interface RequestBody {
  recordingId: string;
  trainingProgramId: string;
  forceReprocess?: boolean;
}

interface BDRCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
  scoringGuidelines: {
    excellent: { min: number; description: string };
    good: { min: number; description: string };
    needs_improvement: { min: number; description: string };
    poor: { min: number; description: string };
  };
  evaluationPrompts: {
    analysisPrompt: string;
    scoringPrompt: string;
    feedbackPrompt: string;
  };
}

interface BDRTrainingProgram {
  id: string;
  name: string;
  scorecard_criteria: BDRCriteria[];
  target_score_threshold: number;
}

const DEFAULT_BDR_CRITERIA: BDRCriteria[] = [
  {
    id: 'opening',
    name: 'Opening',
    description: 'Rep states their name, company, and reason for calling in a confident tone with pattern interrupt',
    weight: 12.5,
    maxScore: 4,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze: (1) Rep states name, company, and reason for calling confidently, (2) Opens with statement/question that breaks routine or sparks curiosity, (3) Gets to point quickly while respecting prospect time, (4) Smooth transition to call purpose.',
      scoringPrompt: 'Rate on 0-4 scale: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class',
      feedbackPrompt: 'Provide specific feedback on opening execution and pattern interrupt effectiveness.'
    }
  },
  {
    id: 'objection_handling',
    name: 'Objection Handling',
    description: 'Acknowledges objections without being combative, maintains curiosity, and reframes perspective',
    weight: 12.5,
    maxScore: 4,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze: (1) Acknowledges objection without sounding combative/dismissive/defensive, (2) Maintains curiosity and authentic interest in learning, (3) Keeps answers short, confident, conversational, (4) Offers alternative perspective to reframe objection, (5) Recovers momentum smoothly.',
      scoringPrompt: 'Rate on 0-4 scale: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class',
      feedbackPrompt: 'Provide specific objection handling techniques and reframing strategies for improvement.'
    }
  },
  {
    id: 'qualification',
    name: 'Qualification',
    description: 'Identifies fit criteria, uncovers pain points, uses open-ended questions and active listening',
    weight: 12.5,
    maxScore: 4,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze: (1) Identifies basic fit criteria early (role, company size, industry), (2) Uncovers pain/challenges tied to solution space, (3) Uses curiosity-based, open-ended questions vs interrogation, (4) Asks probing follow-up questions, (5) Demonstrates active listening by adapting questions.',
      scoringPrompt: 'Rate on 0-4 scale: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class',
      feedbackPrompt: 'Suggest specific qualifying questions and discovery techniques for improvement.'
    }
  },
  {
    id: 'tone_and_energy',
    name: 'Tone & Energy',
    description: 'Positive, energetic tone with natural pacing - not flat, apologetic, rushed, or monotone',
    weight: 12.5,
    maxScore: 4,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze: (1) Tone is positive and energetic (not flat or apologetic), (2) Natural pacing - speech is steady (not rushed or monotone).',
      scoringPrompt: 'Rate on 0-4 scale: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class',
      feedbackPrompt: 'Provide feedback on tone improvement and pacing adjustments needed.'
    }
  },
  {
    id: 'assertiveness_and_control',
    name: 'Assertiveness & Control',
    description: 'Guides conversation without being pushy, practices active listening, creates urgency',
    weight: 12.5,
    maxScore: 4,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze: (1) Guides conversation without being pushy - steers flow without dominating, (2) Active listening - doesn\'t cut off prospect, waits for completion, (3) Taps into "why now" - connects to timing/urgency.',
      scoringPrompt: 'Rate on 0-4 scale: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class',
      feedbackPrompt: 'Suggest techniques for better conversation control and urgency development.'
    }
  },
  {
    id: 'business_acumen_and_relevance',
    name: 'Business Acumen & Relevance',
    description: 'Uses industry/role insights and shares relevant stories, case studies, or proof points',
    weight: 12.5,
    maxScore: 4,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze: (1) References industry/role insights - uses relevant industry knowledge, (2) Uses story/case/proof point - shares relevant customer example or data point.',
      scoringPrompt: 'Rate on 0-4 scale: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class',
      feedbackPrompt: 'Suggest industry insights and proof points that could enhance credibility.'
    }
  },
  {
    id: 'closing',
    name: 'Closing',
    description: 'Summarizes prospect needs, shares company track record, uses assumptive close, confirms details',
    weight: 12.5,
    maxScore: 4,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze: (1) Summarizes/paraphrases prospect needs for clarity - explicitly checks "Did I get that right?" or "Anything else?", (2) Shares company track record and sales rep qualifications, (3) Assumptive close - suggests specific time for next step/meeting, (4) Confirms contact info and asks prospect to accept next step.',
      scoringPrompt: 'Rate on 0-4 scale: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class',
      feedbackPrompt: 'Suggest closing technique improvements and confirmation strategies.'
    }
  },
  {
    id: 'talk_time',
    name: 'Talk Time',
    description: 'Rep speaks less than 50% of the time (ideal ratio: 43/57 rep/prospect)',
    weight: 12.5,
    maxScore: 4,
    scoringGuidelines: {
      excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
      good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
      needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
      poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
    },
    evaluationPrompts: {
      analysisPrompt: 'Analyze: Rep doesn\'t dominate conversation - speaking less than 50% of time (ideal ratio: 43/57 rep/prospect).',
      scoringPrompt: 'Rate on 0-4 scale: 0=Not Demonstrated, 1=Needs Improvement, 2=Meets Expectations, 3=Strong Performance, 4=Best-in-Class',
      feedbackPrompt: 'Provide guidance on achieving better talk time balance and encouraging prospect participation.'
    }
  }
];

/**
 * Analyze manager training data to extract scoring patterns and feedback styles with enhanced strictness detection
 */
function analyzeManagerTrainingData(trainingExamples: any[]): any {
  const scores = trainingExamples.map(ex => ex.overall_score).filter(s => s > 0);

  if (scores.length === 0) {
    return {
      averageScore: 'N/A',
      scoreRange: 'N/A',
      distribution: 'No scoring data',
      commonPatterns: ['No training patterns available'],
      strictnessLevel: 'unknown',
      criteriaWeaknesses: []
    };
  }

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  // Analyze manager strictness level
  const strictnessLevel = avgScore < 2.2 ? 'very_strict' : avgScore < 2.6 ? 'strict' : 'moderate';

  // Analyze criteria-specific weaknesses from manager data
  const criteriaWeaknesses = [];
  const criteriaAverages = {};

  trainingExamples.forEach(ex => {
    if (ex.criteria_scores) {
      Object.entries(ex.criteria_scores).forEach(([criterion, scoreData]: [string, any]) => {
        if (!criteriaAverages[criterion]) criteriaAverages[criterion] = [];
        if (scoreData?.score !== undefined) {
          criteriaAverages[criterion].push(scoreData.score);
        }
      });
    }
  });

  // Calculate criteria averages and identify weak areas
  Object.entries(criteriaAverages).forEach(([criterion, scores]: [string, number[]]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg < 2.0) {
      criteriaWeaknesses.push(`${criterion.replace(/_/g, ' ')}: avg ${avg.toFixed(1)} (consistently low)`);
    }
  });

  // Analyze coaching notes for common patterns with enhanced detection
  const coachingNotes = trainingExamples
    .map(ex => ex.coaching_notes)
    .filter(note => note && note.length > 0)
    .join(' ');

  const commonPatterns = [];

  // Enhanced pattern detection with scoring context
  if (coachingNotes.toLowerCase().includes('talk time') || coachingNotes.toLowerCase().includes('dominated')) {
    commonPatterns.push('Managers heavily penalize poor talk time ratios (key accuracy factor)');
  }
  if (coachingNotes.toLowerCase().includes('business') || coachingNotes.toLowerCase().includes('acumen')) {
    commonPatterns.push('Business acumen requires concrete examples for 3+ scores');
  }
  if (coachingNotes.toLowerCase().includes('opening') || coachingNotes.toLowerCase().includes('pattern')) {
    commonPatterns.push('Opening effectiveness focuses on pattern interrupt execution');
  }
  if (coachingNotes.toLowerCase().includes('needs work') || coachingNotes.toLowerCase().includes('improvement')) {
    commonPatterns.push('Managers use "needs improvement" language for 1-2 scores');
  }

  // Add strictness-based patterns
  if (strictnessLevel === 'very_strict') {
    commonPatterns.push('Manager scoring style: Very strict - rarely awards 3+ scores');
  } else if (strictnessLevel === 'strict') {
    commonPatterns.push('Manager scoring style: Strict - requires clear evidence for 3+ scores');
  }

  if (commonPatterns.length === 0) {
    commonPatterns.push('Managers evaluate comprehensively with standard strictness');
  }

  return {
    averageScore: avgScore.toFixed(2),
    scoreRange: `${minScore.toFixed(1)} - ${maxScore.toFixed(1)}`,
    distribution: `Excellent (3.5+): ${scores.filter(s => s >= 3.5).length}, Good (2.5-3.4): ${scores.filter(s => s >= 2.5 && s < 3.5).length}, Needs Improvement (1.5-2.4): ${scores.filter(s => s >= 1.5 && s < 2.5).length}, Poor (<1.5): ${scores.filter(s => s < 1.5).length}`,
    commonPatterns,
    strictnessLevel: strictnessLevel,
    criteriaWeaknesses: criteriaWeaknesses,
    maxAllowedScore: Math.min(avgScore + 0.2, 4.0), // Strict upper bound
    targetScoreRange: `${Math.max(avgScore - 0.3, 0).toFixed(1)}-${Math.min(avgScore + 0.2, 4.0).toFixed(1)}`
  };
}

/**
 * Convert extracted scoring rubric from CSV to BDRCriteria format
 * This enables AI evaluation to use manager-defined scoring guidelines
 */
function convertScoringRubricToBDRCriteria(scoringRubric: any, dynamicCriteria: BDRCriteria[]): BDRCriteria[] {
  if (!scoringRubric || !scoringRubric.levels || !Array.isArray(scoringRubric.levels)) {
    console.log('🔄 No valid scoring rubric found, using dynamic criteria');
    return dynamicCriteria;
  }

  console.log('🎯 Converting extracted scoring rubric to BDR criteria format');

  // Create scoring guidelines from extracted rubric levels
  const scoringGuidelines = {
    excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution; an ideal example' },
    good: { min: 3, description: 'Strong Performance: Above-average execution with noticeable impact' },
    needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution; generally effective but not standout' },
    poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
  };

  // Override with extracted scoring guidelines if available
  scoringRubric.levels.forEach((level: any) => {
    if (level.score === 4 || level.label === '4') {
      scoringGuidelines.excellent.description = level.description;
    } else if (level.score === 3 || level.label === '3') {
      scoringGuidelines.good.description = level.description;
    } else if (level.score === 2 || level.label === '2') {
      scoringGuidelines.needs_improvement.description = level.description;
    } else if (level.score === 1 || level.label === '1') {
      scoringGuidelines.poor.description = level.description;
    } else if (level.score === 0 || level.label === '0') {
      scoringGuidelines.poor.description = level.description;
    }
  });

  // Enhanced BDR criteria using extracted scoring guidelines
  const enhancedCriteria = dynamicCriteria.map(defaultCriterion => ({
    ...defaultCriterion,
    scoringGuidelines,
    evaluationPrompts: {
      ...defaultCriterion.evaluationPrompts,
      scoringPrompt: `Rate on 0-4 scale using extracted rubric: ${scoringRubric.levels.map((l: any) => `${l.score || l.label}=${l.description}`).join(', ')}`
    }
  }));

  console.log(`✅ Enhanced ${enhancedCriteria.length} BDR criteria with extracted scoring rubric`);
  return enhancedCriteria;
}

/**
 * Generate BDR Scorecard Evaluation using Azure OpenAI GPT-4o Mini with Manager Training Data
 */
async function generateBDRScorecard(
  transcript: string,
  trainingProgram: BDRTrainingProgram,
  chatClient: any,
  managerTrainingExamples: any[] = [],
  dynamicCriteria: BDRCriteria[] = [],
  systemPrompts: any = {},
  supabase: any = null
): Promise<any> {
  const criteria = trainingProgram.scorecard_criteria || dynamicCriteria;
  
  // Create enhanced manager training calibration section with strict scoring enforcement
  let managerCalibrationSection = '';
  if (managerTrainingExamples.length > 0) {
    const trainingAnalysis = analyzeManagerTrainingData(managerTrainingExamples);

    managerCalibrationSection = `
CRITICAL MANAGER CALIBRATION - ENFORCE SCORING STANDARDS:
Based on ${managerTrainingExamples.length} manager-scored evaluations from this training program:

MANDATORY SCORING ALIGNMENT:
- Manager Average Score: ${trainingAnalysis.averageScore} (THIS IS YOUR TARGET BASELINE)
- Manager Scoring Range: ${trainingAnalysis.scoreRange} (STAY WITHIN THIS RANGE)
- Manager Strictness Level: ${trainingAnalysis.strictnessLevel}
- Your Target Range: ${trainingAnalysis.targetScoreRange}
- Maximum Allowed Score: ${trainingAnalysis.maxAllowedScore} (HARD UPPER LIMIT)
- Score Distribution: ${trainingAnalysis.distribution}

CRITERIA-SPECIFIC WEAKNESSES TO MATCH:
${trainingAnalysis.criteriaWeaknesses.map(weakness => `- ${weakness}`).join('\n') || '- No consistent criteria weaknesses identified'}

STRICT SCORING CONSTRAINTS:
1. NEVER exceed maximum allowed score of ${trainingAnalysis.maxAllowedScore}
2. Manager ${trainingAnalysis.strictnessLevel} scoring style requires stricter evaluation
3. Previous AI scored 47% higher - you must align within 15% tolerance
4. Score 3+ only with concrete behavioral evidence from transcript
5. Match manager criteria weakness patterns exactly

MANAGER FEEDBACK PATTERNS TO EMULATE:
${trainingAnalysis.commonPatterns.map(pattern => `- ${pattern}`).join('\n')}

CALIBRATION ENFORCEMENT RULES:
- If manager average is 2.1, your score should NOT exceed 2.3 (10% tolerance maximum)
- Managers penalize poor talk time ratios heavily (65/35 = 1/4 score)
- Business acumen requires concrete industry knowledge/case studies to score 3+
- Opening scores 3+ only with clear pattern interrupt and confident delivery
- Match manager coaching language and specific feedback style exactly
- Score distribution MUST align with manager patterns, not default to "competent" range

CRITICAL: Previous AI scored 47% higher than managers. You MUST score within 15% of manager patterns.

`;
  }

  // Use dynamic system prompts if available, fall back to default structure
  let baseSystemPrompt = `You are an expert BDR (Business Development Representative) coach analyzing a sales call transcript.
Evaluate this call against the specific BDR training criteria provided.`;

  // Override with dynamic system prompt if loaded from database
  if (systemPrompts.system_evaluation && systemPrompts.system_evaluation.content) {
    console.log('🧠 Using dynamic system evaluation prompt from AI Control Center');
    baseSystemPrompt = systemPrompts.system_evaluation.content;

    // Render prompt with variables if needed
    if (systemPrompts.manager_calibration) {
      const { data: renderedPrompt } = await supabase
        .rpc('render_bdr_prompt', {
          p_prompt_template: baseSystemPrompt,
          p_variables: {
            manager_training_context: JSON.stringify(systemPrompts.manager_calibration)
          }
        });

      if (renderedPrompt) {
        baseSystemPrompt = renderedPrompt;
      }
    }
  }

  // Create comprehensive evaluation prompt with training data integration
  const evaluationPrompt = `
${baseSystemPrompt}
${managerCalibrationSection}
TRAINING PROGRAM: ${trainingProgram.name}
TARGET SCORE THRESHOLD: ${trainingProgram.target_score_threshold}%

EVALUATION CRITERIA:
${criteria.map(c => `
${c.name} (Weight: ${c.weight}%, Max Score: ${c.maxScore})
Description: ${c.description}
Scoring Guidelines:
- Excellent (${c.scoringGuidelines.excellent.min}+): ${c.scoringGuidelines.excellent.description}
- Good (${c.scoringGuidelines.good.min}+): ${c.scoringGuidelines.good.description}
- Needs Improvement (${c.scoringGuidelines.needs_improvement.min}+): ${c.scoringGuidelines.needs_improvement.description}
- Poor (${c.scoringGuidelines.poor.min}+): ${c.scoringGuidelines.poor.description}

Analysis Focus: ${c.evaluationPrompts.analysisPrompt}
`).join('\n')}

CALL TRANSCRIPT:
${transcript}

EVALUATION INSTRUCTIONS - STRICT MANAGER ALIGNMENT:
1. Analyze the call transcript thoroughly against each criterion with MANAGER-LEVEL STRICTNESS
2. Apply criteria-specific scoring with enhanced strictness:

   TALK TIME (Critical Focus Area):
   - 4 = Perfect 40/60 or better ratio (rep speaks ≤40%)
   - 3 = Good 45/55 ratio (rep speaks ≤45%)
   - 2 = Acceptable 50/50 ratio (rep speaks ≤50%)
   - 1 = Poor 55-65% rep talk time (manager penalty zone)
   - 0 = Terrible >65% rep talk time (complete domination)

   BUSINESS ACUMEN (Manager Strictness):
   - 4 = Multiple specific industry insights + relevant case study/proof point
   - 3 = Clear industry knowledge + one concrete example/statistic
   - 2 = Basic industry awareness + generic business understanding
   - 1 = Minimal business context + weak industry relevance
   - 0 = No business acumen demonstrated

   OPENING (Pattern Interrupt Required):
   - 4 = Confident name/company + strong pattern interrupt + smooth transition
   - 3 = Clear introduction + noticeable pattern interrupt + good flow
   - 2 = Standard introduction + weak pattern interrupt attempt
   - 1 = Basic introduction + no real pattern interrupt
   - 0 = Poor/unclear introduction

3. MANDATORY SCORING CONSTRAINTS:
   - Overall score MUST NOT exceed manager baseline by more than 0.2 points
   - If no manager data: default to stricter 1.8-2.5 range (not 2.5-3.0)
   - Each criterion score requires concrete evidence from transcript
   - Score 3+ only with clear, specific behavioral evidence

4. CALIBRATE TO MANAGER STANDARDS: Match the established strictness patterns exactly
5. COACHING FEEDBACK: Use manager language patterns and specific focus areas
6. COMPETENCY ALIGNMENT: Base on manager scoring distribution, not AI assumptions

${systemPrompts.overall_scoring && systemPrompts.overall_scoring.content ?
  `\nDYNAMIC SCORING GUIDANCE:\n${systemPrompts.overall_scoring.content}\n` : ''}

REQUIRED JSON RESPONSE FORMAT:
{
  "overallScore": 3.2,
  "criteriaScores": {
    "opening": {
      "score": 3,
      "maxScore": 4,
      "weight": 12.5,
      "feedback": "Strong opening with clear introduction and value proposition",
      "suggestions": ["Could be more personalized", "Add specific company research"]
    }
  },
  "bdrInsights": {
    "keyStrengths": ["Excellent qualifying questions", "Strong objection handling"],
    "improvementAreas": ["Opening could be stronger", "Need better tone and energy"],
    "coachingPriorities": ["Focus on discovery techniques", "Practice assertiveness and control"],
    "nextCallFocus": ["Ask more open-ended questions", "Better talk time balance"],
    "competencyLevel": "proficient"
  },
  "strengths": ["Clear communication", "Good rapport building"],
  "improvements": ["Ask deeper qualifying questions", "Better pain point identification"],
  "actionItems": [
    "Practice open-ended discovery questions",
    "Develop pain point identification skills",
    "Work on value articulation techniques"
  ],
  "coachingNotes": "Overall solid performance with room for improvement in discovery and value articulation",
  "confidenceScore": 0.85,
  "summary": "BDR demonstrated solid skills across the 8 core criteria with specific areas for development"
}

CRITICAL: Use the 0-4 scoring scale only. Calculate overallScore as the average of all criteria scores (not a percentage). Analyze the call and provide the evaluation in the exact JSON format above.`;

  try {
    console.log('🎯 Generating BDR scorecard evaluation...');

    const deploymentName = Deno.env.get('AZURE_OPENAI_GPT4O_DEPLOYMENT') || 'gpt-4o';
    const messages = [
      {
        role: 'system' as const,
        content: 'You are an expert BDR coach. Analyze sales calls against BDR training criteria and provide detailed, actionable feedback. Always respond with valid JSON.'
      },
      {
        role: 'user' as const,
        content: evaluationPrompt
      }
    ];
    
    const options = {
      maxTokens: 2000,
      temperature: 0
    };
    
    const completion = await chatClient.createChatCompletion({
      messages: messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from Azure OpenAI');
    }

    console.log('✅ BDR evaluation generated successfully');
    
    // Extract and validate JSON
    const evaluation = extractJsonFromAIResponse(response);

    // Validate required fields
    if (!evaluation.overallScore || !evaluation.criteriaScores || !evaluation.bdrInsights) {
      throw new Error('Invalid BDR evaluation format');
    }

    // Apply strict manager-aligned score validation and correction
    const correctedEvaluation = applyManagerScoringConstraints(evaluation, managerTrainingExamples);

    return correctedEvaluation;
    
  } catch (error) {
    console.error('❌ Failed to generate BDR scorecard:', error);
    throw error;
  }
}

/**
 * Apply manager scoring constraints to AI evaluation results
 * Ensures AI scores stay within manager-established patterns
 */
function applyManagerScoringConstraints(evaluation: any, managerTrainingExamples: any[]): any {
  if (!managerTrainingExamples || managerTrainingExamples.length === 0) {
    // If no manager data, apply default strict constraints
    console.log('⚠️ No manager training data - applying default strict constraints');

    // Cap overall score at 2.5 for conservative alignment
    if (evaluation.overallScore > 2.5) {
      console.log(`🔧 Constraining overall score from ${evaluation.overallScore} to 2.5 (no manager data)`);
      evaluation.overallScore = 2.5;
    }

    return evaluation;
  }

  const trainingAnalysis = analyzeManagerTrainingData(managerTrainingExamples);
  const maxAllowedScore = parseFloat(trainingAnalysis.maxAllowedScore);
  const managerAverage = parseFloat(trainingAnalysis.averageScore);

  console.log(`🎯 Manager constraints: avg=${managerAverage}, max=${maxAllowedScore}, strictness=${trainingAnalysis.strictnessLevel}`);

  // Apply overall score constraint
  const originalOverallScore = evaluation.overallScore;
  if (evaluation.overallScore > maxAllowedScore) {
    evaluation.overallScore = maxAllowedScore;
    console.log(`🔧 Constrained overall score from ${originalOverallScore} to ${maxAllowedScore} (manager limit)`);
  }

  // Apply criteria-specific constraints based on manager patterns
  let totalConstrainedScore = 0;
  let criteriaCount = 0;

  if (evaluation.criteriaScores) {
    Object.keys(evaluation.criteriaScores).forEach(criterionId => {
      const criterion = evaluation.criteriaScores[criterionId];
      if (criterion && typeof criterion.score === 'number') {
        const originalScore = criterion.score;

        // Apply specific constraints based on manager weakness patterns
        const isWeakCriterion = trainingAnalysis.criteriaWeaknesses.some(weakness =>
          weakness.includes(criterionId.replace(/_/g, ' '))
        );

        if (isWeakCriterion && criterion.score > 2.5) {
          criterion.score = Math.min(criterion.score, 2.5);
          console.log(`🔧 Constrained weak criterion ${criterionId} from ${originalScore} to ${criterion.score}`);
        }

        // Global score cap based on manager patterns
        if (criterion.score > maxAllowedScore) {
          criterion.score = maxAllowedScore;
          console.log(`🔧 Constrained criterion ${criterionId} from ${originalScore} to ${maxAllowedScore}`);
        }

        // Special constraints for consistently problematic areas
        if (criterionId === 'talk_time' && criterion.score > managerAverage + 0.1) {
          criterion.score = Math.min(criterion.score, managerAverage + 0.1);
          console.log(`🔧 Applied talk time strictness: ${criterionId} capped at ${criterion.score}`);
        }

        if (criterionId === 'business_acumen_and_relevance' && criterion.score > managerAverage + 0.1) {
          criterion.score = Math.min(criterion.score, managerAverage + 0.1);
          console.log(`🔧 Applied business acumen strictness: ${criterionId} capped at ${criterion.score}`);
        }

        totalConstrainedScore += criterion.score;
        criteriaCount++;
      }
    });

    // Recalculate overall score from constrained criteria scores
    if (criteriaCount > 0) {
      const recalculatedScore = totalConstrainedScore / criteriaCount;
      evaluation.overallScore = Math.min(recalculatedScore, maxAllowedScore);

      if (Math.abs(recalculatedScore - originalOverallScore) > 0.1) {
        console.log(`🔧 Recalculated overall score from ${originalOverallScore} to ${evaluation.overallScore} based on constrained criteria`);
      }
    }
  }

  // Add constraint metadata for tracking
  evaluation._constraintMetadata = {
    appliedConstraints: true,
    managerAverage: managerAverage,
    maxAllowedScore: maxAllowedScore,
    strictnessLevel: trainingAnalysis.strictnessLevel,
    originalOverallScore: originalOverallScore,
    finalOverallScore: evaluation.overallScore,
    constraintApplied: Math.abs(originalOverallScore - evaluation.overallScore) > 0.01
  };

  return evaluation;
}

/**
 * Update BDR training progress
 */
async function updateTrainingProgress(
  supabase: any,
  userId: string,
  programId: string,
  newScore: number
): Promise<void> {
  try {
    // Get or create progress record using explicit steps
    const progressTable = supabase.from('bdr_training_progress');
    const progressQuery = progressTable.select('*');
    const progressFilter1 = progressQuery.eq('user_id', userId);
    const progressFilter2 = progressFilter1.eq('training_program_id', programId);
    const progressResult = await progressFilter2.limit(1);
    const progressRecords = progressResult.data || [];
    const existingProgress = progressRecords.length > 0 ? progressRecords[0] : null;

    const callsCompleted = (existingProgress?.calls_completed || 0) + 1;
    const previousAverage = existingProgress?.average_score || 0;
    const newAverage = existingProgress 
      ? ((previousAverage * (callsCompleted - 1)) + newScore) / callsCompleted
      : newScore;

    const updateData = {
      calls_completed: callsCompleted,
      average_score: newAverage,
      latest_score: newScore,
      best_score: Math.max(existingProgress?.best_score || 0, newScore),
      last_activity_at: new Date().toISOString(),
      status: 'in_progress',
      completion_percentage: Math.min(100, (callsCompleted / 5) * 100) // Assuming 5 calls minimum
    };

    if (existingProgress) {
      const progressUpdateTable = supabase.from('bdr_training_progress');
      const progressUpdateQuery = progressUpdateTable.update(updateData);
      const progressUpdateFilter = progressUpdateQuery.eq('id', existingProgress.id);
      await progressUpdateFilter;
    } else {
      const progressInsertData = {
        user_id: userId,
        training_program_id: programId,
        started_at: new Date().toISOString(),
        ...updateData
      };
      const progressInsertTable = supabase.from('bdr_training_progress');
      const progressInsertQuery = progressInsertTable.insert(progressInsertData);
      await progressInsertQuery;
    }

    console.log('✅ Training progress updated successfully');
  } catch (error) {
    console.error('❌ Failed to update training progress:', error);
    // Don't throw - progress update is not critical
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request with validation
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    
    const recordingId = requestBody?.recordingId;
    const programId = requestBody?.trainingProgramId;
    const forceReprocess = requestBody?.forceReprocess || false;
    
    if (!recordingId || !programId) {
      return createErrorResponse('Missing required parameters: recordingId and trainingProgramId', 400);
    }

    console.log(`🎯 Starting BDR evaluation for recording ${recordingId} with program ${programId}`);

    // Get recording data using explicit query steps
    const recordingsTable = supabase.from('recordings');
    const recordingsQuery = recordingsTable.select('*');
    const recordingFilter = recordingsQuery.eq('id', recordingId);
    const recordingResult = await recordingFilter.limit(1);
    const recordings = recordingResult.data || [];
    const recording = recordings.length > 0 ? recordings[0] : null;
    const recordingError = recordingResult.error || (recordings.length === 0 ? new Error('Recording not found') : null);

    console.log(`🔍 Recording lookup result:`, {
      recordingId,
      found: recordings.length > 0,
      hasError: !!recordingResult.error,
      errorMessage: recordingResult.error?.message,
      recordingData: recording ? { id: recording.id, title: recording.title, status: recording.status } : null
    });

    if (recordingError || !recording) {
      console.error(`❌ Recording not found: ${recordingId}`, recordingError);
      return createErrorResponse(`Recording not found: ${recordingId}. Please ensure the recording exists and try again.`, 404);
    }

    if (!recording.transcript) {
      return createErrorResponse('No transcript available for evaluation', 400);
    }

    // Get training program using explicit query steps
    let trainingProgram;
    let programError;

    try {
      const programsTable = supabase.from('bdr_training_programs');
      const programsQuery = programsTable.select('*');
      const programFilter1 = programsQuery.eq('id', programId);
      const programFilter2 = programFilter1.eq('is_active', true);
      const programResult = await programFilter2.limit(1);
      const programs = programResult.data || [];
      trainingProgram = programs.length > 0 ? programs[0] : null;
      programError = programResult.error || (programs.length === 0 ? new Error('Training program not found') : null);

      console.log(`🎓 Training program lookup result:`, {
        programId,
        found: programs.length > 0,
        isActive: trainingProgram?.is_active,
        hasError: !!programResult.error,
        errorMessage: programResult.error?.message,
        programName: trainingProgram?.name
      });
    } catch (err) {
      programError = err;
      console.error(`❌ Training program query failed:`, err);
    }

    if (programError || !trainingProgram) {
      console.error(`❌ Training program not found or inactive: ${programId}`, programError);
      return createErrorResponse(`Training program not found or inactive: ${programId}. Please check your BDR training configuration.`, 404);
    }

    // Check for existing evaluation (unless force reprocess)
    if (!forceReprocess) {
      const evaluationsTable = supabase.from('bdr_scorecard_evaluations');
      const evaluationsQuery = evaluationsTable.select('*');
      const evaluationsFilter1 = evaluationsQuery.eq('recording_id', recordingId);
      const evaluationsFilter2 = evaluationsFilter1.eq('training_program_id', programId);
      const evaluationResult = await evaluationsFilter2.limit(1);
      const evaluations = evaluationResult.data || [];
      const existingEvaluation = evaluations.length > 0 ? evaluations[0] : null;

      if (existingEvaluation) {
        console.log('✅ Using existing BDR evaluation');
        return createSuccessResponse({
          evaluation: existingEvaluation,
          isExisting: true
        });
      }
    }

    // Get or create call classification using explicit steps
    const classificationData = {
      recording_id: recordingId,
      training_program_id: programId,
      user_id: recording.user_id,
      status: 'pending',
      classification_method: 'ai_analysis'
    };

    console.log('🎯 Attempting to create call classification:', classificationData);

    const classificationsTable = supabase.from('bdr_call_classifications');
    const upsertQuery = classificationsTable.upsert(classificationData, {
      onConflict: 'recording_id,training_program_id'
    });
    const selectQuery = upsertQuery.select();
    const classificationResult = await selectQuery.limit(1);
    const classifications = classificationResult.data || [];
    const classification = classifications.length > 0 ? classifications[0] : null;
    const classificationError = classificationResult.error || (classifications.length === 0 ? new Error('Classification creation failed') : null);

    console.log('🎯 Classification result:', {
      success: !classificationError,
      error: classificationError?.message,
      data: classification,
      resultCount: classifications.length
    });

    if (classificationError) {
      console.error('❌ Failed to create call classification:', classificationError);
      return createErrorResponse(`Failed to classify call for BDR evaluation: ${classificationError.message}`, 500);
    }

    // Initialize Azure OpenAI client
    const chatClient = createAzureOpenAIChatClient();
    if (!chatClient) {
      return createErrorResponse('Failed to initialize AI client', 500);
    }

    // Query existing manager training data for improved AI accuracy
    console.log('🧠 Querying manager training data for AI calibration...');
    let managerTrainingExamples: any[] = [];

    try {
      const { data: trainingData, error: trainingError } = await supabase
        .from('bdr_scorecard_evaluations')
        .select(`
          overall_score,
          criteria_scores,
          coaching_notes,
          call_identifier,
          created_at
        `)
        .eq('training_program_id', programId)
        .not('coaching_notes', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (trainingError) {
        console.warn('⚠️ Failed to query training data, proceeding with default prompts:', trainingError);
      } else if (trainingData && trainingData.length > 0) {
        managerTrainingExamples = trainingData;
        console.log(`✅ Found ${trainingData.length} manager-scored examples for training calibration`);

        // Log scoring patterns for analysis
        const scores = trainingData.map(d => d.overall_score).filter(s => s > 0);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);

        console.log('📊 Manager scoring patterns:', {
          count: scores.length,
          average: avgScore.toFixed(2),
          range: `${minScore.toFixed(1)} - ${maxScore.toFixed(1)}`,
          scoringDistribution: {
            excellent: scores.filter(s => s >= 3.5).length,
            good: scores.filter(s => s >= 2.5 && s < 3.5).length,
            needsImprovement: scores.filter(s => s >= 1.5 && s < 2.5).length,
            poor: scores.filter(s => s < 1.5).length
          }
        });
      } else {
        console.log('📝 No manager training data found, using default AI prompts');
      }
    } catch (trainingQueryError) {
      console.warn('⚠️ Training data query failed, proceeding without calibration:', trainingQueryError);
    }

    // Load dynamic BDR criteria and system prompts from AI Control Center
    console.log('🎯 Loading dynamic BDR criteria and system prompts...');
    let enhancedTrainingProgram = trainingProgram;
    let dynamicCriteria: BDRCriteria[] = DEFAULT_BDR_CRITERIA;
    let systemPrompts: any = {};

    try {
      // Load BDR training criteria with associated prompts
      console.log('📋 Loading BDR training criteria from database...');
      const { data: criteriaData, error: criteriaError } = await supabase
        .rpc('get_bdr_training_criteria', { p_training_program_id: programId });

      if (criteriaError) {
        console.warn('⚠️ Failed to load dynamic criteria, using defaults:', criteriaError);
      } else if (criteriaData && criteriaData.length > 0) {
        console.log(`✅ Loaded ${criteriaData.length} dynamic BDR criteria from database`);

        // Transform database criteria to BDRCriteria format
        dynamicCriteria = criteriaData.map((criterion: any) => ({
          id: criterion.id,
          name: criterion.name,
          description: criterion.description,
          weight: parseFloat(criterion.weight) || 12.5,
          maxScore: criterion.max_score || 4,
          scoringGuidelines: criterion.scoring_guidelines || {
            excellent: { min: 4, description: 'Best-in-Class: Flawless, high-impact execution' },
            good: { min: 3, description: 'Strong Performance: Above-average execution' },
            needs_improvement: { min: 2, description: 'Meets Expectations: Competent execution' },
            poor: { min: 0, description: 'Not Demonstrated: Absent or counterproductive behavior' }
          },
          evaluationPrompts: criterion.evaluation_prompts || {
            analysisPrompt: `Analyze the ${criterion.name} aspect of this BDR call`,
            scoringPrompt: `Rate on 0-${criterion.max_score || 4} scale`,
            feedbackPrompt: `Provide specific feedback on ${criterion.name} performance`
          }
        }));

        console.log('🔧 Transformed dynamic criteria for BDR evaluation');
      }

      // Load system prompts for BDR evaluation
      console.log('🧠 Loading BDR evaluation system prompts...');
      const { data: promptsData, error: promptsError } = await supabase
        .rpc('get_bdr_evaluation_system_prompts');

      if (promptsError) {
        console.warn('⚠️ Failed to load system prompts, using defaults:', promptsError);
      } else if (promptsData && promptsData.length > 0) {
        console.log(`✅ Loaded ${promptsData.length} system prompts from database`);

        // Transform prompts data to object format
        systemPrompts = promptsData.reduce((acc: any, prompt: any) => {
          acc[prompt.prompt_type] = {
            content: prompt.prompt_content,
            variables: prompt.variables || []
          };
          return acc;
        }, {});
      }

      // Load manager training context for calibration
      console.log('👨‍💼 Loading manager training context...');
      const { data: trainingContext, error: contextError } = await supabase
        .rpc('get_bdr_manager_training_context', { p_training_program_id: programId });

      if (contextError) {
        console.warn('⚠️ Failed to load training context:', contextError);
      } else if (trainingContext && trainingContext.length > 0) {
        console.log('✅ Loaded manager training context for calibration');
        systemPrompts.manager_calibration = trainingContext[0];
      }

      // Check for existing scoring rubric from CSV uploads
      console.log('🔍 Checking for CSV scoring rubric data...');
      const rubricTable = supabase.from('bdr_scorecard_evaluations');
      const rubricQuery = rubricTable.select('scoring_rubric');
      const rubricFilter1 = rubricQuery.eq('training_program_id', programId);
      const rubricFilter2 = rubricFilter1.not('scoring_rubric', 'is', null);
      const rubricResult = await rubricFilter2.limit(1);
      const rubricData = rubricResult.data || [];

      if (rubricData.length > 0 && rubricData[0].scoring_rubric) {
        console.log('✅ Found existing CSV scoring rubric, enhancing criteria...');
        const extractedRubric = rubricData[0].scoring_rubric;
        const enhancedCriteria = convertScoringRubricToBDRCriteria(extractedRubric, dynamicCriteria);

        enhancedTrainingProgram = {
          ...trainingProgram,
          scorecard_criteria: enhancedCriteria
        };
      } else {
        console.log('📋 No CSV rubric found, using dynamic criteria from database');
        enhancedTrainingProgram = {
          ...trainingProgram,
          scorecard_criteria: dynamicCriteria
        };
      }

      console.log('🎯 Enhanced training program with dynamic criteria and system prompts');

    } catch (loadingError) {
      console.error('❌ Failed to load dynamic BDR configuration:', loadingError);
      console.log('🔄 Falling back to default criteria');

      // Fallback to default criteria
      enhancedTrainingProgram = {
        ...trainingProgram,
        scorecard_criteria: DEFAULT_BDR_CRITERIA
      };
    }

    // Generate BDR scorecard evaluation using enhanced criteria and manager training data
    const startTime = Date.now();
    const evaluation = await generateBDRScorecard(
      recording.transcript,
      enhancedTrainingProgram,
      chatClient,
      managerTrainingExamples,
      dynamicCriteria,
      systemPrompts,
      supabase
    );
    const processingTime = Date.now() - startTime;

    // Save BDR evaluation to database using explicit steps
    const evaluationData = {
      call_classification_id: classification.id,
      recording_id: recordingId,
      training_program_id: programId,
      user_id: recording.user_id,
      overall_score: evaluation.overallScore,
      criteria_scores: evaluation.criteriaScores,
      bdr_insights: evaluation.bdrInsights,
      improvement_areas: evaluation.improvements || [],
      strengths: evaluation.strengths || [],
      coaching_notes: evaluation.coachingNotes,
      ai_model_version: 'gpt-4o',
      processing_duration_ms: processingTime,
      confidence_score: evaluation.confidenceScore || 0.8,
      evaluated_at: new Date().toISOString()
    };
    
    const evaluationInsertTable = supabase.from('bdr_scorecard_evaluations');
    const insertQuery = evaluationInsertTable.insert(evaluationData);
    const selectAfterInsert = insertQuery.select();
    const insertResult = await selectAfterInsert.limit(1);
    const insertedEvaluations = insertResult.data || [];
    const savedEvaluation = insertedEvaluations.length > 0 ? insertedEvaluations[0] : null;
    const saveError = insertResult.error || (insertedEvaluations.length === 0 ? new Error('Evaluation save failed') : null);

    if (saveError) {
      console.error('Failed to save BDR evaluation:', saveError);
      return createErrorResponse('Failed to save evaluation', 500);
    }

    // Update call classification status using explicit steps
    const classificationUpdateTable = supabase.from('bdr_call_classifications');
    const updateQuery = classificationUpdateTable.update({ status: 'completed' });
    const updateFilter = updateQuery.eq('id', classification.id);
    await updateFilter;

    // Update training progress
    await updateTrainingProgress(supabase, recording.user_id, programId, evaluation.overallScore);

    // Optionally update the recording's coaching_evaluation with BDR data
    if (recording.coaching_evaluation) {
      const updatedCoaching = {
        ...recording.coaching_evaluation,
        bdrEvaluationId: savedEvaluation.id,
        bdrTrainingProgramId: programId,
        bdrCriteriaScores: evaluation.criteriaScores,
        bdrInsights: evaluation.bdrInsights
      };

      const recordingUpdateTable = supabase.from('recordings');
      const recordingUpdateQuery = recordingUpdateTable.update({ coaching_evaluation: updatedCoaching });
      const recordingUpdateFilter = recordingUpdateQuery.eq('id', recordingId);
      await recordingUpdateFilter;
    }

    // Track usage of active BDR scoring rubric
    try {
      console.log('📊 Updating BDR scoring rubric usage count...');

      // Find active BDR scoring rubric
      const { data: activeRubrics, error: rubricError } = await supabase
        .from('ai_scoring_rubrics')
        .select('id')
        .eq('category', 'bdr_criteria')
        .eq('is_active', true)
        .limit(1);

      if (rubricError) {
        console.warn('⚠️ Failed to find active BDR rubric for usage tracking:', rubricError);
      } else if (activeRubrics && activeRubrics.length > 0) {
        const rubricId = activeRubrics[0].id;

        // Increment usage count
        const { error: incrementError } = await supabase.rpc('increment_rubric_usage', {
          p_rubric_id: rubricId
        });

        if (incrementError) {
          console.warn('⚠️ Failed to increment rubric usage count:', incrementError);
        } else {
          console.log(`✅ Incremented usage count for BDR rubric: ${rubricId}`);
        }
      } else {
        console.log('📝 No active BDR scoring rubric found for usage tracking');
      }
    } catch (usageError) {
      console.warn('⚠️ Usage tracking failed (non-critical):', usageError);
    }

    console.log(`✅ BDR evaluation completed in ${processingTime}ms`);

    return createSuccessResponse({
      evaluation: savedEvaluation,
      processingTimeMs: processingTime,
      isExisting: false
    });

  } catch (error) {
    console.error('❌ BDR evaluation failed:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'BDR evaluation failed',
      500
    );
  }
});