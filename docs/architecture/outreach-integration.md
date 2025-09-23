# Outreach.io Integration Architecture

## API Overview and Implementation Patterns

### Outreach.io API v2 Specification
Outreach.io provides a comprehensive REST API built on JSON API 1.0 specification with enterprise-grade features for sales automation and CRM integration.

#### Core API Characteristics
- **Base URL**: `https://api.outreach.io/api/v2/`
- **Authentication**: OAuth 2.0 with automatic token refresh
- **Rate Limiting**: 10,000 requests per hour per user
- **Data Format**: JSON API 1.0 specification with relationships
- **Pagination**: Cursor-based pagination for performance
- **Filtering**: Advanced filtering and sorting capabilities

#### Authentication Configuration
```typescript
// OAuth 2.0 configuration
interface OutreachOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  baseUrl: string;
}

const oauthConfig: OutreachOAuthConfig = {
  clientId: process.env.VITE_OUTREACH_CLIENT_ID!,
  clientSecret: process.env.OUTREACH_CLIENT_SECRET!,
  redirectUri: `${window.location.origin}/integrations/outreach/callback`,
  scopes: [
    'accounts.read',
    'calls.read',
    'calls.write', 
    'prospects.read',
    'prospects.write',
    'users.read'
  ],
  baseUrl: 'https://api.outreach.io/api/v2',
};

// Token management with automatic refresh
export class OutreachTokenManager {
  private static instance: OutreachTokenManager;
  private refreshInProgress = false;
  
  static getInstance(): OutreachTokenManager {
    if (!this.instance) {
      this.instance = new OutreachTokenManager();
    }
    return this.instance;
  }
  
  async getValidToken(connectionId: string): Promise<string> {
    const connection = await this.getConnection(connectionId);
    
    // Check if token is expiring soon (within 5 minutes)
    const expiresAt = new Date(connection.token_expires_at);
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    
    if (expiresAt <= fiveMinutesFromNow) {
      return await this.refreshToken(connection);
    }
    
    return connection.access_token;
  }
  
  private async refreshToken(connection: OutreachConnection): Promise<string> {
    if (this.refreshInProgress) {
      // Wait for ongoing refresh
      await this.waitForRefresh();
      return this.getValidToken(connection.id);
    }
    
    this.refreshInProgress = true;
    
    try {
      const response = await fetch('https://api.outreach.io/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
          client_id: oauthConfig.clientId,
          client_secret: oauthConfig.clientSecret,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }
      
      const tokenData = await response.json();
      
      // Update connection with new tokens
      await supabase
        .from('outreach_connections')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', connection.id);
      
      return tokenData.access_token;
      
    } finally {
      this.refreshInProgress = false;
    }
  }
  
  private async waitForRefresh(): Promise<void> {
    while (this.refreshInProgress) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

## Dual Integration Architecture

### Organization-Wide Integration Pattern
The organization-wide approach enables IT administrators to configure Outreach integration once for the entire company, providing automatic access to all employees.

```typescript
// Organization connection management
export class OrganizationOutreachManager {
  async connectOrganization(params: {
    organizationId: string;
    connectionName: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    outreachUserEmail: string;
    outreachOrgId: string;
  }): Promise<OrganizationConnection> {
    const { data, error } = await supabase
      .from('organization_outreach_connections')
      .insert({
        organization_id: params.organizationId,
        connection_name: params.connectionName,
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
        token_expires_at: params.expiresAt.toISOString(),
        outreach_user_email: params.outreachUserEmail,
        outreach_org_id: params.outreachOrgId,
        is_active: true,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Trigger user discovery process
    await this.discoverOrganizationUsers(data.id);
    
    return data;
  }
  
  async discoverOrganizationUsers(connectionId: string): Promise<UserDiscoveryResult> {
    // Call Edge Function for user discovery
    const { data, error } = await supabase.functions.invoke('discover-organization-users', {
      body: {
        organizationConnectionId: connectionId,
      },
    });
    
    if (error) throw error;
    return data;
  }
  
  async syncOrganizationCalls(
    connectionId: string,
    syncMode: 'full' | 'incremental' = 'incremental'
  ): Promise<SyncResult> {
    const { data, error } = await supabase.functions.invoke('sync-organization-calls', {
      body: {
        organizationConnectionId: connectionId,
        syncMode,
      },
    });
    
    if (error) throw error;
    return data;
  }
}

// Edge Function: Organization user discovery
// /supabase/functions/discover-organization-users/index.ts
export async function discoverOrganizationUsers(
  organizationConnectionId: string
): Promise<UserDiscoveryResult> {
  try {
    // Get organization connection details
    const { data: connection } = await supabase
      .from('organization_outreach_connections')
      .select('*')
      .eq('id', organizationConnectionId)
      .single();
    
    if (!connection) {
      throw new Error('Organization connection not found');
    }
    
    // Get valid access token
    const accessToken = await OutreachTokenManager.getInstance()
      .getValidToken(organizationConnectionId);
    
    // Fetch internal users with matching domain
    const { data: internalUsers } = await supabase.auth.admin.listUsers();
    const emailDomain = connection.organization_id;
    
    // Filter users by organization domain
    const orgUsers = internalUsers.users.filter(user => 
      user.email && user.email.endsWith(`@${emailDomain}`)
    );
    
    let mappedCount = 0;
    const mappingResults: UserMappingResult[] = [];
    
    // Search for matching prospects in Outreach
    for (const user of orgUsers) {
      try {
        const prospectData = await searchOutreachProspect(user.email, accessToken);
        
        if (prospectData) {
          // Create user profile mapping
          const { data: profile, error } = await supabase
            .from('user_outreach_profiles')
            .upsert({
              organization_connection_id: organizationConnectionId,
              user_id: user.id,
              outreach_prospect_id: prospectData.id,
              prospect_email: prospectData.attributes.emails[0],
              prospect_name: `${prospectData.attributes.firstName} ${prospectData.attributes.lastName}`,
              prospect_company: prospectData.relationships?.account?.data?.attributes?.name,
              prospect_title: prospectData.attributes.title,
              auto_discovered: true,
              is_active: true,
            })
            .select()
            .single();
          
          if (!error) {
            mappedCount++;
            mappingResults.push({
              userId: user.id,
              userEmail: user.email,
              prospectId: prospectData.id,
              prospectName: profile.prospect_name,
              status: 'mapped',
            });
          } else {
            mappingResults.push({
              userId: user.id,
              userEmail: user.email,
              status: 'error',
              error: error.message,
            });
          }
        } else {
          mappingResults.push({
            userId: user.id,
            userEmail: user.email,
            status: 'not_found',
          });
        }
      } catch (error) {
        mappingResults.push({
          userId: user.id,
          userEmail: user.email,
          status: 'error',
          error: error.message,
        });
      }
    }
    
    // Log the discovery operation
    await supabase
      .from('organization_outreach_sync_logs')
      .insert({
        organization_connection_id: organizationConnectionId,
        operation_type: 'user_discovery',
        status: 'completed',
        records_processed: orgUsers.length,
        records_successful: mappedCount,
        records_failed: orgUsers.length - mappedCount,
        details: {
          emailDomain,
          totalUsers: orgUsers.length,
          mappingResults,
        },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
    
    return {
      totalUsers: orgUsers.length,
      mappedUsers: mappedCount,
      mappingResults,
    };
    
  } catch (error) {
    console.error('User discovery error:', error);
    
    // Log error
    await supabase
      .from('organization_outreach_sync_logs')
      .insert({
        organization_connection_id: organizationConnectionId,
        operation_type: 'user_discovery',
        status: 'error',
        error_message: error.message,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
    
    throw error;
  }
}

interface UserDiscoveryResult {
  totalUsers: number;
  mappedUsers: number;
  mappingResults: UserMappingResult[];
}

interface UserMappingResult {
  userId: string;
  userEmail: string;
  prospectId?: number;
  prospectName?: string;
  status: 'mapped' | 'not_found' | 'error';
  error?: string;
}
```

### Individual Integration Pattern
The individual approach allows users to connect their personal Outreach accounts with granular control over data sharing and synchronization.

```typescript
// Individual user connection management
export class IndividualOutreachManager {
  async connectUser(
    userId: string,
    authCode: string,
    connectionName: string = 'Personal Connection'
  ): Promise<OutreachConnection> {
    // Exchange auth code for tokens
    const tokenResponse = await this.exchangeCodeForTokens(authCode);
    
    // Get user info from Outreach
    const userInfo = await this.getOutreachUserInfo(tokenResponse.access_token);
    
    // Store connection
    const { data, error } = await supabase
      .from('outreach_connections')
      .insert({
        user_id: userId,
        connection_name: connectionName,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        token_expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
        outreach_user_id: userInfo.id,
        outreach_user_email: userInfo.email,
        is_active: true,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  }
  
  async syncRecordingToOutreach(
    recordingId: string,
    prospectMappings: ProspectMapping[]
  ): Promise<SyncResult> {
    const { data, error } = await supabase.functions.invoke('sync-to-outreach', {
      body: {
        recordingId,
        prospectMappings,
      },
    });
    
    if (error) throw error;
    return data;
  }
  
  async bulkSyncRecordings(
    connectionId: string,
    recordingIds: string[]
  ): Promise<BulkSyncResult> {
    const results: SyncResult[] = [];
    const batchSize = 5; // Respect rate limits
    
    for (let i = 0; i < recordingIds.length; i += batchSize) {
      const batch = recordingIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recordingId) => {
        try {
          const result = await this.syncRecordingToOutreach(recordingId, []);
          return { recordingId, status: 'success', result };
        } catch (error) {
          return { recordingId, status: 'error', error: error.message };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Rate limiting delay between batches
      if (i + batchSize < recordingIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return {
      totalRecordings: recordingIds.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      results,
    };
  }
  
  private async exchangeCodeForTokens(authCode: string): Promise<TokenResponse> {
    const response = await fetch('https://api.outreach.io/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
        redirect_uri: oauthConfig.redirectUri,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

interface ProspectMapping {
  prospectId: number;
  speakerName?: string;
  role: 'primary' | 'secondary';
}

interface SyncResult {
  success: boolean;
  activityId?: number;
  error?: string;
  prospectsSynced: number;
}

interface BulkSyncResult {
  totalRecordings: number;
  successful: number;
  failed: number;
  results: Array<{
    recordingId: string;
    status: 'success' | 'error';
    result?: any;
    error?: string;
  }>;
}
```

## API Client Implementation

### Robust API Client with Rate Limiting
```typescript
// Production-ready Outreach API client
export class OutreachAPIClient {
  private rateLimitInfo: RateLimitInfo = {
    limit: 10000,
    remaining: 10000,
    resetTime: Date.now() + 3600000, // 1 hour
  };
  
  constructor(private accessToken: string) {}
  
  async makeRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    // Check rate limits before making request
    await this.checkRateLimit();
    
    const url = `${oauthConfig.baseUrl}/${endpoint.replace(/^\//, '')}`;
    const requestOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/vnd.api+json',
        'User-Agent': 'EchoAI-Scribe/1.0',
        ...options.headers,
      },
    };
    
    if (options.body) {
      requestOptions.body = JSON.stringify(options.body);
    }
    
    try {
      const response = await fetch(url, requestOptions);
      
      // Update rate limit info from response headers
      this.updateRateLimitInfo(response);
      
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }
      
      const data = await response.json();
      
      return {
        data: data.data,
        meta: data.meta,
        links: data.links,
        included: data.included,
      };
      
    } catch (error) {
      console.error('Outreach API request failed:', error);
      throw new OutreachAPIError(
        `API request failed: ${error.message}`,
        'REQUEST_FAILED',
        true
      );
    }
  }
  
  // Prospects API methods
  async getProspects(filters: ProspectFilters = {}): Promise<APIResponse<Prospect[]>> {
    const queryParams = new URLSearchParams();
    
    if (filters.email) {
      queryParams.append('filter[emails]', filters.email);
    }
    if (filters.company) {
      queryParams.append('filter[company]', filters.company);
    }
    if (filters.updatedAfter) {
      queryParams.append('filter[updatedAt]', filters.updatedAfter.toISOString());
    }
    
    const endpoint = `prospects?${queryParams.toString()}`;
    return await this.makeRequest<Prospect[]>(endpoint);
  }
  
  async getProspect(id: number, include: string[] = []): Promise<APIResponse<Prospect>> {
    const queryParams = new URLSearchParams();
    if (include.length > 0) {
      queryParams.append('include', include.join(','));
    }
    
    const endpoint = `prospects/${id}?${queryParams.toString()}`;
    return await this.makeRequest<Prospect>(endpoint);
  }
  
  // Calls API methods
  async createCall(callData: CreateCallData): Promise<APIResponse<Call>> {
    return await this.makeRequest<Call>('calls', {
      method: 'POST',
      body: {
        data: {
          type: 'call',
          attributes: callData.attributes,
          relationships: callData.relationships,
        },
      },
    });
  }
  
  async getCalls(filters: CallFilters = {}): Promise<APIResponse<Call[]>> {
    const queryParams = new URLSearchParams();
    
    if (filters.prospectId) {
      queryParams.append('filter[prospect]', filters.prospectId.toString());
    }
    if (filters.dateRange) {
      queryParams.append('filter[createdAt]', `${filters.dateRange.start.toISOString()}..${filters.dateRange.end.toISOString()}`);
    }
    
    const endpoint = `calls?${queryParams.toString()}`;
    return await this.makeRequest<Call[]>(endpoint);
  }
  
  private async checkRateLimit(): Promise<void> {
    if (this.rateLimitInfo.remaining <= 5) {
      const waitTime = this.rateLimitInfo.resetTime - Date.now();
      if (waitTime > 0) {
        console.log(`Rate limit nearly exceeded. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  private updateRateLimitInfo(response: Response): void {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    
    if (limit) this.rateLimitInfo.limit = parseInt(limit);
    if (remaining) this.rateLimitInfo.remaining = parseInt(remaining);
    if (reset) this.rateLimitInfo.resetTime = parseInt(reset) * 1000;
  }
  
  private async handleErrorResponse(response: Response): Promise<never> {
    const errorData = await response.json().catch(() => ({}));
    
    let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
    let errorCode = 'API_ERROR';
    let retryable = false;
    
    switch (response.status) {
      case 401:
        errorCode = 'UNAUTHORIZED';
        errorMessage = 'Access token is invalid or expired';
        break;
      case 403:
        errorCode = 'FORBIDDEN';
        errorMessage = 'Insufficient permissions for this operation';
        break;
      case 404:
        errorCode = 'NOT_FOUND';
        errorMessage = 'Requested resource not found';
        break;
      case 429:
        errorCode = 'RATE_LIMITED';
        errorMessage = 'Rate limit exceeded';
        retryable = true;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorCode = 'SERVER_ERROR';
        errorMessage = 'Outreach API server error';
        retryable = true;
        break;
    }
    
    if (errorData.errors && errorData.errors.length > 0) {
      errorMessage = errorData.errors[0].detail || errorMessage;
    }
    
    throw new OutreachAPIError(errorMessage, errorCode, retryable);
  }
}

// Custom error class for Outreach API errors
export class OutreachAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'OutreachAPIError';
  }
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
}

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

interface APIResponse<T> {
  data: T;
  meta?: any;
  links?: any;
  included?: any[];
}

interface ProspectFilters {
  email?: string;
  company?: string;
  updatedAfter?: Date;
}

interface CallFilters {
  prospectId?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface CreateCallData {
  attributes: {
    subject: string;
    note?: string;
    occuredAt: string;
    outcome: string;
    sentiment: string;
    direction: 'inbound' | 'outbound';
    callDisposition: string;
    tags?: string[];
  };
  relationships: {
    prospect: {
      data: {
        type: 'prospect';
        id: number;
      };
    };
  };
}
```

## Webhook Implementation

### Real-time Data Synchronization
```typescript
// Webhook handler for Outreach events
// /supabase/functions/outreach-webhook/index.ts
export async function handleOutreachWebhook(req: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Verify webhook signature
    const signature = req.headers.get('X-Outreach-Signature');
    const body = await req.text();
    
    if (!verifyWebhookSignature(body, signature)) {
      return new Response('Invalid signature', { 
        status: 401, 
        headers: corsHeaders 
      });
    }
    
    const payload = JSON.parse(body);
    const { event, data } = payload;
    
    // Process different event types
    switch (event) {
      case 'prospect.created':
      case 'prospect.updated':
        await handleProspectEvent(data);
        break;
        
      case 'call.created':
      case 'call.updated':
        await handleCallEvent(data);
        break;
        
      case 'account.updated':
        await handleAccountEvent(data);
        break;
        
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }
    
    return new Response('OK', { headers: corsHeaders });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Internal Server Error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

function verifyWebhookSignature(body: string, signature: string): boolean {
  const webhookSecret = Deno.env.get('OUTREACH_WEBHOOK_SECRET');
  if (!webhookSecret) return false;
  
  const crypto = globalThis.crypto;
  const encoder = new TextEncoder();
  const key = encoder.encode(webhookSecret);
  const data = encoder.encode(body);
  
  // Calculate HMAC-SHA256
  return crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(cryptoKey => {
    return crypto.subtle.sign('HMAC', cryptoKey, data);
  }).then(signatureBuffer => {
    const calculatedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return calculatedSignature === signature;
  });
}

async function handleProspectEvent(prospectData: any): Promise<void> {
  // Update cached prospect data
  const { error } = await supabase
    .from('outreach_prospects_cache')
    .upsert({
      prospect_id: prospectData.id,
      prospect_data: prospectData,
      last_updated: new Date().toISOString(),
    });
  
  if (error) {
    console.error('Error updating prospect cache:', error);
  }
  
  // Trigger real-time update to connected clients
  supabase.channel('prospect-updates').send({
    type: 'broadcast',
    event: 'prospect_updated',
    payload: {
      prospectId: prospectData.id,
      action: 'updated',
    },
  });
}

async function handleCallEvent(callData: any): Promise<void> {
  // Update call cache
  const { error } = await supabase
    .from('outreach_calls_cache')
    .upsert({
      call_id: callData.id,
      prospect_id: callData.relationships?.prospect?.data?.id,
      call_title: callData.attributes.subject,
      call_date: callData.attributes.occurredAt,
      duration: callData.attributes.duration,
      outcome: callData.attributes.outcome,
      sentiment: callData.attributes.sentiment,
      summary: callData.attributes.note,
      call_data: callData,
      last_updated: new Date().toISOString(),
    });
  
  if (error) {
    console.error('Error updating call cache:', error);
    return;
  }
  
  // Notify users with matching prospect mappings
  const { data: userProfiles } = await supabase
    .from('user_outreach_profiles')
    .select('user_id')
    .eq('outreach_prospect_id', callData.relationships?.prospect?.data?.id)
    .eq('is_active', true);
  
  if (userProfiles && userProfiles.length > 0) {
    for (const profile of userProfiles) {
      // Send real-time notification to user
      supabase.channel(`user-${profile.user_id}`).send({
        type: 'broadcast',
        event: 'new_call',
        payload: {
          callId: callData.id,
          callTitle: callData.attributes.subject,
          callDate: callData.attributes.occurredAt,
        },
      });
    }
  }
}

async function handleAccountEvent(accountData: any): Promise<void> {
  // Update account information in prospect mappings
  const { error } = await supabase
    .from('user_outreach_profiles')
    .update({
      prospect_company: accountData.attributes.name,
    })
    .eq('prospect_company', accountData.attributes.name); // Update by company name match
  
  if (error) {
    console.error('Error updating account info:', error);
  }
}
```

## Performance Optimization

### Caching and Data Management
```typescript
// Intelligent caching system for Outreach data
export class OutreachDataCache {
  private static readonly CACHE_DURATION = {
    prospects: 60 * 60 * 1000, // 1 hour
    calls: 30 * 60 * 1000,     // 30 minutes
    accounts: 24 * 60 * 60 * 1000, // 24 hours
  };
  
  static async getCachedProspects(
    connectionId: string,
    filters: ProspectFilters = {}
  ): Promise<Prospect[] | null> {
    const cacheKey = this.generateCacheKey('prospects', connectionId, filters);
    
    const { data } = await supabase
      .from('outreach_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    return data?.cache_data || null;
  }
  
  static async setCachedProspects(
    connectionId: string,
    filters: ProspectFilters,
    prospects: Prospect[]
  ): Promise<void> {
    const cacheKey = this.generateCacheKey('prospects', connectionId, filters);
    const expiresAt = new Date(Date.now() + this.CACHE_DURATION.prospects);
    
    await supabase
      .from('outreach_cache')
      .upsert({
        cache_key: cacheKey,
        cache_data: prospects,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });
  }
  
  static async invalidateCache(pattern: string): Promise<void> {
    await supabase
      .from('outreach_cache')
      .delete()
      .like('cache_key', `${pattern}%`);
  }
  
  private static generateCacheKey(
    type: string,
    connectionId: string,
    filters: any = {}
  ): string {
    const filterString = Object.entries(filters)
      .sort()
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    
    return `${type}:${connectionId}:${filterString}`;
  }
}

// Optimized data fetching with React Query integration
export const useOutreachProspects = (
  connectionId: string,
  filters: ProspectFilters = {}
) => {
  return useQuery({
    queryKey: ['outreach-prospects', connectionId, filters],
    queryFn: async () => {
      // Try cache first
      const cached = await OutreachDataCache.getCachedProspects(connectionId, filters);
      if (cached) {
        return cached;
      }
      
      // Fetch from API
      const client = new OutreachAPIClient(
        await OutreachTokenManager.getInstance().getValidToken(connectionId)
      );
      
      const response = await client.getProspects(filters);
      
      // Cache the results
      await OutreachDataCache.setCachedProspects(connectionId, filters, response.data);
      
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!connectionId,
  });
};

// Batch operations for improved performance
export class OutreachBatchProcessor {
  private static readonly BATCH_SIZE = 10;
  private static readonly BATCH_DELAY = 1000; // 1 second between batches
  
  static async batchProcessCalls(
    calls: CallCreateData[],
    accessToken: string
  ): Promise<BatchProcessResult> {
    const client = new OutreachAPIClient(accessToken);
    const results: BatchProcessResult = {
      successful: 0,
      failed: 0,
      errors: [],
    };
    
    // Process in batches to respect rate limits
    for (let i = 0; i < calls.length; i += this.BATCH_SIZE) {
      const batch = calls.slice(i, i + this.BATCH_SIZE);
      
      const batchPromises = batch.map(async (callData, index) => {
        try {
          await client.createCall(callData);
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            index: i + index,
            error: error.message,
            callData,
          });
        }
      });
      
      await Promise.all(batchPromises);
      
      // Delay between batches
      if (i + this.BATCH_SIZE < calls.length) {
        await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY));
      }
    }
    
    return results;
  }
}

interface BatchProcessResult {
  successful: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
    callData: any;
  }>;
}
```

## Security and Compliance

### Data Protection and Privacy
```typescript
// Secure token storage and management
export class SecureTokenStorage {
  private static readonly ENCRYPTION_KEY = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  
  static async encryptToken(token: string): Promise<string> {
    if (!this.ENCRYPTION_KEY) {
      throw new Error('Encryption key not configured');
    }
    
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.ENCRYPTION_KEY),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  static async decryptToken(encryptedToken: string): Promise<string> {
    if (!this.ENCRYPTION_KEY) {
      throw new Error('Encryption key not configured');
    }
    
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const combined = new Uint8Array(
      atob(encryptedToken)
        .split('')
        .map(char => char.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.ENCRYPTION_KEY),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    return decoder.decode(decrypted);
  }
}

// Audit logging for compliance
export class OutreachAuditLogger {
  static async logOperation(
    operation: AuditOperation
  ): Promise<void> {
    await supabase
      .from('outreach_audit_logs')
      .insert({
        user_id: operation.userId,
        operation_type: operation.type,
        resource_type: operation.resourceType,
        resource_id: operation.resourceId,
        details: operation.details,
        ip_address: operation.ipAddress,
        user_agent: operation.userAgent,
        timestamp: new Date().toISOString(),
      });
  }
  
  static async getAuditTrail(
    filters: AuditFilters
  ): Promise<AuditLogEntry[]> {
    let query = supabase
      .from('outreach_audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.operationType) {
      query = query.eq('operation_type', filters.operationType);
    }
    
    if (filters.dateRange) {
      query = query
        .gte('timestamp', filters.dateRange.start.toISOString())
        .lte('timestamp', filters.dateRange.end.toISOString());
    }
    
    const { data, error } = await query.limit(filters.limit || 100);
    
    if (error) throw error;
    return data || [];
  }
}

interface AuditOperation {
  userId: string;
  type: 'connect' | 'sync' | 'disconnect' | 'read' | 'write';
  resourceType: 'prospect' | 'call' | 'account' | 'connection';
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditFilters {
  userId?: string;
  operationType?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
}

interface AuditLogEntry {
  id: string;
  user_id: string;
  operation_type: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}
```