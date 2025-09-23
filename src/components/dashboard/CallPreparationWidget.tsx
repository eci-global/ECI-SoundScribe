import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  Phone,
  Target,
  Award,
  Zap,
  ChevronRight,
  Clock,
  FileText,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpcomingCall {
  id: string;
  contactName: string;
  company: string;
  time: Date;
  type: 'discovery' | 'demo' | 'negotiation' | 'follow_up';
  suggestedFramework: 'BANT' | 'MEDDIC' | 'SPICED';
}

interface RecentFramework {
  callType: string;
  framework: string;
  score: number;
}

interface CallPreparationWidgetProps {
  upcomingCalls: UpcomingCall[];
  recentFrameworks: RecentFramework[];
}

export function CallPreparationWidget({ upcomingCalls, recentFrameworks }: CallPreparationWidgetProps) {
  const getFrameworkIcon = (framework: string) => {
    switch (framework) {
      case 'BANT':
        return <Target className="w-4 h-4 text-blue-600" />;
      case 'MEDDIC':
        return <Award className="w-4 h-4 text-purple-600" />;
      case 'SPICED':
        return <Zap className="w-4 h-4 text-orange-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getCallTypeColor = (type: string) => {
    switch (type) {
      case 'discovery':
        return 'bg-blue-100 text-blue-800';
      case 'demo':
        return 'bg-purple-100 text-purple-800';
      case 'negotiation':
        return 'bg-green-100 text-green-800';
      case 'follow_up':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // AI-generated preparation tips based on call type
  const getPreparationTips = (callType: string, framework: string) => {
    const tips: Record<string, Record<string, string[]>> = {
      discovery: {
        BANT: [
          "Start with open-ended questions about current challenges",
          "Ask 'What budget have you allocated for solving this?'",
          "Identify all stakeholders: 'Who else would be involved?'"
        ],
        MEDDIC: [
          "Focus on metrics: 'How do you measure success today?'",
          "Explore pain deeply: 'What's the impact of this problem?'",
          "Find the champion: 'Who's most affected by this issue?'"
        ],
        SPICED: [
          "Map the situation thoroughly before discussing pain",
          "Quantify impact: 'What's this costing you annually?'",
          "Identify critical events driving urgency"
        ]
      },
      demo: {
        BANT: [
          "Confirm budget range before showing pricing",
          "Ensure decision makers are present",
          "Link features directly to stated needs"
        ],
        MEDDIC: [
          "Show ROI calculations based on their metrics",
          "Address specific decision criteria they mentioned",
          "Demonstrate value for the economic buyer"
        ],
        SPICED: [
          "Start with their critical event and work backwards",
          "Show impact reduction through your solution",
          "Get commitment on next steps before ending"
        ]
      }
    };

    return tips[callType]?.[framework] || [
      "Review previous call notes and action items",
      "Prepare specific questions based on their industry",
      "Have case studies ready for similar companies"
    ];
  };

  const nextCall = upcomingCalls.length > 0 ? upcomingCalls[0] : null;
  const preparationTips = nextCall ? getPreparationTips(nextCall.type, nextCall.suggestedFramework) : [];

  return (
    <Card className="bg-white/70 backdrop-blur-md border-white/20 shadow-lg h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Call Prep</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {/* Next Call */}
        {nextCall ? (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">{nextCall.contactName}</h4>
                <p className="text-sm text-gray-600">{nextCall.company}</p>
              </div>
              <Badge className={cn("text-xs", getCallTypeColor(nextCall.type))}>
                {nextCall.type}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-700 mb-3">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>
                  {nextCall.time.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                {getFrameworkIcon(nextCall.suggestedFramework)}
                <span>Use {nextCall.suggestedFramework}</span>
              </div>
            </div>

            {/* AI Preparation Tips */}
            <div className="bg-white rounded p-3 space-y-2">
              <h5 className="text-sm font-medium text-gray-900 flex items-center">
                <Lightbulb className="w-4 h-4 mr-1 text-yellow-600" />
                AI Coach Tips
              </h5>
              <ul className="space-y-1">
                {preparationTips.slice(0, 2).map((tip, index) => (
                  <li key={index} className="text-xs text-gray-700 flex items-start">
                    <span className="text-blue-600 mr-1">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <Button size="sm" className="w-full mt-3">
              <Phone className="w-4 h-4 mr-2" />
              Join Call
            </Button>
          </div>
        ) : (
          <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <h4 className="font-medium text-gray-900 text-sm mb-1">No Upcoming Calls</h4>
            <p className="text-xs text-gray-600 mb-3">
              Connect calendar for prep insights
            </p>
            <Button variant="outline" size="sm" className="text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              Schedule
            </Button>
          </div>
        )}

        {/* Recent Performance by Framework - Compact */}
        <div>
          <h4 className="text-xs font-semibold text-gray-900 mb-2">Framework Performance</h4>
          <div className="space-y-1">
            {recentFrameworks.slice(0, 3).map((perf, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <div className="flex items-center space-x-2">
                  {getFrameworkIcon(perf.framework)}
                  <span className="font-medium">{perf.framework}</span>
                </div>
                <span className={cn(
                  "font-bold",
                  perf.score >= 80 ? "text-green-600" : 
                  perf.score >= 60 ? "text-yellow-600" : "text-red-600"
                )}>
                  {Math.round(perf.score)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Resources - Compact */}
        <div className="pt-2 space-y-1">
          <Button variant="outline" size="sm" className="w-full justify-start text-xs">
            <FileText className="w-3 h-3 mr-2" />
            Playbooks
            <ChevronRight className="w-3 h-3 ml-auto" />
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start text-xs">
            <Target className="w-3 h-3 mr-2" />
            Objection Guide
            <ChevronRight className="w-3 h-3 ml-auto" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}