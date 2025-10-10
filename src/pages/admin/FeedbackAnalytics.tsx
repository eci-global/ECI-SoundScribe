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
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-display text-eci-gray-900 mb-2">Manager Feedback Analytics</h1>
              <p className="text-body text-eci-gray-600">
                Monitor AI vs Manager scoring alignment and feedback trends
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
              <BarChart3 className="h-4 w-4 mr-1" />
              Analytics Dashboard
            </Badge>
          </div>
        </div>

        {/* Main Analytics Dashboard - now renders metrics internally */}
        <FeedbackAnalyticsDashboard />

        {/* Quick Actions */}
        <Card className="bg-white shadow-sm mt-6">
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
    </div>
  );
};

export default FeedbackAnalytics;
