
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, BarChart3, PieChart, Target, Star, Users, Clock, Shield, Heart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadialBarChart, RadialBar, Cell, PieChart as RechartsPieChart, Pie } from 'recharts';
import { useFrameworkAnalytics } from '@/hooks/useFrameworkAnalytics';
import { useCoachingInsights } from '@/hooks/useCoachingInsights';
import { useSupportMode } from '@/contexts/SupportContext';
import { useSupportFrameworkAnalytics } from '@/hooks/useSupportFrameworkAnalytics';
import BANTAnalysisCard from './BANTAnalysisCard';
import MEDDICAnalysisCard from './MEDDICAnalysisCard';
import type { Recording } from '@/types/recording';

interface FrameworkAnalyticsDashboardProps {
  userId: string;
  recordings?: Recording[];
}

export default function FrameworkAnalyticsDashboard({ userId, recordings = [] }: FrameworkAnalyticsDashboardProps) {
  const supportMode = useSupportMode();
  
  // Return appropriate component based on mode
  if (supportMode.supportMode) {
    return <SupportFrameworkAnalyticsDashboard userId={userId} recordings={recordings} />;
  } else {
    return <SalesFrameworkAnalyticsDashboard userId={userId} />;
  }
}

// Sales Framework Analytics Component (existing functionality)
function SalesFrameworkAnalyticsDashboard({ userId }: FrameworkAnalyticsDashboardProps) {
  const [selectedFramework, setSelectedFramework] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('30d');
  
  const { trends, comparisons, analyses, loading, error } = useFrameworkAnalytics();
  const { insights, stats } = useCoachingInsights();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading framework analytics: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const frameworkOptions = [
    { value: 'all', label: 'All Frameworks' },
    { value: 'BANT', label: 'BANT' },
    { value: 'MEDDIC', label: 'MEDDIC' },
    { value: 'SPICED', label: 'SPICED' },
    { value: 'SPIN', label: 'SPIN' }
  ];

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' }
  ];

  // Mock trend data for charts
  const trendData = trends.map(trend => ({
    date: new Date(trend.date).toLocaleDateString(),
    score: trend.score,
    framework: trend.frameworkType,
    calls: trend.callCount
  }));

  const comparisonData = comparisons.map(comp => ({
    framework: comp.framework,
    score: comp.score,
    calls: comp.callCount,
    successRate: Math.round(comp.successRate * 100)
  }));

  const strengthInsights = insights.filter(insight => insight.type === 'strength');
  const improvementInsights = insights.filter(insight => insight.type === 'improvement');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sales Framework Analytics</h2>
          <p className="text-gray-600">Track your sales methodology performance</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedFramework} onValueChange={setSelectedFramework}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {frameworkOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeRangeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-bold">{stats.averageScore.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Strengths</p>
                <p className="text-2xl font-bold">{strengthInsights.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Improvements</p>
                <p className="text-2xl font-bold">{improvementInsights.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <PieChart className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Insights</p>
                <p className="text-2xl font-bold">{stats.totalInsights}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bant">BANT Analysis</TabsTrigger>
          <TabsTrigger value="meddic">MEDDIC Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Framework Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="framework" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Framework Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comparisons.map((framework, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{framework.framework}</CardTitle>
                    <Badge variant={framework.score >= 80 ? "default" : framework.score >= 60 ? "secondary" : "outline"}>
                      {framework.score}/100
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Calls Analyzed</span>
                      <span className="font-medium">{framework.callCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Success Rate</span>
                      <span className="font-medium">{Math.round(framework.successRate * 100)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Avg Improvement</span>
                      <span className="font-medium text-green-600">
                        +{Math.round(framework.averageImprovement * 100)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bant">
          <BANTAnalysisCard />
        </TabsContent>

        <TabsContent value="meddic">
          <MEDDICAnalysisCard />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Support Framework Analytics Component
function SupportFrameworkAnalyticsDashboard({ userId, recordings = [] }: FrameworkAnalyticsDashboardProps) {
  const [selectedFramework, setSelectedFramework] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  
  // Use the real-time support framework analytics hook
  const {
    overviewStats,
    servqualData,
    journeyStageData,
    resolutionMetrics,
    trendData,
    servqualDimensions,
    journeyStages,
    resolutionCategories,
    loading,
    error
  } = useSupportFrameworkAnalytics(recordings, timeRange);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading support framework analytics: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supportFrameworkOptions = [
    { value: 'all', label: 'All Support Frameworks' },
    { value: 'SERVQUAL', label: 'SERVQUAL' },
    { value: 'CUSTOMER_JOURNEY', label: 'Customer Journey' },
    { value: 'SUPPORT_QUALITY', label: 'Support Quality' },
    { value: 'RESOLUTION_FRAMEWORK', label: 'Resolution Framework' }
  ];

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' }
  ];


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Support Framework Analytics</h2>
          <p className="text-gray-600">Track your customer service framework performance</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedFramework} onValueChange={setSelectedFramework}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supportFrameworkOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeRangeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Star className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">SERVQUAL Score</p>
                <p className="text-2xl font-bold">{overviewStats.averageServqual}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Heart className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Customer Satisfaction</p>
                <p className="text-2xl font-bold">{overviewStats.customerSatisfaction}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Target className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Resolution Rate</p>
                <p className="text-2xl font-bold">{overviewStats.resolutionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Escalation Rate</p>
                <p className="text-2xl font-bold">{overviewStats.escalationRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="servqual">SERVQUAL Analysis</TabsTrigger>
          <TabsTrigger value="journey">Customer Journey</TabsTrigger>
          <TabsTrigger value="resolution">Resolution Framework</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Framework Performance Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Support Framework Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={servqualData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dimension" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#3b82f6" name="Current Score" />
                    <Bar dataKey="target" fill="#e5e7eb" name="Target" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Quality Strengths</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Empathy & Understanding</span>
                  <Badge variant="default">Excellent</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Problem Resolution Speed</span>
                  <Badge variant="default">Above Target</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Technical Knowledge</span>
                  <Badge variant="default">Strong</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Areas for Improvement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium">Response Time Consistency</span>
                  <Badge variant="secondary">Needs Focus</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="text-sm font-medium">Proactive Communication</span>
                  <Badge variant="outline">Moderate</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium">Complex Issue Handling</span>
                  <Badge variant="secondary">Developing</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="servqual">
          <SERVQUALAnalysisCard servqualDimensions={servqualDimensions} />
        </TabsContent>

        <TabsContent value="journey">
          <CustomerJourneyAnalysisCard journeyStages={journeyStages} />
        </TabsContent>

        <TabsContent value="resolution">
          <ResolutionFrameworkAnalysisCard resolutionCategories={resolutionCategories} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Support Framework Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[75, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="servqual" stroke="#3b82f6" strokeWidth={2} name="SERVQUAL" />
                    <Line type="monotone" dataKey="satisfaction" stroke="#10b981" strokeWidth={2} name="Satisfaction" />
                    <Line type="monotone" dataKey="resolution" stroke="#f59e0b" strokeWidth={2} name="Resolution" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// SERVQUAL Analysis Card Component
interface SERVQUALAnalysisCardProps {
  servqualDimensions: Array<{
    name: string;
    score: number;
    description: string;
    strengths: string[];
    improvements: string[];
  }>;
}

function SERVQUALAnalysisCard({ servqualDimensions }: SERVQUALAnalysisCardProps) {

  const overallServqualScore = Math.round(
    servqualDimensions.reduce((sum, dim) => sum + dim.score, 0) / servqualDimensions.length
  );

  return (
    <div className="space-y-6">
      {/* Overall SERVQUAL Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-blue-600" />
            SERVQUAL Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-600">{overallServqualScore}/100</p>
                <p className="text-sm text-gray-600">Overall SERVQUAL Score</p>
              </div>
              <div className="text-right">
                <Badge variant={overallServqualScore >= 90 ? "default" : overallServqualScore >= 75 ? "secondary" : "destructive"}>
                  {overallServqualScore >= 90 ? "Excellent" : overallServqualScore >= 75 ? "Good" : "Needs Improvement"}
                </Badge>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${overallServqualScore}%` }}></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SERVQUAL Dimensions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {servqualDimensions.map((dimension, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{dimension.name}</CardTitle>
                <Badge variant={dimension.score >= 90 ? "default" : dimension.score >= 75 ? "secondary" : "outline"}>
                  {dimension.score}/100
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{dimension.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${dimension.score}%` }}></div>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <h5 className="font-medium text-green-700 mb-2 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Strengths
                  </h5>
                  <ul className="space-y-1">
                    {dimension.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-gray-700">• {strength}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-medium text-orange-700 mb-2 flex items-center gap-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    Improvements
                  </h5>
                  <ul className="space-y-1">
                    {dimension.improvements.map((improvement, idx) => (
                      <li key={idx} className="text-sm text-gray-700">• {improvement}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Customer Journey Analysis Card Component
interface CustomerJourneyAnalysisCardProps {
  journeyStages: Array<{
    name: string;
    satisfaction: number;
    efficiency: number;
    avgDuration: string;
    keyMetrics: string[];
    insights: string[];
  }>;
}

function CustomerJourneyAnalysisCard({ journeyStages }: CustomerJourneyAnalysisCardProps) {

  return (
    <div className="space-y-6">
      {/* Journey Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Customer Journey Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {journeyStages.map((stage, index) => (
              <div key={index} className="text-center">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-full border-4 border-indigo-200 flex items-center justify-center bg-indigo-50">
                    <span className="text-lg font-bold text-indigo-600">{index + 1}</span>
                  </div>
                  {index < journeyStages.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-indigo-200 transform -translate-y-1/2"></div>
                  )}
                </div>
                <h4 className="text-sm font-medium text-gray-900">{stage.name}</h4>
                <p className="text-xs text-gray-500">{stage.avgDuration}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stage Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {journeyStages.map((stage, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                  {index + 1}
                </div>
                {stage.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="text-lg font-bold text-blue-600">{stage.satisfaction}%</div>
                  <div className="text-xs text-gray-600">Satisfaction</div>
                </div>
                <div className="text-center p-2 bg-emerald-50 rounded">
                  <div className="text-lg font-bold text-emerald-600">{stage.efficiency}%</div>
                  <div className="text-xs text-gray-600">Efficiency</div>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium text-gray-700 mb-2">Key Metrics</h5>
                <ul className="space-y-1">
                  {stage.keyMetrics.map((metric, idx) => (
                    <li key={idx} className="text-sm text-gray-600">• {metric}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h5 className="font-medium text-gray-700 mb-2">Insights</h5>
                <ul className="space-y-1">
                  {stage.insights.map((insight, idx) => (
                    <li key={idx} className="text-sm text-gray-600">• {insight}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Resolution Framework Analysis Card Component
interface ResolutionFrameworkAnalysisCardProps {
  resolutionCategories: Array<{
    category: string;
    resolution: number;
    avgTime: number;
    satisfaction: number;
    volume: number;
    complexity: 'simple' | 'medium' | 'complex';
    topIssues: string[];
  }>;
}

function ResolutionFrameworkAnalysisCard({ resolutionCategories }: ResolutionFrameworkAnalysisCardProps) {

  const overallMetrics = {
    totalResolutions: resolutionCategories.reduce((sum, cat) => sum + cat.volume, 0),
    avgResolutionRate: Math.round(resolutionCategories.reduce((sum, cat) => sum + cat.resolution, 0) / resolutionCategories.length),
    avgSatisfaction: Math.round(resolutionCategories.reduce((sum, cat) => sum + cat.satisfaction, 0) / resolutionCategories.length),
    avgTime: Math.round(resolutionCategories.reduce((sum, cat) => sum + cat.avgTime, 0) / resolutionCategories.length)
  };

  return (
    <div className="space-y-6">
      {/* Resolution Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600" />
            Resolution Framework Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">{overallMetrics.totalResolutions}</div>
              <div className="text-sm text-gray-600">Total Cases</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{overallMetrics.avgResolutionRate}%</div>
              <div className="text-sm text-gray-600">Avg Resolution Rate</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{overallMetrics.avgSatisfaction}%</div>
              <div className="text-sm text-gray-600">Avg Satisfaction</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{overallMetrics.avgTime}m</div>
              <div className="text-sm text-gray-600">Avg Resolution Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {resolutionCategories.map((category, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{category.category}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={category.complexity === 'simple' ? 'default' : category.complexity === 'medium' ? 'secondary' : 'destructive'}>
                    {category.complexity.charAt(0).toUpperCase() + category.complexity.slice(1)}
                  </Badge>
                  <Badge variant="outline">{category.volume} cases</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="text-lg font-bold text-green-600">{category.resolution}%</div>
                  <div className="text-xs text-gray-600">Resolution</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="text-lg font-bold text-blue-600">{category.avgTime}m</div>
                  <div className="text-xs text-gray-600">Avg Time</div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="text-lg font-bold text-purple-600">{category.satisfaction}%</div>
                  <div className="text-xs text-gray-600">Satisfaction</div>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium text-gray-700 mb-2">Top Issues</h5>
                <ul className="space-y-1">
                  {category.topIssues.map((issue, idx) => (
                    <li key={idx} className="text-sm text-gray-600">• {issue}</li>
                  ))}
                </ul>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${category.resolution}%` }}></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
