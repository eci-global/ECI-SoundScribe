import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Mail
} from 'lucide-react';
import * as ssoService from '@/services/ssoService';
import { supabase } from '@/integrations/supabase/client';

interface UserSSOStatus {
  user_id: string;
  email: string;
  full_name: string;
  sso_required: boolean;
  sso_provider: string | null;
  okta_user_id: string | null;
  okta_email: string | null;
  updated_at: string;
}

interface SSOEnforcementLog {
  id: string;
  user_id: string;
  action: string;
  reason: string;
  changed_by: string;
  created_at: string;
  user_email?: string;
  admin_email?: string;
}

export default function SSOManagement() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserSSOStatus[]>([]);
  const [enforcementLogs, setEnforcementLogs] = useState<SSOEnforcementLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Bulk enable dialog state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkDomain, setBulkDomain] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Toggle SSO dialog state
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSSOStatus | null>(null);
  const [toggleReason, setToggleReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadUsers(),
        loadEnforcementLogs()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load SSO management data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    // Get all users with their SSO settings
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .order('email');

    if (usersError) {
      console.error('Error loading users:', usersError);
      throw usersError;
    }

    // Get SSO settings for all users
    const { data: ssoData, error: ssoError } = await supabase
      .from('user_sso_settings')
      .select('*');

    if (ssoError) {
      console.error('Error loading SSO settings:', ssoError);
      throw ssoError;
    }

    // Combine user data with SSO settings
    const combinedData: UserSSOStatus[] = usersData.map(u => {
      const ssoSettings = ssoData?.find(s => s.user_id === u.id);
      return {
        user_id: u.id,
        email: u.email,
        full_name: u.full_name || 'Unknown',
        sso_required: ssoSettings?.sso_required || false,
        sso_provider: ssoSettings?.sso_provider || null,
        okta_user_id: ssoSettings?.okta_user_id || null,
        okta_email: ssoSettings?.okta_email || null,
        updated_at: ssoSettings?.updated_at || u.created_at
      };
    });

    setUsers(combinedData);
  };

  const loadEnforcementLogs = async () => {
    const { data, error } = await supabase
      .from('sso_enforcement_log')
      .select(`
        *,
        user:users!user_id(email),
        admin:users!changed_by(email)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading enforcement logs:', error);
      throw error;
    }

    const formattedLogs: SSOEnforcementLog[] = data.map((log: any) => ({
      id: log.id,
      user_id: log.user_id,
      action: log.action,
      reason: log.reason,
      changed_by: log.changed_by,
      created_at: log.created_at,
      user_email: log.user?.email || 'Unknown',
      admin_email: log.admin?.email || 'System'
    }));

    setEnforcementLogs(formattedLogs);
  };

  const handleToggleSSO = async (userToToggle: UserSSOStatus) => {
    setSelectedUser(userToToggle);
    setToggleReason('');
    setToggleDialogOpen(true);
  };

  const confirmToggleSSO = async () => {
    if (!selectedUser || !user) return;

    if (!toggleReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for this change",
        variant: "destructive"
      });
      return;
    }

    try {
      setActionLoading(selectedUser.user_id);

      if (selectedUser.sso_required) {
        // Disable SSO
        await ssoService.disableSSORequirement(
          selectedUser.user_id,
          toggleReason,
          user.id
        );

        toast({
          title: "SSO Disabled",
          description: `SSO requirement removed for ${selectedUser.email}`
        });
      } else {
        // Enable SSO
        await ssoService.enableSSORequirement(
          selectedUser.user_id,
          toggleReason,
          user.id
        );

        toast({
          title: "SSO Enabled",
          description: `SSO now required for ${selectedUser.email}`
        });
      }

      await loadData();
      setToggleDialogOpen(false);
      setSelectedUser(null);
      setToggleReason('');
    } catch (error) {
      console.error('Error toggling SSO:', error);
      toast({
        title: "Error",
        description: "Failed to update SSO requirement",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkEnable = async () => {
    if (!user) return;

    if (!bulkDomain.trim()) {
      toast({
        title: "Domain Required",
        description: "Please enter an email domain",
        variant: "destructive"
      });
      return;
    }

    if (!bulkReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for bulk SSO enablement",
        variant: "destructive"
      });
      return;
    }

    try {
      setBulkProcessing(true);

      const result = await ssoService.bulkEnableSSOByDomain(
        bulkDomain,
        bulkReason,
        user.id
      );

      toast({
        title: "Bulk SSO Enabled",
        description: `Successfully enabled SSO for ${result.success.length} users. Failed: ${result.failed.length}`,
        variant: result.failed.length > 0 ? "default" : "default"
      });

      await loadData();
      setBulkDialogOpen(false);
      setBulkDomain('');
      setBulkReason('');
    } catch (error) {
      console.error('Error enabling bulk SSO:', error);
      toast({
        title: "Error",
        description: "Failed to enable bulk SSO",
        variant: "destructive"
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ssoEnabledCount = users.filter(u => u.sso_required).length;
  const oktaLinkedCount = users.filter(u => u.okta_user_id).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-blue-500" />
          SSO Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage Okta SSO requirements and monitor user authentication status
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">SSO Required</p>
                <p className="text-3xl font-bold">{ssoEnabledCount}</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Okta Linked</p>
                <p className="text-3xl font-bold">{oktaLinkedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Actions Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Users</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by email or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <Button onClick={() => setBulkDialogOpen(true)}>
                    <Mail className="mr-2 h-4 w-4" />
                    Bulk Enable by Domain
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>
                Manage SSO requirements for individual users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>SSO Status</TableHead>
                      <TableHead>Okta Linked</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((u) => (
                        <TableRow key={u.user_id}>
                          <TableCell className="font-medium">{u.email}</TableCell>
                          <TableCell>{u.full_name}</TableCell>
                          <TableCell>
                            {u.sso_required ? (
                              <Badge variant="default" className="bg-green-500">
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                Required
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <ShieldOff className="mr-1 h-3 w-3" />
                                Optional
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {u.okta_user_id ? (
                              <Badge variant="outline" className="border-purple-500 text-purple-700">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Linked
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                Not Linked
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(u.updated_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant={u.sso_required ? "destructive" : "default"}
                              onClick={() => handleToggleSSO(u)}
                              disabled={actionLoading === u.user_id}
                            >
                              {actionLoading === u.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : u.sso_required ? (
                                <>
                                  <ShieldOff className="mr-1 h-4 w-4" />
                                  Disable SSO
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="mr-1 h-4 w-4" />
                                  Enable SSO
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SSO Enforcement Audit Log</CardTitle>
              <CardDescription>
                Complete history of SSO requirement changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Changed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enforcementLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No audit logs yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      enforcementLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {new Date(log.created_at).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{log.user_email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                log.action === 'enabled'
                                  ? 'default'
                                  : log.action === 'disabled'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{log.reason}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.admin_email}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Enable Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Enable SSO by Domain</DialogTitle>
            <DialogDescription>
              Enable SSO requirement for all users with a specific email domain
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="domain">Email Domain</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={bulkDomain}
                onChange={(e) => setBulkDomain(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                All users with @{bulkDomain || 'domain.com'} will be affected
              </p>
            </div>
            <div>
              <Label htmlFor="bulkReason">Reason</Label>
              <Input
                id="bulkReason"
                placeholder="Company security policy"
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
              />
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will require SSO for all matching users. They will no longer be able to sign in with passwords.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkEnable} disabled={bulkProcessing}>
              {bulkProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enable SSO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle SSO Dialog */}
      <Dialog open={toggleDialogOpen} onOpenChange={setToggleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.sso_required ? 'Disable' : 'Enable'} SSO Requirement
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.sso_required
                ? `Allow ${selectedUser.email} to sign in with password again`
                : `Require ${selectedUser?.email} to use Okta SSO for authentication`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="toggleReason">Reason</Label>
              <Input
                id="toggleReason"
                placeholder="Enter reason for this change..."
                value={toggleReason}
                onChange={(e) => setToggleReason(e.target.value)}
              />
            </div>
            <Alert variant={selectedUser?.sso_required ? "default" : "default"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {selectedUser?.sso_required
                  ? 'This user will be able to sign in with their password again.'
                  : 'This user will no longer be able to sign in with their password. They must use Okta SSO.'}
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmToggleSSO}
              variant={selectedUser?.sso_required ? "destructive" : "default"}
            >
              {selectedUser?.sso_required ? 'Disable SSO' : 'Enable SSO'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
