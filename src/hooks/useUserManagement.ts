
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';

export interface UserRole {
  id: string;
  role: 'admin' | 'manager' | 'user';
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
  roles: UserRole[];
  status: 'active' | 'inactive' | 'suspended';
  metadata: Record<string, any>;
}

export interface UserManagementStats {
  totalUsers: number;
  activeUsers: number;
  admins: number;
  newUsersThisMonth: number;
}

interface AdminUsersResponse {
  success: boolean;
  users: User[];
  stats: UserManagementStats;
}

export const useUserManagement = () => {
  const { user: currentUser } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<UserManagementStats>({
    totalUsers: 0,
    activeUsers: 0,
    admins: 0,
    newUsersThisMonth: 0
  });

  // Fetch users with their roles
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) {
      toast({
        title: "Access denied",
        description: "You don't have permission to view users",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<AdminUsersResponse>('list-admin-users');

      if (error) {
        throw error;
      }

      const allUsers = data?.users || [];

      setUsers(allUsers);
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      setStats(
        data?.stats || {
          totalUsers: allUsers.length,
          activeUsers: allUsers.filter((user) => user.status === 'active').length,
          admins: allUsers.filter((user) => user.roles.some((role) => role.role === 'admin')).length,
          newUsersThisMonth: allUsers.filter((user) => new Date(user.created_at) >= monthStart).length,
        }
      );

    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, toast]);

  // Create new user
  const createUser = useCallback(async (userData: {
    email: string;
    full_name: string;
    role?: 'admin' | 'user';
  }) => {
    if (!isAdmin) {
      toast({
        title: "Access denied",
        description: "You don't have permission to create users",
        variant: "destructive"
      });
      return false;
    }

    try {
      // In a real implementation, you'd call an edge function to create the auth user
      // For now, we'll simulate by creating a profile entry
      const userId = crypto.randomUUID();
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userData.email,
          full_name: userData.full_name
        });

      if (profileError) throw profileError;

      // Assign role
      if (userData.role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: userData.role
          });

        if (roleError) {
          console.warn('Could not assign role:', roleError);
        }
      }

      toast({
        title: "User created",
        description: `${userData.full_name} has been created successfully`
      });

      // Refresh users list
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Creation failed",
        description: error instanceof Error ? error.message : 'Failed to create user',
        variant: "destructive"
      });
      return false;
    }
  }, [isAdmin, toast, fetchUsers]);

  // Update user role
  const updateUserRole = useCallback(async (userId: string, newRole: 'admin' | 'manager' | 'user') => {
    if (!isAdmin) {
      toast({
        title: "Access denied",
        description: "You don't have permission to update user roles",
        variant: "destructive"
      });
      return false;
    }

    try {
      // First, remove existing roles for this user
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Then add the new role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: newRole
        });

      if (error) throw error;

      toast({
        title: "Role updated",
        description: `User role has been updated to ${newRole}`
      });

      // Refresh users list
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : 'Failed to update user role',
        variant: "destructive"
      });
      return false;
    }
  }, [isAdmin, toast, fetchUsers]);

  // Update user profile
  const updateUser = useCallback(async (userId: string, userData: {
    full_name?: string;
    status?: 'active' | 'inactive' | 'suspended';
  }) => {
    if (!isAdmin) {
      toast({
        title: "Access denied",
        description: "You don't have permission to update users",
        variant: "destructive"
      });
      return false;
    }

    try {
      const updateData: any = {};
      if (userData.full_name !== undefined) {
        updateData.full_name = userData.full_name;
      }
      // Note: status updates will work once the status column is added to the database
      // For now, we'll only update the full_name

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "User updated",
        description: "User has been updated successfully"
      });

      // Refresh users list
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : 'Failed to update user',
        variant: "destructive"
      });
      return false;
    }
  }, [isAdmin, toast, fetchUsers]);

  // Delete user
  const deleteUser = useCallback(async (userId: string) => {
    if (!isAdmin) {
      toast({
        title: "Access denied",
        description: "You don't have permission to delete users",
        variant: "destructive"
      });
      return false;
    }

    if (userId === currentUser?.id) {
      toast({
        title: "Cannot delete",
        description: "You cannot delete your own account",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Delete user roles first
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Delete profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "User deleted",
        description: "User has been deleted successfully"
      });

      // Refresh users list
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : 'Failed to delete user',
        variant: "destructive"
      });
      return false;
    }
  }, [isAdmin, currentUser?.id, toast, fetchUsers]);

  // Load users on mount
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  return {
    users,
    loading,
    stats,
    fetchUsers,
    createUser,
    updateUserRole,
    updateUser,
    deleteUser
  };
};
