import { supabase } from '@/integrations/supabase/client';

export interface OutreachApiResponse<T = any> {
  data: T;
  meta?: {
    count: number;
    page: {
      first: string;
      last: string;
      next?: string;
      prev?: string;
    };
  };
  links?: {
    first: string;
    last: string;
    next?: string;
    prev?: string;
  };
  included?: any[];
}

export interface OutreachError {
  id: string;
  title: string;
  detail: string;
  status: string;
  code?: string;
  source?: {
    pointer: string;
    parameter?: string;
  };
}

export interface OutreachErrorResponse {
  errors: OutreachError[];
}

export interface OutreachProspect {
  id: string;
  type: 'prospect';
  attributes: {
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
    title?: string;
    phone?: string;
    linkedinUrl?: string;
    twitterUsername?: string;
    prospectStage?: string;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
  };
  relationships?: {
    account?: {
      data: {
        id: string;
        type: 'account';
      };
    };
    owner?: {
      data: {
        id: string;
        type: 'user';
      };
    };
  };
}

export interface OutreachAccount {
  id: string;
  type: 'account';
  attributes: {
    name: string;
    domain?: string;
    website?: string;
    industry?: string;
    numberOfEmployees?: number;
    createdAt: string;
    updatedAt: string;
  };
}

export interface OutreachCall {
  id: string;
  type: 'call';
  attributes: {
    subject: string;
    body?: string;
    callDisposition?: string;
    callDurationSeconds?: number;
    occurredAt: string;
    createdAt: string;
    updatedAt: string;
  };
  relationships?: {
    prospect?: {
      data: {
        id: string;
        type: 'prospect';
      };
    };
    user?: {
      data: {
        id: string;
        type: 'user';
      };
    };
  };
}

export class OutreachClient {
  private baseUrl = 'https://api.outreach.io/api/v2';
  private accessToken: string | null = null;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    // Get connection from database
    const { data: connection, error } = await supabase
      .from('outreach_connections')
      .select('access_token, token_expires_at, refresh_token')
      .eq('user_id', this.userId)
      .single();

    if (error || !connection) {
      throw new Error('No Outreach connection found. Please connect your account first.');
    }

    // Check if token is expired
    const tokenExpired = new Date(connection.token_expires_at) <= new Date();
    
    if (tokenExpired) {
      // Refresh token via edge function
      const { data: refreshData, error: refreshError } = await supabase.functions.invoke(
        'outreach-refresh-token',
        {
          body: {
            refreshToken: connection.refresh_token,
            userId: this.userId
          }
        }
      );

      if (refreshError || !refreshData?.success) {
        throw new Error('Failed to refresh Outreach token. Please reconnect your account.');
      }

      // Get updated token from database
      const { data: updatedConnection, error: updateError } = await supabase
        .from('outreach_connections')
        .select('access_token')
        .eq('user_id', this.userId)
        .single();

      if (updateError || !updatedConnection) {
        throw new Error('Failed to retrieve updated token.');
      }

      this.accessToken = updatedConnection.access_token;
    } else {
      this.accessToken = connection.access_token;
    }

    return this.accessToken;
  }

  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<OutreachApiResponse<T>> {
    const accessToken = await this.getAccessToken();
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData: OutreachErrorResponse = await response.json();
      const errorMessage = errorData.errors?.[0]?.detail || 
                          errorData.errors?.[0]?.title || 
                          `API Error: ${response.status}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Prospect methods
  async searchProspects(params: {
    emails?: string[];
    name?: string;
    company?: string;
    limit?: number;
  }): Promise<OutreachProspect[]> {
    const searchParams = new URLSearchParams();
    
    if (params.emails && params.emails.length > 0) {
      searchParams.append('filter[emails]', params.emails.join(','));
    }
    
    if (params.name) {
      searchParams.append('filter[name]', params.name);
    }
    
    if (params.company) {
      searchParams.append('filter[company]', params.company);
    }
    
    if (params.limit) {
      searchParams.append('page[limit]', params.limit.toString());
    }

    const response = await this.makeRequest<OutreachProspect[]>(
      `/prospects?${searchParams.toString()}`
    );
    
    return response.data;
  }

  async getProspect(prospectId: string): Promise<OutreachProspect> {
    const response = await this.makeRequest<OutreachProspect>(
      `/prospects/${prospectId}`
    );
    
    return response.data;
  }

  async createProspect(prospectData: {
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
    title?: string;
    phone?: string;
  }): Promise<OutreachProspect> {
    const payload = {
      data: {
        type: 'prospect',
        attributes: {
          firstName: prospectData.firstName,
          lastName: prospectData.lastName,
          emails: [prospectData.email],
          company: prospectData.company,
          title: prospectData.title,
          phone: prospectData.phone,
        },
      },
    };

    const response = await this.makeRequest<OutreachProspect>(
      '/prospects',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    return response.data;
  }

  // Call activity methods
  async createCall(callData: {
    prospectId: string;
    subject: string;
    body?: string;
    duration?: number;
    occurredAt?: Date;
    disposition?: string;
  }): Promise<OutreachCall> {
    const payload = {
      data: {
        type: 'call',
        attributes: {
          subject: callData.subject,
          body: callData.body,
          callDisposition: callData.disposition || 'completed',
          callDurationSeconds: callData.duration || 0,
          occurredAt: (callData.occurredAt || new Date()).toISOString(),
        },
        relationships: {
          prospect: {
            data: {
              type: 'prospect',
              id: callData.prospectId,
            },
          },
        },
      },
    };

    const response = await this.makeRequest<OutreachCall>(
      '/calls',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    return response.data;
  }

  async getCalls(params: {
    prospectId?: string;
    limit?: number;
    sort?: string;
  } = {}): Promise<OutreachCall[]> {
    const searchParams = new URLSearchParams();
    
    if (params.prospectId) {
      searchParams.append('filter[prospect]', params.prospectId);
    }
    
    if (params.limit) {
      searchParams.append('page[limit]', params.limit.toString());
    }
    
    if (params.sort) {
      searchParams.append('sort', params.sort);
    }

    const response = await this.makeRequest<OutreachCall[]>(
      `/calls?${searchParams.toString()}`
    );
    
    return response.data;
  }

  // Account methods
  async searchAccounts(params: {
    name?: string;
    domain?: string;
    limit?: number;
  }): Promise<OutreachAccount[]> {
    const searchParams = new URLSearchParams();
    
    if (params.name) {
      searchParams.append('filter[name]', params.name);
    }
    
    if (params.domain) {
      searchParams.append('filter[domain]', params.domain);
    }
    
    if (params.limit) {
      searchParams.append('page[limit]', params.limit.toString());
    }

    const response = await this.makeRequest<OutreachAccount[]>(
      `/accounts?${searchParams.toString()}`
    );
    
    return response.data;
  }

  // Utility methods
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/prospects?page[limit]=1');
      return true;
    } catch (error) {
      console.error('Outreach connection test failed:', error);
      return false;
    }
  }

  // Rate limiting helper
  private static readonly RATE_LIMIT_REQUESTS = 10000; // per hour
  private static readonly RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms
  private static requestCount = 0;
  private static windowStart = Date.now();

  private static checkRateLimit(): void {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.windowStart > this.RATE_LIMIT_WINDOW) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    if (this.requestCount >= this.RATE_LIMIT_REQUESTS) {
      const resetIn = this.RATE_LIMIT_WINDOW - (now - this.windowStart);
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(resetIn / 1000 / 60)} minutes.`);
    }

    this.requestCount++;
  }
}