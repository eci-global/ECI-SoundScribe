import type { SalesFrameworkType, CallType } from '@/types/salesFrameworks';

export const SALES_FRAMEWORK_PROMPTS = {
  BANT: "Analyze this sales call for Budget, Authority, Need, and Timeline qualification.",
  MEDDIC: "Analyze this sales call for Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, and Champion.",
  SPICED: "Analyze this sales call for Situation, Problem, Implication, Complexity, Economic impact, and Decision.",
  SPIN: "Analyze this sales call using SPIN methodology: Situation, Problem, Implication, and Need-payoff questions.",
  CHALLENGER: "Analyze this sales call using Challenger Sale methodology focusing on insights and challenging assumptions.",
  SOLUTION_SELLING: "Analyze this sales call using Solution Selling methodology focusing on pain discovery and value creation.",
  NEAT: "Analyze this sales call for Need, Economic impact, Access to authority, and Timeline."
};

export function generateFrameworkAnalysisPrompt(
  framework: SalesFrameworkType,
  transcript: string,
  options: { callType?: CallType; industry?: string } = {}
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are a sales methodology expert specializing in ${framework} analysis. 
    Analyze sales conversations and provide detailed insights based on the ${framework} framework.`;
  
  const userPrompt = `${SALES_FRAMEWORK_PROMPTS[framework]}
    
    Call Type: ${options.callType || 'discovery'}
    Industry: ${options.industry || 'general'}
    
    Transcript:
    ${transcript}
    
    Please provide a detailed analysis in JSON format with scores (0-100) for each component.`;

  return { systemPrompt, userPrompt };
}

export function getFrameworkSelectionPrompt(transcript: string): string {
  return `Based on the following sales call transcript, recommend the most suitable sales methodology framework.
    
    Available frameworks: BANT, MEDDIC, SPICED, SPIN, CHALLENGER, SOLUTION_SELLING, NEAT
    
    Transcript:
    ${transcript}
    
    Respond with JSON: { "primaryFramework": "FRAMEWORK_NAME", "reasoning": "brief explanation" }`;
}