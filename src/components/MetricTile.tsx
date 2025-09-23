import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricTileProps {
  title: string;
  value: string | number;
  subValue?: string;
  status: 'Healthy' | 'Warning' | 'Critical';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function MetricTile({ 
  title, 
  value, 
  subValue, 
  status, 
  trend, 
  trendValue,
  icon,
  className = '' 
}: MetricTileProps) {
  const getStatusColor = (status: string) => {
    const colors = {
      Healthy: 'bg-eci-teal/10 text-eci-teal-dark border border-eci-teal',
      Warning: 'bg-eci-red/10 text-eci-red-dark border border-eci-red-light',
      Critical: 'bg-brand-red text-white border border-brand-red',
    } as const;
    return colors[status as keyof typeof colors] || 'bg-eci-gray-100 text-eci-gray-800 border border-eci-gray-200';
  };

  const getTrendIcon = (trend?: string) => {
    if (trend === 'up') {
      return <TrendingUp className="h-4 w-4 text-eci-teal-dark" />;
    } else if (trend === 'down') {
      return <TrendingDown className="h-4 w-4 text-brand-red" />;
    }
    return <Minus className="h-4 w-4 text-eci-gray-600" />;
  };

  const getTrendColor = (trend?: string) => {
    if (trend === 'up') return 'text-eci-teal-dark';
    if (trend === 'down') return 'text-brand-red';
    return 'text-eci-gray-600';
  };

  return (
    <Card className={`bg-white shadow-sm rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        {icon && <div className="text-eci-gray-400">{icon}</div>}
        <Badge className={getStatusColor(status)}>
          {status}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-caption text-eci-gray-600 font-medium">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-display-large font-bold text-eci-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {subValue && (
            <span className="text-body text-eci-gray-600">{subValue}</span>
          )}
        </div>
        
        {(trend || trendValue) && (
          <div className="flex items-center gap-1">
            {getTrendIcon(trend)}
            <span className={`text-caption font-medium ${getTrendColor(trend)}`}>
              {trendValue}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
