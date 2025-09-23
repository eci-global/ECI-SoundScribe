export interface OutreachConnection {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  scope?: string;
  outreach_user_id?: string;
  outreach_user_email?: string;
  outreach_org_id?: string;
  created_at: string;
  updated_at: string;
}

export interface OutreachProspectMapping {
  id: string;
  user_id: string;
  recording_id: string;
  outreach_prospect_id: string;
  created_at: string;
  // Remove fields that don't exist in database
}

export interface OutreachSyncLog {
  id: string;
  user_id: string;
  recording_id?: string;
  sync_type: string;
  status: string;
  error_message?: string;
  outreach_activity_id?: string;
  created_at: string;
  // Remove response_payload field that doesn't exist
}

export interface OutreachCall {
  id: string;
  user_id: string;
  outreach_call_id: string;
  call_subject: string;
  call_body: string;
  call_disposition: string;
  call_duration?: number;
  call_date: string;
  prospect_name?: string;
  prospect_email?: string;
  created_at: string;
  updated_at: string;
  // Additional fields that might be present
  ai_generated_at?: string;
  ai_insights?: any;
  ai_moments?: any;
  ai_next_steps?: any;
  ai_speaker_analysis?: any;
  ai_speakers_updated_at?: string;
  ai_summary?: string;
  coaching_evaluation?: any;
  content_type?: string;
  description?: string;
  duration?: number;
  enable_coaching?: boolean;
  error_message?: string;
  file_size?: number;
  file_type?: string;
  file_url?: string;
  instant_analysis?: any;
  instant_analysis_complete?: boolean;
  processing_progress?: number;
  status?: string;
  summary?: string;
  thumbnail_url?: string;
  title?: string;
  transcript?: string;
  whisper_metadata?: any;
  whisper_segments?: any;
}
