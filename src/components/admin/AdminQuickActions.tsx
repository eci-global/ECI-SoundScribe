
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Database, Settings, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminQuickActions() {
  const navigate = useNavigate();

  const quickActions = [
    {
      icon: Users,
      title: 'Create Initial Users',
      description: 'Set up the initial user accounts',
      action: () => navigate('/admin/create-users'),
      variant: 'default' as const
    },
    {
      icon: Database,
      title: 'System Health',
      description: 'Check system status and metrics',
      action: () => console.log('System health check'),
      variant: 'outline' as const
    },
    {
      icon: Settings,
      title: 'Configuration',
      description: 'Manage system settings',
      action: () => console.log('Configuration'),
      variant: 'outline' as const
    },
    {
      icon: Activity,
      title: 'Activity Logs',
      description: 'View recent system activity',
      action: () => console.log('Activity logs'),
      variant: 'outline' as const
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant={action.variant}
                className="h-auto p-4 flex flex-col items-start space-y-2"
                onClick={action.action}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{action.title}</span>
                </div>
                <span className="text-sm text-left opacity-70">
                  {action.description}
                </span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
