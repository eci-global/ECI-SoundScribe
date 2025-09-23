
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

export const useUserRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'user' | 'moderator' | 'viewer' | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkUserRole = async () => {
      if (!user) {
        setIsAdmin(false);
        setUserRole(null);
        setUserRoles([]);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setError(null);
        
        // First check if user has any roles
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id);

        if (roleError) {
          // If user_roles table doesn't exist or other error, try to bootstrap first admin
          console.warn('Error fetching user roles:', roleError);
          
          // Check if this is the first user and should be made admin
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, created_at')
            .order('created_at', { ascending: true })
            .limit(1);
          
          if (!profilesError && profiles && profiles.length > 0) {
            const isFirstUser = profiles[0].id === user.id;
            
            if (isFirstUser) {
              // Try to grant admin role to first user
              try {
                const { error: grantError } = await supabase
                  .rpc('grant_admin_role', { target_user_id: user.id });
                
                if (!grantError) {
                  setIsAdmin(true);
                  setUserRole('admin');
                  setUserRoles([{
                    id: 'temp-id',
                    user_id: user.id,
                    role: 'admin',
                    created_at: new Date().toISOString()
                  }]);
                } else {
                  console.error('Failed to grant admin role:', grantError);
                  setIsAdmin(false);
                  setUserRole('user');
                  setUserRoles([]);
                }
              } catch (grantError) {
                console.error('Error granting admin role:', grantError);
                setIsAdmin(false);
                setUserRole('user');
                setUserRoles([]);
              }
            } else {
              setIsAdmin(false);
              setUserRole('user');
              setUserRoles([]);
            }
          } else {
            setIsAdmin(false);
            setUserRole('user');
            setUserRoles([]);
          }
        } else {
          // Successfully got role data
          const mappedRoles: UserRole[] = (roleData || []).map(role => ({
            id: role.id,
            user_id: role.user_id,
            role: role.role,
            created_at: role.created_at
          }));
          setUserRoles(mappedRoles);
          
          if (roleData && roleData.length > 0) {
            // Check if user has admin role
            const hasAdminRole = roleData.some(role => role.role === 'admin');
            setIsAdmin(hasAdminRole);
            
            // Set primary role (admin takes precedence, then user)
            if (hasAdminRole) {
              setUserRole('admin');
            } else {
              setUserRole('user');
            }
          } else {
            // No roles found - check if this should be the first admin
            const { data: adminCheck } = await supabase
              .from('user_roles')
              .select('id')
              .eq('role', 'admin')
              .limit(1);
              
            if (!adminCheck || adminCheck.length === 0) {
              // No admins exist, make this user admin
              try {
                const { error: grantError } = await supabase
                  .rpc('grant_admin_role', { target_user_id: user.id });
                
                if (!grantError) {
                  setIsAdmin(true);
                  setUserRole('admin');
                  // Refetch roles
                  const { data: newRoleData } = await supabase
                    .from('user_roles')
                    .select('*')
                    .eq('user_id', user.id);
                  const mappedNewRoles: UserRole[] = (newRoleData || []).map(role => ({
                    id: role.id,
                    user_id: role.user_id,
                    role: role.role,
                    created_at: role.created_at
                  }));
                  setUserRoles(mappedNewRoles);
                } else {
                  setIsAdmin(false);
                  setUserRole('user');
                  setUserRoles([]);
                }
              } catch (grantError) {
                console.error('Error granting admin role:', grantError);
                setIsAdmin(false);
                setUserRole('user');
                setUserRoles([]);
              }
            } else {
              // Admins exist, but this user has no roles - default to user
              setIsAdmin(false);
              setUserRole('user');
              setUserRoles([]);
            }
          }
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setError('Failed to check user permissions');
        setIsAdmin(false);
        setUserRole('user');
        setUserRoles([]);
      } finally {
        setLoading(false);
      }
    };

    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      console.warn('useUserRole - timeout reached, defaulting to user role');
      setIsAdmin(false);
      setUserRole('user');
      setUserRoles([]);
      setLoading(false);
      setError('Timeout checking user permissions');
    }, 8000); // 8 second timeout

    checkUserRole().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user]);

  // Function to refresh user roles
  const refreshUserRole = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      if (!error && roleData) {
        const mappedRefreshedRoles: UserRole[] = roleData.map(role => ({
          id: role.id,
          user_id: role.user_id,
          role: role.role,
          created_at: role.created_at
        }));
        setUserRoles(mappedRefreshedRoles);
        const hasAdminRole = roleData.some(role => role.role === 'admin');
        setIsAdmin(hasAdminRole);
        
        if (hasAdminRole) {
          setUserRole('admin');
        } else {
          setUserRole('user');
        }
      }
    } catch (error) {
      console.error('Error refreshing user role:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to check if user has specific permission
  const hasPermission = (requiredRole: 'admin' | 'moderator' | 'user' | 'viewer') => {
    if (!userRole) return false;
    
    const roleHierarchy = {
      admin: 4,
      moderator: 3,
      user: 2,
      viewer: 1
    };
    
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  };

  return { 
    isAdmin, 
    userRole, 
    userRoles, 
    loading, 
    error, 
    refreshUserRole, 
    hasPermission 
  };
};
