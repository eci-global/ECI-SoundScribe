import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle,
  Circle,
  ExternalLink,
  Play,
  Zap,
  Users,
  FileAudio,
  Settings,
  ArrowRight,
  Clock,
  Shield,
  TrendingUp
} from 'lucide-react';
import { useOutreachIntegration } from '@/hooks/useOutreachIntegration';

interface QuickStartGuideProps {
  onComplete?: () => void;
}

export default function QuickStartGuide({ onComplete }: QuickStartGuideProps) {
  const { isConnected } = useOutreachIntegration();
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  const steps = [
    {
      id: 1,
      title: "Connect Your Outreach Account",
      description: "Securely link your Outreach.io account to enable automatic syncing",
      action: "Connect Account",
      url: "/integrations/outreach/connect",
      icon: <Shield className="h-5 w-5" />,
      completed: isConnected,
      automated: false
    },
    {
      id: 2,
      title: "Test the Integration",
      description: "Run our test suite to verify everything is working correctly",
      action: "Run Tests",
      url: "/integrations/outreach/test",
      icon: <Settings className="h-5 w-5" />,
      completed: completedSteps.has(2),
      automated: false
    },
    {
      id: 3,
      title: "Upload Your First Recording",
      description: "Upload a sales call and watch it automatically sync to Outreach",
      action: "Upload Recording",
      url: "/uploads",
      icon: <FileAudio className="h-5 w-5" />,
      completed: completedSteps.has(3),
      automated: false
    },
    {
      id: 4,
      title: "Review Auto-Created Activities",
      description: "Check your Outreach account for the new call activities",
      action: "View in Outreach",
      url: "https://app.outreach.io/prospects",
      icon: <CheckCircle className="h-5 w-5" />,
      completed: completedSteps.has(4),
      automated: true
    }
  ];

  const totalSteps = steps.length;
  const completedCount = steps.filter(step => step.completed).length;
  const progress = (completedCount / totalSteps) * 100;

  const handleStepAction = (step: any) => {
    if (step.url.startsWith('http')) {
      window.open(step.url, '_blank');
    } else {
      window.open(step.url, '_blank');
    }
    
    if (!step.completed && !step.automated) {
      const newCompleted = new Set(completedSteps);
      newCompleted.add(step.id);
      setCompletedSteps(newCompleted);
    }
  };

  const markStepComplete = (stepId: number) => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(stepId);
    setCompletedSteps(newCompleted);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Play className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl text-blue-900">Outreach Integration Quick Start</CardTitle>
              <CardDescription className="text-blue-700">
                Get up and running with automated call syncing in just 4 steps
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">Setup Progress</span>
              <span className="text-sm text-blue-600">{completedCount}/{totalSteps} completed</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {progress === 100 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  🎉 <strong>Setup Complete!</strong> Your Outreach integration is ready to use. 
                  New recordings will automatically sync to your prospects.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card 
            key={step.id}
            className={`transition-all duration-200 ${
              step.completed 
                ? 'border-green-200 bg-green-50/50' 
                : index === completedCount 
                ? 'border-blue-200 bg-blue-50/50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Step Number/Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  step.completed 
                    ? 'bg-green-100 text-green-600' 
                    : index === completedCount 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="font-semibold">{step.id}</span>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                        {step.icon}
                        {step.title}
                        {step.completed && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Complete
                          </Badge>
                        )}
                        {step.automated && (
                          <Badge variant="outline" className="text-xs">
                            Auto
                          </Badge>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {step.description}
                      </p>
                      
                      {/* Step-specific content */}
                      {step.id === 1 && !step.completed && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                          <strong>Required permissions:</strong> Read prospects, Create activities, Update records
                        </div>
                      )}
                      
                      {step.id === 3 && (
                        <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded border border-purple-200">
                          <strong>Tip:</strong> Make sure the recording includes participant email addresses for automatic prospect matching
                        </div>
                      )}
                    </div>
                    
                    {/* Action Button */}
                    <div className="flex-shrink-0">
                      {step.completed ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Done</span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleStepAction(step)}
                          variant={index === completedCount ? "default" : "outline"}
                          size="sm"
                          className={index === completedCount ? "shadow-md" : ""}
                        >
                          {step.action}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Benefits Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            What You'll Get
          </CardTitle>
          <CardDescription>
            Once setup is complete, here's what the integration will do for you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Save Time</h3>
              <p className="text-sm text-gray-600">
                Eliminate 10-15 minutes of manual note-taking per call
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Automatic Sync</h3>
              <p className="text-sm text-gray-600">
                Recordings automatically create detailed activity records
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Better Insights</h3>
              <p className="text-sm text-gray-600">
                AI-generated summaries and coaching feedback included
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      {progress === 100 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">🚀 You're All Set!</CardTitle>
            <CardDescription className="text-green-700">
              Your Outreach integration is configured and ready to use
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-green-800 mb-2">What happens next:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• New recordings will automatically sync</li>
                  <li>• Activities appear in Outreach within minutes</li>
                  <li>• AI insights included in activity notes</li>
                  <li>• Coaching scores added to prospect records</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-green-800 mb-2">Useful links:</h4>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('/help/outreach-integration', '_blank')}
                    className="w-full justify-start"
                  >
                    📚 Complete Documentation
                    <ArrowRight className="h-3 w-3 ml-auto" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('/integrations/outreach/test', '_blank')}
                    className="w-full justify-start"
                  >
                    🧪 Test Integration
                    <ArrowRight className="h-3 w-3 ml-auto" />
                  </Button>
                </div>
              </div>
            </div>
            
            {onComplete && (
              <div className="pt-4 border-t border-green-200">
                <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">
                  Continue to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}