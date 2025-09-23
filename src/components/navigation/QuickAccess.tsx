import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Link, TrendingUp, Users } from 'lucide-react';

export default function QuickAccess() {
  const navigate = useNavigate();

  const quickActions = [
    {
      id: 'outreach-setup',
      title: 'Connect Outreach',
      description: 'Set up Outreach.io integration',
      icon: Link,
      path: '/integrations/outreach/connect',
      color: 'bg-blue-50 text-blue-600'
    },
    {
      id: 'admin-integrations',
      title: 'Integration Status',
      description: 'Monitor all service connections',
      icon: Settings,
      path: '/admin/integrations',
      color: 'bg-purple-50 text-purple-600'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'View performance trends',
      icon: TrendingUp,
      path: '/analytics',
      color: 'bg-green-50 text-green-600'
    }
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Quick Access</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2 hover:shadow-md transition-shadow"
                onClick={() => navigate(action.path)}
              >
                <div className={`p-2 rounded-lg ${action.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-eci-gray-900">{action.title}</div>
                  <div className="text-sm text-eci-gray-600 mt-1">{action.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}