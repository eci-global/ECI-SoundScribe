import { supabase } from '@/integrations/supabase/client';

export interface OrganizationSetting {
  id: string;
  organization_id: string;
  setting_key: string;
  setting_value: Record<string, any>;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface SupportModeScoreSettings {
  enabled: boolean;
}

export interface SupportModeDisplaySettings {
  style: 'percentage' | 'letter_grade' | 'qualitative';
}

/**
 * Service for managing organization-level settings and feature flags
 */
class OrganizationSettingsService {
  private organizationId = 'default'; // Can be extended to support multiple orgs

  /**
   * Get a specific setting by key
   */
  async getSetting<T = Record<string, any>>(
    settingKey: string
  ): Promise<T | null> {
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('setting_value')
        .eq('organization_id', this.organizationId)
        .eq('setting_key', settingKey)
        .single();

      if (error) {
        console.error(`Error fetching setting ${settingKey}:`, error);
        return null;
      }

      return (data?.setting_value as T) || null;
    } catch (error) {
      console.error(`Exception fetching setting ${settingKey}:`, error);
      return null;
    }
  }

  /**
   * Get all settings for the organization
   */
  async getAllSettings(): Promise<OrganizationSetting[]> {
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', this.organizationId)
        .order('setting_key', { ascending: true });

      if (error) {
        console.error('Error fetching all settings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception fetching all settings:', error);
      return [];
    }
  }

  /**
   * Update a setting value
   */
  async updateSetting<T = Record<string, any>>(
    settingKey: string,
    settingValue: T,
    description?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('organization_settings')
        .upsert(
          {
            organization_id: this.organizationId,
            setting_key: settingKey,
            setting_value: settingValue as any,
            description,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'organization_id,setting_key',
          }
        );

      if (error) {
        console.error(`Error updating setting ${settingKey}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Exception updating setting ${settingKey}:`, error);
      return false;
    }
  }

  /**
   * Delete a setting
   */
  async deleteSetting(settingKey: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('organization_settings')
        .delete()
        .eq('organization_id', this.organizationId)
        .eq('setting_key', settingKey);

      if (error) {
        console.error(`Error deleting setting ${settingKey}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Exception deleting setting ${settingKey}:`, error);
      return false;
    }
  }

  /**
   * Support Mode: Get score visibility setting
   */
  async getSupportModeShowScores(): Promise<boolean> {
    const setting = await this.getSetting<SupportModeScoreSettings>(
      'support_mode.show_scores'
    );
    return setting?.enabled ?? true; // Default to true (show scores)
  }

  /**
   * Support Mode: Update score visibility setting
   */
  async updateSupportModeShowScores(enabled: boolean): Promise<boolean> {
    return this.updateSetting<SupportModeScoreSettings>(
      'support_mode.show_scores',
      { enabled },
      'Controls whether ECI scores are displayed in support mode coaching insights'
    );
  }

  /**
   * Support Mode: Get score display style
   */
  async getSupportModeDisplayStyle(): Promise<'percentage' | 'letter_grade' | 'qualitative'> {
    const setting = await this.getSetting<SupportModeDisplaySettings>(
      'support_mode.score_display_style'
    );
    return setting?.style ?? 'percentage'; // Default to percentage
  }

  /**
   * Support Mode: Update score display style
   */
  async updateSupportModeDisplayStyle(
    style: 'percentage' | 'letter_grade' | 'qualitative'
  ): Promise<boolean> {
    return this.updateSetting<SupportModeDisplaySettings>(
      'support_mode.score_display_style',
      { style },
      'Display style for scores: percentage, letter_grade, or qualitative'
    );
  }

  /**
   * Set organization ID (for multi-tenant support in the future)
   */
  setOrganizationId(organizationId: string): void {
    this.organizationId = organizationId;
  }

  /**
   * Get current organization ID
   */
  getOrganizationId(): string {
    return this.organizationId;
  }
}

// Export singleton instance
export const organizationSettingsService = new OrganizationSettingsService();

// Named exports for convenience
export const {
  getSetting,
  getAllSettings,
  updateSetting,
  deleteSetting,
  getSupportModeShowScores,
  updateSupportModeShowScores,
  getSupportModeDisplayStyle,
  updateSupportModeDisplayStyle,
} = organizationSettingsService;
