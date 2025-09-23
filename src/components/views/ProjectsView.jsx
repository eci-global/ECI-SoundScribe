import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit,
  Trash2,
  Users,
  Calendar,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  FolderOpen,
  GitBranch,
  Activity
} from 'lucide-react';

const ProjectsView = ({ boardData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Transform real data into projects
  const getProjectsFromTasks = () => {
    if (!boardData?.tasks) return [];

    const projectGroups = {};
    
    boardData.tasks.forEach(task => {
      const projectName = task.projectContext?.name || 'General';
      
      if (!projectGroups[projectName]) {
        projectGroups[projectName] = {
          id: projectName.toLowerCase().replace(/\s+/g, '-'),
          name: projectName,
          description: task.projectContext?.description || 'No description available',
          tasks: [],
          assignedAgents: new Set()
        };
      }
      
      projectGroups[projectName].tasks.push(task);
      if (task.agentName) {
        projectGroups[projectName].assignedAgents.add(task.agentName);
      }
    });

    return Object.values(projectGroups).map(project => {
      const tasks = project.tasks;
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const totalTasks = tasks.length;
      
      return {
        ...project,
        status: completedTasks === totalTasks ? 'completed' : 
               tasks.some(t => t.status === 'in_progress') ? 'in-progress' : 'planning',
        priority: tasks.some(t => t.priority === 'high') ? 'high' : 'medium',
        progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        totalTasks,
        completedTasks,
        assignedAgents: Array.from(project.assignedAgents || []),
        tags: Array.from(new Set(tasks.flatMap(t => t.tags || []))).slice(0, 5), // Unique tags from tasks
        startDate: tasks.reduce((earliest, task) => {
          const taskDate = new Date(task.createdAt);
          return !earliest || taskDate < earliest ? taskDate : earliest;
        }, null),
        endDate: null // We don't have end dates in task data
      };
    });
  };

  const projects = getProjectsFromTasks();

  // Use real projects data
  const displayProjects = projects;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Activity className="w-4 h-4 text-blue-500" />;
      case 'planning':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'on-hold':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <FolderOpen className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'completed': 'bg-green-100 text-green-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'planning': 'bg-yellow-100 text-yellow-800',
      'on-hold': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge variant="secondary" className={variants[status] || variants['planning']}>
        {status.replace('-', ' ')}
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

  const filteredProjects = displayProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || project.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getProjectMetrics = () => {
    const total = projects.length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const inProgress = projects.filter(p => p.status === 'in-progress').length;
    const onHold = projects.filter(p => p.status === 'on-hold').length;
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0);

    return { total, completed, inProgress, onHold, totalBudget, totalSpent };
  };

  const metrics = getProjectMetrics();

  const ProjectCard = ({ project }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(project.status)}
            <CardTitle className="text-lg">{project.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getPriorityBadge(project.priority)}
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <CardDescription>{project.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          {getStatusBadge(project.status)}
          <span className="text-sm text-muted-foreground">
            {project.progress}% complete
          </span>
        </div>
        
        <Progress value={project.progress} className="w-full" />
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Tasks</div>
            <div>{project.completedTasks}/{project.totalTasks}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Budget</div>
            <div>{formatCurrency(project.spent || 0)}/{formatCurrency(project.budget || 0)}</div>
          </div>
        </div>
        
        <div>
          <div className="text-sm text-muted-foreground mb-2">Assigned Agents</div>
          <div className="flex items-center gap-2">
            {(project.assignedAgents || []).slice(0, 3).map((agentName, index) => (
              <Avatar key={agentName || index} className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {(agentName || 'Unknown').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {(project.assignedAgents?.length || 0) > 3 && (
              <div className="text-xs text-muted-foreground">
                +{(project.assignedAgents?.length || 0) - 3} more
              </div>
            )}
            {(!project.assignedAgents || project.assignedAgents.length === 0) && (
              <div className="text-xs text-muted-foreground">No agents assigned</div>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {(project.tags || []).slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {(project.tags?.length || 0) > 3 && (
            <Badge variant="outline" className="text-xs">
              +{(project.tags?.length || 0) - 3}
            </Badge>
          )}
          {(!project.tags || project.tags.length === 0) && (
            <div className="text-xs text-muted-foreground">No tags</div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.inProgress} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((metrics.completed / metrics.total) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.completed} of {metrics.total} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(metrics.totalSpent)} spent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((metrics.totalSpent / metrics.totalBudget) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Budget efficiency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setShowCreateProject(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {/* Create Project Dialog */}
      <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Set up a new project and assign agents to work on it
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project-name">Project Name</Label>
                <Input id="project-name" placeholder="Enter project name" />
              </div>
              <div>
                <Label htmlFor="project-priority">Priority</Label>
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
            </div>
            
            <div>
              <Label htmlFor="project-description">Description</Label>
              <Textarea 
                id="project-description" 
                placeholder="Describe the project objectives and scope..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input id="start-date" type="date" />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input id="end-date" type="date" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget">Budget ($)</Label>
                <Input id="budget" type="number" placeholder="0" />
              </div>
              <div>
                <Label htmlFor="assigned-agents">Assign Agents</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agents" />
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
            
            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input id="tags" placeholder="Enter tags separated by commas" />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateProject(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowCreateProject(false)}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsView;