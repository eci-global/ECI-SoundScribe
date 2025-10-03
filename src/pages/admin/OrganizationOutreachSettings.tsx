import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building,
  Settings,
  Users,
  Zap,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Shield,
  Database,
  Clock,
  TrendingUp,
  UserCheck,
  Search,
  Plus,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { AdminFormShell } from '@/components/admin/AdminFormShell';
import { AdminTableShell } from '@/components/admin/AdminTableShell';

interface OrganizationConnection {
  id: string;
  organization_id: string;
  connection_name: string;
  outreach_user_email: string;
  outreach_org_id: string;
  is_active: boolean;
  token_expires_at: string;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  prospect_email: string;
  prospect_name: string;
  prospect_company: string;
  prospect_title: string;
  auto_discovered: boolean;
  is_active: boolean;
  last_synced_at: string;
  user_email?: string;
}

interface SyncLog {
  id: string;
  operation_type: string;
  status: string;
  records_processed: number;
  records_successful: number;
  records_failed: number;
  started_at: string;
  completed_at: string;
}

export default function OrganizationOutreachSettings() {
  const { toast } = useToast();
  const [connection, setConnection] = useState<OrganizationConnection | null>(null);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [connectionName, setConnectionName] = useState('Default Organization Connection');

  useEffect(() => {
    loadOrganizationData();
  }, []);

  const loadOrganizationData = async () => {
    setIsLoading(true);
    try {
      // Load organization connection from existing outreach_connections
      const { data: connectionData, error: connectionError } = await supabase
        .from('outreach_connections')
        .select('*')
        .limit(1);

      if (!connectionError && connectionData && connectionData.length > 0) {
        const conn = connectionData[0];
        const mockConnection: OrganizationConnection = {
          id: conn.id,
          organization_id: conn.outreach_org_id || 'org-1',
          connection_name: 'Organization Connection',
          outreach_user_email: conn.outreach_user_email || '',
          outreach_org_id: conn.outreach_org_id || '',
          is_active: true,
          token_expires_at: conn.token_expires_at,
          created_at: conn.created_at,
          updated_at: conn.updated_at
        };
        
        setConnection(mockConnection);
        setOrganizationId(mockConnection.organization_id);
        setConnectionName(mockConnection.connection_name);

        // Load user profiles from existing profiles table
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!profilesError && profilesData) {
          const mockProfiles: UserProfile[] = profilesData.map(p => ({
            id: p.id,
            user_id: p.id,
            prospect_email: p.email,
            prospect_name: p.full_name || p.email,
            prospect_company: '',
            prospect_title: '',
            auto_discovered: false,
            is_active: true,
            last_synced_at: p.updated_at,
            user_email: p.email
          }));
          setUserProfiles(mockProfiles);
        }

        // Load sync logs from existing outreach_sync_logs
        const { data: logsData, error: logsError } = await supabase
          .from('outreach_sync_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!logsError && logsData) {
          const mockSyncLogs: SyncLog[] = logsData.map(log => ({
            id: log.id,
            operation_type: log.sync_type,
            status: log.status,
            records_processed: 1,
            records_successful: log.status === 'success' ? 1 : 0,
            records_failed: log.status === 'failure' ? 1 : 0,
            started_at: log.created_at,
            completed_at: log.created_at
          }));
          setSyncLogs(mockSyncLogs);
        }
      }
    } catch (error: any) {
      console.error('Error loading organization data:', error);
      toast({
        title: "Error Loading Data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectOrganization = async () => {
    if (!organizationId.trim()) {
      toast({
        title: "Organization ID Required",
        description: "Please enter your organization domain or identifier.",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    try {
      // Redirect to OAuth flow with organization context
      const authUrl = new URL('/integrations/outreach/connect', window.location.origin);
      authUrl.searchParams.set('organization_id', organizationId);
      authUrl.searchParams.set('connection_name', connectionName);
      authUrl.searchParams.set('is_organization', 'true');
      
      window.open(authUrl.toString(), '_blank');
      
      toast({
        title: "Redirecting to Outreach",
        description: "Complete the OAuth flow to connect your organization.",
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDiscoverUsers = async () => {
    if (!connection) return;

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('discover-organization-users', {
        body: {
          organizationConnectionId: connection.id,
          organizationId: connection.organization_id
        }
      });

      if (error) throw error;

      toast({
        title: "User Discovery Started",
        description: `Discovering users for ${connection.organization_id}...`,
      });

      // Reload data after discovery
      setTimeout(() => {
        loadOrganizationData();
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Discovery Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFullSync = async () => {
    if (!connection) return;

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-organization-calls', {
        body: {
          organizationConnectionId: connection.id,
          syncType: 'full'
        }
      });

      if (error) throw error;

      toast({
        title: "Full Sync Started",
        description: "Syncing all Outreach calls for the organization...",
      });

      // Reload data after sync
      setTimeout(() => {
        loadOrganizationData();
      }, 5000);

    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;

    try {
      // Mock disconnect for now since we're using outreach_connections table
      const { error } = await supabase
        .from('outreach_connections')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;

      setConnection(null);
      setUserProfiles([]);
      setSyncLogs([]);

      toast({
        title: "Organization Disconnected",
        description: "Outreach integration has been disabled for the organization.",
      });
    } catch (error: any) {
      toast({
        title: "Disconnect Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
            <span className="text-gray-600">Loading organization settings...</span>
          </div>
        </div>
      
    );
  }

  return (
    
      <div className="h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Building className="h-6 w-6 text-blue-600" />
            Organization Outreach Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Manage company-wide Outreach.io integration for all users
          </p>
        </div>
        
        {connection && (
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800">Connected</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://app.outreach.io', '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Open Outreach
            </Button>
          </div>
        )}
      </div>

      {!connection ? (
        /* Setup Flow */
        <AdminFormShell
          title="Connect Organization to Outreach"
          description="Set up organization-wide integration so all users can access their Outreach calls"
          icon={Settings}
          isSubmitting={isConnecting}
          actions={(
            <Button
              onClick={handleConnectOrganization}
              disabled={isConnecting || !organizationId.trim()}
              className="min-w-48"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect to Outreach
                </>
              )}
            </Button>
          )}
        >
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="organizationId">Organization Domain/ID</Label>
                <Input
                  id="organizationId"
                  placeholder="example.com"
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Usually your company email domain (e.g., company.com)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="connectionName">Connection Name</Label>
                <Input
                  id="connectionName"
                  placeholder="Default Organization Connection"
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                />
              </div>
            </div>
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Admin Setup:</strong> This will create an organization-wide connection that allows 
                all users to see their Outreach calls without individual OAuth setup.
              </AlertDescription>
            </Alert>
        </AdminFormShell>
      ) : (
        /* Management Interface */
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">User Mapping</TabsTrigger>
            <TabsTrigger value="sync">Sync Operations</TabsTrigger>
            <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Connection Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-semibold">Active</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Connected as {connection.outreach_user_email}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Mapped Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">{userProfiles.length}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Users with Outreach access
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Token Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span className="font-semibold text-sm">
                      Expires {formatDistanceToNow(new Date(connection.token_expires_at), { addSuffix: true })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Organization Integration</CardTitle>
                <CardDescription>
                  Manage your organization-wide Outreach integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Organization</Label>
                    <p className="text-sm text-gray-600">{connection.organization_id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Connection Name</Label>
                    <p className="text-sm text-gray-600">{connection.connection_name}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleDiscoverUsers}
                    disabled={isSyncing}
                    variant="outline"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Discover Users
                  </Button>
                  <Button
                    onClick={handleFullSync}
                    disabled={isSyncing}
                    variant="outline"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Full Sync
                  </Button>
                  <Button
                    onClick={handleDisconnect}
                    variant="destructive"
                    className="ml-auto"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Mapping Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User-Prospect Mapping</CardTitle>
                    <CardDescription>
                      Internal users mapped to Outreach prospects
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={handleDiscoverUsers} disabled={isSyncing}>
                    <Plus className="h-4 w-4 mr-2" />
                    Discover More
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {userProfiles.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Mapped</h3>
                    <p className="text-gray-600 mb-4">
                      Run user discovery to automatically map internal users to Outreach prospects
                    </p>
                    <Button onClick={handleDiscoverUsers} disabled={isSyncing}>
                      <Search className="h-4 w-4 mr-2" />
                      Discover Users
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userProfiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{profile.prospect_name}</span>
                            {profile.auto_discovered && (
                              <Badge variant="outline" className="text-xs">Auto-discovered</Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {profile.user_email} → {profile.prospect_email}
                            {profile.prospect_company && ` • ${profile.prospect_company}`}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge className={
                            profile.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }>
                            {profile.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sync Operations Tab */}
          <TabsContent value="sync" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync Operations</CardTitle>
                <CardDescription>
                  Manage data synchronization between Echo AI and Outreach
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Button
                    onClick={handleDiscoverUsers}
                    disabled={isSyncing}
                    variant="outline"
                    className="h-20 flex-col"
                  >
                    <Search className="h-6 w-6 mb-2" />
                    <span className="font-medium">Discover Users</span>
                    <span className="text-xs text-gray-500">Find prospects by email domain</span>
                  </Button>
                  
                  <Button
                    onClick={handleFullSync}
                    disabled={isSyncing}
                    variant="outline"
                    className="h-20 flex-col"
                  >
                    <Database className="h-6 w-6 mb-2" />
                    <span className="font-medium">Full Sync</span>
                    <span className="text-xs text-gray-500">Sync all Outreach call data</span>
                  </Button>
                </div>
                
                {isSyncing && (
                  <Alert>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      Sync operation in progress. This may take several minutes...
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync Activity Logs</CardTitle>
                <CardDescription>
                  Recent synchronization operations and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {syncLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
                    <p className="text-gray-600">
                      Sync operations will appear here once you start using the integration
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {syncLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(log.status)}
                          <div>
                            <div className="font-medium text-sm">
                              {log.operation_type.replace('_', ' ').toUpperCase()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {log.records_successful}/{log.records_processed} successful
                          </div>
                          {log.records_failed > 0 && (
                            <div className="text-xs text-red-600">
                              {log.records_failed} failed
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
        </div>
      </div>
    
  );
}
