import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  BarChart3, 
  Target,
  Award,
  MessageSquare,
  Calendar,
  Star,
  AlertCircle,
  CheckCircle,
  Download,
  Filter
} from 'lucide-react';
import { EmployeeService } from '@/services/employeeService';
import type { Team, Employee } from '@/types/employee';
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
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';

const EmployeeDashboard: React.FC = () => {
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [orgStats, setOrgStats] = useState<{ totalEmployees: number; averageScore: number; totalCalls: number; coachingSessions: number }>({ totalEmployees: 0, averageScore: 0, totalCalls: 0, coachingSessions: 0 });
  const [performanceTrend, setPerformanceTrend] = useState<Array<{ name: string; score: number; calls: number }>>([]);
  const [teamComparison, setTeamComparison] = useState<Array<{ name: string; averageScore: number; totalCalls: number; memberCount: number }>>([]);
  const [topPerformers, setTopPerformers] = useState<Array<{ employee: Employee; score: number; calls: number; improvement: number }>>([]);
  const [improvementAreas, setImprovementAreas] = useState<Array<{ area: string; count: number; trend: 'improving' | 'declining' | 'stable' }>>([]);

  useEffect(() => {
    loadDashboardData();
  }, [selectedTeam, timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const teamList = await EmployeeService.listTeams();
      setTeams(teamList);
      if (selectedTeam === 'all') {
        const [stats, trend, comparison, top, improvements] = await Promise.all([
          EmployeeService.getOrgStats(timeRange),
          EmployeeService.getOrgPerformanceTrend(timeRange),
          EmployeeService.getTeamComparison(timeRange),
          EmployeeService.getTopPerformers(timeRange, 5),
          EmployeeService.getCommonImprovementAreas(timeRange, 5),
        ]);
        setOrgStats(stats);
        setPerformanceTrend(trend.map(d => ({ name: d.date, score: d.score, calls: d.calls })));
        setTeamComparison(comparison);
        setTopPerformers(top);
        setImprovementAreas(improvements);
      } else {
        const report = await EmployeeService.getTeamPerformanceReport(selectedTeam);
        setOrgStats({
          totalEmployees: report.employees.length,
          averageScore: report.team_metrics.average_score,
          totalCalls: report.team_metrics.total_calls,
          coachingSessions: 0,
        });
        setPerformanceTrend([]);
        setTeamComparison([{ name: report.team.name, averageScore: report.team_metrics.average_score, totalCalls: report.team_metrics.total_calls, memberCount: report.employees.length }]);
        const top = report.individual_performance
          .sort((a, b) => b.performance_summary.current_score - a.performance_summary.current_score)
          .slice(0, 5)
          .map(ip => ({ employee: ip.employee, score: ip.performance_summary.current_score, calls: ip.performance_summary.total_calls, improvement: ip.performance_summary.score_trend }));
        setTopPerformers(top);
        setImprovementAreas(report.team_metrics.improvement_areas.map(area => ({ area, count: 0, trend: 'stable' as const })));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setTeams([]);
      setOrgStats({ totalEmployees: 0, averageScore: 0, totalCalls: 0, coachingSessions: 0 });
      setPerformanceTrend([]);
      setTeamComparison([]);
      setTopPerformers([]);
      setImprovementAreas([]);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employee Performance Dashboard</h1>
          <p className="text-gray-600">Track team performance and coaching effectiveness</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgStats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgStats.averageScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +0.3 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgStats.totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coaching Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgStats.coachingSessions}</div>
            <p className="text-xs text-muted-foreground">
              +8 this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="coaching">Coaching</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trend</CardTitle>
                <CardDescription>Average scores over time</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceTrend.length === 0 ? (
                  <div className="text-sm text-gray-500">No trend data for the selected period.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={performanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#2563eb" 
                        fill="#2563eb"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Team Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Team Performance Comparison</CardTitle>
                <CardDescription>Average scores by team</CardDescription>
              </CardHeader>
              <CardContent>
                {teamComparison.length === 0 ? (
                  <div className="text-sm text-gray-500">No team comparison data available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={teamComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Bar dataKey="averageScore" fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>Employees with highest scores this period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformers.length === 0 && (
                  <div className="text-sm text-gray-500">No top performers for the selected period.</div>
                )}
                {topPerformers.map((performer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium">{performer.employee.first_name} {performer.employee.last_name}</h4>
                        <p className="text-sm text-gray-600">{performer.calls} calls</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-lg font-semibold">{performer.score}</div>
                        <div className="flex items-center text-sm text-green-600">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +{performer.improvement}
                        </div>
                      </div>
                      <Award className="h-5 w-5 text-yellow-500" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
                <CardDescription>Distribution of employee scores</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={teamComparison.map(t => ({ name: t.name, value: Math.max(t.averageScore, 0) }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {teamComparison.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Improvement Areas */}
            <Card>
              <CardHeader>
                <CardTitle>Common Improvement Areas</CardTitle>
                <CardDescription>Areas where employees need the most help</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {improvementAreas.map((area, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">{area.area}</span>
                        <Badge variant="outline">{area.count} employees</Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        {area.trend === 'improving' && <TrendingUp className="h-4 w-4 text-green-500" />}
                        {area.trend === 'declining' && <TrendingDown className="h-4 w-4 text-red-500" />}
                        {area.trend === 'stable' && <div className="h-4 w-4 bg-gray-300 rounded-full" />}
                        <span className="text-xs text-gray-600 capitalize">{area.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Coaching Tab */}
        <TabsContent value="coaching" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Coaching Effectiveness</CardTitle>
                <CardDescription>Success rate of coaching sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">87%</div>
                  <p className="text-sm text-gray-600">Follow-up completion rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Coaching</CardTitle>
                <CardDescription>Employees currently in coaching</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">12</div>
                  <p className="text-sm text-gray-600">Active sessions</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manager Feedback</CardTitle>
                <CardDescription>Recent manager coaching notes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">24</div>
                  <p className="text-sm text-gray-600">This week</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coaching Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Coaching Trends</CardTitle>
              <CardDescription>Coaching session frequency and effectiveness</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="calls" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamComparison.map((team, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>{team.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Score</span>
                      <span className="font-semibold">{team.averageScore.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Calls</span>
                      <span className="font-semibold">{team.totalCalls}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Team Size</span>
                      <span className="font-semibold">{team.memberCount} members</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      View Team Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeDashboard;
