import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target,
  MessageCircle,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import FeedbackAnalyticsDashboard from '@/components/analytics/FeedbackAnalyticsDashboard';

const FeedbackAnalytics: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manager Feedback Analytics</h1>
          <p className="text-gray-600 mt-2">
            Monitor AI vs Manager scoring alignment and feedback trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            <BarChart3 className="h-4 w-4 mr-1" />
            Analytics Dashboard
          </Badge>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Corrections</p>
                <p className="text-2xl font-bold text-blue-900">15</p>
                <p className="text-xs text-blue-700">Last 30 days</p>
              </div>
              <MessageCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">High Variance</p>
                <p className="text-2xl font-bold text-orange-900">3</p>
                <p className="text-xs text-orange-700">Requires attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Alignment Trend</p>
                <p className="text-2xl font-bold text-green-900">+12.5%</p>
                <p className="text-xs text-green-700">Improving</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Avg Variance</p>
                <p className="text-2xl font-bold text-purple-900">0.8</p>
                <p className="text-xs text-purple-700">Score difference</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Feedback Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FeedbackAnalyticsDashboard />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Export Analytics</h4>
              <p className="text-sm text-gray-600 mb-3">
                Download feedback analytics data for reporting
              </p>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Export Data →
              </button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">AI Calibration</h4>
              <p className="text-sm text-gray-600 mb-3">
                Review and update AI calibration constraints
              </p>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Manage Calibration →
              </button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Validation Queue</h4>
              <p className="text-sm text-gray-600 mb-3">
                Review high-variance scores requiring validation
              </p>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View Queue →
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackAnalytics;
