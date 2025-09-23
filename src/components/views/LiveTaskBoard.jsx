import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { agentEngineApi } from '@/services/agentEngineApi';
import { 
  Clock, 
  User, 
  Calendar,
  Flag,
  Timer,
  Activity,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Filter,
  Search
} from 'lucide-react';

const LiveTaskBoard = ({ boardData, agents, onTaskMove }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [realtimeActivity, setRealtimeActivity] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    const handleRealtimeUpdate = (data) => {
      setLastUpdate(new Date());
      
      // Add to activity feed
      const activityMessage = {
        id: Date.now(),
        type: 'realtime_update',
        data,
        timestamp: new Date()
      };
      
      setRealtimeActivity(prev => [activityMessage, ...prev.slice(0, 9)]); // Keep latest 10
    };

    // Connect to WebSocket for real-time updates
    agentEngineApi.connectWebSocket();
    
    // Subscribe to different event types
    const unsubscribeTask = agentEngineApi.on('task_updated', handleRealtimeUpdate);
    const unsubscribeAgent = agentEngineApi.on('agent_status_changed', handleRealtimeUpdate);
    const unsubscribeGeneral = agentEngineApi.on('system_update', handleRealtimeUpdate);

    return () => {
      // Unsubscribe from all events
      unsubscribeTask();
      unsubscribeAgent();
      unsubscribeGeneral();
    };
  }, []);

  // Auto-refresh every 5 seconds to show live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Transform real task data for the board
  const transformTasks = () => {
    if (!boardData?.tasks) return [];
    
    return boardData.tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || task.context || 'No description',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      agentName: task.agentName || 'Unassigned',
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      estimatedTime: task.estimatedTime || 'Unknown',
      progress: task.progress || 0,
      projectContext: task.projectContext,
      tags: task.tags || []
    }));
  };

  const tasks = transformTasks();

  // Group tasks by status for Kanban columns
  const taskColumns = {
    'pending': { title: 'To Do', color: 'bg-gray-100', tasks: [] },
    'in_progress': { title: 'In Progress', color: 'bg-blue-100', tasks: [] },
    'review': { title: 'Review', color: 'bg-yellow-100', tasks: [] },
    'done': { title: 'Done', color: 'bg-green-100', tasks: [] }
  };

  // Distribute tasks into columns
  tasks.forEach(task => {
    const status = task.status;
    if (taskColumns[status]) {
      taskColumns[status].tasks.push(task);
    } else {
      taskColumns['pending'].tasks.push(task);
    }
  });

  // Filter tasks based on search and filters
  const filterTasks = (taskList) => {
    return taskList.filter(task => {
      const matchesSearch = !searchTerm || 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAgent = filterAgent === 'all' || task.agentName === filterAgent;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      
      return matchesSearch && matchesAgent && matchesPriority;
    });
  };

  // Apply filters to all columns
  Object.keys(taskColumns).forEach(status => {
    taskColumns[status].tasks = filterTasks(taskColumns[status].tasks);
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-gray-500" />;
      case 'in_progress': return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'review': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'done': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const TaskCard = ({ task }) => {
    const handleDragStart = (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ taskId: task.id, currentStatus: task.status }));
      e.dataTransfer.effectAllowed = 'move';
    };

    return (
    <Card 
      className="mb-3 hover:shadow-md transition-shadow cursor-grab border-l-4 border-l-blue-500"
      draggable
      onDragStart={handleDragStart}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStatusIcon(task.status)}
            <h4 className="font-medium text-sm truncate">{task.title}</h4>
          </div>
          <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
        </div>
        
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {task.description}
        </p>
        
        {task.progress > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span>Progress</span>
              <span>{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-1" />
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {task.agentName ? task.agentName.substring(0, 2).toUpperCase() : 'UN'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {task.agentName || 'Unassigned'}
            </span>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatTimeAgo(task.updatedAt)}</span>
          </div>
        </div>
        
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.tags.slice(0, 2).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {task.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{task.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    );
  };

  const getAgentStats = () => {
    const agentStats = {};
    agents?.forEach(agent => {
      agentStats[agent.name] = {
        total: 0,
        inProgress: 0,
        completed: 0
      };
    });

    tasks.forEach(task => {
      if (agentStats[task.agentName]) {
        agentStats[task.agentName].total++;
        if (task.status === 'in_progress') {
          agentStats[task.agentName].inProgress++;
        } else if (task.status === 'done') {
          agentStats[task.agentName].completed++;
        }
      }
    });

    return agentStats;
  };

  const agentStats = getAgentStats();

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.currentStatus !== targetStatus && onTaskMove) {
        await onTaskMove(data.taskId, targetStatus);
      }
    } catch (error) {
      console.error('Failed to move task:', error);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Live Task Board</h2>
          <p className="text-muted-foreground">Real-time agent task tracking and management</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="w-40">
              <User className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents?.map(agent => (
                <SelectItem key={agent.id} value={agent.name}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-40">
              <Flag className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Agent Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents?.slice(0, 4).map(agent => (
          <Card key={agent.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{agent.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium text-sm">{agent.name}</h4>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{agentStats[agent.name]?.inProgress || 0} active</span>
                    <span>•</span>
                    <span>{agentStats[agent.name]?.completed || 0} done</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {Object.entries(taskColumns).map(([status, column]) => (
          <div key={status} className="space-y-4">
            <div className={`p-4 rounded-lg ${column.color}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{column.title}</h3>
                <Badge variant="secondary" className="text-xs">
                  {column.tasks.length}
                </Badge>
              </div>
            </div>
            
            <div 
              className="space-y-3 min-h-[400px] p-2 rounded-lg border-2 border-dashed border-transparent transition-colors"
              onDrop={(e) => handleDrop(e, status)}
              onDragOver={handleDragOver}
              onDragEnter={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-blue-300', 'bg-blue-50');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-blue-300', 'bg-blue-50');
              }}
            >
              {column.tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tasks in {column.title.toLowerCase()}</p>
                </div>
              ) : (
                column.tasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500 animate-pulse" />
            Live Activity Feed
            <Badge variant="outline" className="ml-auto">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {realtimeActivity.length > 0 ? (
              realtimeActivity.map(activity => (
                <div key={activity.id} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="font-medium">{activity.data?.agentName || 'System'}</span>
                  <span className="text-muted-foreground">
                    {activity.type === 'realtime_update' && 'updated'}
                    {activity.data?.type === 'task_updated' && 'updated task'}
                    {activity.data?.type === 'task_created' && 'created task'}
                    {activity.data?.type === 'agent_status_changed' && 'changed status'}
                  </span>
                  <span className="font-medium">{activity.data?.title || activity.data?.taskTitle || ''}</span>
                  <span className="text-muted-foreground ml-auto">{formatTimeAgo(activity.timestamp)}</span>
                </div>
              ))
            ) : (
              // Fallback to showing current task activity if no WebSocket updates
              tasks.slice(0, 3).map(task => (
                <div key={task.id} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="font-medium">{task.agentName}</span>
                  <span className="text-muted-foreground">is working on</span>
                  <span className="font-medium">{task.title}</span>
                  <span className="text-muted-foreground ml-auto">{formatTimeAgo(task.updatedAt)}</span>
                </div>
              ))
            )}
            {tasks.length === 0 && realtimeActivity.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No recent activity. Agents are waiting for tasks.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveTaskBoard;