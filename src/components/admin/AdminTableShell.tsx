import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface AdminTableShellProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function AdminTableShell({
  title,
  description,
  icon: Icon,
  loading,
  empty,
  emptyTitle,
  emptyDescription,
  actions,
  children,
}: AdminTableShellProps) {
  return (
    <Card className="border-eci-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex items-center justify-center w-10 h-10 bg-eci-blue/10 rounded-lg">
                <Icon className="w-5 h-5 text-eci-blue" strokeWidth={1.5} />
              </div>
            )}
            <div>
              <CardTitle className="text-title text-eci-gray-900">{title}</CardTitle>
              {description && (
                <CardDescription className="text-body text-eci-gray-600">{description}</CardDescription>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-eci-blue" strokeWidth={1.5} />
              <p className="text-body text-eci-gray-600">Loading...</p>
            </div>
          </div>
        ) : empty ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-eci-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {/* Decorative placeholder circle */}
              <div className="w-8 h-8 rounded-full bg-eci-gray-300" />
            </div>
            {emptyTitle && (
              <h3 className="text-body-large font-medium text-eci-gray-900 mb-2">{emptyTitle}</h3>
            )}
            {emptyDescription && (
              <p className="text-body text-eci-gray-600">{emptyDescription}</p>
            )}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

