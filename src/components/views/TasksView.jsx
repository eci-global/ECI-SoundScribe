import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Search, 
  Filter, 
  Play,
  Pause,
  Square,
  RotateCcw,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity,
  Calendar,
  User,
  Flag,
  Timer,
  FileText,
  Settings
} from 'lucide-react';

const TasksView = ({ boardData, agents, onTaskMove }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAgent, setFilterAgent] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);

  // Transform real task data to match UI expectations
  const transformTaskData = (task) => ({
    id: task.id,
    title: task.title,
    description: task.description || task.context || 'No description provided',
    status: task.status, // 'todo', 'in_progress', 'done', 'backlog'
    priority: task.priority || 'medium',
    assignedAgent: task.agentName || task.assignedTo || 'Unassigned',
    agentId: task.agentId,
    estimatedTime: task.estimatedDuration ? `${task.estimatedDuration}m` : 'Unknown',
    actualTime: task.actualDuration ? `${task.actualDuration}m` : null,
    progress: task.progress || 0,
    createdAt: new Date(task.createdAt),
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    tags: task.tags || [],
    projectContext: task.projectContext?.name || 'General'
  });

  // Use real tasks from boardData
  const allTasks = boardData?.tasks ? boardData.tasks.map(transformTaskData) : [];

  // Use the real tasks
  const displayTasks = allTasks;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'todo':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'backlog':
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'done': 'bg-green-100 text-green-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'todo': 'bg-yellow-100 text-yellow-800',
      'backlog': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge variant="secondary" className={variants[status] || variants['todo']}>
{status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge variant="outline" className={variants[priority] || variants.medium}>
        {priority}
      </Badge>
    );
  };

  const handleTaskAction = async (taskId, action) => {
    try {
      let newStatus = 'todo';
      
      switch (action) {
        case 'start':
          newStatus = 'in_progress';
          break;
        case 'pause':
          newStatus = 'todo';
          break;
        case 'complete':
          newStatus = 'done';
          break;
        case 'retry':
          newStatus = 'todo';
          break;
        default:
          return;
      }

      // Use the onTaskMove prop to update task status via API
      if (onTaskMove) {
        await onTaskMove(taskId, newStatus);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const filteredTasks = displayTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesAgent = filterAgent === 'all' || task.agentId === filterAgent;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesAgent;
  });

  const getTaskMetrics = () => {
    const total = displayTasks.length;
    const completed = displayTasks.filter(t => t.status === 'done').length;
    const inProgress = displayTasks.filter(t => t.status === 'in_progress').length;
    const pending = displayTasks.filter(t => t.status === 'todo').length;
    const backlog = displayTasks.filter(t => t.status === 'backlog').length;
    const overdue = displayTasks.filter(t => t.dueDate && t.dueDate < new Date() && t.status !== 'done').length;

    return { total, completed, inProgress, pending, backlog, overdue };
  };

  const metrics = getTaskMetrics();

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTimeSpent = (timeString) => {
    if (!timeString || timeString === '0h') return 'Not started';
    return timeString;
  };

  const isOverdue = (dueDate, status) => {
    return dueDate && dueDate < new Date() && status !== 'done';
  };

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.failed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Timer className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
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
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-32">
              <Flag className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="w-40">
              <User className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents?.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setShowCreateTask(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Task Queue</CardTitle>
          <CardDescription>Monitor and manage agent tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned Agent</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Time Spent</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {displayTasks.length === 0 
                        ? "No tasks available. Tasks will appear here when created by agents."
                        : "No tasks match your search criteria."
                      }
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => (
                <TableRow 
                  key={task.id}
                  className={isOverdue(task.dueDate, task.status) ? 'bg-red-50' : ''}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {getStatusIcon(task.status)}
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {task.description}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {task.projectContext}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(task.status)}
                    {task.errorMessage && (
                      <div className="text-xs text-red-600 mt-1">
                        {task.errorMessage}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {getPriorityBadge(task.priority)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {task.assignedAgent.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{task.assignedAgent}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">{task.progress}%</div>
                      <Progress value={task.progress} className="w-20" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`text-sm ${isOverdue(task.dueDate, task.status) ? 'text-red-600 font-medium' : ''}`}>
                      {formatDate(task.dueDate)}
                      {isOverdue(task.dueDate, task.status) && (
                        <div className="text-xs text-red-500">Overdue</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{formatTimeSpent(task.actualTime)}</div>
                      <div className="text-xs text-muted-foreground">
                        Est: {task.estimatedTime}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {task.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTaskAction(task.id, 'start')}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {task.status === 'in-progress' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTaskAction(task.id, 'pause')}
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {task.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTaskAction(task.id, 'retry')}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTask(task);
                          setShowTaskDetails(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Define a new task and assign it to an agent
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div>
              <Label htmlFor="task-title">Task Title</Label>
              <Input id="task-title" placeholder="Enter task title" />
            </div>
            
            <div>
              <Label htmlFor="task-description">Description</Label>
              <Textarea 
                id="task-description" 
                placeholder="Describe the task requirements and objectives..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task-priority">Priority</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task-agent">Assign to Agent</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nova-frontend">Nova-Frontend</SelectItem>
                    <SelectItem value="raven-database">Raven-Database</SelectItem>
                    <SelectItem value="cipher-security">Cipher-Security</SelectItem>
                    <SelectItem value="storm-devops">Storm-DevOps</SelectItem>
                    <SelectItem value="quinn-testing">Quinn-Testing</SelectItem>
                    <SelectItem value="sophia-architect">Sophia-Architect</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimated-time">Estimated Time</Label>
                <Input id="estimated-time" placeholder="e.g., 4h 30m" />
              </div>
              <div>
                <Label htmlFor="due-date">Due Date</Label>
                <Input id="due-date" type="date" />
              </div>
            </div>
            
            <div>
              <Label htmlFor="task-project">Project</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ecommerce">E-commerce Platform Redesign</SelectItem>
                  <SelectItem value="security">Security Audit & Compliance</SelectItem>
                  <SelectItem value="api">API Performance Optimization</SelectItem>
                  <SelectItem value="mobile">Mobile App Development</SelectItem>
                  <SelectItem value="testing">Testing Infrastructure Upgrade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="task-tags">Tags</Label>
              <Input id="task-tags" placeholder="Enter tags separated by commas" />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTask(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowCreateTask(false)}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Details Dialog */}
      <Dialog open={showTaskDetails} onOpenChange={setShowTaskDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              {selectedTask?.title}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Status & Progress</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(selectedTask.status)}
                      {getPriorityBadge(selectedTask.priority)}
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Progress</div>
                      <div className="flex items-center gap-2">
                        <Progress value={selectedTask.progress} className="flex-1" />
                        <span className="text-sm">{selectedTask.progress}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Assignment</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {selectedTask.assignedAgent.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span>{selectedTask.assignedAgent.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Project: {selectedTask.project}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Timeline</h4>
                  <div className="space-y-1 text-sm">
                    <div>Created: {formatDate(selectedTask.createdAt)}</div>
                    <div>Due: {formatDate(selectedTask.dueDate)}</div>
                    {selectedTask.completedAt && (
                      <div>Completed: {formatDate(selectedTask.completedAt)}</div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Time Tracking</h4>
                  <div className="space-y-1 text-sm">
                    <div>Estimated: {selectedTask.estimatedTime}</div>
                    <div>Actual: {formatTimeSpent(selectedTask.actualTime)}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedTask.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Subtasks</h4>
                <div className="space-y-2">
                  {selectedTask.subtasks.map(subtask => (
                    <div key={subtask.id} className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`w-4 h-4 ${subtask.completed ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={subtask.completed ? 'line-through text-muted-foreground' : ''}>
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDetails(false)}>
              Close
            </Button>
            <Button>
              <Edit className="w-4 h-4 mr-2" />
              Edit Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksView;