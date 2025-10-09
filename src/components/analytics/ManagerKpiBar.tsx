import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Phone, Users, Target, Star } from 'lucide-react';

interface ManagerKpis {
  totalCalls: number;
  averageScore: number;
  topPerformer: {
    id: string;
    name: string;
    score: number;
  } | null;
  employeeCount: number;
}

interface ManagerKpiBarProps {
  kpis: ManagerKpis;
}

export function ManagerKpiBar({ kpis }: ManagerKpiBarProps) {
  const kpiCards = [
    {
      key: 'totalCalls',
      label: 'Total Calls',
      value: kpis.totalCalls.toLocaleString(),
      icon: Phone,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      key: 'averageScore',
      label: 'Average Score',
      value: kpis.averageScore.toFixed(1),
      icon: Target,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      suffix: '/5.0',
    },
    {
      key: 'employeeCount',
      label: 'Active Employees',
      value: kpis.employeeCount.toString(),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      key: 'topPerformer',
      label: 'Top Performer',
      value: kpis.topPerformer?.name || 'N/A',
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      subtitle: kpis.topPerformer ? `${kpis.topPerformer.score.toFixed(1)}/5.0` : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpiCards.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.key} className="border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{kpi.label}</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-semibold text-gray-900">
                      {kpi.value}
                    </p>
                    {kpi.suffix && (
                      <span className="text-sm text-gray-500">{kpi.suffix}</span>
                    )}
                  </div>
                  {kpi.subtitle && (
                    <p className="text-sm text-gray-500">{kpi.subtitle}</p>
                  )}
                </div>
                <div className={`rounded-full p-3 ${kpi.bgColor}`}>
                  <Icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}