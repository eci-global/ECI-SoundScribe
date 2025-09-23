import { supabase } from '@/integrations/supabase/client';

export interface PromptTemplate {
  id?: string;
  name: string;
  category: string;
  description: string;
  template_content: string;
  variables?: PromptVariable[];
  is_active?: boolean;
  usage_count?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  last_used_at?: string;
}

export interface PromptVariable {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  description?: string;
  required?: boolean;
  default_value?: string;
  options?: string[]; // For select type
}

export interface PromptCategory {
  category: string;
  template_count: number;
}

export interface PromptTemplateFilters {
  category?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

class PromptTemplateClient {
  private async makeRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    // Get current session and check if token is expired
    let { data: { session } } = await supabase.auth.getSession();

    // Check if token is expired or will expire soon (within 60 seconds)
    if (session?.access_token) {
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const timeToExpiry = expirationTime - currentTime;

        // If token expires within 60 seconds, refresh it
        if (timeToExpiry < 60000) {
          console.log('Token expires soon, attempting refresh...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Redirect to login if refresh fails
            window.location.href = '/auth/login?message=Session expired, please log in again';
            throw new Error('Authentication session expired. Please log in again.');
          }

          if (refreshData.session) {
            session = refreshData.session;
            console.log('Token refreshed successfully');
          }
        }
      } catch (tokenError) {
        console.error('Error checking token expiration:', tokenError);
        // If we can't parse the token, it's likely invalid
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error('Token refresh failed after parse error:', refreshError);
          window.location.href = '/auth/login?message=Invalid session, please log in again';
          throw new Error('Authentication session invalid. Please log in again.');
        }

        if (refreshData.session) {
          session = refreshData.session;
          console.log('Token refreshed after parse error');
        }
      }
    }

    if (!session?.access_token) {
      throw new Error('No authentication session found. Please log in.');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    };

    const url = `${supabase.supabaseUrl}/functions/v1/ai-prompt-management${path}`;

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

      // Handle authentication errors specifically
      if (response.status === 401 || response.status === 403) {
        console.error('Authentication error:', errorData);

        // Try refreshing the session one more time
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshData.session) {
          window.location.href = '/auth/login?message=Session expired, please log in again';
          throw new Error('Authentication failed. Please log in again.');
        }

        // Retry the request with refreshed token
        const retryHeaders = {
          ...headers,
          'Authorization': `Bearer ${refreshData.session.access_token}`,
        };

        const retryResponse = await fetch(url, {
          ...options,
          headers: retryHeaders,
        });

        if (!retryResponse.ok) {
          const retryErrorData = await retryResponse.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(retryErrorData.error || `HTTP ${retryResponse.status}`);
        }

        return retryResponse.json();
      }

      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Get all prompt templates with optional filtering
  async getTemplates(filters: PromptTemplateFilters = {}): Promise<PromptTemplate[]> {
    const searchParams = new URLSearchParams();

    if (filters.category) searchParams.set('category', filters.category);
    if (filters.is_active !== undefined) searchParams.set('is_active', filters.is_active.toString());
    if (filters.limit) searchParams.set('limit', filters.limit.toString());
    if (filters.offset) searchParams.set('offset', filters.offset.toString());

    const query = searchParams.toString();
    const path = query ? `?${query}` : '';

    const response = await this.makeRequest<{ templates: PromptTemplate[] }>(path);
    return response.templates;
  }

  // Get a specific template by ID
  async getTemplate(id: string): Promise<PromptTemplate | null> {
    const response = await this.makeRequest<{ template: PromptTemplate | null }>(`?id=${id}`);
    return response.template;
  }

  // Get all template categories
  async getCategories(): Promise<PromptCategory[]> {
    const response = await this.makeRequest<{ categories: PromptCategory[] }>('/categories');
    return response.categories;
  }

  // Create a new template
  async createTemplate(template: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): Promise<string> {
    const response = await this.makeRequest<{ template_id: string }>('', {
      method: 'POST',
      body: JSON.stringify(template),
    });
    return response.template_id;
  }

  // Update an existing template
  async updateTemplate(template: PromptTemplate & { id: string }): Promise<void> {
    await this.makeRequest<{ success: boolean }>('', {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  }

  // Delete a template (soft delete)
  async deleteTemplate(id: string): Promise<void> {
    await this.makeRequest<{ success: boolean }>(`?id=${id}`, {
      method: 'DELETE',
    });
  }

  // Duplicate a template
  async duplicateTemplate(templateId: string, newName: string): Promise<string> {
    const response = await this.makeRequest<{ template_id: string }>('/duplicate', {
      method: 'POST',
      body: JSON.stringify({
        template_id: templateId,
        name: newName,
      }),
    });
    return response.template_id;
  }

  // Render a template with variables
  async renderTemplate(templateId: string, variableValues: Record<string, string>): Promise<string> {
    const response = await this.makeRequest<{ rendered_content: string }>('/render', {
      method: 'POST',
      body: JSON.stringify({
        template_id: templateId,
        variable_values: variableValues,
      }),
    });
    return response.rendered_content;
  }

  // Validate template content (check for proper variable syntax)
  validateTemplate(content: string, variables: PromptVariable[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unmatched braces
    const openBraces = (content.match(/\{\{/g) || []).length;
    const closeBraces = (content.match(/\}\}/g) || []).length;

    if (openBraces !== closeBraces) {
      errors.push('Unmatched braces - ensure all variables use {{variable_name}} format');
    }

    // Check for variables in content that aren't defined
    const variableMatches = content.match(/\{\{([^}]+)\}\}/g) || [];
    const variableNames = variableMatches.map(match => match.slice(2, -2).trim());
    const definedVariables = variables.map(v => v.name);

    const undefinedVariables = variableNames.filter(name => !definedVariables.includes(name));
    if (undefinedVariables.length > 0) {
      errors.push(`Undefined variables: ${undefinedVariables.join(', ')}`);
    }

    // Check for required variables that aren't used
    const requiredVariables = variables.filter(v => v.required).map(v => v.name);
    const unusedRequired = requiredVariables.filter(name => !variableNames.includes(name));
    if (unusedRequired.length > 0) {
      errors.push(`Required variables not used in template: ${unusedRequired.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Extract variables from template content
  extractVariables(content: string): string[] {
    const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(matches.map(match => match.slice(2, -2).trim()))];
  }

  // Get variable suggestions based on common prompt patterns
  getVariableSuggestions(category: string): PromptVariable[] {
    const commonVariables: Record<string, PromptVariable[]> = {
      'bdr_coaching': [
        { name: 'rep_name', type: 'text', description: 'Sales representative name', required: true },
        { name: 'call_transcript', type: 'text', description: 'Call transcript content', required: true },
        { name: 'scoring_criteria', type: 'text', description: 'BDR scoring criteria', required: true },
        { name: 'company_name', type: 'text', description: 'Company name' },
        { name: 'prospect_name', type: 'text', description: 'Prospect name' },
      ],
      'analysis': [
        { name: 'content', type: 'text', description: 'Content to analyze', required: true },
        { name: 'analysis_type', type: 'select', description: 'Type of analysis', options: ['sentiment', 'topic', 'summary'] },
        { name: 'context', type: 'text', description: 'Additional context' },
      ],
      'summary': [
        { name: 'text', type: 'text', description: 'Text to summarize', required: true },
        { name: 'max_length', type: 'number', description: 'Maximum summary length' },
        { name: 'focus_area', type: 'text', description: 'Area to focus on in summary' },
      ],
      'classification': [
        { name: 'input', type: 'text', description: 'Input to classify', required: true },
        { name: 'categories', type: 'text', description: 'Possible categories', required: true },
        { name: 'examples', type: 'text', description: 'Classification examples' },
      ],
    };

    return commonVariables[category] || [];
  }
}

export const promptTemplateClient = new PromptTemplateClient();

// React Query hooks for template management
export const PROMPT_TEMPLATE_QUERY_KEYS = {
  all: ['prompt-templates'] as const,
  lists: () => [...PROMPT_TEMPLATE_QUERY_KEYS.all, 'list'] as const,
  list: (filters: PromptTemplateFilters) => [...PROMPT_TEMPLATE_QUERY_KEYS.lists(), filters] as const,
  details: () => [...PROMPT_TEMPLATE_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PROMPT_TEMPLATE_QUERY_KEYS.details(), id] as const,
  categories: () => [...PROMPT_TEMPLATE_QUERY_KEYS.all, 'categories'] as const,
};

// Type definitions for AI prompt management
export type { PromptTemplate, PromptVariable, PromptCategory, PromptTemplateFilters };