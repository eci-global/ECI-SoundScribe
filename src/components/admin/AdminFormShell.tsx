import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface AdminFormShellProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isSubmitting?: boolean;
  error?: string | null;
  success?: string | null;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function AdminFormShell({
  title,
  description,
  icon: Icon,
  isSubmitting,
  error,
  success,
  actions,
  children,
}: AdminFormShellProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5" />}
          <div>
            <CardTitle className="text-title text-eci-gray-900">{title}</CardTitle>
            {description && (
              <CardDescription className="text-body text-eci-gray-600">{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        {children}
      </CardContent>
      {actions && (
        <CardFooter className="flex justify-end gap-2">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {actions}
        </CardFooter>
      )}
    </Card>
  );
}

