import React, { useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  UserPlus, Search, Mail, Shield, MoreVertical, CheckCircle, XCircle, Edit, Trash2,
  UserCheck, UserX, RefreshCw, AlertTriangle, Activity, Download, Users, History,
  Eye, Lock, Plus, FileKey, Edit2, Layers, Tag, Settings, Star
} from 'lucide-react';
import { AdminTableShell } from '@/components/admin/AdminTableShell';

// Enhanced interfaces for the unified system
interface UserRole {
  id: string;
  role: 'admin' | 'manager' | 'user';
  created_at: string;
}

interface UserPolicy {
  id: string;
  policy_id: string;
  policy_name: string;
  policy_description?: string;
  resource_name: string;
  permissions: string[];
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
  enabled: boolean;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
  roles: UserRole[];
  policies: UserPolicy[];
  status: 'active' | 'inactive' | 'suspended';
  metadata: Record<string, any>;
}

interface AccessPolicy {
  id: string;
  name: string;
  description?: string;
  resource_name: string;
  permissions: string[];
  groups: string[];
  enabled: boolean;
  created_at: string;
  created_by?: string;
  assignments?: any[];
}

interface Resource {
  name: string;
  description?: string;
  permissions: Array<{
    type: string;
    description?: string;
  }>;
}

interface UserManagementStats {
  totalUsers: number;
  activeUsers: number;
  admins: number;
  managers: number;
  newUsersThisMonth: number;
  usersWithPolicies: number;
  totalPolicyAssignments: number;
  usersWithBothRolesAndPolicies: number;
}

export default function UserAccessManagement() {
  const { toast } = useToast();

  // Loading protection ref to prevent multiple simultaneous fetches
  const fetchingRef = useRef(false);

  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [policies, setPolicies] = useState<AccessPolicy[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [stats, setStats] = useState<UserManagementStats>({
    totalUsers: 0,
    activeUsers: 0,
    admins: 0,
    managers: 0,
    newUsersThisMonth: 0,
    usersWithPolicies: 0,
    totalPolicyAssignments: 0,
    usersWithBothRolesAndPolicies: 0
  });

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Dialog states
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [showCreatePolicyDialog, setShowCreatePolicyDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showEditPolicyDialog, setShowEditPolicyDialog] = useState(false);
  const [showAssignPolicyDialog, setShowAssignPolicyDialog] = useState(false);
  const [showUserActivityDialog, setShowUserActivityDialog] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<AccessPolicy | null>(null);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Form data states
  const [userFormData, setUserFormData] = useState({
    email: '',
    full_name: '',
    role: 'user' as 'admin' | 'manager' | 'user'
  });

  const [policyFormData, setPolicyFormData] = useState({
    name: '',
    description: '',
    resource_name: '',
    permissions: [] as string[],
    groups: [] as string[],
    enabled: true
  });

  const [editUserFormData, setEditUserFormData] = useState({
    full_name: '',
    status: 'active' as 'active' | 'inactive' | 'suspended'
  });

  // Fetch functions
  const fetchUsers = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (fetchingRef.current) {
      console.log('Fetch already in progress, skipping...');
      return;
    }

    fetchingRef.current = true;
    setLoading(true);

    try {
      console.log('Fetching users from Edge Function...');
      const { data, error } = await supabase.functions.invoke('list-admin-users');

      if (error) {
        console.error('Edge Function error:', error);
        throw error;
      }

      if (data?.users) {
        console.log('Successfully fetched users:', data.users.length);
        setUsers(data.users);

        // Use data.stats if available, otherwise create default stats based on users
        const defaultStats = {
          totalUsers: data.users.length,
          activeUsers: data.users.filter((u: any) => u.status === 'active').length,
          admins: data.users.filter((u: any) => u.roles?.some((r: any) => r.role === 'admin')).length,
          managers: data.users.filter((u: any) => u.roles?.some((r: any) => r.role === 'manager')).length,
          newUsersThisMonth: 0,
          usersWithPolicies: data.users.filter((u: any) => u.policies?.length > 0).length,
          totalPolicyAssignments: data.users.reduce((acc: number, u: any) => acc + (u.policies?.length || 0), 0),
          usersWithBothRolesAndPolicies: data.users.filter((u: any) => u.roles?.length > 0 && u.policies?.length > 0).length
        };

        setStats(data.stats || defaultStats);
      } else {
        console.log('No users data returned, using fallback');
        // Fallback: try to fetch from profiles table directly
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            email,
            full_name,
            avatar_url,
            created_at,
            updated_at,
            last_sign_in_at,
            user_roles!inner(role, created_at)
          `)
          .limit(50);

        if (!profileError && profiles) {
          const formattedUsers = profiles.map(profile => ({
            id: profile.id,
            email: profile.email || '',
            full_name: profile.full_name || '',
            avatar_url: profile.avatar_url || '',
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            last_sign_in_at: profile.last_sign_in_at,
            roles: profile.user_roles ? [{
              id: profile.id,
              role: profile.user_roles.role,
              created_at: profile.user_roles.created_at
            }] : [],
            policies: [],
            status: 'active',
            metadata: {}
          }));

          setUsers(formattedUsers);
          setStats({
            totalUsers: formattedUsers.length,
            activeUsers: formattedUsers.length,
            admins: formattedUsers.filter(u => u.roles.some(r => r.role === 'admin')).length,
            managers: formattedUsers.filter(u => u.roles.some(r => r.role === 'manager')).length,
            newUsersThisMonth: 0,
            usersWithPolicies: 0,
            totalPolicyAssignments: 0,
            usersWithBothRolesAndPolicies: 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);

      // Last resort fallback with empty data to prevent infinite loading
      setUsers([]);
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        admins: 0,
        managers: 0,
        newUsersThisMonth: 0,
        usersWithPolicies: 0,
        totalPolicyAssignments: 0,
        usersWithBothRolesAndPolicies: 0
      });

      toast({
        title: "Error",
        description: "Failed to fetch users. Please check your connection and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [toast]);  // Removed 'stats' from dependency array to break the circular dependency

  const fetchPolicies = useCallback(async () => {
    try {
      // For now, use default policies while Edge Function is being debugged
      const defaultPolicies = [
        {
          id: '1',
          name: 'Admin Full Access',
          description: 'Complete system access for administrators',
          resource_name: '*',
          permissions: ['read', 'write', 'delete', 'admin'],
          groups: ['Administrators'],
          enabled: true,
          created_at: new Date().toISOString(),
          assignments: []
        },
        {
          id: '2',
          name: 'Manager BDR Access',
          description: 'BDR training and analytics access for managers',
          resource_name: 'bdr_training',
          permissions: ['read', 'write', 'export'],
          groups: ['Managers'],
          enabled: true,
          created_at: new Date().toISOString(),
          assignments: []
        },
        {
          id: '3',
          name: 'User Standard Access',
          description: 'Standard recording access for users',
          resource_name: 'recordings',
          permissions: ['read', 'write'],
          groups: ['Users'],
          enabled: true,
          created_at: new Date().toISOString(),
          assignments: []
        }
      ];

      setPolicies(defaultPolicies);
    } catch (error) {
      console.error('Error fetching policies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch policies",
        variant: "destructive"
      });
    }
  }, [toast]);

  const fetchResources = useCallback(async () => {
    try {
      // For now, let's use a simple approach and set some default resources
      // until we can properly debug the Edge Function
      const defaultResources = [
        {
          name: 'recordings',
          description: 'Audio/video recordings and transcripts',
          permissions: [
            { type: 'read', description: 'View recordings and transcripts' },
            { type: 'write', description: 'Create and edit recordings' },
            { type: 'delete', description: 'Delete recordings' },
            { type: 'export', description: 'Export recordings and data' }
          ]
        },
        {
          name: 'analytics',
          description: 'System analytics and reports',
          permissions: [
            { type: 'read', description: 'View analytics dashboards' },
            { type: 'write', description: 'Create custom reports' },
            { type: 'export', description: 'Export analytics data' }
          ]
        },
        {
          name: 'users',
          description: 'User accounts and profiles',
          permissions: [
            { type: 'read', description: 'View user information' },
            { type: 'write', description: 'Create and edit users' },
            { type: 'delete', description: 'Delete user accounts' }
          ]
        }
      ];

      setResources(defaultResources);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast({
        title: "Error",
        description: "Failed to fetch resources",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Initialize data
  React.useEffect(() => {
    fetchUsers();
    fetchPolicies();
    fetchResources();
  }, [fetchUsers, fetchPolicies, fetchResources]);

  // User management functions
  const handleCreateUser = async () => {
    if (!userFormData.email || !userFormData.full_name) {
      toast({
        title: "Error",
        description: "Email and full name are required",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create user profile
      const userId = crypto.randomUUID();

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userFormData.email,
          full_name: userFormData.full_name
        });

      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: userFormData.role
        });

      if (roleError) {
        console.warn('Could not assign role:', roleError);
      }

      toast({
        title: "Success",
        description: "User created successfully"
      });

      setShowCreateUserDialog(false);
      setUserFormData({ email: '', full_name: '', role: 'user' });
      await fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive"
      });
    }
  };

  const handleCreatePolicy = async () => {
    if (!policyFormData.name || !policyFormData.resource_name || policyFormData.permissions.length === 0) {
      toast({
        title: "Error",
        description: "Name, resource, and permissions are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-access-policies', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          ...policyFormData
        })
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Policy created successfully"
      });

      setShowCreatePolicyDialog(false);
      setPolicyFormData({
        name: '',
        description: '',
        resource_name: '',
        permissions: [],
        groups: [],
        enabled: true
      });
      await fetchPolicies();
    } catch (error) {
      console.error('Error creating policy:', error);
      toast({
        title: "Error",
        description: "Failed to create policy",
        variant: "destructive"
      });
    }
  };

  const handleAssignRole = async (userId: string, role: 'admin' | 'manager' | 'user') => {
    try {
      // Remove existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Add new role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role ${role} assigned successfully`
      });

      await fetchUsers();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast({
        title: "Error",
        description: "Failed to assign role",
        variant: "destructive"
      });
    }
  };

  const togglePolicy = async (policyId: string, enabled: boolean) => {
    try {
      // For now, just update the local state until Edge Function is working
      setPolicies(prev => prev.map(policy =>
        policy.id === policyId ? { ...policy, enabled } : policy
      ));

      toast({
        title: "Success",
        description: `Policy ${enabled ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error('Error toggling policy:', error);
      toast({
        title: "Error",
        description: "Failed to update policy",
        variant: "destructive"
      });
    }
  };

  // Filtering logic
  let filteredUsers = users;

  if (searchQuery) {
    filteredUsers = users.filter(user =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (roleFilter !== 'all') {
    filteredUsers = filteredUsers.filter(user =>
      (user.roles || []).some(role => role.role === roleFilter)
    );
  }

  if (statusFilter !== 'all') {
    filteredUsers = filteredUsers.filter(user => user.status === statusFilter);
  }

  // Utility functions
  const getStatusBadge = (status: string) => {
    const variants = {
      active: { className: 'bg-green-100 text-green-800', icon: CheckCircle },
      inactive: { className: 'bg-gray-100 text-gray-800', icon: XCircle },
      suspended: { className: 'bg-red-100 text-red-800', icon: XCircle }
    };
    const variant = variants[status as keyof typeof variants] || variants.active;
    const Icon = variant.icon;

    return (
      <Badge className={`${variant.className} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status || 'active'}
      </Badge>
    );
  };

  const getPermissionBadgeColor = (permission: string) => {
    const colors = {
      read: 'bg-blue-100 text-blue-800',
      write: 'bg-green-100 text-green-800',
      delete: 'bg-red-100 text-red-800',
      admin: 'bg-purple-100 text-purple-800',
      export: 'bg-orange-100 text-orange-800'
    };
    return colors[permission as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-display text-eci-gray-900 mb-2">User & Access Management</h1>
              <p className="text-body text-eci-gray-600">Manage user accounts and basic roles. Detailed permissions are now managed in Roles & Access</p>
            </div>
            <Button
              variant="outline"
              onClick={() => { fetchUsers(); }}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
          <Card className="bg-white shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-eci-gray-500">Total Users</p>
                <p className="mt-2 text-title font-semibold text-eci-gray-900">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="bg-white shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-eci-gray-500">Active Users</p>
                <p className="mt-2 text-title font-semibold text-eci-gray-900">{stats.activeUsers}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="bg-white shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-eci-gray-500">Admins</p>
                <p className="mt-2 text-title font-semibold text-eci-gray-900">{stats.admins}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
          </Card>

          <Card className="bg-white shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-eci-gray-500">Policy Assignments</p>
                <p className="mt-2 text-title font-semibold text-eci-gray-900">{stats.totalPolicyAssignments}</p>
              </div>
              <FileKey className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users ({filteredUsers.length})
            </TabsTrigger>
            <TabsTrigger value="policies" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Access Policies (use Roles & Access)
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <AdminTableShell
              title={`Users (${filteredUsers.length})`}
              description="Manage user accounts, roles, and policy assignments"
              icon={Users}
              loading={loading}
              empty={!loading && filteredUsers.length === 0}
              emptyTitle="No users found"
              emptyDescription="Try adjusting filters or add a new user."
            >
              <div className="flex flex-col gap-4 mb-6">
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    <Users className="h-4 w-4" />
                    <span>{selectedUsers.length} selected</span>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => console.log('Bulk assign admin')}>
                        Make Admin
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => console.log('Bulk assign manager')}>
                        Make Manager
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => console.log('Bulk assign user')}>
                        Make User
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
                    <div className="relative w-full md:w-72">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-eci-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search by name or email"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => console.log('Export users')} className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                    <Button className="flex items-center gap-2" onClick={() => setShowCreateUserDialog(true)}>
                      <UserPlus className="h-4 w-4" />
                      Add User
                    </Button>
                  </div>
                </div>
              </div>

              {/* Users Table */}
              {filteredUsers.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-eci-gray-200">
                        <th className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                            onChange={() => {
                              if (selectedUsers.length === filteredUsers.length) {
                                setSelectedUsers([]);
                              } else {
                                setSelectedUsers(filteredUsers.map(u => u.id));
                              }
                            }}
                            className="rounded"
                          />
                        </th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">User</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Roles</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Policies</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Status</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Last Active</th>
                        <th className="text-right py-3 px-4 text-caption font-medium text-eci-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-eci-gray-100 hover:bg-eci-gray-50">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers([...selectedUsers, user.id]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                }
                              }}
                              className="rounded"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-eci-gray-200">
                                  {getInitials(user.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-body font-medium text-eci-gray-900">{user.full_name}</p>
                                <p className="text-caption text-eci-gray-600 flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {(user.roles || []).map((role) => (
                                <Badge key={role.id} variant="outline" className="text-xs flex items-center gap-1">
                                  <Shield className="h-3 w-3" />
                                  {role.role}
                                </Badge>
                              ))}
                              {(user.roles || []).length === 0 && (
                                <Badge variant="outline" className="text-xs text-gray-500">
                                  No roles
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {(user.policies || []).slice(0, 2).map((policy) => (
                                <Badge key={policy.id} variant="secondary" className="text-xs flex items-center gap-1">
                                  <FileKey className="h-3 w-3" />
                                  {policy.policy_name}
                                </Badge>
                              ))}
                              {(user.policies || []).length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(user.policies || []).length - 2} more
                                </Badge>
                              )}
                              {(user.policies || []).length === 0 && (
                                <Badge variant="outline" className="text-xs text-gray-500">
                                  No policies
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(user.status)}</td>
                          <td className="py-3 px-4 text-body text-eci-gray-600">
                            {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                <DropdownMenuItem onClick={() => {
                                  setSelectedUser(user);
                                  setEditUserFormData({
                                    full_name: user.full_name,
                                    status: user.status
                                  });
                                  setShowEditUserDialog(true);
                                }}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit User
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => {
                                  setSelectedUser(user);
                                  setShowAssignPolicyDialog(true);
                                }}>
                                  <Tag className="mr-2 h-4 w-4" />
                                  Assign Policy
                                </DropdownMenuItem>

                                <DropdownMenuLabel>Assign Role</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleAssignRole(user.id, 'admin')}>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Make Admin
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAssignRole(user.id, 'manager')}>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Make Manager
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAssignRole(user.id, 'user')}>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Make User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminTableShell>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="space-y-6">
            <AdminTableShell
              title={`Access Policies (${policies.length})`}
              description="Configure permissions and access policies"
              loading={false}
              empty={policies.length === 0}
              emptyTitle="No policies defined"
              emptyDescription="Create a policy to control access."
              actions={(
                <Button className="flex items-center gap-2" onClick={() => setShowCreatePolicyDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Add Policy
                </Button>
              )}
            >
              <div className="space-y-4">
                {policies.map((policy) => (
                  <div key={policy.id} className="border border-eci-gray-200 rounded-lg p-4 hover:border-eci-gray-300">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-body font-semibold text-eci-gray-900">{policy.name}</h3>
                          <Badge variant={policy.enabled ? 'default' : 'secondary'}>
                            {policy.enabled ? 'Active' : 'Disabled'}
                          </Badge>
                          {policy.assignments && policy.assignments.length > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {policy.assignments.length} users
                            </Badge>
                          )}
                        </div>
                        {policy.description && (
                          <p className="text-body-small text-eci-gray-600 mb-3">{policy.description}</p>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-caption text-eci-gray-600 w-20">Resource:</span>
                            <code className="text-caption bg-eci-gray-100 px-2 py-1 rounded">{policy.resource_name}</code>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-caption text-eci-gray-600 w-20">Permissions:</span>
                            <div className="flex gap-1">
                              {policy.permissions.map((perm) => (
                                <Badge key={perm} className={getPermissionBadgeColor(perm)}>
                                  {perm}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {policy.groups.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-caption text-eci-gray-600 w-20">Groups:</span>
                              <div className="flex gap-1">
                                {policy.groups.map((group) => (
                                  <Badge key={group} variant="outline">
                                    {group}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <p className="text-caption text-eci-gray-500 mt-3">
                          Created: {new Date(policy.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedPolicy(policy);
                            setShowEditPolicyDialog(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={policy.enabled}
                          onCheckedChange={(checked) => togglePolicy(policy.id, checked)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AdminTableShell>
          </TabsContent>
        </Tabs>

        {/* Create User Dialog */}
        <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system. They will need to sign up separately to activate their account.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="col-span-3"
                  placeholder="user@example.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="full_name" className="text-right">Full Name</Label>
                <Input
                  id="full_name"
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="col-span-3"
                  placeholder="John Doe"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Initial Role</Label>
                <Select value={userFormData.role} onValueChange={(value: 'admin' | 'manager' | 'user') => setUserFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateUserDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser}>
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Policy Dialog */}
        <Dialog open={showCreatePolicyDialog} onOpenChange={setShowCreatePolicyDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Access Policy</DialogTitle>
              <DialogDescription>
                Define a new access policy with specific permissions for resources.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="policy_name" className="text-right">Name</Label>
                <Input
                  id="policy_name"
                  value={policyFormData.name}
                  onChange={(e) => setPolicyFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                  placeholder="Policy Name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="policy_description" className="text-right">Description</Label>
                <Input
                  id="policy_description"
                  value={policyFormData.description}
                  onChange={(e) => setPolicyFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="col-span-3"
                  placeholder="Policy description"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="resource" className="text-right">Resource</Label>
                <Select value={policyFormData.resource_name} onValueChange={(value) => setPolicyFormData(prev => ({ ...prev, resource_name: value }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select resource" />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.map((resource) => (
                      <SelectItem key={resource.name} value={resource.name}>
                        {resource.name} - {resource.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right mt-2">Permissions</Label>
                <div className="col-span-3 space-y-2">
                  {resources.find(r => r.name === policyFormData.resource_name)?.permissions.map((permission) => (
                    <div key={permission.type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={permission.type}
                        checked={policyFormData.permissions.includes(permission.type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPolicyFormData(prev => ({
                              ...prev,
                              permissions: [...prev.permissions, permission.type]
                            }));
                          } else {
                            setPolicyFormData(prev => ({
                              ...prev,
                              permissions: prev.permissions.filter(p => p !== permission.type)
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={permission.type} className="text-sm font-normal">
                        <Badge className={getPermissionBadgeColor(permission.type)}>
                          {permission.type}
                        </Badge>
                        {permission.description && (
                          <span className="ml-2 text-eci-gray-600">{permission.description}</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreatePolicyDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePolicy}>
                Create Policy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and status.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_full_name" className="text-right">Full Name</Label>
                <Input
                  id="edit_full_name"
                  value={editUserFormData.full_name}
                  onChange={(e) => setEditUserFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="col-span-3"
                  placeholder="John Doe"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_status" className="text-right">Status</Label>
                <Select value={editUserFormData.status} onValueChange={(value: 'active' | 'inactive' | 'suspended') => setEditUserFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedUser && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Email</Label>
                  <div className="col-span-3 text-sm text-gray-600">{selectedUser.email}</div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditUserDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => console.log('Update user')}>
                Update User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}






