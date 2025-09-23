import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminFormShell } from '@/components/admin/AdminFormShell';

interface UserCreationResult {
  email: string;
  status: 'created' | 'exists' | 'error';
  message?: string;
  error?: string;
  user_id?: string;
}

interface UserCreationResponse {
  success: boolean;
  message: string;
  results: UserCreationResult[];
  error?: string;
}

export default function UserCreator() {
  const [isCreating, setIsCreating] = useState(false);
  const [results, setResults] = useState<UserCreationResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createUsers = async () => {
    setIsCreating(true);
    setError(null);
    setResults(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('create-users', {
        method: 'POST',
      });

      if (functionError) throw functionError;

      const response = data as UserCreationResponse;
      if (response.success) setResults(response.results);
      else setError(response.error || 'Unknown error occurred');
    } catch (err) {
      console.error('Error creating users:', err);
      setError(err instanceof Error ? err.message : 'Failed to create users');
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'created':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'exists':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'created':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'exists':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <AdminFormShell
      title="Create Initial Users"
      description="Create the initial set of users for the SoundScribe application"
      icon={Users}
      isSubmitting={isCreating}
      error={error}
      actions={(
        <Button onClick={createUsers} disabled={isCreating} className="min-w-40">
          {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isCreating ? 'Creating Users...' : 'Create Users'}
        </Button>
      )}
    >
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <h3 className="font-semibold">Users to be created:</h3>
        <ul className="space-y-1 text-sm text-gray-600">
          <li> Brian Hildebrand (bhildebrand@ecisolutions.com)</li>
          <li> Test User (test@soundscribe.com)</li>
          <li> Daniel Koranteng (dkoranteng@ecisolutions.com) - Admin</li>
          <li> Normal User (normailuser@eci.com)</li>
        </ul>
      </div>

      {results && (
        <div className="mt-6 space-y-3">
          <h3 className="font-semibold">Creation Results:</h3>
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  <span className="font-medium">{result.email}</span>
                </div>
                <span className="text-sm capitalize">{result.status}</span>
              </div>
              {result.error && (
                <p className="text-sm mt-1 text-red-600">{result.error}</p>
              )}
              {result.message && (
                <p className="text-sm mt-1">{result.message}</p>
              )}
              {result.user_id && (
                <p className="text-xs mt-1 text-gray-500">ID: {result.user_id}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminFormShell>
  );
}

