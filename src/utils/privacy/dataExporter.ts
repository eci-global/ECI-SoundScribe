/**
 * Data Export Utilities
 * Handles user data export for privacy compliance
 */

export interface ExportableData {
  recordings: any[];
  profile: any;
  analytics: any[];
  [key: string]: any;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'xml';
  includeRecordings?: boolean;
  includeAnalytics?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export class DataExporter {
  static async exportUserData(userId: string, options: ExportOptions): Promise<ExportableData> {
    // Mock implementation for now
    return {
      recordings: [],
      profile: {},
      analytics: []
    };
  }
}

export const exportUserData = DataExporter.exportUserData;

export const createDownloadLink = (data: any, filename: string): string => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  return URL.createObjectURL(blob);
};

export const downloadExportedData = (data: any, filename: string): void => {
  const link = createDownloadLink(data, filename);
  const a = document.createElement('a');
  a.href = link;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(link);
};

export const fieldAnonymizers = {
  email: (value: string) => value.replace(/(.{2}).*@/, '$1***@'),
  phone: (value: string) => value.replace(/\d(?=\d{4})/g, '*'),
  creditCard: (value: string) => value.replace(/\d(?=\d{4})/g, '*'),
  name: (value: string) => value.split(' ').map((part, i) => i === 0 ? part : part[0] + '*'.repeat(part.length - 1)).join(' ')
};