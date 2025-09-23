import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { TrendingUp, BarChart3, Target } from 'lucide-react';
import type { Recording } from '@/types/recording';
import { format, subDays, startOfDay } from 'date-fns';

interface PerformanceTrendsWidgetProps {
  recordings: Recording[];
  timeRange: '7d' | '30d' | '90d';
}

export function PerformanceTrendsWidget({ recordings, timeRange }: PerformanceTrendsWidgetProps) {
  // Generate trend data based on recordings
  const generateTrendData = () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const dayRecordings = recordings.filter(r => {
        const recordingDate = startOfDay(new Date(r.created_at));
        return recordingDate.getTime() === date.getTime();
      });

      // Calculate average score for the day
      const avgScore = dayRecordings.length > 0 
        ? dayRecordings
            .filter(r => r.coaching_evaluation?.overallScore)
            .reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / 
          dayRecordings.filter(r => r.coaching_evaluation?.overallScore).length
        : null;

      // Calculate framework-specific scores
      const bantScore = dayRecordings
        .filter(r => (r as any).primary_framework === 'BANT')
        .reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / 
        dayRecordings.filter(r => (r as any).primary_framework === 'BANT').length || null;

      const meddicScore = dayRecordings
        .filter(r => (r as any).primary_framework === 'MEDDIC')
        .reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / 
        dayRecordings.filter(r => (r as any).primary_framework === 'MEDDIC').length || null;

      const spicedScore = dayRecordings
        .filter(r => (r as any).primary_framework === 'SPICED')
        .reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / 
        dayRecordings.filter(r => (r as any).primary_framework === 'SPICED').length || null;

      data.push({
        date: format(date, timeRange === '7d' ? 'EEE' : 'MMM dd'),
        fullDate: date,
        score: avgScore ? Math.round(avgScore) : null,
        callCount: dayRecordings.length,
        bantScore: bantScore ? Math.round(bantScore) : null,
        meddicScore: meddicScore ? Math.round(meddicScore) : null,
        spicedScore: spicedScore ? Math.round(spicedScore) : null
      });
    }

    return data;
  };

  const trendData = generateTrendData();
  
  // Calculate overall metrics
  const totalCalls = recordings.length;
  const avgScore = recordings
    .filter(r => r.coaching_evaluation?.overallScore)
    .reduce((acc, r) => acc + (r.coaching_evaluation?.overallScore || 0), 0) / 
    recordings.filter(r => r.coaching_evaluation?.overallScore).length || 0;

  // Calculate trend direction
  const recentScores = trendData.filter(d => d.score !== null).slice(-3);
  const earlierScores = trendData.filter(d => d.score !== null).slice(0, 3);
  const recentAvg = recentScores.reduce((acc, d) => acc + (d.score || 0), 0) / recentScores.length || 0;
  const earlierAvg = earlierScores.reduce((acc, d) => acc + (d.score || 0), 0) / earlierScores.length || 0;
  const trendDirection = recentAvg > earlierAvg ? 'up' : recentAvg < earlierAvg ? 'down' : 'flat';
  const trendValue = Math.abs(recentAvg - earlierAvg);

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
              {entry.dataKey === 'callCount' ? ' calls' : '/10'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span>Performance Trends</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {trendDirection === 'up' && (
              <div className="flex items-center text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">+{trendValue.toFixed(1)}</span>
              </div>
            )}
            {trendDirection === 'down' && (
              <div className="flex items-center text-red-600">
                <TrendingUp className="w-4 h-4 mr-1 rotate-180" />
                <span className="text-sm font-medium">-{trendValue.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalCalls}</div>
            <div className="text-sm text-gray-600">Total Calls</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{avgScore.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Avg Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round((recordings.filter(r => r.status === 'completed').length / totalCalls) * 100) || 0}%
            </div>
            <div className="text-sm text-gray-600">Completion</div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                domain={[0, 10]}
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.1}
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Framework Breakdown */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Framework Performance
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Target className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-blue-600">
                {recordings.filter(r => (r as any).primary_framework === 'BANT').length}
              </div>
              <div className="text-xs text-gray-600">BANT Calls</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Target className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-purple-600">
                {recordings.filter(r => (r as any).primary_framework === 'MEDDIC').length}
              </div>
              <div className="text-xs text-gray-600">MEDDIC Calls</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <Target className="w-5 h-5 text-orange-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-orange-600">
                {recordings.filter(r => (r as any).primary_framework === 'SPICED').length}
              </div>
              <div className="text-xs text-gray-600">SPICED Calls</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}