/**
 * File Security Utilities
 * 
 * Provides secure file validation and processing for Excel uploads
 * to mitigate xlsx package vulnerabilities
 */

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  fileInfo: {
    name: string;
    size: number;
    type: string;
    lastModified: Date;
  };
}

export interface SecurityConfig {
  maxFileSize: number; // in bytes
  allowedTypes: string[];
  allowedExtensions: string[];
  processingTimeout: number; // in milliseconds
  maxRows: number;
  maxColumns: number;
}

// Default security configuration
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel' // .xls
  ],
  allowedExtensions: ['.xlsx', '.xls'],
  processingTimeout: 30000, // 30 seconds
  maxRows: 10000,
  maxColumns: 100
};

/**
 * Comprehensive file validation for Excel uploads
 */
export function validateExcelFile(
  file: File, 
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): FileValidationResult {
  const warnings: string[] = [];
  
  // Basic file info
  const fileInfo = {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified)
  };

  // 1. File size validation
  if (file.size > config.maxFileSize) {
    return {
      isValid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(config.maxFileSize)})`,
      fileInfo
    };
  }

  // 2. File type validation
  const fileExtension = getFileExtension(file.name);
  if (!config.allowedExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: `File type "${fileExtension}" is not allowed. Only Excel files (.xlsx, .xls) are permitted`,
      fileInfo
    };
  }

  // 3. MIME type validation (additional check)
  if (file.type && !config.allowedTypes.includes(file.type)) {
    warnings.push(`File MIME type "${file.type}" doesn't match expected Excel format`);
  }

  // 4. File name validation
  if (!isValidFileName(file.name)) {
    return {
      isValid: false,
      error: 'File name contains invalid characters',
      fileInfo
    };
  }

  // 5. File size warnings
  if (file.size > 5 * 1024 * 1024) { // 5MB
    warnings.push('Large file detected - processing may take longer');
  }

  // 6. Check for suspicious file names
  if (isSuspiciousFileName(file.name)) {
    warnings.push('File name appears unusual - please verify this is a legitimate Excel file');
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    fileInfo
  };
}

/**
 * Safe Excel processing with timeout and error handling
 */
export async function safeProcessExcel<T>(
  file: File,
  processor: (file: File) => Promise<T>,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): Promise<T> {
  // Validate file first
  const validation = validateExcelFile(file, config);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Log security event
  logSecurityEvent('excel_processing_start', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  });

  const startTime = Date.now();

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Excel processing timeout after ${config.processingTimeout}ms`));
      }, config.processingTimeout);
    });

    // Process file with timeout
    const result = await Promise.race([
      processor(file),
      timeoutPromise
    ]);

    const processingTime = Date.now() - startTime;
    
    // Log successful processing
    logSecurityEvent('excel_processing_success', {
      fileName: file.name,
      processingTime,
      fileSize: file.size
    });

    // Check for suspicious processing time
    if (processingTime > 10000) { // 10 seconds
      logSecurityEvent('excel_processing_slow', {
        fileName: file.name,
        processingTime,
        fileSize: file.size
      });
    }

    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Log processing failure
    logSecurityEvent('excel_processing_error', {
      fileName: file.name,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
      fileSize: file.size
    });

    // Re-throw with sanitized error message
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('File processing took too long. Please try a smaller file.');
      }
      if (error.message.includes('corrupted') || error.message.includes('invalid')) {
        throw new Error('Unable to process file. The file may be corrupted or in an unsupported format.');
      }
    }
    
    throw new Error('Failed to process file. Please try a different file.');
  }
}

/**
 * Validate Excel content structure
 */
export function validateExcelContent(
  data: any[][],
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): { isValid: boolean; error?: string; warnings?: string[] } {
  const warnings: string[] = [];

  // Check row count
  if (data.length > config.maxRows) {
    return {
      isValid: false,
      error: `File contains too many rows (${data.length}). Maximum allowed: ${config.maxRows}`
    };
  }

  // Check column count
  const maxColumns = Math.max(...data.map(row => row.length));
  if (maxColumns > config.maxColumns) {
    return {
      isValid: false,
      error: `File contains too many columns (${maxColumns}). Maximum allowed: ${config.maxColumns}`
    };
  }

  // Check for empty file
  if (data.length === 0) {
    return {
      isValid: false,
      error: 'File appears to be empty'
    };
  }

  // Check for suspicious content patterns
  const suspiciousPatterns = [
    /javascript:/i,
    /<script/i,
    /eval\(/i,
    /function\s*\(/i,
    /__proto__/i,
    /constructor/i
  ];

  for (let rowIndex = 0; rowIndex < Math.min(data.length, 100); rowIndex++) {
    const row = data[rowIndex];
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = String(row[colIndex] || '');
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(cellValue)) {
          warnings.push(`Suspicious content detected in row ${rowIndex + 1}, column ${colIndex + 1}`);
        }
      }
    }
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

// Helper functions

function getFileExtension(filename: string): string {
  return filename.toLowerCase().substring(filename.lastIndexOf('.'));
}

function isValidFileName(filename: string): boolean {
  // Check for valid characters (alphanumeric, spaces, hyphens, underscores, dots)
  const validPattern = /^[a-zA-Z0-9\s\-_\.]+$/;
  return validPattern.test(filename) && filename.length <= 255;
}

function isSuspiciousFileName(filename: string): boolean {
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.pif$/i,
    /\.com$/i,
    /\.vbs$/i,
    /\.js$/i,
    /\.jar$/i,
    /\.php$/i,
    /\.asp$/i,
    /\.jsp$/i,
    /\.sh$/i,
    /\.ps1$/i,
    /script/i,
    /malware/i,
    /virus/i,
    /trojan/i
  ];

  return suspiciousPatterns.some(pattern => pattern.test(filename));
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function logSecurityEvent(eventType: string, data: any): void {
  // Import the security monitoring service
  import('../services/securityMonitoringService').then(({ SecurityMonitoringService }) => {
    SecurityMonitoringService.logEvent(
      eventType as any, // Type assertion for event types
      data,
      'medium', // Default severity
      'file_security'
    );
  }).catch(() => {
    // Fallback to console logging if monitoring service fails
    console.warn(`[SECURITY] ${eventType}:`, {
      timestamp: new Date().toISOString(),
      ...data
    });
  });
}

/**
 * Create a secure Excel processor wrapper
 */
export function createSecureExcelProcessor<T>(
  processor: (file: File) => Promise<T>,
  config?: Partial<SecurityConfig>
): (file: File) => Promise<T> {
  const securityConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };
  
  return async (file: File): Promise<T> => {
    return safeProcessExcel(file, processor, securityConfig);
  };
}
