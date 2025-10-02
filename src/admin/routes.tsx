import React from 'react';
import {
  Shield,
  Library as LibraryIcon,
  Users,
  Lock,
  Settings,
  Database,
  Target,
  Workflow,
  Plug,
  Activity,
  Key,
  GraduationCap,
  Brain,
  Zap,
  Sliders,
  TestTube,
  BarChart3,
  FileText,
} from 'lucide-react';

// Page components
import AdminHome from '@/pages/admin/AdminHome';
import RecordingTable from '@/pages/admin/RecordingTable';
import AllRecordings from '@/pages/admin/AllRecordings';
import FileManager from '@/pages/admin/FileManager';
import StorageAnalytics from '@/pages/admin/StorageAnalytics';
import OrgOverview from '@/pages/admin/OrgOverview';
import UserManagement from '@/pages/admin/UserManagement';
import AclSettings from '@/pages/admin/AclSettings';
import AdminTools from '@/pages/admin/AdminTools';
import AuditLogViewer from '@/pages/admin/AuditLogViewer';
import TargetRules from '@/pages/admin/TargetRules';
import AutomationBuilder from '@/pages/admin/AutomationBuilder';
import IntegrationStatus from '@/pages/admin/IntegrationStatus';
import PrivacySettings from '@/pages/admin/PrivacySettings';
import SystemActivity from '@/pages/admin/SystemActivity';
import OrganizationOutreachSettings from '@/pages/admin/OrganizationOutreachSettings';
import AdvancedAnalyticsPage from '@/pages/admin/AdvancedAnalyticsPage';
import BDRTrainingSettings from '@/pages/admin/BDRTrainingSettings';
import BDRScorecardUploadHistory from '@/pages/admin/BDRScorecardUploadHistory';
import AIControlCenter from '@/pages/admin/AIControlCenter';
import AIPromptManagement from '@/pages/admin/AIPromptManagement';
import AIModelConfiguration from '@/pages/admin/AIModelConfiguration';
import AIScoringRubrics from '@/pages/admin/AIScoringRubrics';
import AIExperiments from '@/pages/admin/AIExperiments';

export interface AdminNavItem {
  title: string;
  icon?: React.ComponentType<any>;
  path?: string;
  children?: AdminNavItem[];
}

export const adminNav: AdminNavItem[] = [
  { title: 'Admin home', icon: Shield, path: '/admin' },
  {
    title: 'Library',
    icon: LibraryIcon,
    children: [
      { title: 'All recordings', path: '/admin/all-recordings' },
      { title: 'File management', path: '/admin/files' },
      { title: 'Storage analytics', path: '/admin/storage-analytics' },
    ],
  },
  {
    title: 'Organization',
    icon: Users,
    children: [
      { title: 'Overview', path: '/admin/org' },
      { title: 'User management', path: '/admin/org/users' },
    ],
  },
  { title: 'Access control', icon: Lock, path: '/admin/access' },
  { title: 'Tools', icon: Settings, path: '/admin/tools' },
  {
    title: 'Records',
    icon: Database,
    children: [
      { title: 'All recordings (Legacy)', path: '/admin/recordings' },
      { title: 'Manager recordings', path: '/admin/all-recordings' }
    ]
  },
  { title: 'Targeting', icon: Target, path: '/admin/targeting' },
  { title: 'Workflow automations', icon: Workflow, path: '/admin/automations' },
  { title: 'Integrations', icon: Plug, path: '/admin/integrations' },
  { title: 'Organization outreach', icon: Target, path: '/admin/organization-outreach' },
  {
    title: 'BDR Training',
    icon: GraduationCap,
    children: [
      { title: 'Settings & Programs', path: '/admin/bdr-training' },
      { title: 'Upload History', path: '/admin/bdr-scorecard-history' }
    ]
  },
  {
    title: 'AI Control Center',
    icon: Brain,
    children: [
      { title: 'Dashboard', path: '/admin/ai-control' },
      { title: 'Prompt Management', path: '/admin/ai-prompts' },
      { title: 'Model Configuration', path: '/admin/ai-models' },
      { title: 'Scoring Rubrics', path: '/admin/ai-scoring' },
      { title: 'Experiments', path: '/admin/ai-experiments' }
    ]
  },
  { title: 'Data & privacy', icon: Lock, path: '/admin/privacy' },
  { title: 'System activity', icon: Activity, path: '/admin/activity' },
  { title: 'Audit', icon: Key, path: '/admin/audit' },
  { title: 'Advanced Analytics', icon: Activity, path: '/admin/analytics' },
];

// Path -> Component map used by AdminDashboard
export const adminRouteMap: Record<string, React.ComponentType<any>> = {
  '/admin': AdminHome,
  '/admin/library': AllRecordings,
  '/admin/recordings': RecordingTable,
  '/admin/all-recordings': AllRecordings,
  '/admin/files': FileManager,
  '/admin/storage-analytics': StorageAnalytics,
  '/admin/org': OrgOverview,
  '/admin/org/users': UserManagement,
  '/admin/access': AclSettings,
  '/admin/tools': AdminTools,
  '/admin/audit': AuditLogViewer,
  '/admin/targeting': TargetRules,
  '/admin/automations': AutomationBuilder,
  '/admin/integrations': IntegrationStatus,
  '/admin/organization-outreach': OrganizationOutreachSettings,
  '/admin/privacy': PrivacySettings,
  '/admin/activity': SystemActivity,
  '/admin/analytics': AdvancedAnalyticsPage,
  '/admin/bdr-training': BDRTrainingSettings,
  '/admin/bdr-scorecard-history': BDRScorecardUploadHistory,
  '/admin/ai-control': AIControlCenter,
  '/admin/ai-prompts': AIPromptManagement,
  '/admin/ai-models': AIModelConfiguration,
  '/admin/ai-scoring': AIScoringRubrics,
  '/admin/ai-experiments': AIExperiments,
};

export function resolveAdminComponent(pathname: string): React.ReactElement {
  const Component = adminRouteMap[pathname] || AdminHome;
  return <Component />;
}

