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
   * Extract questions from transcript with better context and pairing
   */
  private static extractQuestions(lines: string[]): ExtractedQuestion[] {
    const questions: ExtractedQuestion[] = [];
    let questionId = 1;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Look for lines that end with question marks or contain question words
      if (trimmedLine.endsWith('?') || this.containsQuestionWords(trimmedLine)) {
        const question: ExtractedQuestion = {
          id: `q_${questionId++}`,
          question_text: this.cleanQuestionText(trimmedLine),
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
   * Extract customer answers with better pairing to questions
   */
  private static extractAnswers(lines: string[]): CustomerAnswer[] {
    const answers: CustomerAnswer[] = [];
    let answerId = 1;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      const speakerName = this.extractSpeakerName(line);
      
      // Look for substantial responses (not questions, not too short)
      if (!trimmedLine.endsWith('?') && 
          !this.containsQuestionWords(trimmedLine) && 
          trimmedLine.length > 15 &&
          speakerName.toLowerCase() !== 'interviewer') {
        
        const answer: CustomerAnswer = {
          id: `a_${answerId++}`,
          answer_text: this.cleanAnswerText(trimmedLine),
          customer_name: speakerName,
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
  private static containsQuestionWords(text: string): boolean {
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'can you', 'could you', 'would you', 'do you', 'are you', 'have you', 'did you'];
    const lowerText = text.toLowerCase();
    return questionWords.some(word => lowerText.includes(word));
  }

  private static cleanQuestionText(text: string): string {
    // Remove speaker prefix if present
    return text.replace(/^[^:]+:\s*/, '').trim();
  }

  private static cleanAnswerText(text: string): string {
    // Remove speaker prefix if present
    return text.replace(/^[^:]+:\s*/, '').trim();
  }

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
      if (relatedAnswer) {
        // Generate specific solutions based on content analysis
        const solutions = this.generateSpecificSolutions(question, relatedAnswer);
        solutions.forEach(solution => {
          recommendations.push({
            id: `rec_${recId++}`,
            question_id: question.id,
            recommended_solution: solution.solution,
            solution_type: solution.type,
            priority: solution.priority,
            rationale: solution.rationale,
            implementation_steps: solution.steps,
            expected_impact: solution.impact
          });
        });
      }
    });
    
    // Add general recommendations based on overall patterns
    const generalRecommendations = this.generateGeneralRecommendations(questions, answers);
    generalRecommendations.forEach(rec => {
      recommendations.push({
        id: `rec_${recId++}`,
        question_id: 'general',
        ...rec
      });
    });
    
    return recommendations;
  }

  private static generateSpecificSolutions(question: ExtractedQuestion, answer: CustomerAnswer): any[] {
    const solutions: any[] = [];
    const lowerAnswer = answer.answer_text.toLowerCase();
    const lowerQuestion = question.question_text.toLowerCase();

    // Performance-related solutions
    if (lowerAnswer.includes('slow') || lowerAnswer.includes('performance') || lowerAnswer.includes('speed')) {
      solutions.push({
        solution: 'Optimize system performance and response times',
        type: 'immediate' as const,
        priority: 'high' as const,
        rationale: 'Customer reported performance issues affecting their workflow',
        steps: [
          'Conduct performance audit of current system',
          'Identify bottlenecks in file upload process',
          'Implement caching mechanisms',
          'Optimize database queries',
          'Monitor performance metrics post-implementation'
        ],
        impact: 'Reduced wait times and improved user productivity'
      });
    }

    // Usability-related solutions
    if (lowerAnswer.includes('interface') || lowerAnswer.includes('ui') || lowerAnswer.includes('confusing') || lowerAnswer.includes('intuitive')) {
      solutions.push({
        solution: 'Redesign user interface for better usability',
        type: 'short_term' as const,
        priority: 'high' as const,
        rationale: 'Customer expressed confusion with current interface design',
        steps: [
          'Conduct user experience research',
          'Create wireframes for improved navigation',
          'Implement user testing sessions',
          'Iterate based on feedback',
          'Deploy updated interface'
        ],
        impact: 'Improved user satisfaction and reduced learning curve'
      });
    }

    // Feature-related solutions
    if (lowerAnswer.includes('feature') || lowerAnswer.includes('missing') || lowerAnswer.includes('need')) {
      solutions.push({
        solution: 'Develop requested features based on customer feedback',
        type: 'long_term' as const,
        priority: 'medium' as const,
        rationale: 'Customer identified specific feature needs',
        steps: [
          'Prioritize feature requests',
          'Create detailed specifications',
          'Develop and test new features',
          'Gather customer feedback during beta',
          'Release to production'
        ],
        impact: 'Enhanced product functionality and customer retention'
      });
    }

    // Support-related solutions
    if (lowerAnswer.includes('support') || lowerAnswer.includes('help') || lowerAnswer.includes('documentation')) {
      solutions.push({
        solution: 'Enhance customer support and documentation',
        type: 'immediate' as const,
        priority: 'medium' as const,
        rationale: 'Customer needs better support resources',
        steps: [
          'Review current support processes',
          'Create comprehensive documentation',
          'Implement live chat support',
          'Train support team on common issues',
          'Monitor support ticket resolution times'
        ],
        impact: 'Faster issue resolution and improved customer satisfaction'
      });
    }

    return solutions;
  }

  private static generateGeneralRecommendations(questions: ExtractedQuestion[], answers: CustomerAnswer[]): any[] {
    const recommendations: any[] = [];
    
    // Analyze overall sentiment
    const negativeAnswers = answers.filter(a => a.sentiment === 'negative');
    const positiveAnswers = answers.filter(a => a.sentiment === 'positive');
    
    if (negativeAnswers.length > positiveAnswers.length) {
      recommendations.push({
        recommended_solution: 'Implement comprehensive customer feedback program',
        solution_type: 'process_improvement' as const,
        priority: 'high' as const,
        rationale: 'Overall negative sentiment indicates need for systematic feedback collection',
        implementation_steps: [
          'Set up regular customer feedback surveys',
          'Implement feedback tracking system',
          'Create feedback response protocols',
          'Schedule regular customer check-ins',
          'Monitor sentiment trends over time'
        ],
        expected_impact: 'Proactive issue identification and improved customer relationships'
      });
    }

    // Analyze question quality
    const lowQualityQuestions = questions.filter(q => q.effectiveness_score < 0.6);
    if (lowQualityQuestions.length > questions.length * 0.3) {
      recommendations.push({
        recommended_solution: 'Improve interview question quality and structure',
        solution_type: 'process_improvement' as const,
        priority: 'medium' as const,
        rationale: 'High percentage of low-quality questions affecting data collection',
        implementation_steps: [
          'Review and refine question templates',
          'Train interviewers on effective questioning techniques',
          'Implement question effectiveness tracking',
          'Create question bank with proven effectiveness',
          'Regular interviewer feedback sessions'
        ],
        expected_impact: 'Higher quality customer insights and more actionable feedback'
      });
    }

    return recommendations;
  }

  private static generateCallBreakdown(lines: string[], questions: ExtractedQuestion[], answers: CustomerAnswer[]): CallBreakdown {
    const totalDuration = lines.length * 30; // Rough estimate
    const sectionDuration = totalDuration / 4; // More detailed breakdown
    
    // Extract key topics from the conversation
    const keyTopics = this.extractKeyTopics(lines);
    
    // Extract pain points and opportunities
    const painPoints = this.extractPainPoints(answers);
    const opportunities = this.extractOpportunities(answers);
    
    return {
      sections: [
        {
          id: 'intro',
          title: 'Introduction & Context Setting',
          start_time: 0,
          end_time: sectionDuration,
          participants: this.extractParticipants(lines),
          key_points: [
            'Meeting introduction and agenda overview',
            'Customer background and role clarification',
            'Product usage context establishment'
          ],
          questions_asked: questions.slice(0, Math.ceil(questions.length * 0.25)).map(q => q.question_text),
          customer_feedback: answers.slice(0, Math.ceil(answers.length * 0.25)).map(a => a.answer_text)
        },
        {
          id: 'experience',
          title: 'Current Experience & Usage',
          start_time: sectionDuration,
          end_time: sectionDuration * 2,
          participants: this.extractParticipants(lines),
          key_points: [
            'Current product usage patterns',
            'Daily workflow integration',
            'Initial user experience assessment'
          ],
          questions_asked: questions.slice(Math.ceil(questions.length * 0.25), Math.ceil(questions.length * 0.5)).map(q => q.question_text),
          customer_feedback: answers.slice(Math.ceil(answers.length * 0.25), Math.ceil(answers.length * 0.5)).map(a => a.answer_text)
        },
        {
          id: 'challenges',
          title: 'Challenges & Pain Points',
          start_time: sectionDuration * 2,
          end_time: sectionDuration * 3,
          participants: this.extractParticipants(lines),
          key_points: [
            'Specific challenges encountered',
            'Workflow disruptions identified',
            'Frustration points and impact assessment'
          ],
          questions_asked: questions.slice(Math.ceil(questions.length * 0.5), Math.ceil(questions.length * 0.75)).map(q => q.question_text),
          customer_feedback: answers.slice(Math.ceil(answers.length * 0.5), Math.ceil(answers.length * 0.75)).map(a => a.answer_text)
        },
        {
          id: 'conclusion',
          title: 'Feedback & Next Steps',
          start_time: sectionDuration * 3,
          end_time: totalDuration,
          participants: this.extractParticipants(lines),
          key_points: [
            'Overall product assessment',
            'Feature requests and suggestions',
            'Action items and follow-up plans'
          ],
          questions_asked: questions.slice(Math.ceil(questions.length * 0.75)).map(q => q.question_text),
          customer_feedback: answers.slice(Math.ceil(answers.length * 0.75)).map(a => a.answer_text)
        }
      ],
      key_topics: keyTopics,
      customer_pain_points: painPoints,
      opportunities_identified: opportunities,
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

  private static extractKeyTopics(lines: string[]): string[] {
    const allText = lines.join(' ').toLowerCase();
    const topics: string[] = [];
    
    // Common UX interview topics
    const topicKeywords = {
      'User Experience': ['experience', 'ux', 'usability', 'interface', 'design'],
      'Performance': ['performance', 'speed', 'slow', 'fast', 'loading', 'response'],
      'Features': ['feature', 'functionality', 'capability', 'tool', 'option'],
      'Support': ['support', 'help', 'documentation', 'training', 'guidance'],
      'Workflow': ['workflow', 'process', 'routine', 'daily', 'task'],
      'Integration': ['integration', 'connect', 'api', 'sync', 'import', 'export'],
      'Mobile': ['mobile', 'phone', 'tablet', 'app', 'responsive'],
      'Security': ['security', 'privacy', 'data', 'protection', 'access']
    };
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => allText.includes(keyword))) {
        topics.push(topic);
      }
    });
    
    return topics.length > 0 ? topics : ['User Experience', 'Product Feedback'];
  }

  private static extractPainPoints(answers: CustomerAnswer[]): string[] {
    const painPoints: string[] = [];
    
    answers.forEach(answer => {
      if (answer.sentiment === 'negative') {
        // Extract specific pain points from negative responses
        const text = answer.answer_text.toLowerCase();
        if (text.includes('slow') || text.includes('performance')) {
          painPoints.push('Performance and speed issues');
        }
        if (text.includes('confusing') || text.includes('difficult') || text.includes('hard')) {
          painPoints.push('Usability and interface confusion');
        }
        if (text.includes('missing') || text.includes('need') || text.includes('want')) {
          painPoints.push('Missing features or functionality');
        }
        if (text.includes('support') || text.includes('help')) {
          painPoints.push('Inadequate support resources');
        }
      }
    });
    
    // Remove duplicates and return unique pain points
    return [...new Set(painPoints)];
  }

  private static extractOpportunities(answers: CustomerAnswer[]): string[] {
    const opportunities: string[] = [];
    
    answers.forEach(answer => {
      if (answer.sentiment === 'positive') {
        // Extract opportunities from positive responses
        const text = answer.answer_text.toLowerCase();
        if (text.includes('like') || text.includes('love') || text.includes('great')) {
          opportunities.push('Positive user sentiment and satisfaction');
        }
        if (text.includes('improve') || text.includes('better') || text.includes('enhance')) {
          opportunities.push('Enhancement and improvement opportunities');
        }
        if (text.includes('recommend') || text.includes('suggest')) {
          opportunities.push('User recommendations and suggestions');
        }
      }
    });
    
    // Remove duplicates and return unique opportunities
    return [...new Set(opportunities)];
  }

  private static extractParticipants(lines: string[]): string[] {
    const participants = new Set<string>();
    
    lines.forEach(line => {
      const speakerMatch = line.match(/^([^:]+):/);
      if (speakerMatch) {
        const speakerName = speakerMatch[1].trim();
        if (speakerName && speakerName !== '') {
          participants.add(speakerName);
        }
      }
    });
    
    return Array.from(participants);
  }

  private static generateComprehensiveSummary(questions: ExtractedQuestion[], answers: CustomerAnswer[], employees: IdentifiedEmployee[]): string {
    const questionCount = questions.length;
    const answerCount = answers.length;
    const employeeCount = employees.length;
    const avgQuestionQuality = questions.length > 0 ? questions.reduce((sum, q) => sum + q.effectiveness_score, 0) / questions.length : 0;
    
    // Analyze sentiment distribution
    const sentimentCounts = answers.reduce((acc, answer) => {
      acc[answer.sentiment] = (acc[answer.sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const positiveCount = sentimentCounts.positive || 0;
    const negativeCount = sentimentCounts.negative || 0;
    const neutralCount = sentimentCounts.neutral || 0;
    
    // Identify key themes
    const keyThemes = this.extractKeyTopicsFromAnswers(answers);
    
    // Generate dynamic summary
    let summary = `This comprehensive user experience interview involved ${employeeCount} participants and generated ${questionCount} questions with ${answerCount} detailed responses. `;
    
    summary += `The interview quality scored ${(avgQuestionQuality * 100).toFixed(1)}%, indicating ${avgQuestionQuality > 0.7 ? 'high-quality' : avgQuestionQuality > 0.5 ? 'moderate-quality' : 'basic'} questioning techniques. `;
    
    summary += `Customer sentiment analysis revealed ${positiveCount} positive, ${negativeCount} negative, and ${neutralCount} neutral responses, `;
    
    if (positiveCount > negativeCount) {
      summary += `indicating overall positive user experience with room for targeted improvements. `;
    } else if (negativeCount > positiveCount) {
      summary += `highlighting significant areas requiring immediate attention and improvement. `;
    } else {
      summary += `showing a balanced perspective with both strengths and areas for enhancement. `;
    }
    
    summary += `Key themes identified include ${keyThemes.slice(0, 3).join(', ')}. `;
    
    summary += `The interview provided actionable insights into user needs, pain points, and enhancement opportunities that can directly inform product roadmap decisions and customer success strategies.`;
    
    return summary;
  }

  private static extractKeyTopicsFromAnswers(answers: CustomerAnswer[]): string[] {
    const allText = answers.map(a => a.answer_text).join(' ').toLowerCase();
    const topics: string[] = [];
    
    const topicKeywords = {
      'Performance Issues': ['slow', 'performance', 'speed', 'loading', 'response time'],
      'Usability Concerns': ['confusing', 'difficult', 'interface', 'ui', 'navigation'],
      'Feature Requests': ['missing', 'need', 'want', 'feature', 'functionality'],
      'Support Needs': ['support', 'help', 'documentation', 'training'],
      'Workflow Integration': ['workflow', 'process', 'integration', 'daily use'],
      'Positive Feedback': ['like', 'love', 'great', 'excellent', 'satisfied']
    };
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => allText.includes(keyword))) {
        topics.push(topic);
      }
    });
    
    return topics.length > 0 ? topics : ['User Experience', 'Product Feedback'];
  }

  private static generateNextSteps(questions: ExtractedQuestion[], answers: CustomerAnswer[]): CallBreakdown['next_steps'] {
    const nextSteps: CallBreakdown['next_steps'] = [];
    
    // Analyze sentiment and generate targeted next steps
    const negativeAnswers = answers.filter(a => a.sentiment === 'negative');
    const positiveAnswers = answers.filter(a => a.sentiment === 'positive');
    const lowQualityQuestions = questions.filter(q => q.effectiveness_score < 0.6);
    
    // Always include core analysis steps
    nextSteps.push({
      id: 'analyze_feedback',
      action: 'Conduct comprehensive analysis of customer feedback and identify key themes',
      owner: 'Product Team',
      priority: 'high',
      status: 'pending'
    });
    
    nextSteps.push({
      id: 'create_action_plan',
      action: 'Create detailed action plan based on interview insights',
      owner: 'Product Manager',
      priority: 'high',
      status: 'pending'
    });
    
    // Add sentiment-specific steps
    if (negativeAnswers.length > 0) {
      nextSteps.push({
        id: 'address_concerns',
        action: `Address ${negativeAnswers.length} identified customer concerns and pain points`,
        owner: 'Product Team',
        priority: 'high',
        status: 'pending'
      });
    }
    
    if (positiveAnswers.length > 0) {
      nextSteps.push({
        id: 'leverage_strengths',
        action: 'Leverage positive feedback to enhance marketing and customer success',
        owner: 'Marketing Team',
        priority: 'medium',
        status: 'pending'
      });
    }
    
    // Add process improvement steps
    if (lowQualityQuestions.length > questions.length * 0.3) {
      nextSteps.push({
        id: 'improve_interview_process',
        action: 'Enhance interview question quality and interviewer training',
        owner: 'Research Team',
        priority: 'medium',
        status: 'pending'
      });
    }
    
    // Add follow-up steps
    nextSteps.push({
      id: 'schedule_follow_up',
      action: 'Schedule follow-up interview to track progress on identified issues',
      owner: 'Customer Success',
      priority: 'medium',
      status: 'pending',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
    });
    
    // Add implementation tracking
    nextSteps.push({
      id: 'track_implementation',
      action: 'Implement tracking system for solution implementation progress',
      owner: 'Product Team',
      priority: 'medium',
      status: 'pending'
    });
    
    return nextSteps;
  }
}
