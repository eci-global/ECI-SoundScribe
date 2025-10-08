import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Users, ShieldAlert, BarChart3 } from 'lucide-react';
import { ManagerKpis } from '@/utils/managerAnalytics';

interface ManagerKpiBarProps {
  kpis: ManagerKpis;
}

const metricConfig = [
  {
    key: 'totalCalls' as const,
    label: 'Total calls',
    icon: BarChart3,
    emphasis: true,
  },
  {
    key: 'averageScore' as const,
    label: 'Avg score',
    icon: TrendingUp,
  },
  {
    key: 'coverageRate' as const,
    label: 'Team coverage',
    icon: Users,
  },
  {
    key: 'highRiskCalls' as const,
    label: 'High-risk calls',
    icon: ShieldAlert,
  },
] as const;

export function ManagerKpiBar({ kpis }: ManagerKpiBarProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metricConfig.map(({ key, label, icon: Icon, emphasis }) => {
        const value = kpis[key];
        const formattedValue = typeof value === 'number'
          ? key === 'averageScore'
            ? value?.toFixed(2)
            : key === 'coverageRate'
              ? `${value.toFixed(1)}%`
              : value
          : value ?? '--';

        return (
          <Card key={key} className="border-gray-200 bg-white shadow-sm">
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
                <span>{label}</span>
                <Icon className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {formattedValue}
              </div>
              {key === 'weekOverWeekChange' && typeof value === 'number' ? (
                <span className={`text-xs font-medium ${value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {value >= 0 ? '+' : ''}{value.toFixed(1)}% vs last week
                </span>
              ) : null}
              {key === 'totalCalls' ? (
                <span className="text-xs text-gray-500">{kpis.callVolumeLast7} in the last 7 days</span>
              ) : null}
              {key === 'coverageRate' ? (
                <span className="text-xs text-gray-500">{kpis.activeEmployees} active team members</span>
              ) : null}
              {key === 'highRiskCalls' ? (
                <span className="text-xs text-gray-500">Track coaching follow-up on these calls</span>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

