import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Target,
  BarChart3,
  Users,
  TrendingUp,
  Database,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import FeedbackSystemTest from '@/components/coach/FeedbackSystemTest';
import FeedbackAnalyticsDashboard from '@/components/analytics/FeedbackAnalyticsDashboard';
import FeedbackSystemDemo from '@/components/coach/FeedbackSystemDemo';

const FeedbackSystemTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Manager Feedback System Test
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Test the new manager feedback features and AI calibration system
          </p>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900">Database Schema</h3>
                  <p className="text-sm text-blue-700">Manager feedback tables</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">AI Calibration</h3>
                  <p className="text-sm text-green-700">Real-time constraint updates</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-purple-900">Analytics</h3>
                  <p className="text-sm text-purple-700">AI vs Manager alignment</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              New Features Implemented
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Manager Feedback System</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    "Provide Feedback" button on AI evaluations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Individual criteria score adjustment (0-4 scale)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Coaching notes correction
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Reason for changes dropdown
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Confidence level selection
                  </li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">AI Calibration System</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Real-time constraint updates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    High-variance score detection
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Manager validation workflow
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Analytics dashboard
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Comprehensive testing suite
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Demo */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Interactive Demo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FeedbackSystemDemo />
          </CardContent>
        </Card>

        {/* Test Suite */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              System Test Suite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FeedbackSystemTest />
          </CardContent>
        </Card>

        {/* Analytics Dashboard Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Analytics Dashboard Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FeedbackAnalyticsDashboard />
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Testing Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-700">
            <div className="space-y-3">
              <p><strong>To test the manager feedback system:</strong></p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Navigate to any recording with BDR analysis</li>
                <li>Look for the "Provide Feedback" button on AI-generated evaluations</li>
                <li>Click the button to open the manager feedback modal</li>
                <li>Adjust scores, correct notes, and select a reason for changes</li>
                <li>Submit the feedback to see real-time constraint updates</li>
              </ol>
              <p className="mt-4"><strong>Note:</strong> The database migrations need to be applied first for full functionality.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeedbackSystemTestPage;
