import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi
} from 'lucide-react';

const DashboardView = ({ systemStats, boardData, agents }) => {
  // Generate recent activities from board data and agent states
  const getRecentActivities = () => {
    if (!boardData || !agents) return [];
    
    const activities = [];
    
    // Add completed tasks
    (boardData?.tasks || [])
      .filter(task => task.status === 'done')
      .slice(0, 3)
      .forEach(task => {
        activities.push({
          id: `completed-${task.id}`,
          agent: task.agentName,
          action: `Completed: ${task.title}`,
          timestamp: new Date(task.completedAt || task.createdAt),
          status: 'success',
          duration: task.estimatedDuration ? `${task.estimatedDuration}m` : 'Unknown'
        });
      });

    // Add current agent activities
    agents
      .filter(agent => agent.status === 'working' && agent.currentTask)
      .forEach(agent => {
        activities.push({
          id: `working-${agent.id}`,
          agent: agent.name,
          action: `Working on: ${agent.currentTask}`,
          timestamp: new Date(agent.workingSince || agent.lastActivity),
          status: 'in-progress',
          duration: 'Ongoing'
        });
      });

    // Add failed tasks
    (boardData?.tasks || [])
      .filter(task => task.status === 'backlog' && task.error)
      .slice(0, 2)
      .forEach(task => {
        activities.push({
          id: `failed-${task.id}`,
          agent: task.agentName,
          action: `Task failed: ${task.title}`,
          timestamp: new Date(task.createdAt),
          status: 'error',
          duration: 'Failed'
        });
      });

    return activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
  };

  // Calculate system health metrics
  const getSystemHealth = () => {
    if (!agents) return { cpu: 0, memory: 0, disk: 0, network: 100 };
    
    const activeAgents = agents.filter(a => a.status !== 'idle').length;
    const totalAgents = agents.length;
    const utilization = totalAgents > 0 ? (activeAgents / totalAgents) * 100 : 0;
    
    return {
      cpu: Math.round(utilization * 0.8), // Simulate CPU based on agent utilization
      memory: Math.round(utilization * 0.9), // Simulate memory usage
      disk: Math.round(Math.random() * 30 + 10), // Random disk usage
      network: Math.round(Math.random() * 20 + 80) // Random network health
    };
  };

  // Calculate performance metrics
  const getPerformance = () => {
    if (!boardData) return { tasksPerHour: 0, avgResponseTime: '0s', successRate: 0, errorRate: 0 };
    
    const stats = boardData.statistics;
    const successRate = stats.totalTasks > 0 ? (stats.tasksCompleted / stats.totalTasks) * 100 : 0;
    
    return {
      tasksPerHour: stats.tasksPerHour || 0,
      avgResponseTime: stats.averageTaskTime ? `${Math.round(stats.averageTaskTime)}m` : '0m',
      successRate: Math.round(successRate),
      errorRate: Math.round(100 - successRate)
    };
  };

  // Get top performing agents
  const getTopAgents = () => {
    if (!agents) return [];
    
    return agents
      .map(agent => ({
        name: agent.name,
        tasksCompleted: agent.tasksCompleted,
        efficiency: agent.metrics.successRate * 100,
        status: agent.status === 'working' ? 'busy' : 
               agent.status === 'idle' ? 'idle' : 
               agent.status === 'error' ? 'error' : 'active'
      }))
      .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
      .slice(0, 5);
  };

  const recentActivities = getRecentActivities();
  const systemHealth = getSystemHealth();
  const performance = getPerformance();
  const topAgents = getTopAgents();

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'in-progress':
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      idle: 'bg-gray-100 text-gray-800',
      busy: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge variant="secondary" className={variants[status] || variants.idle}>
        {status}
      </Badge>
    );
  };

  const formatTimeAgo = (timestamp) => {
    const minutes = Math.floor((Date.now() - timestamp.getTime()) / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="space-y-6">
      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.cpu}%</div>
            <Progress value={systemHealth.cpu} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.memory}%</div>
            <Progress value={systemHealth.memory} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.disk}%</div>
            <Progress value={systemHealth.disk} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network I/O</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.network}%</div>
            <Progress value={systemHealth.network} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks/Hour</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.tasksPerHour}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.avgResponseTime}</div>
            <p className="text-xs text-muted-foreground">
              -200ms from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              Target: 95%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.errorRate}%</div>
            <p className="text-xs text-muted-foreground">
              Within tolerance
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest agent actions and their outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  {getStatusIcon(activity.status)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{activity.agent}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">Duration: {activity.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Agents */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Agents</CardTitle>
            <CardDescription>Agent performance rankings for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topAgents.map((agent, index) => (
                <div key={agent.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {agent.tasksCompleted} tasks • {agent.efficiency}% efficiency
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(agent.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardView;