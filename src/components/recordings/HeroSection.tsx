import React from 'react';
import { FileAudio, Clock, Sparkles, TrendingUp } from 'lucide-react';
import MetricCard from './MetricCard';
import QuickActions from './QuickActions';
import { useRecordingMetrics } from '@/hooks/useRecordingMetrics';
import { RecordingListItem } from '@/hooks/useRecordings';

interface HeroSectionProps {
  recordings: RecordingListItem[];
  isLoading?: boolean;
}

export default function HeroSection({ recordings, isLoading }: HeroSectionProps) {
  const metrics = useRecordingMetrics(recordings);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5" />
        <div className="relative px-6 py-12">
          <div className="max-w-7xl mx-auto">
            {/* Loading skeleton */}
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                    <div className="h-8 bg-gray-200 rounded w-1/3" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5" />
      
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full -translate-x-48 -translate-y-48 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-indigo-200/20 to-pink-200/20 rounded-full translate-x-48 translate-y-48 blur-3xl" />
      
      <div className="relative px-6 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
              Outreach Recordings
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              AI-powered insights and analytics from your call recordings
            </p>
            <QuickActions className="justify-center" />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Recordings"
              value={metrics.totalRecordings}
              icon={FileAudio}
              color="blue"
              trend={{
                value: 12,
                isPositive: true
              }}
            />
            <MetricCard
              title="Total Duration"
              value={metrics.totalDuration}
              icon={Clock}
              color="green"
              trend={{
                value: 8,
                isPositive: true
              }}
            />
            <MetricCard
              title="AI Insights"
              value={metrics.aiInsights}
              icon={Sparkles}
              color="purple"
              trend={{
                value: 24,
                isPositive: true
              }}
            />
            <MetricCard
              title="Success Rate"
              value={`${metrics.successRate}%`}
              icon={TrendingUp}
              color="orange"
              trend={{
                value: 3,
                isPositive: true
              }}
            />
          </div>

          {/* Additional Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-sm text-gray-600 uppercase tracking-wider mb-1">Time Saved</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.timeSaved}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-sm text-gray-600 uppercase tracking-wider mb-1">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.averageDuration}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-sm text-gray-600 uppercase tracking-wider mb-1">Processing</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.processingRecordings}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}