import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUserManagement, User } from '@/hooks/useUserManagement';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Search, Mail, Shield, MoreVertical, CheckCircle, XCircle, Edit, Trash2, UserCheck, UserX, RefreshCw, AlertTriangle, Activity, Download, Users, History, Eye } from 'lucide-react';
import { AdminTableShell } from '@/components/admin/AdminTableShell';

export default function UserManagement() {
  const { 
    users, 
    loading, 
    stats,
    fetchUsers,
    createUser,
    updateUserRole,
    updateUser,
    deleteUser
  } = useUserManagement();
  
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]); // For bulk operations
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'user' as 'admin' | 'manager' | 'user'
  });
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    status: 'active' as 'active' | 'inactive' | 'suspended'
  });

  // Apply filters to users
  let filteredUsers = users;
  
  if (searchQuery) {
    filteredUsers = users.filter(user => 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  if (roleFilter !== 'all') {
    filteredUsers = filteredUsers.filter(user => 
      user.roles.some(role => role.role === roleFilter)
    );
  }
  
  if (statusFilter !== 'all') {
    // Note: Status filtering will work once the status column is added to the database
    // For now, all users are considered 'active'
    filteredUsers = filteredUsers.filter(user => user.status === 'active');
  }

  // Handle user creation
  const handleCreateUser = async () => {
    if (!formData.email || !formData.full_name) {
      toast({
        title: "Error",
        description: "Email and full name are required",
        variant: "destructive"
      });
      return;
    }

    const success = await createUser(formData);
    if (success) {
      toast({
        title: "Success",
        description: "User created successfully"
      });
      setShowCreateDialog(false);
      setFormData({ email: '', full_name: '', role: 'user' });
    } else {
      toast({
        title: "Error", 
        description: "Failed to create user",
        variant: "destructive"
      });
    }
  };

  // Handle role assignment
  const handleAssignRole = async (userId: string, role: 'admin' | 'manager' | 'user') => {
    const success = await updateUserRole(userId, role);
    if (success) {
      toast({
        title: "Success",
        description: `Role ${role} assigned successfully`
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to assign role",
        variant: "destructive"
      });
    }
  };

  // Handle role removal - simplified to just update to 'user' role
  const handleRemoveRole = async (userId: string) => {
    const success = await updateUserRole(userId, 'user');
    if (success) {
      toast({
        title: "Success",
        description: "Role updated to user"
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive"
      });
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
    const success = await deleteUser(userId);
    if (success) {
      toast({
        title: "Success",
        description: "User deleted successfully"
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  // Handle user update
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    if (!editFormData.full_name) {
      toast({
        title: "Error",
        description: "Full name is required",
        variant: "destructive"
      });
      return;
    }

    const success = await updateUser(selectedUser.id, {
      full_name: editFormData.full_name
      // Note: status updates will be available once the database schema is updated
    });

    if (success) {
      setShowEditDialog(false);
      setSelectedUser(null);
    }
  };

  // Handle bulk operations
  const handleBulkDelete = async () => {
    const deletePromises = selectedUsers.map(userId => deleteUser(userId));
    const results = await Promise.all(deletePromises);
    const successCount = results.filter(Boolean).length;
    
    if (successCount === selectedUsers.length) {
      toast({
        title: "Success",
        description: `${successCount} users deleted successfully`
      });
    } else {
      toast({
        title: "Partial Success",
        description: `${successCount} of ${selectedUsers.length} users deleted`,
        variant: "destructive"
      });
    }
    setSelectedUsers([]);
  };

  const handleBulkRoleAssign = async (role: 'admin' | 'manager' | 'user') => {
    const assignPromises = selectedUsers.map(userId => updateUserRole(userId, role));
    const results = await Promise.all(assignPromises);
    const successCount = results.filter(Boolean).length;
    
    if (successCount === selectedUsers.length) {
      toast({
        title: "Success",
        description: `${role} role assigned to ${successCount} users`
      });
    } else {
      toast({
        title: "Partial Success",
        description: `Role assigned to ${successCount} of ${selectedUsers.length} users`,
        variant: "destructive"
      });
    }
    setSelectedUsers([]);
  };

  // Handle export
  const handleExportUsers = () => {
    const csvData = [
      ['Name', 'Email', 'Roles', 'Status', 'Created Date', 'Last Sign In'],
      ...filteredUsers.map(user => [
        user.full_name,
        user.email,
        user.roles.map(r => r.role).join(', '),
        user.status,
        new Date(user.created_at).toLocaleDateString(),
        user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'
      ])
    ];
    
    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Success",
      description: "User data exported successfully"
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  // Open edit dialog
  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      full_name: user.full_name,
      status: user.status
    });
    setShowEditDialog(true);
  };

  // Open activity history dialog
  const openActivityDialog = async (user: User) => {
    setSelectedUser(user);
    setShowActivityDialog(true);
    setActivityLoading(true);
    
    try {
      // Fetch user's recent activity from recordings table
      const { data: recordings, error: recordingsError } = await supabase
        .from('recordings')
        .select('title, created_at, duration, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (recordingsError) {
        console.error('Error fetching user activity:', recordingsError);
        setUserActivity([]);
      } else {
        setUserActivity(recordings || []);
      }
    } catch (error) {
      console.error('Error fetching user activity:', error);
      setUserActivity([]);
    } finally {
      setActivityLoading(false);
    }
  };

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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-display text-eci-gray-900 mb-2">User Management</h1>
                <p className="text-body text-eci-gray-600">Manage user accounts and permissions</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => fetchUsers()}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Note: Error banner removed as hook doesn't return error */}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
            <div className="rounded-2xl border border-eci-gray-200 bg-white p-5">
              <p className="text-caption text-eci-gray-500">Total Users</p>
              <p className="mt-2 text-title font-semibold text-eci-gray-900">{stats.totalUsers}</p>
            </div>
            <div className="rounded-2xl border border-eci-gray-200 bg-white p-5">
              <p className="text-caption text-eci-gray-500">Active</p>
              <p className="mt-2 text-title font-semibold text-eci-gray-900">{stats.activeUsers}</p>
            </div>
            <div className="rounded-2xl border border-eci-gray-200 bg-white p-5">
              <p className="text-caption text-eci-gray-500">Admins</p>
              <p className="mt-2 text-title font-semibold text-eci-gray-900">{stats.admins}</p>
            </div>
            <div className="rounded-2xl border border-eci-gray-200 bg-white p-5">
              <p className="text-caption text-eci-gray-500">New This Month</p>
              <p className="mt-2 text-title font-semibold text-eci-gray-900">{stats.newUsersThisMonth}</p>
            </div>
          </div>

          <AdminTableShell
            title={`Users (${filteredUsers.length})`}
            description="Manage user accounts and permissions"
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
                    <Button size="sm" variant="outline" onClick={() => handleBulkRoleAssign('admin')}>
                      Make Admin
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkRoleAssign('manager')}>
                      Make Manager
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkRoleAssign('user')}>
                      Make User
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                      Delete
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
                  <Button variant="outline" onClick={handleExportUsers} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                  <Button className="flex items-center gap-2" onClick={() => setShowCreateDialog(true)}>
                    <UserPlus className="h-4 w-4" />
                    Add User
                  </Button>
                </div>
              </div>

            </div>

              {/* Users table */}
              {filteredUsers.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-eci-gray-200">
                        <th className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                            onChange={handleSelectAll}
                            className="rounded"
                          />
                        </th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">User</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Roles</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Status</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Last Active</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Created</th>
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
                              {user.roles.map((role) => (
                                <Badge key={role.id} variant="outline" className="text-xs flex items-center gap-1">
                                  <Shield className="h-3 w-3" />
                                  {role.role}
                                  {user.roles.length > 1 && (
                                     <button
                                       onClick={() => handleRemoveRole(user.id)}
                                       className="ml-1 text-red-500 hover:text-red-700"
                                     >
                                       <XCircle className="h-3 w-3" />
                                     </button>
                                  )}
                                </Badge>
                              ))}
                              {user.roles.length === 0 && (
                                <Badge variant="outline" className="text-xs text-gray-500">
                                  No roles
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(user.status)}</td>
                          <td className="py-3 px-4 text-body text-eci-gray-600">
                            {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="py-3 px-4 text-body text-eci-gray-600">
                            {new Date(user.created_at).toLocaleDateString()}
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
                                
                                <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit User
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem onClick={() => openActivityDialog(user)}>
                                  <History className="mr-2 h-4 w-4" />
                                  View Activity
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
                                
                                <DropdownMenuSeparator />
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete User
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will remove all roles from {user.full_name} and effectively delete their access. 
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
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

          {/* Create User Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="col-span-3"
                    placeholder="user@example.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="full_name" className="text-right">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="col-span-3"
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">Initial Role</Label>
                  <Select value={formData.role} onValueChange={(value: 'admin' | 'manager' | 'user') => setFormData(prev => ({ ...prev, role: value as 'admin' | 'manager' | 'user' }))}>
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
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser}>
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
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
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="col-span-3"
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_status" className="text-right">Status</Label>
                  <Select value={editFormData.status} onValueChange={(value: 'active' | 'inactive' | 'suspended') => setEditFormData(prev => ({ ...prev, status: value }))}>
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
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateUser}>
                  Update User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* User Activity Dialog */}
          <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>User Activity History</DialogTitle>
                <DialogDescription>
                  Recent activity for {selectedUser?.full_name}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {activityLoading ? (
                  <div className="text-center py-8">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-eci-red"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading activity...</p>
                  </div>
                ) : userActivity.length > 0 ? (
                  <div className="space-y-3">
                    {userActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-blue-100 p-2">
                            <Activity className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{activity.title || 'Recording'}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(activity.created_at).toLocaleDateString()} at {new Date(activity.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {activity.duration && (
                            <p className="text-sm text-gray-600">{Math.round(activity.duration / 60)}m</p>
                          )}
                          <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                            {activity.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Eye className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <p className="text-gray-600">No recent activity found</p>
                    <p className="text-sm text-gray-500">This user hasn't created any recordings yet.</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowActivityDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </AdminLayout>
  );
}
