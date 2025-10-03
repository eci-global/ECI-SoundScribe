import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  BarChart3, 
  MessageSquare,
  Target,
  Star,
  TrendingUp,
  Calendar,
  Mic,
  Volume2,
  Settings,
  Download,
  Upload
} from 'lucide-react';
import { EmployeeService } from '@/services/employeeService';
import EmployeeDirectory from '@/pages/EmployeeDirectory';
import EmployeeProfile from '@/pages/EmployeeProfile';
import EmployeeDashboard from '@/pages/EmployeeDashboard';
import EmployeeVoiceDetection from './EmployeeVoiceDetection';
import EmployeeScorecardManager from './EmployeeScorecardManager';
import type { Employee, Team, EmployeeSearchFilters } from '@/types/employee';

const EmployeeManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'directory' | 'dashboard' | 'profile' | 'settings'>('directory');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      // This would be replaced with actual team loading
      const mockTeams: Team[] = [
        { id: '1', name: 'Sales Team', description: 'Primary sales team', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '2', name: 'BDR Team', description: 'Business Development Representatives', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '3', name: 'Support Team', description: 'Customer support team', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      ];
      setTeams(mockTeams);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validate required fields
      if (!newEmployee.first_name || !newEmployee.last_name || !newEmployee.email) {
        setError('Please fill in all required fields (First Name, Last Name, Email)');
        return;
      }
      
      const employee = await EmployeeService.createEmployee({
        ...newEmployee,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      setSuccess(`Employee ${employee.first_name} ${employee.last_name} created successfully!`);
      setNewEmployee({});
      
      // Close dialog after a short delay
      setTimeout(() => {
        setShowAddEmployee(false);
        setSuccess(null);
        // Refresh the directory
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Failed to create employee:', error);
      if (error instanceof Error) {
        setError(`Failed to create employee: ${error.message}`);
      } else {
        setError('Failed to create employee. Please check if the database tables exist.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    setActiveTab('profile');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'directory':
        return <EmployeeDirectory />;
      case 'dashboard':
        return <EmployeeDashboard />;
      case 'profile':
        return selectedEmployee ? (
          <EmployeeProfile />
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select an Employee</h3>
            <p className="text-gray-600">Choose an employee from the directory to view their profile.</p>
          </div>
        );
      case 'settings':
        return <EmployeeSettings />;
      default:
        return <EmployeeDirectory />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Employee Management</h1>
          <p className="text-gray-600">Track performance, manage teams, and analyze employee data</p>
        </div>
        <div className="flex items-center space-x-4">
          <Dialog open={showAddEmployee} onOpenChange={(open) => {
            setShowAddEmployee(open);
            if (open) {
              setError(null);
              setSuccess(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>
                  Create a new employee profile for tracking and performance management.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                    {error}
                  </div>
                )}
                
                {/* Success Message */}
                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                    {success}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={newEmployee.first_name || ''}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, first_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={newEmployee.last_name || ''}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, last_name: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmployee.email || ''}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input
                    id="employee_id"
                    value={newEmployee.employee_id || ''}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, employee_id: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Select onValueChange={(value) => setNewEmployee(prev => ({ ...prev, department: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Support">Support</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={newEmployee.role || ''}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, role: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="team_id">Team</Label>
                  <Select onValueChange={(value) => setNewEmployee(prev => ({ ...prev, team_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddEmployee(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddEmployee} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Employee'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="directory" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Directory</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {renderTabContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Employee Settings Component
const EmployeeSettings: React.FC = () => {
  const [voiceTrainingStatus, setVoiceTrainingStatus] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const handleVoiceTraining = async (employeeId: string) => {
    try {
      setLoading(true);
      // This would call the voice training function
      console.log('Training voice for employee:', employeeId);
    } catch (error) {
      console.error('Voice training failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Volume2 className="h-5 w-5" />
            <span>Voice Training Settings</span>
          </CardTitle>
          <CardDescription>
            Manage employee voice profiles for automatic detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Voice training allows the system to automatically identify employees in recordings. 
              Train voice profiles using sample recordings to improve detection accuracy.
            </p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload Training Samples
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Voice Profiles
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mic className="h-5 w-5" />
            <span>Detection Settings</span>
          </CardTitle>
          <CardDescription>
            Configure automatic employee detection parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="confidence_threshold">Confidence Threshold</Label>
                <Input
                  id="confidence_threshold"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  defaultValue="0.7"
                  placeholder="0.7"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Minimum confidence required for automatic detection
                </p>
              </div>
              <div>
                <Label htmlFor="auto_tagging">Auto Tagging</Label>
                <Select defaultValue="enabled">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600 mt-1">
                  Automatically tag employees when detected
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Coaching Settings</span>
          </CardTitle>
          <CardDescription>
            Configure coaching and feedback settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="coaching_frequency">Coaching Frequency</Label>
                <Select defaultValue="weekly">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="feedback_reminders">Feedback Reminders</Label>
                <Select defaultValue="enabled">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeManagement;
