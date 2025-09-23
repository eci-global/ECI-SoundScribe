
export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'down';
  uptime?: number;
  services?: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    lastCheck?: string;
  }>;
  lastChecked?: string;
}

export const useSystemHealth = () => {
  // Mock implementation for now
  const systemStatus: SystemStatus = {
    status: 'healthy',
    uptime: 99.9,
    services: [
      { name: 'Database', status: 'healthy' },
      { name: 'Storage', status: 'healthy' },
      { name: 'Edge Functions', status: 'healthy' }
    ],
    lastChecked: new Date().toISOString()
  };

  return {
    systemStatus,
    loading: false
  };
};
