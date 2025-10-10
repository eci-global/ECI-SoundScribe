import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  organizationSettingsService,
  type OrganizationSetting,
} from '@/services/organizationSettingsService';

/**
 * React Query hook for fetching a specific organization setting
 */
export function useOrganizationSetting<T = Record<string, any>>(
  settingKey: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  return useQuery<T | null>({
    queryKey: ['organization-setting', settingKey],
    queryFn: () => organizationSettingsService.getSetting<T>(settingKey),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * React Query hook for fetching all organization settings
 */
export function useOrganizationSettings(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  return useQuery<OrganizationSetting[]>({
    queryKey: ['organization-settings'],
    queryFn: () => organizationSettingsService.getAllSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * React Query mutation hook for updating a setting
 */
export function useUpdateOrganizationSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      settingKey,
      settingValue,
      description,
    }: {
      settingKey: string;
      settingValue: any;
      description?: string;
    }) => {
      const success = await organizationSettingsService.updateSetting(
        settingKey,
        settingValue,
        description
      );
      if (!success) {
        throw new Error('Failed to update setting');
      }
      return { settingKey, settingValue };
    },
    onSuccess: (data) => {
      // Invalidate both the specific setting and all settings queries
      queryClient.invalidateQueries({ queryKey: ['organization-setting', data.settingKey] });
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
    },
  });
}

/**
 * React Query mutation hook for deleting a setting
 */
export function useDeleteOrganizationSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settingKey: string) => {
      const success = await organizationSettingsService.deleteSetting(settingKey);
      if (!success) {
        throw new Error('Failed to delete setting');
      }
      return settingKey;
    },
    onSuccess: (settingKey) => {
      // Invalidate both the specific setting and all settings queries
      queryClient.invalidateQueries({ queryKey: ['organization-setting', settingKey] });
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
    },
  });
}

/**
 * Specialized hook for Support Mode score visibility setting
 */
export function useSupportModeShowScores() {
  const { data, isLoading, error } = useQuery<boolean>({
    queryKey: ['organization-setting', 'support_mode.show_scores'],
    queryFn: async () => {
      const setting = await organizationSettingsService.getSupportModeShowScores();
      return setting;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const success = await organizationSettingsService.updateSupportModeShowScores(enabled);
      if (!success) {
        throw new Error('Failed to update support mode score visibility');
      }
      return enabled;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organization-setting', 'support_mode.show_scores']
      });
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
    },
  });

  return {
    showScores: data ?? true, // Default to true if not loaded
    isLoading,
    error,
    updateShowScores: mutation.mutate,
    isUpdating: mutation.isPending,
    updateError: mutation.error,
  };
}

/**
 * Specialized hook for Support Mode display style setting
 */
export function useSupportModeDisplayStyle() {
  const { data, isLoading, error } = useQuery<'percentage' | 'letter_grade' | 'qualitative'>({
    queryKey: ['organization-setting', 'support_mode.score_display_style'],
    queryFn: async () => {
      const style = await organizationSettingsService.getSupportModeDisplayStyle();
      return style;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (style: 'percentage' | 'letter_grade' | 'qualitative') => {
      const success = await organizationSettingsService.updateSupportModeDisplayStyle(style);
      if (!success) {
        throw new Error('Failed to update support mode display style');
      }
      return style;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organization-setting', 'support_mode.score_display_style']
      });
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
    },
  });

  return {
    displayStyle: data ?? 'percentage', // Default to percentage
    isLoading,
    error,
    updateDisplayStyle: mutation.mutate,
    isUpdating: mutation.isPending,
    updateError: mutation.error,
  };
}
