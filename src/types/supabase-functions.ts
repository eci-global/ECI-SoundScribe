export type SupabaseFunctionName = 
  | 'calculate_admin_kpis'
  | 'create_missing_profiles'
  | 'grant_admin_role'
  | 'has_role'
  | 'search_recordings'
  | 'search_recording_content';

export interface AdminKpis {
  instantSummaries?: {
    today: number;
    last7Days: number;
    last30Days: number;
    total: number;
    avgDuration: number;
  };
  repAdoption?: {
    totalUsers: number;
    activeUsers: number;
    weeklyActiveUsers: number;
    adoptionRate: number;
  };
  systemHealth?: {
    totalRecordings: number;
    completedRecordings: number;
    failedRecordings: number;
    processingRecordings: number;
    successRate: number;
  };
  performanceMetrics?: {
    avgProcessingTime: number;
    totalStorageMB: number;
    last24hRecordings: number;
  };
  lastUpdated?: string;
}
