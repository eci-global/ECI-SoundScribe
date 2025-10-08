import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  Clock, 
  Target,
  MessageSquare,
  BarChart3,
  Users,
  Award,
  AlertCircle,
  CheckCircle,
  Star
} from 'lucide-react';
import { EmployeeService } from '@/services/employeeService';
import type { EmployeeDetailResponse, EmployeeRecording, ScoreTrend, ManagerCoachingNote } from '@/types/employee';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const EmployeeProfile: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [employeeData, setEmployeeData] = useState<EmployeeDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employeeId) {
      loadEmployeeData();
    }
  }, [employeeId]);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      const data = await EmployeeService.getEmployeeById(employeeId!);
      setEmployeeData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !employeeData) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Employee</h2>
        <p className="text-gray-600 mb-4">{error || 'Employee not found'}</p>
        <Button onClick={() => navigate('/employees')}>
          Back to Employees
        </Button>
      </div>
    );
  }

  const { employee, analytics, dashboard_data } = employeeData;
  const { performance_summary, recent_recordings, score_trends, coaching_history } = analytics;

  const getScoreTrendIcon = (trend: number) => {
    if (trend > 0.1) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < -0.1) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getScoreTrendText = (trend: number) => {
    if (trend > 0.1) return 'Improving';
    if (trend < -0.1) return 'Declining';
    return 'Stable';
  };

  const getScoreTrendColor = (trend: number) => {
    if (trend > 0.1) return 'text-green-600';
    if (trend < -0.1) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {employee.first_name} {employee.last_name}
          </h1>
          <p className="text-gray-600">{employee.role} • {employee.department}</p>
        </div>
        <Button onClick={() => navigate('/employees')}>
          Back to Employees
        </Button>
      </div>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance_summary.current_score.toFixed(1)}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              {getScoreTrendIcon(performance_summary.score_trend)}
              <span className={getScoreTrendColor(performance_summary.score_trend)}>
                {getScoreTrendText(performance_summary.score_trend)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance_summary.total_calls}</div>
            <p className="text-xs text-muted-foreground">
              Last: {new Date(performance_summary.last_evaluation_date).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coaching Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance_summary.coaching_notes_count}</div>
            <p className="text-xs text-muted-foreground">
              Active feedback sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Rank</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#3</div>
            <p className="text-xs text-muted-foreground">
              Out of 12 team members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recordings">Recordings</TabsTrigger>
          <TabsTrigger value="coaching">Coaching</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Score Progression</CardTitle>
                <CardDescription>Performance over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={score_trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Strengths and Improvements */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-green-500" />
                    <span>Top Strengths</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {performance_summary.recent_strengths.slice(0, 3).map((strength, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{strength}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-orange-500" />
                    <span>Improvement Areas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {performance_summary.recent_improvements.slice(0, 3).map((improvement, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">{improvement}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Recordings Tab */}
        <TabsContent value="recordings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Recordings</CardTitle>
              <CardDescription>All recordings where this employee participated</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recent_recordings.map((recording) => (
                  <div key={recording.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{recording.title}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(recording.created_at).toLocaleDateString()}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{Math.floor(recording.duration / 60)} min</span>
                        </span>
                        <Badge variant={recording.participation_type === 'primary' ? 'default' : 'secondary'}>
                          {recording.participation_type}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{recording.overall_score.toFixed(1)}</div>
                      <div className="text-sm text-gray-600">
                        {recording.talk_time_percentage.toFixed(1)}% talk time
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coaching Tab */}
        <TabsContent value="coaching" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Coaching History</CardTitle>
              <CardDescription>Manager feedback and coaching notes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {coaching_history.map((note) => (
                  <div key={note.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{note.title}</h4>
                      <Badge variant={note.priority === 'high' ? 'destructive' : note.priority === 'medium' ? 'default' : 'secondary'}>
                        {note.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{note.content}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                      <span>{new Date(note.created_at).toLocaleDateString()}</span>
                      <span>{note.note_type}</span>
                      <Badge variant={note.status === 'completed' ? 'default' : 'secondary'}>
                        {note.status}
                      </Badge>
                    </div>
                    {note.action_items && note.action_items.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700">Action Items:</p>
                        <ul className="text-xs text-gray-600 list-disc list-inside">
                          {note.action_items.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Average Score</span>
                      <span>{dashboard_data.performance_metrics.average_score.toFixed(1)}</span>
                    </div>
                    <Progress value={dashboard_data.performance_metrics.average_score * 20} className="mt-1" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Score Improvement</span>
                      <span className={dashboard_data.performance_metrics.score_improvement > 0 ? 'text-green-600' : 'text-red-600'}>
                        {dashboard_data.performance_metrics.score_improvement > 0 ? '+' : ''}{dashboard_data.performance_metrics.score_improvement.toFixed(1)}
                      </span>
                    </div>
                    <Progress 
                      value={Math.abs(dashboard_data.performance_metrics.score_improvement) * 20} 
                      className="mt-1" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coaching Effectiveness */}
            <Card>
              <CardHeader>
                <CardTitle>Coaching Effectiveness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Follow-up Rate</span>
                      <span>{dashboard_data.coaching_effectiveness.follow_up_rate.toFixed(1)}%</span>
                    </div>
                    <Progress value={dashboard_data.coaching_effectiveness.follow_up_rate} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{dashboard_data.coaching_effectiveness.coaching_notes_count}</div>
                      <div className="text-xs text-gray-600">Total Notes</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{dashboard_data.coaching_effectiveness.action_items_completed}</div>
                      <div className="text-xs text-gray-600">Completed</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeProfile;
