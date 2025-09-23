/**
 * Sales Framework Analysis Service
 * 
 * Core service for analyzing sales calls using various frameworks.
 * Handles AI processing, framework selection, and result storage.
 */

import { 
  SalesFrameworkType, 
  CallType, 
  FrameworkAnalysis,
  FrameworkAnalysisRequest,
  FrameworkAnalysisResponse,
  EnhancedCoachingEvaluation,
  SalesFrameworkSettings
} from '@/types/salesFrameworks';
import { 
  generateFrameworkAnalysisPrompt,
  getFrameworkSelectionPrompt,
  SALES_FRAMEWORK_PROMPTS
} from '@/utils/salesFrameworkPrompts';
import { 
  selectOptimalFramework,
  analyzeWithFramework,
  DEFAULT_FRAMEWORK_SETTINGS
} from '@/utils/salesFrameworkAnalysis';
import { supabase } from '@/integrations/supabase/client';

// ===============================
// AI Analysis Service
// ===============================

class SalesFrameworkService {
  private apiKey: string;
  private endpoint: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY || '';
    this.endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || '';
  }

  /**
   * Analyze a recording with the optimal framework(s)
   */
  async analyzeRecording(
    recordingId: string,
    transcript: string,
    options: {
      callType?: CallType;
      industry?: string;
      frameworks?: SalesFrameworkType[];
      settings?: SalesFrameworkSettings;
    } = {}
  ): Promise<FrameworkAnalysisResponse> {
    try {
      const { callType, industry, frameworks, settings = DEFAULT_FRAMEWORK_SETTINGS } = options;
      
      // Determine frameworks to use
      let frameworksToAnalyze: SalesFrameworkType[];
      
      if (frameworks && frameworks.length > 0) {
        frameworksToAnalyze = frameworks;
      } else if (settings.autoSelectFramework) {
        // Use AI to select optimal framework
        const selectedFramework = await this.selectFramework(transcript, callType, industry);
        frameworksToAnalyze = [selectedFramework];
        
        // Add secondary frameworks if multi-framework analysis is enabled
        if (settings.multiFrameworkAnalysis) {
          frameworksToAnalyze = this.getRecommendedFrameworks(selectedFramework, callType);
        }
      } else {
        frameworksToAnalyze = [settings.defaultFramework];
      }

      // Analyze with selected frameworks - analyze each one
      const analyses: FrameworkAnalysis[] = [];
      
      for (const framework of frameworksToAnalyze) {
        const request: FrameworkAnalysisRequest = {
          recordingId,
          framework,
          transcript,
          callType,
          industry
        };

        const response = await analyzeWithFramework(request);
        if (response.success && response.analysis) {
          analyses.push(response.analysis);
        }
      }
      
      // Return combined response
      const combinedResponse: FrameworkAnalysisResponse = {
        analysis: analyses[0], // Primary analysis
        analyses,
        success: analyses.length > 0,
        processingTime: Date.now()
      };

      // Store results in mock way (no database for now)
      console.log('Mock: Storing framework analyses', { recordingId, analyses });

      return combinedResponse;
    } catch (error) {
      console.error('Framework analysis failed:', error);
      return {
        analysis: {} as FrameworkAnalysis,
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        processingTime: 0
      };
    }
  }

  /**
   * Use AI to select the optimal framework for a transcript
   */
  async selectFramework(
    transcript: string, 
    callType?: CallType,
    industry?: string
  ): Promise<SalesFrameworkType> {
    try {
      const prompt = getFrameworkSelectionPrompt(transcript);
      
      const response = await this.callAI(
        'You are a sales methodology expert specialized in framework selection.',
        prompt
      );

      const selection = JSON.parse(response);
      return selection.primaryFramework || 'BANT';
    } catch (error) {
      console.error('Framework selection failed:', error);
      // Fallback to heuristic selection
      return selectOptimalFramework(transcript, callType || 'discovery', industry);
    }
  }

  /**
   * Analyze transcript with a specific framework using AI
   */
  async analyzeWithFramework(
    framework: SalesFrameworkType,
    transcript: string,
    callType: CallType = 'discovery',
    industry?: string
  ): Promise<FrameworkAnalysis> {
    try {
      const { systemPrompt, userPrompt } = generateFrameworkAnalysisPrompt(
        framework,
        transcript,
        { callType, industry }
      );

      const response = await this.callAI(systemPrompt, userPrompt);
      const analysis = JSON.parse(response) as FrameworkAnalysis;

      // Enhance analysis with metadata
      analysis.analysisTimestamp = new Date().toISOString();
      analysis.aiModelVersion = 'gpt-4o-mini-framework-v1';
      analysis.callType = callType;

      return analysis;
    } catch (error) {
      console.error(`${framework} analysis failed:`, error);
      throw new Error(`Failed to analyze with ${framework}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create enhanced coaching evaluation with framework analysis
   */
  async createEnhancedCoachingEvaluation(
    recordingId: string,
    transcript: string,
    basicEvaluation: any,
    options: {
      callType?: CallType;
      industry?: string;
      frameworks?: SalesFrameworkType[];
    } = {}
  ): Promise<EnhancedCoachingEvaluation> {
    try {
      // Analyze with frameworks
      const frameworkResponse = await this.analyzeRecording(recordingId, transcript, options);
      
      if (!frameworkResponse.success || !frameworkResponse.analyses || frameworkResponse.analyses.length === 0) {
        throw new Error('Framework analysis failed');
      }

      const primaryAnalysis = frameworkResponse.analyses[0];
      const analyses = frameworkResponse.analyses;
      
      // Create enhanced evaluation
      const enhancedEvaluation: EnhancedCoachingEvaluation = {
        // Maintain backward compatibility
        overallScore: basicEvaluation.overallScore || 0,
        strengths: basicEvaluation.strengths || [],
        improvements: basicEvaluation.improvements || [],
        summary: basicEvaluation.summary || '',
        
        // Enhanced framework analysis
        frameworkAnalyses: analyses,
        primaryFramework: primaryAnalysis.frameworkType,
        secondaryFrameworks: analyses.slice(1).map(a => a.frameworkType),
        
        // Call classification
        callType: options.callType || 'discovery',
        callOutcome: this.inferCallOutcome(primaryAnalysis),
        
        // Enhanced insights
        strategicInsights: this.generateStrategicInsights(analyses),
        tacticalImprovements: this.generateTacticalImprovements(analyses),
        frameworkRecommendations: this.generateFrameworkRecommendations(analyses),
        
        // Coaching intelligence
        coachingPriority: this.determineCoachingPriority(analyses),
        skillLevel: this.assessSkillLevel(analyses),
        improvementPotential: this.calculateImprovementPotential(analyses),
        
        // Metadata
        analysisVersion: '2.0.0',
        frameworksUsed: analyses.map(a => a.frameworkType),
        totalAnalysisTime: frameworkResponse.processingTime
      };

      return enhancedEvaluation;
    } catch (error) {
      console.error('Enhanced coaching evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Store framework analyses in database (mock implementation)
   */
  async storeFrameworkAnalyses(
    recordingId: string,
    analyses: FrameworkAnalysis[]
  ): Promise<void> {
    // Mock implementation - just log for now
    console.log('Mock: Storing framework analyses', {
      recordingId,
      analysesCount: analyses.length,
      frameworks: analyses.map(a => a.frameworkType)
    });
    
    // In a real implementation, this would save to a sales_framework_analyses table
    // For now, just return successfully
    return Promise.resolve();
  }

  /**
   * Retrieve framework analyses for a recording (mock implementation)
   */
  async getFrameworkAnalyses(recordingId: string): Promise<FrameworkAnalysis[]> {
    // Mock implementation - return empty array for now
    console.log('Mock: Retrieving framework analyses for recording', recordingId);
    return [];
  }

  // ===============================
  // Private Helper Methods
  // ===============================

  private async callAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch(`${this.endpoint}/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-10-01-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`AI API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private getRecommendedFrameworks(
    primaryFramework: SalesFrameworkType,
    callType?: CallType
  ): SalesFrameworkType[] {
    const frameworks = [primaryFramework];
    
    // Add complementary frameworks based on primary
    switch (primaryFramework) {
      case 'BANT':
        frameworks.push('SPICED'); // Add consultative element
        break;
      case 'MEDDIC':
        frameworks.push('CHALLENGER'); // Add insight element
        break;
      case 'SPICED':
        frameworks.push('BANT'); // Add qualification element
        break;
      default:
        frameworks.push('BANT'); // BANT as universal secondary
    }

    return frameworks.slice(0, 2); // Limit to 2 frameworks
  }

  private inferCallOutcome(analysis: FrameworkAnalysis): string {
    const score = analysis.overallScore;
    if (score >= 80) return 'advanced';
    if (score >= 60) return 'qualified';
    if (score >= 40) return 'follow_up_needed';
    return 'disqualified';
  }

  private generateStrategicInsights(analyses: FrameworkAnalysis[]): string[] {
    const insights: string[] = [];
    
    analyses.forEach(analysis => {
      if (analysis.overallScore >= 80) {
        insights.push(`Strong ${analysis.frameworkType} execution suggests high deal potential`);
      } else if (analysis.overallScore < 50) {
        insights.push(`Weak ${analysis.frameworkType} foundation needs strategic attention`);
      }
    });

    return insights;
  }

  private generateTacticalImprovements(analyses: FrameworkAnalysis[]): string[] {
    const improvements: string[] = [];
    
    analyses.forEach(analysis => {
      // coachingActions is a string array in our interface, not objects
      analysis.coachingActions.forEach(action => improvements.push(action));
    });

    return improvements.slice(0, 5); // Top 5 improvements
  }

  private generateFrameworkRecommendations(analyses: FrameworkAnalysis[]): string[] {
    const recommendations: string[] = [];
    
    const bestFramework = analyses.reduce((best, current) => 
      current.overallScore > best.overallScore ? current : best
    );

    recommendations.push(`Focus on ${bestFramework.frameworkType} methodology for this deal type`);
    
    if (analyses.length > 1) {
      recommendations.push(`Consider multi-framework approach combining ${analyses.map(a => a.frameworkType).join(' and ')}`);
    }

    return recommendations;
  }

  private determineCoachingPriority(analyses: FrameworkAnalysis[]): 'high' | 'medium' | 'low' {
    const avgScore = analyses.reduce((sum, a) => sum + a.overallScore, 0) / analyses.length;
    
    if (avgScore < 50) return 'high';
    if (avgScore < 70) return 'medium';
    return 'low';
  }

  private assessSkillLevel(analyses: FrameworkAnalysis[]): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    const avgScore = analyses.reduce((sum, a) => sum + a.overallScore, 0) / analyses.length;
    
    if (avgScore >= 85) return 'expert';
    if (avgScore >= 70) return 'advanced';
    if (avgScore >= 55) return 'intermediate';
    return 'beginner';
  }

  private calculateImprovementPotential(analyses: FrameworkAnalysis[]): number {
    const scores = analyses.map(a => a.overallScore);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Higher potential if current score is low but framework execution shows potential
    const potential = Math.max(0, 100 - avgScore);
    return Math.min(100, potential);
  }
}

// ===============================
// Service Instance
// ===============================

export const salesFrameworkService = new SalesFrameworkService();

// ===============================
// Utility Functions
// ===============================

export async function analyzeRecordingWithFrameworks(
  recordingId: string,
  transcript: string,
  options?: {
    callType?: CallType;
    industry?: string;
    frameworks?: SalesFrameworkType[];
  }
): Promise<FrameworkAnalysisResponse> {
  return salesFrameworkService.analyzeRecording(recordingId, transcript, options);
}

export async function getRecordingFrameworkAnalyses(
  recordingId: string
): Promise<FrameworkAnalysis[]> {
  return salesFrameworkService.getFrameworkAnalyses(recordingId);
}

export async function createEnhancedCoachingEvaluation(
  recordingId: string,
  transcript: string,
  basicEvaluation: any,
  options?: {
    callType?: CallType;
    industry?: string;
    frameworks?: SalesFrameworkType[];
  }
): Promise<EnhancedCoachingEvaluation> {
  return salesFrameworkService.createEnhancedCoachingEvaluation(
    recordingId,
    transcript,
    basicEvaluation,
    options
  );
}