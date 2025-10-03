import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Target,
  Star,
  Users,
  Clock,
  Shield,
  Heart,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';
import { useECIFrameworkAnalytics } from '@/hooks/useECIFrameworkAnalytics';
import type { Recording } from '@/types/recording';

interface ECIAnalyticsDashboardProps {
  userId: string;
  recordings?: Recording[];
}

export default function ECIAnalyticsDashboard({ userId, recordings = [] }: ECIAnalyticsDashboardProps) {
  const [selectedFramework, setSelectedFramework] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Use the ECI framework analytics hook
  const {
    overviewStats,
    sectionPerformance,
    managerReviewQueue,
    teamPerformance,
    trendData,
    loading,
    error
  } = useECIFrameworkAnalytics(recordings, timeRange);

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
              <p>Error loading ECI analytics: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supportFrameworkOptions = [
    { value: 'all', label: 'All ECI Behaviors' },
    { value: 'CARE_FOR_CUSTOMER', label: 'Care for Customer (60%)' },
    { value: 'CALL_RESOLUTION', label: 'Call Resolution (30%)' },
    { value: 'CALL_FLOW', label: 'Call Flow (10%)' },
    { value: 'MANAGER_REVIEW', label: 'Manager Review Queue' }
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
          <h2 className="text-2xl font-bold">ECI Support Analytics</h2>
          <p className="text-gray-600">Track performance using ECI Quality Framework with manager review support</p>
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

      {/* ECI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Star className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ECI Score</p>
                <p className="text-2xl font-bold">{overviewStats.averageECIScore}</p>
                <p className="text-xs text-gray-500">Overall Performance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Eye className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Manager Reviews</p>
                <p className="text-2xl font-bold">{overviewStats.managerReviewRequired}</p>
                <p className="text-xs text-gray-500">Need Attention</p>
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
                <p className="text-sm text-gray-600">Care Excellence</p>
                <p className="text-2xl font-bold">{overviewStats.careExcellenceRate}%</p>
                <p className="text-xs text-gray-500">Customer Care</p>
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
                <p className="text-sm text-gray-600">Escalation Risk</p>
                <p className="text-2xl font-bold">{overviewStats.escalationRate}%</p>
                <p className="text-xs text-gray-500">High Risk Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ECI Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="behaviors">ECI Behaviors</TabsTrigger>
          <TabsTrigger value="manager-review">Manager Review</TabsTrigger>
          <TabsTrigger value="team-performance">Team Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* ECI Section Performance */}
          <Card>
            <CardHeader>
              <CardTitle>ECI Section Performance</CardTitle>
              <p className="text-sm text-gray-600">Weighted performance across the three ECI sections</p>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectionPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#3b82f6" name="Performance Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ECI Performance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sectionPerformance.map((section, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <span className="text-sm font-medium">{section.name}</span>
                      <p className="text-xs text-gray-500">Weight: {section.weight}%</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={section.score >= 80 ? "default" : section.score >= 60 ? "secondary" : "outline"}>
                        {section.score}%
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {section.yesCount}Y / {section.noCount}N / {section.uncertainCount}U
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analytics Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium">Total Recordings Analyzed</span>
                  <Badge variant="default">{overviewStats.totalAnalyzed}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium">Manager Reviews Required</span>
                  <Badge variant="secondary">{overviewStats.managerReviewRequired}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium">High Escalation Risk</span>
                  <Badge variant="outline">{overviewStats.escalationRate}%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Call Flow Compliance</span>
                  <Badge variant="default">{overviewStats.callFlowComplianceRate}%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="behaviors" className="space-y-6">
          {/* ECI Behavior Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {sectionPerformance.map((section, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    {section.name}
                    <Badge variant={section.score >= 80 ? "default" : section.score >= 60 ? "secondary" : "outline"}>
                      {section.score}%
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-gray-600">Weight: {section.weight}% of overall score</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={[
                              { name: 'YES', value: section.yesCount, fill: '#10b981' },
                              { name: 'NO', value: section.noCount, fill: '#ef4444' },
                              { name: 'UNCERTAIN', value: section.uncertainCount, fill: '#f59e0b' }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={50}
                            dataKey="value"
                          />
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <div className="w-3 h-3 bg-green-500 rounded mx-auto mb-1"></div>
                        <span>YES: {section.yesCount}</span>
                      </div>
                      <div>
                        <div className="w-3 h-3 bg-red-500 rounded mx-auto mb-1"></div>
                        <span>NO: {section.noCount}</span>
                      </div>
                      <div>
                        <div className="w-3 h-3 bg-yellow-500 rounded mx-auto mb-1"></div>
                        <span>UNCERTAIN: {section.uncertainCount}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="manager-review" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manager Review Queue</CardTitle>
              <p className="text-sm text-gray-600">Recordings with UNCERTAIN ratings that need manager attention</p>
            </CardHeader>
            <CardContent>
              {managerReviewQueue.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recordings require manager review at this time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {managerReviewQueue.slice(0, 10).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-gray-600">{item.agentName}</p>
                        <p className="text-xs text-gray-500">
                          UNCERTAIN: {item.uncertainBehaviors.join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            item.priorityLevel === 'high' ? 'destructive' :
                            item.priorityLevel === 'medium' ? 'secondary' : 'outline'
                          }
                        >
                          {item.priorityLevel} Priority
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(item.analysisDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team-performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance Overview</CardTitle>
              <p className="text-sm text-gray-600">Individual agent performance using ECI framework</p>
            </CardHeader>
            <CardContent>
              {teamPerformance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No team performance data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamPerformance.map((agent, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{agent.agentName}</h4>
                        <p className="text-sm text-gray-600">
                          {agent.recordingsCount} recordings analyzed
                        </p>
                        <div className="flex gap-4 mt-2">
                          <span className="text-xs text-green-600">
                            Strength: {agent.strengthArea}
                          </span>
                          <span className="text-xs text-orange-600">
                            Focus: {agent.improvementArea}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{agent.averageScore}</div>
                        <p className="text-xs text-gray-500">ECI Score</p>
                        {agent.managerReviewCount > 0 && (
                          <Badge variant="secondary" className="mt-1">
                            {agent.managerReviewCount} Reviews
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}