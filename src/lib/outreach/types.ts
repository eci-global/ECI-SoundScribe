// Re-export types from OutreachClient for convenience
export type {
  OutreachApiResponse,
  OutreachError,
  OutreachErrorResponse,
  OutreachAccount,
  OutreachCall
} from './OutreachClient';

// Use OutreachProspect from OutreachClient
export type { OutreachProspect } from './OutreachClient';

// Additional types for UI components
export interface OutreachSyncStatus {
  id: string;
  recording_id: string;
  user_id: string;
  operation_type: 'activity_create' | 'prospect_update' | 'webhook_received' | 'token_refresh';
  status: 'success' | 'error' | 'pending';
  outreach_resource_id?: string;
  outreach_resource_type?: string;
  request_payload?: any;
  response_payload?: any;
  error_details?: any;
  created_at: string;
}

export interface OutreachProspectMapping {
  id: string;
  user_id: string;
  recording_id: string;
  outreach_prospect_id: string;
  prospect_email?: string;
  prospect_name?: string;
  prospect_company?: string;
  synced_at: string;
  sync_status: 'pending' | 'synced' | 'error';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface OutreachConnection {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  outreach_user_id?: string;
  outreach_org_id?: string;
  outreach_user_email?: string;
  scope?: string;
  created_at: string;
  updated_at: string;
}

// UI Component Props
export interface OutreachSyncPanelProps {
  recordingId: string;
  onSyncComplete?: () => void;
}

// OutreachProspect is imported from OutreachClient - removed duplicate definition

export interface ProspectMappingProps {
  recordingId: string;
  prospects: import('./OutreachClient').OutreachProspect[];
  onMappingComplete: (mappings: ProspectMapping[]) => void;
}

export interface ProspectMapping {
  prospectId: string;
  speakerName: string;
  confidence: number;
}

// Sync operation results
export interface SyncResult {
  success: boolean;
  message: string;
  data?: {
    prospects_synced: number;
    activities_created: number;
    activities: any[];
  };
  error?: string;
}

// Recording with Outreach data
export interface RecordingWithOutreach {
  id: string;
  title: string;
  // ... other recording fields
  outreach_mappings?: OutreachProspectMapping[];
  outreach_sync_status?: OutreachSyncStatus;
  last_synced_at?: string;
  sync_status?: 'not_synced' | 'synced' | 'error' | 'pending';
}