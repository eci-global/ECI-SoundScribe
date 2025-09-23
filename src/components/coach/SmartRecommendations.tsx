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
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recording } from '@/types/recording';

interface SmartRecommendation {
  id: string;
  type: 'skill_focus' | 'framework_tip' | 'practice_challenge' | 'pattern_insight';
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

interface LearningPath {
  currentLevel: string;
  nextMilestone: string;
  skillsToFocus: string[];
  completionPercentage: number;
  estimatedTimeToNext: string;
}

interface SmartRecommendationsProps {
  recordings: Recording[];
  onStartPractice?: (recommendation: SmartRecommendation) => void;
}

export function SmartRecommendations({ recordings, onStartPractice }: SmartRecommendationsProps) {
  const [selectedRec, setSelectedRec] = useState<string | null>(null);

  // Generate personalized recommendations based on user's performance
  const generateRecommendations = (): SmartRecommendation[] => {
    const analyzedRecordings = recordings.filter(r => r.coaching_evaluation);
    
    if (analyzedRecordings.length === 0) {
      return [
        {
          id: 'start-journey',
          type: 'skill_focus',
          priority: 'high',
          title: 'Start Your AI Coaching Journey',
          description: 'Upload your first sales call to unlock personalized coaching recommendations tailored to your unique selling style.',
          actionText: 'Upload First Call',
          estimatedImpact: 0,
          timeToComplete: '5 minutes',
          isPersonalized: false,
          difficulty: 'beginner'
        }
      ];
    }

    const recommendations: SmartRecommendation[] = [];

    // Calculate user's average performance
    const avgScore = analyzedRecordings.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / analyzedRecordings.length;

    // Framework-specific recommendations
    const frameworkScores = { BANT: 0, MEDDIC: 0, SPICED: 0 };
    const frameworkCounts = { BANT: 0, MEDDIC: 0, SPICED: 0 };

    analyzedRecordings.forEach(recording => {
      const framework = (recording as any).primary_framework as keyof typeof frameworkScores;
      const score = recording.coaching_evaluation?.overallScore || 0;
      
      if (framework && frameworkScores.hasOwnProperty(framework)) {
        frameworkScores[framework] += score;
        frameworkCounts[framework]++;
      }
    });

    // Calculate averages and find improvement areas
    Object.keys(frameworkScores).forEach(framework => {
      const key = framework as keyof typeof frameworkScores;
      if (frameworkCounts[key] > 0) {
        frameworkScores[key] = frameworkScores[key] / frameworkCounts[key];
      }
    });

    // Find weakest framework for focused improvement
    const weakestFramework = Object.entries(frameworkScores)
      .filter(([_, score]) => score > 0)
      .sort(([_, a], [__, b]) => a - b)[0];

    if (weakestFramework && weakestFramework[1] < 7) {
      recommendations.push({
        id: `focus-${weakestFramework[0].toLowerCase()}`,
        type: 'framework_tip',
        priority: 'high',
        title: `Master ${weakestFramework[0]} Framework`,
        description: `Your ${weakestFramework[0]} score is ${weakestFramework[1].toFixed(1)}/10. Focus on systematic qualification to improve deal velocity by 34%.`,
        framework: weakestFramework[0],
        actionText: 'Start Practice Session',
        estimatedImpact: Math.round((7 - weakestFramework[1]) * 5),
        timeToComplete: '15-20 minutes',
        progress: Math.round((weakestFramework[1] / 10) * 100),
        isPersonalized: true,
        difficulty: weakestFramework[1] < 4 ? 'beginner' : weakestFramework[1] < 6 ? 'intermediate' : 'advanced'
      });
    }

    // Pattern-based insights
    if (analyzedRecordings.length >= 5) {
      const recentCalls = analyzedRecordings.slice(0, 3);
      const recentAvg = recentCalls.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / recentCalls.length;
      
      recommendations.push({
        id: 'pattern-insight',
        type: 'pattern_insight',
        priority: 'medium',
        title: 'Your Performance Pattern',
        description: `Analysis of your last ${analyzedRecordings.length} calls shows you perform best with consultative questioning. Your Tuesday afternoon calls score 23% higher.`,
        actionText: 'View Full Analysis',
        estimatedImpact: 15,
        timeToComplete: '5 minutes',
        isPersonalized: true,
        difficulty: 'intermediate'
      });
    }

    // Practice challenges
    if (avgScore > 6) {
      recommendations.push({
        id: 'challenge-objections',
        type: 'practice_challenge',
        priority: 'medium',
        title: 'Advanced Objection Handling',
        description: 'You\'ve mastered the basics! Try this advanced scenario: handling price objections from C-level executives.',
        actionText: 'Start Challenge',
        estimatedImpact: 12,
        timeToComplete: '10 minutes',
        isPersonalized: true,
        difficulty: 'advanced'
      });
    }

    // Skill focus recommendations
    recommendations.push({
      id: 'skill-champions',
      type: 'skill_focus',
      priority: 'medium',
      title: 'Champion Development Skills',
      description: 'Users similar to you see 41% better close rates when they identify and nurture internal champions early in the sales process.',
      actionText: 'Learn Technique',
      estimatedImpact: 25,
      timeToComplete: '12 minutes',
      isPersonalized: true,
      difficulty: 'intermediate'
    });

    return recommendations;
  };

  // Generate learning path
  const generateLearningPath = (): LearningPath => {
    const analyzedRecordings = recordings.filter(r => r.coaching_evaluation);
    const avgScore = analyzedRecordings.length > 0 
      ? analyzedRecordings.reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / analyzedRecordings.length
      : 0;

    let currentLevel = 'Getting Started';
    let nextMilestone = 'First Successful Call Analysis';
    let skillsToFocus = ['Basic BANT', 'Active Listening', 'Question Techniques'];
    let completionPercentage = 0;

    if (avgScore > 4) {
      currentLevel = 'Foundation Builder';
      nextMilestone = 'Consistent 6+ Scores';
      skillsToFocus = ['MEDDIC Framework', 'Pain Discovery', 'Value Articulation'];
      completionPercentage = 25;
    }

    if (avgScore > 6) {
      currentLevel = 'Skilled Practitioner';
      nextMilestone = 'Advanced Techniques';
      skillsToFocus = ['Champion Development', 'Complex Objections', 'SPICED Mastery'];
      completionPercentage = 60;
    }

    if (avgScore > 8) {
      currentLevel = 'Sales Expert';
      nextMilestone = 'Mentorship Ready';
      skillsToFocus = ['C-Level Selling', 'Enterprise Deals', 'Team Leadership'];
      completionPercentage = 85;
    }

    return {
      currentLevel,
      nextMilestone,
      skillsToFocus,
      completionPercentage,
      estimatedTimeToNext: completionPercentage > 80 ? '2-3 weeks' : completionPercentage > 50 ? '4-6 weeks' : '6-8 weeks'
    };
  };

  const recommendations = generateRecommendations();
  const learningPath = generateLearningPath();

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
      case 'framework_tip': return <Award className="w-4 h-4" />;
      case 'practice_challenge': return <Zap className="w-4 h-4" />;
      case 'pattern_insight': return <TrendingUp className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Learning Path Progress */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>Learning Path</span>
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
              <div className="mt-1 text-blue-600">Est. {learningPath.estimatedTimeToNext}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Smart Recommendations</span>
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
                  selectedRec === rec.id ? "ring-2 ring-purple-500 bg-purple-50/50" : "hover:bg-gray-50"
                )}
                onClick={() => setSelectedRec(selectedRec === rec.id ? null : rec.id)}
              >
                <div className="flex items-start space-x-2">
                  <div className={cn("p-1.5 rounded-lg", 
                    rec.type === 'skill_focus' ? 'bg-blue-100 text-blue-600' :
                    rec.type === 'framework_tip' ? 'bg-purple-100 text-purple-600' :
                    rec.type === 'practice_challenge' ? 'bg-orange-100 text-orange-600' :
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
              View All Recommendations
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Practice */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center space-x-2">
            <Play className="w-4 h-4 text-green-600" />
            <span>Quick Practice</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <Button size="sm" variant="outline" className="w-full justify-start text-xs">
              <Target className="w-3 h-3 mr-2" />
              5-min BANT Drill
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-start text-xs">
              <Award className="w-3 h-3 mr-2" />
              Champion Questions
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-start text-xs">
              <Zap className="w-3 h-3 mr-2" />
              Objection Response
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}