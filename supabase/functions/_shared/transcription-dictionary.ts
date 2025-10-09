// Custom dictionary for transcription correction
// Maps common mis-transcriptions to correct terms

export const CUSTOM_TERMS: Record<string, string> = {
  // Company names
  'eci solutions': 'ECI Solutions',
  'eci': 'ECI',
  'eci manufacturing': 'ECI Manufacturing',

  // Common employee names (add more as needed)
  'grace burkes': 'Grace Burkes',
  'bob martin': 'Bob Martin',
  'milan jandu': 'Milan Jandu',
  'hector monreal': 'Hector Monreal',

  // Business terms
  'crm': 'CRM',
  'roi': 'ROI',
  'kpi': 'KPI',
  'bdr': 'BDR',
  'api': 'API',
  'saas': 'SaaS',

  // Product/service terms
  'outreach': 'Outreach',
  'salesforce': 'Salesforce',
  'hubspot': 'HubSpot',
};

/**
 * Build contextual prompt for Whisper based on custom dictionary
 */
export function buildWhisperPrompt(): string {
  const companyNames = ['ECI Solutions', 'ECI', 'ECI Manufacturing'];
  const commonTerms = ['CRM', 'Outreach', 'follow-up', 'prospect', 'quote', 'order', 'customer service'];

  return `This is a sales call or customer support conversation between business professionals. Common terms: ${[...companyNames, ...commonTerms].join(', ')}.`;
}

/**
 * Apply custom dictionary corrections to transcript
 * (Simple find-and-replace for known terms)
 */
export function applyDictionaryCorrections(transcript: string): string {
  let corrected = transcript;

  for (const [incorrect, correct] of Object.entries(CUSTOM_TERMS)) {
    const regex = new RegExp(`\\b${incorrect}\\b`, 'gi');
    corrected = corrected.replace(regex, correct);
  }

  return corrected;
}
