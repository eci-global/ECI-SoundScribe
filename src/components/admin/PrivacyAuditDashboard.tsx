import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield,
  FileText,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Filter,
  Calendar,
  Users,
  Database,
  Scale,
  Eye,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePrivacyCompliance } from '@/hooks/usePrivacyCompliance';
import { validateCompliance, createComplianceContext } from '@/utils/privacy';
import type { ComplianceReport } from '@/utils/privacy';

interface AuditReport {
  id: string;
  name: string;
  type: 'gdpr' | 'ccpa' | 'security' | 'data_inventory' | 'consent_audit';
  generatedAt: string;
  period: { start: string; end: string };
  status: 'completed' | 'generating' | 'failed';
  summary: {
    totalItems: number;
    complianceScore: number;
    issues: number;
    recommendations: number;
  };
  downloadUrl?: string;
}

interface ComplianceMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  category: 'privacy' | 'security' | 'access' | 'data';
  description: string;
}

export default function PrivacyAuditDashboard() {
  const { toast } = useToast();
  
  // Use privacy compliance hook
  const {
    exportRequests,
    deletionRequests,
    consentRecords,
    auditLogs,
    retentionPolicies,
    getComplianceMetrics
  } = usePrivacyCompliance();

  // State
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [auditReports, setAuditReports] = useState<AuditReport[]>([]);
  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetric[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadComplianceData();
    loadAuditReports();
    loadComplianceMetrics();
  }, [selectedPeriod]);

  const loadComplianceData = async () => {
    try {
      // Create compliance context from current system state
      const context = createComplianceContext({
        dataTypes: ['recordings', 'transcripts', 'user_data', 'audit_logs'],
        processingPurposes: ['service_provision', 'analytics', 'support', 'security'],
        retentionPolicies: retentionPolicies,
        consentRecords: consentRecords,
        securityMeasures: ['encryption', 'access_control', 'audit_logging'],
        userRightsEnabled: {
          dataAccess: true,
          dataPortability: true,
          dataRectification: true,
          dataErasure: true,
          processingRestriction: true,
          objectToProcessing: true
        },
        privacyPolicyLastUpdated: '2025-01-01',
        hasBreachProcedures: true,
        hasDPO: false,
        hasImpactAssessment: true
      });

      const report = validateCompliance(context);
      setComplianceReport(report);
    } catch (error: any) {
      console.error('Failed to load compliance data:', error);
      toast({
        title: "Data Loading Error",
        description: "Failed to load compliance data",
        variant: "destructive"
      });
    }
  };

  const loadAuditReports = async () => {
    try {
      const response = await fetch('/api/admin/audit-reports', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          period: selectedPeriod,
          category: selectedCategory
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load audit reports');
      }

      const reports = await response.json();
      setAuditReports(reports);
    } catch (error: any) {
      console.error('Failed to load audit reports:', error);
      toast({
        title: "Data Loading Error",
        description: "Failed to load audit reports",
        variant: "destructive"
      });
      setAuditReports([]);
    }
  };

  const loadComplianceMetrics = async () => {
    try {
      // Get base metrics from the hook
      const baseMetrics = await getComplianceMetrics();
      
      // Get enhanced metrics from the backend
      const response = await fetch('/api/admin/compliance-metrics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          period: selectedPeriod
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load compliance metrics');
      }

      const enhancedMetrics = await response.json();
      setComplianceMetrics(enhancedMetrics);
    } catch (error: any) {
      console.error('Failed to load compliance metrics:', error);
      toast({
        title: "Data Loading Error",
        description: "Failed to load compliance metrics",
        variant: "destructive"
      });
      setComplianceMetrics([]);
    }
  };

  // Generate compliance report
  const generateComplianceReport = async (reportType: string) => {
    setIsGeneratingReport(true);
    try {
      const response = await fetch('/api/admin/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: reportType,
          period: selectedPeriod
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const newReport = await response.json();
      setAuditReports(prev => [newReport, ...prev]);
      
      toast({
        title: "Report Generated",
        description: `${reportType.toUpperCase()} report has been generated successfully`,
      });
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      toast({
        title: "Report Generation Failed",
        description: error.message || "Failed to generate report",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Export report
  const exportReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/admin/export-report/${reportId}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Failed to export report:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export report",
        variant: "destructive"
      });
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'gdpr': return <Scale className="h-4 w-4" />;
      case 'ccpa': return <Shield className="h-4 w-4" />;
      case 'security': return <Shield className="h-4 w-4" />;
      case 'data_inventory': return <Database className="h-4 w-4" />;
      case 'consent_audit': return <Users className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'gdpr': return 'bg-blue-100 text-blue-800';
      case 'ccpa': return 'bg-green-100 text-green-800';
      case 'security': return 'bg-red-100 text-red-800';
      case 'data_inventory': return 'bg-purple-100 text-purple-800';
      case 'consent_audit': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down': return <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />;
      case 'stable': return <div className="h-3 w-3 bg-gray-400 rounded-full" />;
      default: return null;
    }
  };

  const getMetricColor = (value: number, target: number, unit: string) => {
    const isPercentage = unit === '%';
    const isTime = unit === 'days' || unit === 'hours';
    
    if (isTime) {
      // For time metrics, lower is better
      return value <= target ? 'text-green-600' : 'text-red-600';
    } else {
      // For percentage and count metrics, higher is better
      return value >= target ? 'text-green-600' : 'text-red-600';
    }
  };

  const filteredMetrics = selectedCategory === 'all' 
    ? complianceMetrics 
    : complianceMetrics.filter(m => m.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Privacy Compliance Overview */}
      <Card className="bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-eci-gray-400" />
            <h2 className="text-title font-semibold text-eci-gray-900">Privacy Compliance Overview</h2>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">7 Days</SelectItem>
                <SelectItem value="30days">30 Days</SelectItem>
                <SelectItem value="90days">90 Days</SelectItem>
                <SelectItem value="1year">1 Year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => loadComplianceData()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {complianceReport && (
          <div className="grid grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                complianceReport.overall.score >= 90 ? 'text-green-600' :
                complianceReport.overall.score >= 70 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {complianceReport.overall.score}%
              </div>
              <p className="text-caption text-eci-gray-600">Overall Compliance</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{complianceReport.overall.passedRules}</div>
              <p className="text-caption text-eci-gray-600">Passed Rules</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{complianceReport.overall.failedRules}</div>
              <p className="text-caption text-eci-gray-600">Failed Rules</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{complianceReport.recommendations.length}</div>
              <p className="text-caption text-eci-gray-600">Recommendations</p>
            </div>
          </div>
        )}

        {/* Regulation-specific Compliance */}
        {complianceReport && (
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(complianceReport.byRegulation).map(([regulation, data]) => (
              <div key={regulation} className="p-4 border border-eci-gray-200 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-body font-medium">{regulation}</span>
                  <Badge className={data.score >= 90 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {data.score}%
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-caption">
                    <span>Passed: {data.passedRules}</span>
                    <span>Total: {data.totalRules}</span>
                  </div>
                  <Progress value={data.score} className="h-2" />
                  {data.criticalIssues > 0 && (
                    <p className="text-caption text-red-600">
                      {data.criticalIssues} critical issue{data.criticalIssues !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Compliance Metrics */}
      <Card className="bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-eci-gray-400" />
            <h2 className="text-title font-semibold text-eci-gray-900">Compliance Metrics</h2>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="privacy">Privacy</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="access">Access</SelectItem>
              <SelectItem value="data">Data</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {filteredMetrics.map((metric) => (
            <div key={metric.id} className="p-4 border border-eci-gray-200 rounded">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-body font-medium">{metric.name}</span>
                    {getTrendIcon(metric.trend)}
                  </div>
                  <p className="text-caption text-eci-gray-600">{metric.description}</p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getMetricColor(metric.value, metric.target, metric.unit)}`}>
                    {metric.value}{metric.unit}
                  </div>
                  <p className="text-caption text-eci-gray-500">
                    Target: {metric.target}{metric.unit}
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-caption text-eci-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{((metric.value / metric.target) * 100).toFixed(0)}%</span>
                </div>
                <Progress value={Math.min((metric.value / metric.target) * 100, 100)} className="h-2" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Audit Reports */}
      <Card className="bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-eci-gray-400" />
            <h2 className="text-title font-semibold text-eci-gray-900">Audit Reports</h2>
          </div>
          <div className="flex items-center gap-2">
            <Select onValueChange={(value) => generateComplianceReport(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Generate new report" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gdpr">GDPR Compliance Report</SelectItem>
                <SelectItem value="ccpa">CCPA Compliance Report</SelectItem>
                <SelectItem value="security">Security Audit Report</SelectItem>
                <SelectItem value="data_inventory">Data Inventory Report</SelectItem>
                <SelectItem value="consent_audit">Consent Audit Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isGeneratingReport && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-body font-medium text-blue-900">Generating compliance report...</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {auditReports.map((report) => (
            <div key={report.id} className="flex items-center justify-between p-4 border border-eci-gray-200 rounded">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getReportTypeIcon(report.type)}
                  <span className="text-body font-medium">{report.name}</span>
                  <Badge className={getReportTypeColor(report.type)}>
                    {report.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
                    {report.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-6 text-caption text-eci-gray-600">
                  <span>
                    Period: {new Date(report.period.start).toLocaleDateString()} - {new Date(report.period.end).toLocaleDateString()}
                  </span>
                  <span>Generated: {new Date(report.generatedAt).toLocaleDateString()}</span>
                  <span>Items: {report.summary.totalItems}</span>
                  <span className={`font-medium ${
                    report.summary.complianceScore >= 90 ? 'text-green-600' :
                    report.summary.complianceScore >= 70 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    Score: {report.summary.complianceScore}%
                  </span>
                  {report.summary.issues > 0 && (
                    <span className="text-red-600">Issues: {report.summary.issues}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  onClick={() => exportReport(report.id)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={report.status !== 'completed'}
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-white shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-6 w-6 text-eci-gray-400" />
          <h2 className="text-title font-semibold text-eci-gray-900">Recent Privacy Activity</h2>
        </div>

        <div className="space-y-3">
          {/* Export Requests */}
          {exportRequests.slice(0, 3).map((request) => (
            <div key={request.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center gap-3">
                <Download className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-body-small font-medium">Data Export Request</p>
                  <p className="text-caption text-eci-gray-600">
                    {request.format.toUpperCase()} format - {new Date(request.requestedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge className={
                request.status === 'completed' ? 'bg-green-100 text-green-800' :
                request.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }>
                {request.status}
              </Badge>
            </div>
          ))}

          {/* Deletion Requests */}
          {deletionRequests.slice(0, 2).map((request) => (
            <div key={request.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-body-small font-medium">Data Deletion Request</p>
                  <p className="text-caption text-eci-gray-600">
                    {request.deletionType} deletion - {new Date(request.requestedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge className={
                request.status === 'completed' ? 'bg-green-100 text-green-800' :
                request.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                request.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }>
                {request.status}
              </Badge>
            </div>
          ))}

          {/* Consent Updates */}
          {consentRecords.slice(0, 2).map((consent) => (
            <div key={consent.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-body-small font-medium">Consent {consent.granted ? 'Granted' : 'Revoked'}</p>
                  <p className="text-caption text-eci-gray-600">
                    {consent.consentType.replace('_', ' ')} - {new Date(consent.grantedAt || consent.revokedAt || '').toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge className={consent.granted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {consent.granted ? 'Granted' : 'Revoked'}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}