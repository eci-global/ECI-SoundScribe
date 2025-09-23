import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Lightbulb, 
  Target, 
  TrendingUp,
  CheckCircle,
  Clock,
  ArrowRight,
  Star,
  BookOpen,
  Play,
  ChevronRight,
  Sparkles,
  Award,
  Zap,
  Heart,
  Shield,
  Users,
  Headphones
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recording } from '@/types/recording';
import { analyzeAllSupportSignals, aggregateSupportMetrics } from '@/utils/supportSignals';

interface SupportRecommendation {
  id: string;
  type: 'skill_focus' | 'servqual_tip' | 'practice_challenge' | 'pattern_insight';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  framework?: string;
  actionText: string;
  estimatedImpact: number;
  timeToComplete: string;
  progress?: number;
  isPersonalized: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface SupportLearningPath {
  currentLevel: string;
  nextMilestone: string;
  skillsToFocus: string[];
  completionPercentage: number;
  estimatedTimeToNext: string;
}

interface SupportSmartRecommendationsProps {
  recordings: Recording[];
  onStartPractice?: (recommendation: SupportRecommendation) => void;
}

export function SupportSmartRecommendations({ recordings, onStartPractice }: SupportSmartRecommendationsProps) {
  const [selectedRec, setSelectedRec] = useState<string | null>(null);

  // Generate personalized support recommendations based on user's performance
  const generateSupportRecommendations = (): SupportRecommendation[] => {
    const supportRecordings = recordings.filter(r => 
      r.status === 'completed' && (r.support_analysis || r.transcript)
    );
    
    if (supportRecordings.length === 0) {
      return [
        {
          id: 'start-support-journey',
          type: 'skill_focus',
          priority: 'high',
          title: 'Start Your Support AI Coaching Journey',
          description: 'Upload your first customer support call to unlock personalized coaching recommendations tailored to your unique service style.',
          actionText: 'Upload First Support Call',
          estimatedImpact: 0,
          timeToComplete: '5 minutes',
          isPersonalized: false,
          difficulty: 'beginner'
        }
      ];
    }

    const recommendations: SupportRecommendation[] = [];
    
    // Get aggregated support metrics
    const aggregatedMetrics = aggregateSupportMetrics(supportRecordings);

    // SERVQUAL-specific recommendations
    const servqualDimensions = {
      reliability: aggregatedMetrics.servqualAverages.reliability,
      assurance: aggregatedMetrics.servqualAverages.assurance,
      tangibles: aggregatedMetrics.servqualAverages.tangibles,
      empathy: aggregatedMetrics.servqualAverages.empathy,
      responsiveness: aggregatedMetrics.servqualAverages.responsiveness
    };

    // Find weakest SERVQUAL dimension for focused improvement
    const weakestDimension = Object.entries(servqualDimensions)
      .filter(([_, score]) => score > 0)
      .sort(([_, a], [__, b]) => a - b)[0];

    if (weakestDimension && weakestDimension[1] < 75) {
      const dimensionName = weakestDimension[0].charAt(0).toUpperCase() + weakestDimension[0].slice(1);
      recommendations.push({
        id: `servqual-${weakestDimension[0]}`,
        type: 'servqual_tip',
        priority: 'high',
        title: `Improve ${dimensionName} SERVQUAL`,
        description: `Your ${dimensionName} score is ${weakestDimension[1]}/100. Focus on this dimension to improve customer satisfaction by 25%.`,
        framework: 'SERVQUAL',
        actionText: 'Start SERVQUAL Practice',
        estimatedImpact: Math.round((75 - weakestDimension[1]) / 3),
        timeToComplete: '15-20 minutes',
        progress: Math.round(weakestDimension[1]),
        isPersonalized: true,
        difficulty: weakestDimension[1] < 50 ? 'beginner' : weakestDimension[1] < 65 ? 'intermediate' : 'advanced'
      });
    }

    // Customer satisfaction recommendations
    if (aggregatedMetrics.avgSatisfaction < 80) {
      recommendations.push({
        id: 'customer-satisfaction-focus',
        type: 'skill_focus',
        priority: 'high',
        title: 'Boost Customer Satisfaction',
        description: `Your average customer satisfaction is ${aggregatedMetrics.avgSatisfaction}%. Focus on active listening and empathy to reach the 85%+ excellence range.`,
        actionText: 'Learn Satisfaction Techniques',
        estimatedImpact: 20,
        timeToComplete: '12 minutes',
        isPersonalized: true,
        difficulty: 'intermediate'
      });
    }

    // First Contact Resolution recommendations
    if (aggregatedMetrics.avgFCR < 85) {
      recommendations.push({
        id: 'fcr-improvement',
        type: 'skill_focus',
        priority: 'high',
        title: 'Enhance First Contact Resolution',
        description: `Your FCR rate is ${aggregatedMetrics.avgFCR}%. Improving diagnostic skills and solution knowledge can boost this to 90%+.`,
        actionText: 'FCR Training Module',
        estimatedImpact: 15,
        timeToComplete: '18 minutes',
        isPersonalized: true,
        difficulty: 'intermediate'
      });
    }

    // Escalation risk recommendations
    const highEscalationCalls = aggregatedMetrics.escalationDistribution.high;
    if (highEscalationCalls > 0) {
      recommendations.push({
        id: 'deescalation-training',
        type: 'practice_challenge',
        priority: 'high',
        title: 'Master De-escalation Techniques',
        description: `${highEscalationCalls} of your calls had high escalation risk. Learn proven de-escalation strategies to handle difficult situations.`,
        actionText: 'Practice De-escalation',
        estimatedImpact: 25,
        timeToComplete: '20 minutes',
        isPersonalized: true,
        difficulty: 'advanced'
      });
    }

    // Pattern-based insights
    if (supportRecordings.length >= 5) {
      const recentCalls = supportRecordings.slice(0, 3);
      
      recommendations.push({
        id: 'support-pattern-insight',
        type: 'pattern_insight',
        priority: 'medium',
        title: 'Your Support Performance Pattern',
        description: `Analysis of your last ${supportRecordings.length} calls shows you excel at ${aggregatedMetrics.servqualAverages.empathy > 85 ? 'empathetic customer connection' : 'technical problem solving'}.`,
        actionText: 'View Full Pattern Analysis',
        estimatedImpact: 12,
        timeToComplete: '5 minutes',
        isPersonalized: true,
        difficulty: 'intermediate'
      });
    }

    // Quality metrics recommendations
    if (aggregatedMetrics.qualityMetrics.communicationSkills < 80) {
      recommendations.push({
        id: 'communication-skills',
        type: 'skill_focus',
        priority: 'medium',
        title: 'Enhance Communication Skills',
        description: 'Improve your communication clarity and active listening skills to better understand and address customer needs.',
        actionText: 'Communication Training',
        estimatedImpact: 18,
        timeToComplete: '15 minutes',
        isPersonalized: true,
        difficulty: 'intermediate'
      });
    }

    // Advanced practice challenges for high performers
    if (aggregatedMetrics.avgSatisfaction > 85 && aggregatedMetrics.avgFCR > 85) {
      recommendations.push({
        id: 'advanced-customer-scenarios',
        type: 'practice_challenge',
        priority: 'medium',
        title: 'Advanced Customer Service Scenarios',
        description: 'You\'ve mastered the basics! Try complex scenarios involving multiple issues and difficult customer personalities.',
        actionText: 'Start Advanced Challenge',
        estimatedImpact: 10,
        timeToComplete: '25 minutes',
        isPersonalized: true,
        difficulty: 'advanced'
      });
    }

    // Customer journey optimization
    if (aggregatedMetrics.journeyMetrics.solutionClarity < 75) {
      recommendations.push({
        id: 'solution-clarity',
        type: 'skill_focus',
        priority: 'medium',
        title: 'Improve Solution Clarity',
        description: 'Customers benefit from clear, step-by-step explanations. Learn to break down complex solutions into digestible steps.',
        actionText: 'Learn Clear Communication',
        estimatedImpact: 15,
        timeToComplete: '10 minutes',
        isPersonalized: true,
        difficulty: 'intermediate'
      });
    }

    return recommendations;
  };

  // Generate support learning path
  const generateSupportLearningPath = (): SupportLearningPath => {
    const supportRecordings = recordings.filter(r => 
      r.status === 'completed' && (r.support_analysis || r.transcript)
    );
    
    if (supportRecordings.length === 0) {
      return {
        currentLevel: 'Getting Started',
        nextMilestone: 'First Customer Service Analysis',
        skillsToFocus: ['Active Listening', 'Basic SERVQUAL', 'Customer Empathy'],
        completionPercentage: 0,
        estimatedTimeToNext: '3-4 calls'
      };
    }

    const aggregatedMetrics = aggregateSupportMetrics(supportRecordings);
    const avgSatisfaction = aggregatedMetrics.avgSatisfaction;
    const avgFCR = aggregatedMetrics.avgFCR;

    let currentLevel = 'New Agent';
    let nextMilestone = 'Consistent Service Quality';
    let skillsToFocus = ['SERVQUAL Basics', 'Customer Communication', 'Problem Identification'];
    let completionPercentage = 10;

    if (avgSatisfaction > 60 && avgFCR > 60) {
      currentLevel = 'Service Professional';
      nextMilestone = 'Quality Excellence';
      skillsToFocus = ['Advanced SERVQUAL', 'De-escalation', 'Customer Journey Mastery'];
      completionPercentage = 40;
    }

    if (avgSatisfaction > 75 && avgFCR > 75) {
      currentLevel = 'Support Specialist';
      nextMilestone = 'Expert-Level Performance';
      skillsToFocus = ['Complex Problem Solving', 'Customer Psychology', 'Service Innovation'];
      completionPercentage = 70;
    }

    if (avgSatisfaction > 85 && avgFCR > 85) {
      currentLevel = 'Support Expert';
      nextMilestone = 'Team Leadership';
      skillsToFocus = ['Mentorship Skills', 'Quality Coaching', 'Advanced Customer Relations'];
      completionPercentage = 90;
    }

    return {
      currentLevel,
      nextMilestone,
      skillsToFocus,
      completionPercentage,
      estimatedTimeToNext: completionPercentage > 80 ? '2-3 weeks' : completionPercentage > 50 ? '4-6 weeks' : '6-8 weeks'
    };
  };

  const recommendations = generateSupportRecommendations();
  const learningPath = generateSupportLearningPath();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'skill_focus': return <Target className="w-4 h-4" />;
      case 'servqual_tip': return <Award className="w-4 h-4" />;
      case 'practice_challenge': return <Zap className="w-4 h-4" />;
      case 'pattern_insight': return <TrendingUp className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Support Learning Path Progress */}
      <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Support Learning Path</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-900">{learningPath.currentLevel}</span>
                <span className="text-xs text-gray-600">{learningPath.completionPercentage}%</span>
              </div>
              <Progress value={learningPath.completionPercentage} className="h-2" />
            </div>
            
            <div className="text-xs text-gray-600">
              <div className="font-medium mb-1">Next Milestone: {learningPath.nextMilestone}</div>
              <div>Focus Areas: {learningPath.skillsToFocus.join(', ')}</div>
              <div className="mt-1 text-indigo-600">Est. {learningPath.estimatedTimeToNext}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Support Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Smart Support Recommendations</span>
            <Badge variant="outline" className="text-xs">
              {recommendations.filter(r => r.isPersonalized).length} personalized
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  "border rounded-lg p-3 cursor-pointer transition-all duration-200",
                  selectedRec === rec.id ? "ring-2 ring-indigo-500 bg-indigo-50/50" : "hover:bg-gray-50"
                )}
                onClick={() => setSelectedRec(selectedRec === rec.id ? null : rec.id)}
              >
                <div className="flex items-start space-x-2">
                  <div className={cn("p-1.5 rounded-lg", 
                    rec.type === 'skill_focus' ? 'bg-blue-100 text-blue-600' :
                    rec.type === 'servqual_tip' ? 'bg-indigo-100 text-indigo-600' :
                    rec.type === 'practice_challenge' ? 'bg-purple-100 text-purple-600' :
                    'bg-green-100 text-green-600'
                  )}>
                    {getTypeIcon(rec.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900 text-sm truncate">{rec.title}</h4>
                      {rec.isPersonalized && <Star className="w-3 h-3 text-yellow-500" />}
                    </div>
                    
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={cn("text-xs", getPriorityColor(rec.priority))}>
                        {rec.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        +{rec.estimatedImpact}% impact
                      </Badge>
                      <span className="text-xs text-gray-500">{rec.timeToComplete}</span>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-3">{rec.description}</p>
                    
                    {rec.progress !== undefined && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Current Progress</span>
                          <span>{rec.progress}%</span>
                        </div>
                        <Progress value={rec.progress} className="h-1.5" />
                      </div>
                    )}
                    
                    {selectedRec === rec.id && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartPractice?.(rec);
                          }}
                        >
                          <Play className="w-3 h-3 mr-2" />
                          {rec.actionText}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <ChevronRight className={cn(
                    "w-4 h-4 text-gray-400 transition-transform",
                    selectedRec === rec.id ? "rotate-90" : ""
                  )} />
                </div>
              </div>
            ))}
          </div>

          {/* View All Button */}
          <div className="pt-3 border-t mt-3">
            <Button variant="outline" size="sm" className="w-full text-xs">
              View All Support Recommendations
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Support Practice */}
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center space-x-2">
            <Play className="w-4 h-4 text-emerald-600" />
            <span>Quick Support Practice</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <Button size="sm" variant="outline" className="w-full justify-start text-xs">
              <Heart className="w-3 h-3 mr-2" />
              5-min Empathy Drill
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-start text-xs">
              <Shield className="w-3 h-3 mr-2" />
              De-escalation Techniques
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-start text-xs">
              <Headphones className="w-3 h-3 mr-2" />
              Active Listening Practice
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-start text-xs">
              <Award className="w-3 h-3 mr-2" />
              SERVQUAL Assessment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}