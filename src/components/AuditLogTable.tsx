
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Activity, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuditLogEntry {
  id: string;
  created_at: string;
  user_email: string | null;
  action: string | null;
  resource_type: string | null;
  resource_id: string | null;
  severity: 'info' | 'warning' | 'critical';
}

export function AuditLogTable() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAuditLogs = async () => {
      try {
        setLoading(true);
        const { data, error: queryError } = await supabase
          .from('audit_log_entries')
          .select('id, created_at, user_email, action, resource_type, resource_id, severity')
          .order('created_at', { ascending: false })
          .limit(8);

        if (queryError) {
          throw queryError;
        }

        if (!isMounted) return;
        setEntries(data as AuditLogEntry[]);
        setError(null);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
        if (!isMounted) return;
        setEntries([]);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAuditLogs();

    return () => {
      isMounted = false;
    };
  }, []);

  const getSeverityBadge = (severity: string) => {
    const variants = {
      info: 'bg-eci-teal/10 text-eci-teal-dark',
      warning: 'bg-orange-100 text-orange-800',
      critical: 'bg-eci-red/10 text-eci-red-dark',
    };
    return <Badge className={variants[severity as keyof typeof variants]}>{severity}</Badge>;
  };

  return (
    <Card className="bg-white shadow-sm rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-eci-gray-400" />
          <h3 className="text-body font-semibold text-eci-gray-900">Recent Audit Events</h3>
        </div>
        <button
          onClick={() => navigate('/admin/audit')}
          className="text-caption text-eci-red hover:text-eci-red-dark"
        >
          View audit log →
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-eci-red-light bg-eci-red/10 px-3 py-2 text-caption text-eci-red-dark">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="flex items-start gap-3 rounded-lg border border-eci-gray-100 p-3">
              <div className="h-8 w-8 rounded-full bg-eci-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-eci-gray-100" />
                <div className="h-3 w-2/3 rounded bg-eci-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-eci-gray-200 bg-eci-gray-50 py-8 text-caption text-eci-gray-600">
          <AlertTriangle className="h-6 w-6 text-eci-gray-400" />
          No audit activity recorded yet
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 rounded-lg border border-eci-gray-100 p-3 hover:bg-eci-gray-50"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body-small font-medium text-eci-gray-900">
                    {log.action || 'Unknown action'}
                  </span>
                  {getSeverityBadge(log.severity)}
                </div>
                <p className="mt-1 text-caption text-eci-gray-600">
                  {log.user_email || 'System'} → {log.resource_type ?? 'resource'}
                  {log.resource_id ? `/${log.resource_id}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 text-caption text-eci-gray-500">
                <Clock className="h-3 w-3" />
                {new Date(log.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
