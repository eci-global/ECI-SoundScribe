import { supabase } from '@/integrations/supabase/client';
import type { 
  UXAnalysis, 
  UXAnalysisRequest, 
  UXAnalysisResponse,
  EmployeeIdentification,
  QuestionAnalysis,
  SolutionRecommendation,
  CallBreakdown,
  ExtractedQuestion,
  CustomerAnswer,
  IdentifiedEmployee
} from '@/types/uxAnalysis';

export class UXAnalysisService {
  /**
   * Analyze a recording for UX insights
   */
  static async analyzeRecording(request: UXAnalysisRequest): Promise<UXAnalysisResponse> {
    try {
      console.log('🔍 Starting UX analysis for recording:', request.recording_id);

      // Call the edge function for UX analysis
      const { data, error } = await supabase.functions.invoke('analyze-ux-interview', {
        body: {
          recording_id: request.recording_id,
          transcript: request.transcript,
          options: request.options || {
            include_employee_identification: true,
            include_solution_recommendations: true,
            analysis_depth: 'comprehensive'
          }
        }
      });

      if (error) {
        console.error('UX analysis edge function error:', error);
        throw error;
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'UX analysis failed');
      }

      // Save the analysis to the database
      const savedAnalysis = await this.saveUXAnalysis(data.data);

      return {
        success: true,
        data: savedAnalysis,
        processing_time: data.processing_time
      };

    } catch (error) {
      console.error('UX analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get UX analysis for a recording
   */
  static async getUXAnalysis(recordingId: string): Promise<UXAnalysis | null> {
    try {
      const { data, error } = await supabase
        .from('ux_analysis')
        .select('*')
        .eq('recording_id', recordingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No analysis found
        }
        throw error;
      }

      return data as UXAnalysis;
    } catch (error) {
      console.error('Error fetching UX analysis:', error);
      return null;
    }
  }

  /**
   * Save UX analysis to database
   */
  private static async saveUXAnalysis(analysis: UXAnalysis): Promise<UXAnalysis> {
    try {
      const { data, error } = await supabase
        .from('ux_analysis')
        .upsert({
          recording_id: analysis.recording_id,
          employee_identification: analysis.employee_identification,
          question_analysis: analysis.question_analysis,
          solution_recommendations: analysis.solution_recommendations,
          call_breakdown: analysis.call_breakdown,
          comprehensive_summary: analysis.comprehensive_summary,
          next_steps: analysis.next_steps,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return data as UXAnalysis;
    } catch (error) {
      console.error('Error saving UX analysis:', error);
      throw error;
    }
  }

  /**
   * Generate instant UX analysis (fallback when edge function is not available)
   */
  static async generateInstantUXAnalysis(transcript: string, recordingId: string): Promise<UXAnalysis> {
    console.log('🎭 Generating instant UX analysis (demo mode)');

    // Parse transcript to extract basic information
    const lines = transcript.split('\n').filter(line => line.trim());
    const questions = this.extractQuestions(lines);
    const employees = this.identifyEmployees(lines);
    const answers = this.extractAnswers(lines);

    const analysis: UXAnalysis = {
      recording_id: recordingId,
      employee_identification: {
        identified_employees: employees,
        confidence_score: 0.7,
        identification_method: 'transcript_analysis'
      },
      question_analysis: {
        questions: questions,
        question_patterns: this.identifyQuestionPatterns(questions),
        overall_question_quality: this.calculateQuestionQuality(questions)
      },
      solution_recommendations: this.generateSolutionRecommendations(questions, answers),
      call_breakdown: this.generateCallBreakdown(lines, questions, answers),
      comprehensive_summary: this.generateComprehensiveSummary(questions, answers, employees),
      next_steps: this.generateNextSteps(questions, answers)
    };

    return analysis;
  }

  /**
   * Extract questions from transcript
   */
  private static extractQuestions(lines: string[]): ExtractedQuestion[] {
    const questions: ExtractedQuestion[] = [];
    let questionId = 1;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Look for lines that end with question marks
      if (trimmedLine.endsWith('?')) {
        const question: ExtractedQuestion = {
          id: `q_${questionId++}`,
          question_text: trimmedLine,
          question_type: this.classifyQuestionType(trimmedLine),
          asked_by: this.extractSpeakerName(line),
          timestamp: index * 30, // Rough estimate
          context: this.getContext(lines, index),
          effectiveness_score: this.scoreQuestionEffectiveness(trimmedLine)
        };
        questions.push(question);
      }
    });

    return questions;
  }

  /**
   * Identify employees from transcript
   */
  private static identifyEmployees(lines: string[]): IdentifiedEmployee[] {
    const employees: Map<string, IdentifiedEmployee> = new Map();

    lines.forEach((line, index) => {
      const speakerMatch = line.match(/^([^:]+):/);
      if (speakerMatch) {
        const speakerName = speakerMatch[1].trim();
        
        if (!employees.has(speakerName)) {
          employees.set(speakerName, {
            name: speakerName,
            role: this.inferRole(speakerName, lines),
            confidence: 0.8,
            segments: [],
            characteristics: {
              speaking_style: this.analyzeSpeakingStyle(lines, speakerName),
              expertise_areas: this.inferExpertiseAreas(lines, speakerName),
              communication_effectiveness: 0.7
            }
          });
        }

        const employee = employees.get(speakerName)!;
        employee.segments.push({
          start_time: index * 30,
          end_time: (index + 1) * 30,
          text: line,
          context: this.getContext(lines, index)
        });
      }
    });

    return Array.from(employees.values());
  }

  /**
   * Extract customer answers
   */
  private static extractAnswers(lines: string[]): CustomerAnswer[] {
    const answers: CustomerAnswer[] = [];
    let answerId = 1;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Look for non-question responses (lines that don't end with ?)
      if (!trimmedLine.endsWith('?') && trimmedLine.length > 20) {
        const answer: CustomerAnswer = {
          id: `a_${answerId++}`,
          answer_text: trimmedLine,
          customer_name: this.extractSpeakerName(line),
          timestamp: index * 30,
          sentiment: this.analyzeSentiment(trimmedLine),
          completeness: this.assessAnswerCompleteness(trimmedLine),
          key_insights: this.extractKeyInsights(trimmedLine)
        };
        answers.push(answer);
      }
    });

    return answers;
  }

  // Helper methods for analysis
  private static classifyQuestionType(question: string): ExtractedQuestion['question_type'] {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('how') || lowerQuestion.includes('what') || lowerQuestion.includes('why')) {
      return 'open_ended';
    } else if (lowerQuestion.includes('do you') || lowerQuestion.includes('are you') || lowerQuestion.includes('can you')) {
      return 'closed_ended';
    } else if (lowerQuestion.includes('tell me more') || lowerQuestion.includes('can you elaborate')) {
      return 'probing';
    } else if (lowerQuestion.includes('so you mean') || lowerQuestion.includes('just to clarify')) {
      return 'clarifying';
    } else {
      return 'follow_up';
    }
  }

  private static extractSpeakerName(line: string): string {
    const speakerMatch = line.match(/^([^:]+):/);
    return speakerMatch ? speakerMatch[1].trim() : 'Unknown';
  }

  private static getContext(lines: string[], index: number): string {
    const start = Math.max(0, index - 2);
    const end = Math.min(lines.length, index + 3);
    return lines.slice(start, end).join(' ');
  }

  private static scoreQuestionEffectiveness(question: string): number {
    // Simple scoring based on question characteristics
    let score = 0.5;
    
    if (question.length > 20) score += 0.1;
    if (question.includes('?')) score += 0.1;
    if (question.toLowerCase().includes('how') || question.toLowerCase().includes('what')) score += 0.2;
    if (question.length < 100) score += 0.1; // Not too long
    
    return Math.min(1, score);
  }

  private static inferRole(speakerName: string, lines: string[]): string {
    // Simple role inference based on common patterns
    const allText = lines.join(' ').toLowerCase();
    
    if (allText.includes('interviewer') || allText.includes('researcher')) {
      return 'Interviewer';
    } else if (allText.includes('customer') || allText.includes('user')) {
      return 'Customer';
    } else if (allText.includes('manager') || allText.includes('supervisor')) {
      return 'Manager';
    } else {
      return 'Employee';
    }
  }

  private static analyzeSpeakingStyle(lines: string[], speakerName: string): string {
    const speakerLines = lines.filter(line => line.startsWith(speakerName + ':'));
    const avgLength = speakerLines.reduce((sum, line) => sum + line.length, 0) / speakerLines.length;
    
    if (avgLength > 100) return 'Detailed';
    if (avgLength > 50) return 'Moderate';
    return 'Concise';
  }

  private static inferExpertiseAreas(lines: string[], speakerName: string): string[] {
    const speakerText = lines.filter(line => line.startsWith(speakerName + ':')).join(' ').toLowerCase();
    const expertiseAreas: string[] = [];
    
    if (speakerText.includes('technical') || speakerText.includes('system')) expertiseAreas.push('Technical');
    if (speakerText.includes('business') || speakerText.includes('process')) expertiseAreas.push('Business');
    if (speakerText.includes('customer') || speakerText.includes('user')) expertiseAreas.push('Customer Experience');
    
    return expertiseAreas.length > 0 ? expertiseAreas : ['General'];
  }

  private static analyzeSentiment(text: string): CustomerAnswer['sentiment'] {
    const positiveWords = ['good', 'great', 'excellent', 'love', 'like', 'happy', 'satisfied'];
    const negativeWords = ['bad', 'terrible', 'hate', 'dislike', 'frustrated', 'angry', 'disappointed'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private static assessAnswerCompleteness(answer: string): number {
    // Simple completeness assessment
    let score = 0.5;
    
    if (answer.length > 50) score += 0.2;
    if (answer.includes('because') || answer.includes('since')) score += 0.2;
    if (answer.split('.').length > 2) score += 0.1;
    
    return Math.min(1, score);
  }

  private static extractKeyInsights(text: string): string[] {
    // Simple key insight extraction
    const insights: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    sentences.forEach(sentence => {
      if (sentence.toLowerCase().includes('problem') || sentence.toLowerCase().includes('issue')) {
        insights.push('Identified problem/issue');
      }
      if (sentence.toLowerCase().includes('solution') || sentence.toLowerCase().includes('fix')) {
        insights.push('Mentioned solution');
      }
      if (sentence.toLowerCase().includes('need') || sentence.toLowerCase().includes('want')) {
        insights.push('Expressed need/want');
      }
    });
    
    return insights.length > 0 ? insights : ['General feedback'];
  }

  private static identifyQuestionPatterns(questions: ExtractedQuestion[]): QuestionAnalysis['question_patterns'] {
    const patterns: QuestionAnalysis['question_patterns'] = [];
    
    const typeCounts = questions.reduce((acc, q) => {
      acc[q.question_type] = (acc[q.question_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(typeCounts).forEach(([type, count]) => {
      patterns.push({
        pattern_type: type,
        frequency: count,
        effectiveness: questions.filter(q => q.question_type === type).reduce((sum, q) => sum + q.effectiveness_score, 0) / count,
        examples: questions.filter(q => q.question_type === type).slice(0, 2).map(q => q.question_text)
      });
    });
    
    return patterns;
  }

  private static calculateQuestionQuality(questions: ExtractedQuestion[]): number {
    if (questions.length === 0) return 0;
    return questions.reduce((sum, q) => sum + q.effectiveness_score, 0) / questions.length;
  }

  private static generateSolutionRecommendations(questions: ExtractedQuestion[], answers: CustomerAnswer[]): SolutionRecommendation[] {
    const recommendations: SolutionRecommendation[] = [];
    let recId = 1;
    
    // Generate recommendations based on questions and answers
    questions.forEach((question, index) => {
      const relatedAnswer = answers[index];
      if (relatedAnswer && relatedAnswer.sentiment === 'negative') {
        recommendations.push({
          id: `rec_${recId++}`,
          question_id: question.id,
          recommended_solution: `Address the concern raised: "${question.question_text}"`,
          solution_type: 'immediate',
          priority: 'high',
          rationale: 'Customer expressed negative sentiment',
          implementation_steps: [
            'Review the specific concern',
            'Develop targeted response',
            'Follow up with customer'
          ],
          expected_impact: 'Improved customer satisfaction'
        });
      }
    });
    
    return recommendations;
  }

  private static generateCallBreakdown(lines: string[], questions: ExtractedQuestion[], answers: CustomerAnswer[]): CallBreakdown {
    const totalDuration = lines.length * 30; // Rough estimate
    const sectionDuration = totalDuration / 3;
    
    return {
      sections: [
        {
          id: 'intro',
          title: 'Introduction & Setup',
          start_time: 0,
          end_time: sectionDuration,
          participants: ['Interviewer', 'Customer'],
          key_points: ['Meeting introduction', 'Context setting'],
          questions_asked: questions.slice(0, 2).map(q => q.question_text),
          customer_feedback: answers.slice(0, 2).map(a => a.answer_text)
        },
        {
          id: 'main',
          title: 'Main Discussion',
          start_time: sectionDuration,
          end_time: sectionDuration * 2,
          participants: ['Interviewer', 'Customer'],
          key_points: ['Core topics discussed', 'Key insights gathered'],
          questions_asked: questions.slice(2, -2).map(q => q.question_text),
          customer_feedback: answers.slice(2, -2).map(a => a.answer_text)
        },
        {
          id: 'conclusion',
          title: 'Wrap-up & Next Steps',
          start_time: sectionDuration * 2,
          end_time: totalDuration,
          participants: ['Interviewer', 'Customer'],
          key_points: ['Summary of discussion', 'Action items identified'],
          questions_asked: questions.slice(-2).map(q => q.question_text),
          customer_feedback: answers.slice(-2).map(a => a.answer_text)
        }
      ],
      key_topics: ['User Experience', 'Product Feedback', 'Process Improvement'],
      customer_pain_points: answers.filter(a => a.sentiment === 'negative').map(a => a.answer_text),
      opportunities_identified: answers.filter(a => a.sentiment === 'positive').map(a => a.answer_text),
      overall_sentiment: this.calculateOverallSentiment(answers)
    };
  }

  private static calculateOverallSentiment(answers: CustomerAnswer[]): CallBreakdown['overall_sentiment'] {
    const sentimentCounts = answers.reduce((acc, answer) => {
      acc[answer.sentiment] = (acc[answer.sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const maxSentiment = Object.entries(sentimentCounts).reduce((max, [sentiment, count]) => 
      count > max.count ? { sentiment, count } : max, 
      { sentiment: 'neutral', count: 0 }
    );
    
    return maxSentiment.sentiment as CallBreakdown['overall_sentiment'];
  }

  private static generateComprehensiveSummary(questions: ExtractedQuestion[], answers: CustomerAnswer[], employees: IdentifiedEmployee[]): string {
    const questionCount = questions.length;
    const answerCount = answers.length;
    const employeeCount = employees.length;
    const avgQuestionQuality = questions.length > 0 ? questions.reduce((sum, q) => sum + q.effectiveness_score, 0) / questions.length : 0;
    
    return `This user experience interview involved ${employeeCount} participants and included ${questionCount} questions with ${answerCount} responses. The overall question quality scored ${(avgQuestionQuality * 100).toFixed(1)}%. Key themes discussed included user feedback, process improvement opportunities, and product enhancement suggestions. The interview provided valuable insights into customer needs and pain points that can inform future product development and service improvements.`;
  }

  private static generateNextSteps(questions: ExtractedQuestion[], answers: CustomerAnswer[]): CallBreakdown['next_steps'] {
    const nextSteps: CallBreakdown['next_steps'] = [];
    
    // Generate next steps based on analysis
    nextSteps.push({
      id: 'analyze_feedback',
      action: 'Analyze customer feedback and identify key themes',
      owner: 'Product Team',
      priority: 'high',
      status: 'pending'
    });
    
    nextSteps.push({
      id: 'follow_up',
      action: 'Follow up with customer on any outstanding questions',
      owner: 'Customer Success',
      priority: 'medium',
      status: 'pending'
    });
    
    if (answers.some(a => a.sentiment === 'negative')) {
      nextSteps.push({
        id: 'address_concerns',
        action: 'Address customer concerns and pain points',
        owner: 'Product Team',
        priority: 'high',
        status: 'pending'
      });
    }
    
    return nextSteps;
  }
}
