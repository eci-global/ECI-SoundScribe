/**
 * Data Anonymization Utilities
 * Provides functions to anonymize personal data for privacy compliance
 */

export interface AnonymizationOptions {
  preserveFormat: boolean;
  useHashingForIds: boolean;
  keepStatistics: boolean;
  customRules?: Record<string, (value: any) => any>;
}

export interface AnonymizedResult<T> {
  data: T;
  anonymizationMap: Record<string, string>;
  statistics: {
    fieldsAnonymized: number;
    recordsProcessed: number;
    anonymizationRules: string[];
  };
}

export class DataAnonymizer {
  private options: AnonymizationOptions;
  private anonymizationMap: Map<string, string> = new Map();
  private statisticsCounter = {
    fieldsAnonymized: 0,
    recordsProcessed: 0,
    rulesApplied: new Set<string>()
  };

  constructor(options: Partial<AnonymizationOptions> = {}) {
    this.options = {
      preserveFormat: true,
      useHashingForIds: true,
      keepStatistics: true,
      ...options
    };
  }

  /**
   * Anonymize a dataset
   */
  anonymize<T>(data: T): AnonymizedResult<T> {
    this.resetCounters();
    const anonymizedData = this.processData(data);
    
    return {
      data: anonymizedData,
      anonymizationMap: Object.fromEntries(this.anonymizationMap),
      statistics: {
        fieldsAnonymized: this.statisticsCounter.fieldsAnonymized,
        recordsProcessed: this.statisticsCounter.recordsProcessed,
        anonymizationRules: Array.from(this.statisticsCounter.rulesApplied)
      }
    };
  }

  /**
   * Process data recursively
   */
  private processData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => {
        this.statisticsCounter.recordsProcessed++;
        return this.processData(item);
      });
    }

    if (typeof data === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.anonymizeField(key, value);
      }
      return result;
    }

    return data;
  }

  /**
   * Anonymize a specific field based on its key and value
   */
  private anonymizeField(key: string, value: any): any {
    // Apply custom rules first
    if (this.options.customRules && this.options.customRules[key]) {
      this.statisticsCounter.fieldsAnonymized++;
      this.statisticsCounter.rulesApplied.add(`custom:${key}`);
      return this.options.customRules[key](value);
    }

    // Built-in anonymization rules
    const lowerKey = key.toLowerCase();

    // Email addresses
    if (lowerKey.includes('email') && typeof value === 'string' && this.isEmail(value)) {
      this.statisticsCounter.fieldsAnonymized++;
      this.statisticsCounter.rulesApplied.add('email');
      return this.anonymizeEmail(value);
    }

    // Phone numbers
    if ((lowerKey.includes('phone') || lowerKey.includes('mobile') || lowerKey.includes('tel')) 
        && typeof value === 'string' && this.isPhoneNumber(value)) {
      this.statisticsCounter.fieldsAnonymized++;
      this.statisticsCounter.rulesApplied.add('phone');
      return this.anonymizePhoneNumber(value);
    }

    // Names
    if ((lowerKey.includes('name') || lowerKey.includes('firstname') || lowerKey.includes('lastname'))
        && typeof value === 'string' && value.length > 0) {
      this.statisticsCounter.fieldsAnonymized++;
      this.statisticsCounter.rulesApplied.add('name');
      return this.anonymizeName(value);
    }

    // Addresses
    if ((lowerKey.includes('address') || lowerKey.includes('street') || lowerKey.includes('location'))
        && typeof value === 'string' && value.length > 0) {
      this.statisticsCounter.fieldsAnonymized++;
      this.statisticsCounter.rulesApplied.add('address');
      return this.anonymizeAddress(value);
    }

    // IP Addresses
    if ((lowerKey.includes('ip') || lowerKey.includes('ipaddress')) 
        && typeof value === 'string' && this.isIPAddress(value)) {
      this.statisticsCounter.fieldsAnonymized++;
      this.statisticsCounter.rulesApplied.add('ip');
      return this.anonymizeIPAddress(value);
    }

    // Credit Card Numbers
    if ((lowerKey.includes('card') || lowerKey.includes('credit') || lowerKey.includes('payment'))
        && typeof value === 'string' && this.isCreditCardNumber(value)) {
      this.statisticsCounter.fieldsAnonymized++;
      this.statisticsCounter.rulesApplied.add('creditcard');
      return this.anonymizeCreditCard(value);
    }

    // Social Security Numbers
    if ((lowerKey.includes('ssn') || lowerKey.includes('social') || lowerKey.includes('security'))
        && typeof value === 'string' && this.isSSN(value)) {
      this.statisticsCounter.fieldsAnonymized++;
      this.statisticsCounter.rulesApplied.add('ssn');
      return this.anonymizeSSN(value);
    }

    // User IDs (if hashing is enabled)
    if ((lowerKey.includes('userid') || lowerKey.includes('user_id') || key === 'id')
        && typeof value === 'string' && this.options.useHashingForIds) {
      this.statisticsCounter.fieldsAnonymized++;
      this.statisticsCounter.rulesApplied.add('id');
      return this.anonymizeId(value);
    }

    // Dates of birth
    if ((lowerKey.includes('birth') || lowerKey.includes('dob')) 
        && typeof value === 'string' && this.isDate(value)) {
      this.statisticsCounter.fieldsAnonymized++;
      this.statisticsCounter.rulesApplied.add('birthdate');
      return this.anonymizeBirthDate(value);
    }

    // User agents
    if ((lowerKey.includes('useragent') || lowerKey.includes('user_agent'))
        && typeof value === 'string') {
      this.statisticsCounter.fieldsAnonymized++;
      this.statisticsCounter.rulesApplied.add('useragent');
      return this.anonymizeUserAgent(value);
    }

    // Recursively process nested objects
    if (typeof value === 'object' && value !== null) {
      return this.processData(value);
    }

    return value;
  }

  /**
   * Anonymize email addresses
   */
  private anonymizeEmail(email: string): string {
    if (!this.options.preserveFormat) {
      return '[ANONYMIZED_EMAIL]';
    }

    const [local, domain] = email.split('@');
    if (!domain) return '[INVALID_EMAIL]';

    const anonymizedLocal = local.length > 2 
      ? local.substring(0, 2) + '*'.repeat(Math.max(local.length - 2, 1))
      : '**';

    const result = `${anonymizedLocal}@${domain}`;
    this.anonymizationMap.set(email, result);
    return result;
  }

  /**
   * Anonymize phone numbers
   */
  private anonymizePhoneNumber(phone: string): string {
    if (!this.options.preserveFormat) {
      return '[ANONYMIZED_PHONE]';
    }

    // Keep format but replace digits
    const result = phone.replace(/\d/g, (match, index) => {
      // Keep first 3 and last 2 digits for format recognition
      if (index < 3 || index >= phone.length - 2) {
        return match;
      }
      return '*';
    });

    this.anonymizationMap.set(phone, result);
    return result;
  }

  /**
   * Anonymize names
   */
  private anonymizeName(name: string): string {
    if (!this.options.preserveFormat) {
      return '[ANONYMIZED_NAME]';
    }

    const words = name.split(/\s+/);
    const anonymizedWords = words.map(word => {
      if (word.length <= 2) return '*'.repeat(word.length);
      return word.charAt(0) + '*'.repeat(word.length - 1);
    });

    const result = anonymizedWords.join(' ');
    this.anonymizationMap.set(name, result);
    return result;
  }

  /**
   * Anonymize addresses
   */
  private anonymizeAddress(address: string): string {
    if (!this.options.preserveFormat) {
      return '[ANONYMIZED_ADDRESS]';
    }

    // Replace street numbers and specific identifiers
    const result = address
      .replace(/\d+/g, 'XXX')
      .replace(/apt\s*\d+/gi, 'Apt XXX')
      .replace(/suite\s*\d+/gi, 'Suite XXX')
      .replace(/unit\s*\d+/gi, 'Unit XXX');

    this.anonymizationMap.set(address, result);
    return result;
  }

  /**
   * Anonymize IP addresses
   */
  private anonymizeIPAddress(ip: string): string {
    if (!this.options.preserveFormat) {
      return '[ANONYMIZED_IP]';
    }

    // For IPv4, keep first two octets
    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        const result = `${parts[0]}.${parts[1]}.XXX.XXX`;
        this.anonymizationMap.set(ip, result);
        return result;
      }
    }

    // For IPv6, keep first 4 groups
    if (ip.includes(':')) {
      const parts = ip.split(':');
      if (parts.length >= 4) {
        const result = `${parts.slice(0, 4).join(':')}:XXXX:XXXX:XXXX:XXXX`;
        this.anonymizationMap.set(ip, result);
        return result;
      }
    }

    return '[ANONYMIZED_IP]';
  }

  /**
   * Anonymize credit card numbers
   */
  private anonymizeCreditCard(cardNumber: string): string {
    if (!this.options.preserveFormat) {
      return '[ANONYMIZED_CARD]';
    }

    // Keep last 4 digits and format
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length >= 4) {
      const lastFour = digits.slice(-4);
      const masked = '*'.repeat(digits.length - 4) + lastFour;
      
      // Preserve original formatting
      let result = cardNumber;
      let digitIndex = 0;
      result = result.replace(/\d/g, () => masked[digitIndex++] || '*');
      
      this.anonymizationMap.set(cardNumber, result);
      return result;
    }

    return '[INVALID_CARD]';
  }

  /**
   * Anonymize Social Security Numbers
   */
  private anonymizeSSN(ssn: string): string {
    if (!this.options.preserveFormat) {
      return '[ANONYMIZED_SSN]';
    }

    // Keep last 4 digits
    const result = ssn.replace(/\d/g, (match, index) => {
      const digitIndex = ssn.split('').filter(c => /\d/.test(c)).length - 
                        ssn.substr(index).split('').filter(c => /\d/.test(c)).length;
      return digitIndex < ssn.replace(/\D/g, '').length - 4 ? '*' : match;
    });

    this.anonymizationMap.set(ssn, result);
    return result;
  }

  /**
   * Anonymize IDs with hashing
   */
  private anonymizeId(id: string): string {
    // Use simple hash for consistency
    const hash = this.simpleHash(id);
    const result = `anon_${hash.toString(36)}`;
    this.anonymizationMap.set(id, result);
    return result;
  }

  /**
   * Anonymize birth dates
   */
  private anonymizeBirthDate(date: string): string {
    if (!this.options.preserveFormat) {
      return '[ANONYMIZED_DATE]';
    }

    // Keep year, anonymize month and day
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return '[INVALID_DATE]';
    }

    const year = dateObj.getFullYear();
    const result = `XXXX-XX-XX (${year})`;
    this.anonymizationMap.set(date, result);
    return result;
  }

  /**
   * Anonymize user agents
   */
  private anonymizeUserAgent(userAgent: string): string {
    // Extract browser and OS info while removing specific versions
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/i);
    const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/i);
    
    const browser = browserMatch ? browserMatch[1] : 'Unknown Browser';
    const os = osMatch ? osMatch[1] : 'Unknown OS';
    
    const result = `${browser}/XX.X (${os})`;
    this.anonymizationMap.set(userAgent, result);
    return result;
  }

  /**
   * Simple hash function for IDs
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Reset statistics counters
   */
  private resetCounters(): void {
    this.statisticsCounter = {
      fieldsAnonymized: 0,
      recordsProcessed: 0,
      rulesApplied: new Set()
    };
    this.anonymizationMap.clear();
  }

  // Validation methods
  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isPhoneNumber(value: string): boolean {
    return /[\d\s\-\(\)\+]{7,}/.test(value);
  }

  private isIPAddress(value: string): boolean {
    // IPv4 or IPv6
    return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) || 
           /^[0-9a-fA-F:]{3,39}$/.test(value);
  }

  private isCreditCardNumber(value: string): boolean {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 13 && digits.length <= 19;
  }

  private isSSN(value: string): boolean {
    return /^\d{3}-?\d{2}-?\d{4}$/.test(value);
  }

  private isDate(value: string): boolean {
    return !isNaN(Date.parse(value));
  }
}

/**
 * Quick anonymization function
 */
export function anonymizeData<T>(
  data: T,
  options: Partial<AnonymizationOptions> = {}
): AnonymizedResult<T> {
  const anonymizer = new DataAnonymizer(options);
  return anonymizer.anonymize(data);
}

/**
 * Anonymize specific field types
 */
export const fieldAnonymizers = {
  email: (email: string) => {
    const [local, domain] = email.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
  },
  
  phone: (phone: string) => {
    return phone.replace(/\d/g, (d, i) => i < 3 || i >= phone.length - 2 ? d : '*');
  },
  
  name: (name: string) => {
    return name.split(' ').map(word => 
      word.charAt(0) + '*'.repeat(Math.max(word.length - 1, 0))
    ).join(' ');
  },
  
  creditCard: (card: string) => {
    const digits = card.replace(/\D/g, '');
    return card.replace(/\d/g, (d, i) => {
      const digitPos = card.substring(0, i).replace(/\D/g, '').length;
      return digitPos < digits.length - 4 ? '*' : d;
    });
  }
};

/**
 * Bulk anonymization for datasets
 */
export function anonymizeDataset<T extends Record<string, any>[]>(
  dataset: T,
  fieldMappings: Record<string, keyof typeof fieldAnonymizers>,
  options: Partial<AnonymizationOptions> = {}
): AnonymizedResult<T> {
  const customRules = Object.entries(fieldMappings).reduce((rules, [field, type]) => {
    rules[field] = fieldAnonymizers[type];
    return rules;
  }, {} as Record<string, (value: any) => any>);

  return anonymizeData(dataset, { ...options, customRules });
}