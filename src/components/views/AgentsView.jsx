import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Play, 
  Pause, 
  Square, 
  Settings, 
  Eye, 
  RefreshCw,
  Search,
  Filter,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react';

const AgentsView = ({ agents, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Remove hardcoded agents array - use props instead
  const agentList = agents || [];

  // Transform real agent data to match UI expectations
  const transformAgentData = (agent) => ({
    id: agent.id,
    name: agent.name,
    type: agent.specialization || 'AI Agent',
    status: agent.status === 'working' ? 'busy' : 
            agent.status === 'idle' ? 'idle' : 
            agent.status === 'error' ? 'error' : 'active',
    lastActive: new Date(agent.lastActivity || Date.now()),
    tasksRunning: agent.currentTasks?.length || 0,
    tasksCompleted: agent.metrics?.tasksCompleted || agent.tasksCompleted || 0,
    uptime: calculateUptime(agent.startTime),
    cpu: Math.round((agent.metrics?.cpuUsage || 0) * 100),
    memory: Math.round((agent.metrics?.memoryUsage || 0) * 100),
    version: agent.version || '1.0.0',
    capabilities: agent.capabilities || [],
    priority: agent.priority || 'medium'
  });

  const calculateUptime = (startTime) => {
    if (!startTime) return 'Unknown';
    const start = new Date(startTime);
    const now = new Date();
    const diff = now - start;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}d ${hours}h`;
  };

  // Use real agents
  const displayAgents = agentList.length > 0 
    ? agentList.map(transformAgentData)
    : []; // Empty if no agents

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'busy':
        return <Activity className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'idle':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      busy: 'bg-yellow-100 text-yellow-800',
      idle: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge variant="secondary" className={variants[status] || variants.idle}>
        {status}
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

  const handleAgentAction = async (agentId, action) => {
    try {
      // TODO: Implement real agent control API calls
      console.log(`Agent action: ${action} on agent ${agentId}`);
      
      // For now, just refresh the data to get the latest state
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to perform agent action:', error);
    }
  };

  const filteredAgents = displayAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || agent.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const formatTimeAgo = (timestamp) => {
    const minutes = Math.floor((Date.now() - timestamp.getTime()) / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search agents..."
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddAgent(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Agent
          </Button>
        </div>
      </div>

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Management</CardTitle>
          <CardDescription>Monitor and control your AI agents</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Resources</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {displayAgents.length === 0 
                        ? "No agents connected. Please check the AI Agent Engine connection."
                        : "No agents match your search criteria."
                      }
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {getStatusIcon(agent.status)}
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-sm text-muted-foreground">{agent.type}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(agent.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Running: {agent.tasksRunning}</div>
                      <div className="text-muted-foreground">Completed: {agent.tasksCompleted}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>CPU: {agent.cpu}%</div>
                      <div className="text-muted-foreground">Memory: {agent.memory}%</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatTimeAgo(agent.lastActive)}
                  </TableCell>
                  <TableCell>
                    {getPriorityBadge(agent.priority)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {agent.status === 'active' || agent.status === 'busy' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAgentAction(agent.id, 'pause')}
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAgentAction(agent.id, 'start')}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAgentAction(agent.id, 'restart')}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAgent(agent);
                          setShowConfig(true);
                        }}
                      >
                        <Settings className="w-4 h-4" />
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

      {/* Add Agent Dialog */}
      <Dialog open={showAddAgent} onOpenChange={setShowAddAgent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Agent</DialogTitle>
            <DialogDescription>
              Configure a new AI agent for your workforce
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" placeholder="Agent name" className="col-span-3" />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Type</Label>
              <Select>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select agent type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="frontend">Frontend Development</SelectItem>
                  <SelectItem value="backend">Backend Development</SelectItem>
                  <SelectItem value="database">Database Management</SelectItem>
                  <SelectItem value="security">Security Analysis</SelectItem>
                  <SelectItem value="devops">DevOps Automation</SelectItem>
                  <SelectItem value="testing">Quality Assurance</SelectItem>
                  <SelectItem value="architecture">System Architecture</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">Priority</Label>
              <Select>
                <SelectTrigger className="col-span-3">
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
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="capabilities" className="text-right">Capabilities</Label>
              <Textarea 
                id="capabilities" 
                placeholder="List agent capabilities..." 
                className="col-span-3" 
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAgent(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowAddAgent(false)}>
              Create Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agent Configuration Dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure {selectedAgent?.name}</DialogTitle>
            <DialogDescription>
              Modify agent settings and capabilities
            </DialogDescription>
          </DialogHeader>
          
          {selectedAgent && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agent-name">Agent Name</Label>
                  <Input id="agent-name" defaultValue={selectedAgent.name} />
                </div>
                <div>
                  <Label htmlFor="agent-version">Version</Label>
                  <Input id="agent-version" defaultValue={selectedAgent.version} />
                </div>
              </div>
              
              <div>
                <Label htmlFor="agent-capabilities">Capabilities</Label>
                <Textarea 
                  id="agent-capabilities" 
                  defaultValue={selectedAgent.capabilities.join('\n')}
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agent-priority">Priority Level</Label>
                  <Select defaultValue={selectedAgent.priority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="auto-restart" />
                  <Label htmlFor="auto-restart">Auto-restart on failure</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Resource Limits</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cpu-limit" className="text-sm">CPU Limit (%)</Label>
                    <Input id="cpu-limit" type="number" defaultValue="80" />
                  </div>
                  <div>
                    <Label htmlFor="memory-limit" className="text-sm">Memory Limit (%)</Label>
                    <Input id="memory-limit" type="number" defaultValue="70" />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfig(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowConfig(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentsView;