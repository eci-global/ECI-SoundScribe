import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAdminTools } from '@/hooks/useAdminTools';
import { 
  Terminal, 
  Database, 
  Download, 
  RefreshCw, 
  FileText, 
  Shield, 
  Settings as Wrench,
  ExternalLink,
  Activity,
  Archive
} from 'lucide-react';
import { AdminTableShell } from '@/components/admin/AdminTableShell';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: string;
  category: 'maintenance' | 'backup' | 'diagnostics' | 'documentation';
  status?: 'ready' | 'running' | 'warning';
}

export default function AdminTools() {
  const { 
    isRunning, 
    createDatabaseBackup,
    runHealthCheck,
    getDatabaseStats,
    clearCache,
    runDatabaseMaintenance,
    runSecurityAudit,
    exportSystemLogs,
    reindexSearch
  } = useAdminTools();
  
  const tools: Tool[] = [
    {
      id: '1',
      name: 'Database Backup',
      description: 'Create a full backup of the system database',
      icon: Database,
      action: 'backup:database',
      category: 'backup',
      status: 'ready'
    },
    {
      id: '2',
      name: 'Export System Logs',
      description: 'Download system logs for the last 30 days',
      icon: Download,
      action: 'export:logs',
      category: 'diagnostics',
      status: 'ready'
    },
    {
      id: '3',
      name: 'Reindex Search',
      description: 'Rebuild search indexes for better performance',
      icon: RefreshCw,
      action: 'reindex:search',
      category: 'maintenance',
      status: 'ready'
    },
    {
      id: '4',
      name: 'CLI Documentation',
      description: 'Access command-line interface documentation',
      icon: Terminal,
      action: 'docs:cli',
      category: 'documentation',
      status: 'ready'
    },
    {
      id: '5',
      name: 'API Reference',
      description: 'View comprehensive API documentation',
      icon: FileText,
      action: 'docs:api',
      category: 'documentation',
      status: 'ready'
    },
    {
      id: '6',
      name: 'Security Audit',
      description: 'Run security audit and generate report',
      icon: Shield,
      action: 'audit:security',
      category: 'diagnostics',
      status: 'ready'
    },
    {
      id: '7',
      name: 'Cache Clear',
      description: 'Clear application cache and temp files',
      icon: Archive,
      action: 'clear:cache',
      category: 'maintenance',
      status: 'ready'
    },
    {
      id: '8',
      name: 'Database Maintenance',
      description: 'Clean up old records and optimize database',
      icon: Database,
      action: 'maintenance:database',
      category: 'maintenance',
      status: 'ready'
    },
    {
      id: '9',
      name: 'Health Check',
      description: 'Run comprehensive system health check',
      icon: Activity,
      action: 'check:health',
      category: 'diagnostics',
      status: 'running'
    }
  ];

  const handleToolAction = async (action: string) => {
    console.log('Executing tool action:', action);
    
    try {
      switch (action) {
        case 'backup:database':
          await createDatabaseBackup();
          break;
        case 'check:health':
          await runHealthCheck();
          break;
        case 'clear:cache':
          await clearCache();
          break;
        case 'maintenance:database':
          await runDatabaseMaintenance();
          break;
        case 'audit:security':
          await runSecurityAudit();
          break;
        case 'export:logs':
          await exportSystemLogs();
          break;
        case 'reindex:search':
          await reindexSearch();
          break;
        case 'docs:cli':
        case 'docs:api':
          // Handle documentation links - these could open external URLs
          console.log(`Opening documentation for: ${action}`);
          break;
        default:
          console.log(`Action ${action} not implemented yet`);
      }
    } catch (error) {
      console.error('Tool action failed:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      maintenance: 'text-blue-600 bg-blue-50',
      backup: 'text-green-600 bg-green-50',
      diagnostics: 'text-purple-600 bg-purple-50',
      documentation: 'text-orange-600 bg-orange-50'
    };
    return colors[category as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  const getStatusIndicator = (status?: string) => {
    if (!status) return null;
    const indicators = {
      ready: { color: 'bg-green-500', pulse: false },
      running: { color: 'bg-blue-500', pulse: true },
      warning: { color: 'bg-orange-500', pulse: false }
    };
    const indicator = indicators[status as keyof typeof indicators];
    return (
      <div className={`h-2 w-2 rounded-full ${indicator.color} ${indicator.pulse ? 'animate-pulse' : ''}`} />
    );
  };

  const groupedTools = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  return (
    
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-900 mb-2">Admin Tools</h1>
            <p className="text-body text-eci-gray-600">System maintenance and diagnostic utilities</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <Wrench className="h-6 w-6 text-blue-600" />
                <span className="text-caption text-blue-600">3 tools</span>
              </div>
              <p className="text-body font-medium text-blue-900">Maintenance</p>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <Database className="h-6 w-6 text-green-600" />
                <span className="text-caption text-green-600">1 tool</span>
              </div>
              <p className="text-body font-medium text-green-900">Backup</p>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="h-6 w-6 text-purple-600" />
                <span className="text-caption text-purple-600">3 tools</span>
              </div>
              <p className="text-body font-medium text-purple-900">Diagnostics</p>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <FileText className="h-6 w-6 text-orange-600" />
                <span className="text-caption text-orange-600">2 tools</span>
              </div>
              <p className="text-body font-medium text-orange-900">Documentation</p>
            </Card>
          </div>

          {/* Tools by Category */}
          {Object.entries(groupedTools).map(([category, categoryTools]) => (
            <AdminTableShell
              key={category}
              title={category.charAt(0).toUpperCase() + category.slice(1)}
              description={`Tools in ${category}`}
              empty={categoryTools.length === 0}
              emptyTitle={`No ${category} tools`}
              emptyDescription={`No tools available in ${category}.`}
            >
              <div className="grid grid-cols-2 gap-4">
                  {categoryTools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <div 
                        key={tool.id} 
                        className="border border-eci-gray-200 rounded-lg p-4 hover:border-eci-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getCategoryColor(category)}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-body font-medium text-eci-gray-900">{tool.name}</h3>
                              {isRunning[tool.action] ? (
                                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                              ) : (
                                getStatusIndicator(tool.status)
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-body-small text-eci-gray-600 mb-4">{tool.description}</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full"
                          onClick={() => handleToolAction(tool.action)}
                          disabled={isRunning[tool.action] || tool.status === 'running'}
                        >
                          {isRunning[tool.action] || tool.status === 'running' ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Running...
                            </>
                          ) : (
                            <>
                              {category === 'documentation' ? (
                                <>
                                  View <ExternalLink className="h-3 w-3 ml-1" />
                                </>
                              ) : (
                                'Run'
                              )}
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </AdminTableShell>
          ))}
        </div>
      </div>
    
  );
}
