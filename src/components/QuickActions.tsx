import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Trash2, Activity, Download, Settings, RefreshCw, FileSearch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface QuickActionItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  variant: 'default' | 'destructive' | 'outline' | 'ghost';
  action: () => Promise<void> | void;
}

export function QuickActions() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const withFeedback = (id: string, handler: () => Promise<void>) => async () => {
    try {
      setLoadingAction(id);
      await handler();
    } catch (error) {
      console.error(`Quick action ${id} failed:`, error);
      toast({
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const actions: QuickActionItem[] = [
    {
      id: 'navigate-add-user',
      label: 'Invite User',
      description: 'Open the guided user creation flow',
      icon: UserPlus,
      variant: 'default',
      action: () => navigate('/admin/create-users'),
    },
    {
      id: 'cleanup-data',
      label: 'Cleanup Data',
      description: 'Remove audit and metric data older than 90 days',
      icon: Trash2,
      variant: 'destructive',
      action: withFeedback('cleanup-data', async () => {
        const { data, error } = await supabase.rpc('cleanup_old_data', {
          p_days_to_keep: 90,
        });

        if (error) throw error;

        toast({
          title: 'Cleanup started',
          description:
            data?.message || 'Legacy data cleanup has been triggered. This runs in the background.',
        });
      }),
    },
    {
      id: 'health-check',
      label: 'Health Check',
      description: 'Run the latest integration heartbeat',
      icon: Activity,
      variant: 'outline',
      action: withFeedback('health-check', async () => {
        const { data, error } = await supabase.rpc('get_system_health_metrics');
        if (error) throw error;
        toast({
          title: 'Health check complete',
          description: `Status: ${data?.healthScore ?? data?.health_score ?? 'unknown'} | Error rate: ${
            data?.errorRate ?? data?.error_rate ?? 0
          }%`,
        });
      }),
    },
    {
      id: 'export-audit',
      label: 'Export Audit Logs',
      description: 'Generate audit log export for the last 30 days',
      icon: Download,
      variant: 'outline',
      action: withFeedback('export-audit', async () => {
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 30);

        const { data, error } = await supabase.rpc('export_admin_data', {
          p_data_type: 'audit_logs',
          p_format: 'json',
          p_date_from: dateFrom.toISOString(),
          p_date_to: new Date().toISOString(),
        });

        if (error) throw error;

        toast({
          title: 'Export ready',
          description:
            data?.download_url || 'Audit export generated. Check the Audit page for download links.',
        });
      }),
    },
    {
      id: 'view-audit',
      label: 'Review Audits',
      description: 'Open the full audit log dashboard',
      icon: FileSearch,
      variant: 'ghost',
      action: () => navigate('/admin/audit'),
    },
    {
      id: 'open-settings',
      label: 'Admin Settings',
      description: 'Manage privacy and governance configuration',
      icon: Settings,
      variant: 'ghost',
      action: () => navigate('/admin/privacy'),
    },
  ];

  return (
    <Card className="bg-white shadow-sm rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-5 w-5 text-eci-gray-400" />
        <h3 className="text-body font-semibold text-eci-gray-900">Quick Actions</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const isLoading = loadingAction === action.id;

          return (
            <Button
              key={action.id}
              variant={action.variant}
              size="sm"
              onClick={action.action}
              className="flex items-center gap-2 justify-start h-auto p-3 text-left"
              title={action.description}
              disabled={isLoading}
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${isLoading ? 'animate-pulse' : ''}`} />
              <span className="text-caption font-medium">{action.label}</span>
            </Button>
          );
        })}
      </div>
      
      <div className="mt-4 pt-3 border-t border-eci-gray-200">
        <p className="text-caption text-eci-gray-600">
          Need help? Visit the{' '}
          <button
            className="text-eci-red hover:text-eci-red-dark font-medium"
            onClick={() => window.open('/help', '_blank', 'noopener')}
          >
            administrator guide
          </button>
        </p>
      </div>
    </Card>
  );
}
