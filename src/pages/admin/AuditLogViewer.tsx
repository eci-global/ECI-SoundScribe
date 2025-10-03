import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Shield, 
  FileEdit, 
  UserPlus, 
  Trash2, 
  Download,
  Settings,
  Search,
  Activity,
  RefreshCw,
  AlertTriangle,
  Filter,
  Clock,
  XCircle
} from 'lucide-react';

interface AuditLog {
  id: string;
  created_at: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_values?: any;
  new_values?: any;
  metadata?: any;
  ip_address?: string;
  severity: 'info' | 'warning' | 'critical' | 'error';
  status: 'success' | 'failure' | 'pending';
  error_message?: string;
}

export default function AuditLogViewer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { isAdmin } = useUserRole();
  const { toast } = useToast();

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (fetchError) throw fetchError;

      // Transform the data to ensure proper typing
      const transformedLogs: AuditLog[] = (data || []).map(log => ({
        id: log.id,
        created_at: log.created_at,
        user_email: (log.metadata as any)?.user_email || 'Unknown',
        action: log.action,
        resource_type: log.resource_type,
        resource_id: log.resource_id || '',
        old_values: (log.metadata as any)?.old_values,
        new_values: (log.metadata as any)?.new_values,
        metadata: log.metadata,
        ip_address: (log.metadata as any)?.ip_address?.toString() || '',
        severity: (log.metadata as any)?.severity as 'info' | 'warning' | 'critical' | 'error' || 'info',
        status: (log.metadata as any)?.status as 'success' | 'failure' | 'pending' || 'success',
        error_message: (log.metadata as any)?.error_message
      }));

      setAuditLogs(transformedLogs);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError(err.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAuditLogs();
    }
  }, [isAdmin]);

  // Filter audit logs
  const filteredLogs = auditLogs.filter(log => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!(
        log.user_email.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.resource_type.toLowerCase().includes(query)
      )) {
        return false;
      }
    }

    // Severity filter
    if (severityFilter !== 'all' && log.severity !== severityFilter) {
      return false;
    }

    // Action filter
    if (actionFilter !== 'all' && !log.action.includes(actionFilter)) {
      return false;
    }

    return true;
  });

  // Export audit logs
  const exportAuditLogs = async () => {
    try {
      const csvData = filteredLogs.map(log => ({
        Timestamp: new Date(log.created_at).toLocaleString(),
        User: log.user_email,
        Action: log.action,
        Resource: log.resource_type,
        'Resource ID': log.resource_id,
        Severity: log.severity,
        Status: log.status,
        'IP Address': log.ip_address || '',
        Details: JSON.stringify(log.metadata || {})
      }));

      const csv = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Audit logs exported successfully"
      });

    } catch (err) {
      console.error('Error exporting audit logs:', err);
      toast({
        title: "Error",
        description: "Failed to export audit logs",
        variant: "destructive"
      });
    }
  };

  const getActionIcon = (action: string) => {
    const icons = {
      'create_user': UserPlus,
      'update_user': User,
      'delete_user': Trash2,
      'assign_role': Shield,
      'remove_role': Shield,
      'admin_session_start': Activity,
      'admin_session_end': Activity,
      'create': FileEdit,
      'update': FileEdit,
      'delete': Trash2,
      'settings.update': Settings,
      'permission.grant': Shield,
      'permission.revoke': Shield
    };
    const Icon = icons[action as keyof typeof icons] || Activity;
    return <Icon className="h-4 w-4" />;
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      info: 'bg-blue-100 text-blue-800',
      warning: 'bg-orange-100 text-orange-800', 
      critical: 'bg-red-100 text-red-800',
      error: 'bg-red-100 text-red-800'
    };
    return <Badge className={variants[severity as keyof typeof variants] || variants.info}>{severity}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'bg-green-100 text-green-800',
      failure: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return <Badge className={variants[status as keyof typeof variants] || variants.success}>{status}</Badge>;
  };

  // Get unique actions for filters
  const uniqueActions = Array.from(new Set(auditLogs.map(log => log.action.split('_')[0] || log.action)));

  // Format details for display
  const formatDetails = (log: AuditLog) => {
    if (log.error_message) {
      return log.error_message;
    }
    
    if (log.metadata && typeof log.metadata === 'object') {
      return Object.entries(log.metadata)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }
    
    return 'No additional details';
  };

  if (!isAdmin) {
    return (
      
        <div className="h-full overflow-y-auto">
          <div className="max-w-7xl mx-auto p-8">
            <div className="text-center py-12">
              <Shield className="h-16 w-16 mx-auto mb-4 text-eci-gray-400" />
              <h2 className="text-title text-eci-gray-900 mb-2">Access Denied</h2>
              <p className="text-body text-eci-gray-600">You need admin privileges to view audit logs.</p>
            </div>
          </div>
        </div>
      
    );
  }

  return (
    
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-display text-eci-gray-900 mb-2">Audit Log Viewer</h1>
                <p className="text-body text-eci-gray-600">Monitor system activity and security events</p>
              </div>
              
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={fetchAuditLogs}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={exportAuditLogs}
                  disabled={filteredLogs.length === 0}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <p className="text-red-800">{error}</p>
                  <Button size="sm" variant="outline" onClick={fetchAuditLogs} className="ml-auto">
                    Retry
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600">Total Events</p>
                  <p className="text-title font-semibold text-eci-gray-900">{auditLogs.length}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600">Critical Events</p>
                  <p className="text-title font-semibold text-red-600">
                    {auditLogs.filter(log => log.severity === 'critical').length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600">Failed Actions</p>
                  <p className="text-title font-semibold text-orange-600">
                    {auditLogs.filter(log => log.status === 'failure').length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-orange-500" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-eci-gray-600">Filtered Results</p>
                  <p className="text-title font-semibold text-eci-gray-900">{filteredLogs.length}</p>
                </div>
                <Filter className="h-8 w-8 text-green-500" />
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-white shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-eci-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by user, action, or resource..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Logs Table */}
          <Card className="bg-white shadow-sm">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-title font-semibold text-eci-gray-900">Recent Activity</h2>
                <Badge variant="secondary">{filteredLogs.length} events</Badge>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eci-red mx-auto"></div>
                  <p className="mt-2 text-body-small text-eci-gray-600">Loading audit logs...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-eci-gray-200">
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Timestamp</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">User</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Action</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Resource</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Details</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Severity</th>
                        <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="border-b border-eci-gray-100 hover:bg-eci-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-body text-eci-gray-900">
                              <Clock className="h-3 w-3 text-eci-gray-400" />
                              {new Date(log.created_at).toLocaleString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-body text-eci-gray-900">
                              <User className="h-3 w-3 text-eci-gray-400" />
                              <p className="text-body font-medium">{log.user_email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              <div>
                                <span className="text-body text-eci-gray-900">{log.action}</span>
                                {log.status !== 'success' && (
                                  <div className="flex items-center gap-1 mt-1">
                                    {getStatusBadge(log.status)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <code className="text-caption bg-eci-gray-100 px-2 py-1 rounded">{log.resource_type}</code>
                              {log.resource_id && (
                                <p className="text-caption text-eci-gray-500 mt-1 truncate max-w-24">
                                  ID: {log.resource_id.substring(0, 8)}...
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-body text-eci-gray-600 max-w-xs">
                            <div className="truncate" title={formatDetails(log)}>
                              {formatDetails(log)}
                            </div>
                          </td>
                          <td className="py-3 px-4">{getSeverityBadge(log.severity)}</td>
                          <td className="py-3 px-4 text-caption text-eci-gray-600 font-mono">
                            {log.ip_address || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    
  );
}