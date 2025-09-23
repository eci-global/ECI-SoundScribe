export interface OutreachConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OutreachRecording {
  id: string;
  title: string;
  description?: string;
  recordedAt: string;
  duration?: number;
  downloadUrl: string;
  prospect: {
    name: string;
    email: string;
    company?: string;
  };
  rep: {
    name: string;
    email: string;
  };
}

export interface OutreachToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
}

class OutreachService {
  private config: OutreachConfig;
  private baseUrl = 'https://api.outreach.io/api/v2';

  constructor(config: OutreachConfig) {
    this.config = config;
  }

  // Generate OAuth authorization URL
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'calls.all accounts.all prospects.all users.all emailAddresses.all',
      state: state || ''
    });

    return `https://api.outreach.io/oauth/authorize?${params.toString()}`;
  }

  // Exchange authorization code for access token using Edge Function
  async exchangeCodeForToken(code: string): Promise<OutreachToken> {
    // Get current user ID from Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('outreach-oauth', {
      body: {
        code: code,
        redirectUri: this.config.redirectUri,
        userId: user.id
      }
    });

    if (error) {
      console.error('OAuth Edge Function error:', error);
      throw new Error(`OAuth token exchange failed: ${error.message || 'Edge Function returned a non-2xx status code'}`);
    }

    if (!data || !data.connection) {
      throw new Error('Invalid response from OAuth service');
    }

    // The Edge Function stores the connection in the database
    // We need to return a token format that matches our interface
    // Since the actual tokens are stored securely in the database,
    // we'll return a placeholder token that indicates success
    return {
      access_token: 'stored_in_database',
      refresh_token: 'stored_in_database',
      expires_at: Date.now() + (3600 * 1000), // 1 hour placeholder
      token_type: 'Bearer'
    };
  }

  // Refresh access token using Edge Function
  async refreshAccessToken(refreshToken: string): Promise<OutreachToken> {
    // Get current user ID from Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('outreach-refresh-token', {
      body: {
        userId: user.id
      }
    });

    if (error) {
      console.error('Token refresh error:', error);
      throw new Error(`Token refresh failed: ${error.message || 'Edge Function returned a non-2xx status code'}`);
    }

    if (!data || !data.success) {
      throw new Error('Token refresh failed');
    }

    // Return placeholder token indicating success
    return {
      access_token: 'stored_in_database',
      refresh_token: 'stored_in_database',
      expires_at: Date.now() + (3600 * 1000), // 1 hour placeholder
      token_type: 'Bearer'
    };
  }

  // Get recordings from Outreach using Edge Function
  async getRecordings(token: string, options?: {
    limit?: number;
    after?: string;
    before?: string;
  }): Promise<{ recordings: OutreachRecording[]; hasMore: boolean; nextCursor?: string }> {
    // Get current user ID from Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get the user's Outreach connection from the database
    const { data: connection, error: connectionError } = await supabase
      .from('outreach_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      throw new Error('Outreach connection not found. Please reconnect your account.');
    }

    // Check if token is expired
    if (new Date(connection.token_expires_at) <= new Date()) {
      // Try to refresh the token
      await this.refreshAccessToken(connection.refresh_token);
      
      // Get the updated connection
      const { data: updatedConnection, error: updateError } = await supabase
        .from('outreach_connections')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (updateError || !updatedConnection) {
        throw new Error('Failed to refresh Outreach token. Please reconnect your account.');
      }
    }

    // Use the stored access token to make API calls
    const params = new URLSearchParams();
    
    if (options?.limit) params.append('page[limit]', options.limit.toString());
    if (options?.after) params.append('page[after]', options.after);
    if (options?.before) params.append('page[before]', options.before);
    
    // Include related data
    params.append('include', 'prospect,sequence,sequenceStep');

    const response = await fetch(`${this.baseUrl}/calls?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/vnd.api+json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch recordings: ${error}`);
    }

    const data = await response.json();
    
    // Transform Outreach data to our format
    const recordings: OutreachRecording[] = data.data
      .filter((call: any) => call.attributes.recordingUrl) // Only calls with recordings
      .map((call: any) => {
        // Find related prospect data
        const prospectData = data.included?.find(
          (item: any) => item.type === 'prospect' && item.id === call.relationships?.prospect?.data?.id
        );

        return {
          id: call.id,
          title: call.attributes.purpose || `Call with ${prospectData?.attributes?.firstName || 'Unknown'} ${prospectData?.attributes?.lastName || ''}`,
          description: call.attributes.note || undefined,
          recordedAt: call.attributes.completedAt || call.attributes.createdAt,
          duration: call.attributes.duration,
          downloadUrl: call.attributes.recordingUrl,
          prospect: {
            name: prospectData ? `${prospectData.attributes.firstName || ''} ${prospectData.attributes.lastName || ''}`.trim() : 'Unknown',
            email: prospectData?.attributes?.emails?.[0]?.email || '',
            company: prospectData?.attributes?.company?.name || undefined,
          },
          rep: {
            name: call.attributes.createdBy?.name || 'Unknown',
            email: call.attributes.createdBy?.email || '',
          }
        };
      });

    return {
      recordings,
      hasMore: !!data.links?.next,
      nextCursor: data.meta?.page?.after
    };
  }

  // Download recording file using stored token
  async downloadRecording(token: string, recordingUrl: string): Promise<Blob> {
    // Get current user ID from Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get the user's Outreach connection from the database
    const { data: connection, error: connectionError } = await supabase
      .from('outreach_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      throw new Error('Outreach connection not found. Please reconnect your account.');
    }

    const response = await fetch(recordingUrl, {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download recording: ${response.statusText}`);
    }

    return await response.blob();
  }

  // Get user profile
  async getUserProfile(token: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/users/current`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.api+json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch user profile: ${error}`);
    }

    return await response.json();
  }

  // Check if token is still valid
  isTokenValid(token: OutreachToken): boolean {
    // Since we're using database-stored tokens, we'll check the connection status
    // This is a simplified check - actual validation happens in the API calls
    return token.access_token === 'stored_in_database';
  }
}

// Singleton instance
let outreachService: OutreachService | null = null;

export function getOutreachService(): OutreachService {
  if (!outreachService) {
    const config: OutreachConfig = {
      clientId: import.meta.env.VITE_OUTREACH_CLIENT_ID || '',
      clientSecret: '', // No longer needed on frontend - handled by Edge Function
      redirectUri: import.meta.env.VITE_OUTREACH_REDIRECT_URI || `${window.location.origin}/integrations/outreach/callback`,
    };

    if (!config.clientId || config.clientId === 'your_outreach_client_id') {
      console.warn('Outreach client ID not properly configured. Please set VITE_OUTREACH_CLIENT_ID in your environment variables.');
      throw new Error('Outreach integration not configured. Please contact your administrator.');
    }

    // Client secret is no longer required on frontend - it's handled securely by the Edge Function
    outreachService = new OutreachService(config);
  }

  return outreachService;
}

// Utility functions for token storage
export function storeOutreachToken(token: OutreachToken): void {
  localStorage.setItem('outreach_token', JSON.stringify(token));
}

export function getStoredOutreachToken(): OutreachToken | null {
  const stored = localStorage.getItem('outreach_token');
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearOutreachToken(): void {
  localStorage.removeItem('outreach_token');
}

export { OutreachService };