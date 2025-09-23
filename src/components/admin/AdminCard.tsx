
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export default function AdminCard({ title, description, children, action, className = '' }: AdminCardProps) {
  return (
    <Card className={`bg-white border-eci-gray-200 shadow-eci-subtle ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-title text-eci-gray-900 mb-1">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="text-body text-eci-gray-600">
                {description}
              </CardDescription>
            )}
          </div>
          {action && (
            <div className="ml-4">
              {action}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
