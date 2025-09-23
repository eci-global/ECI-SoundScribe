/**
 * Scorecard Data Validator for BDR Training Integration
 * 
 * Validates parsed Excel scorecard data against BDR training program criteria
 * Ensures data integrity before processing and training dataset creation
 */

import { ParsedScorecardData } from './excelParser';
import { BDRTrainingProgram, BDRCriteria } from '../types/bdr-training';

// Validation result structure
export interface ScorecardValidationResult {
  isValid: boolean;
  validRecords: ValidatedScorecardRecord[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

// Individual record validation result
export interface ValidatedScorecardRecord {
  originalData: ParsedScorecardData;
  normalizedData: NormalizedScorecardData;
  validationFlags: {
    hasAllRequiredFields: boolean;
    scoresWithinRange: boolean;
    dateFormatValid: boolean;
    callIdentifierValid: boolean;
  };
}

// Normalized scorecard data (standardized format)
export interface NormalizedScorecardData {
  callIdentifier: string;
  callDate: Date | null;
  durationMinutes: number | null;
  scores: {
    opening: number;
    clearConfident: number;
    patternInterrupt: number;
    toneEnergy: number;
    closing: number;
  };
  managerNotes: string | null;
  calculatedOverallScore: number;
  metadata: {
    originalRowNumber: number;
    normalizationApplied: string[];
  };
}

// Validation error types
export interface ValidationError {
  type: 'missing_required' | 'invalid_format' | 'out_of_range' | 'duplicate_identifier' | 'business_rule';
  severity: 'error' | 'critical';
  message: string;
  recordIdentifier?: string;
  rowNumber?: number;
  field?: string;
  value?: any;
  suggestedFix?: string;
}

// Validation warning types  
export interface ValidationWarning {
  type: 'format_assumption' | 'missing_optional' | 'data_quality' | 'recommendation';
  message: string;
  recordIdentifier?: string;
  rowNumber?: number;
  field?: string;
  value?: any;
  impact?: 'low' | 'medium' | 'high';
}

// Validation summary
export interface ValidationSummary {
  totalRecords: number;
  validRecords: number;
  errorRecords: number;
  warningRecords: number;
  duplicateIdentifiers: number;
  missingOptionalFields: {
    callDate: number;
    duration: number;
    managerNotes: number;
  };
  scoreDistribution: {
    excellent: number; // 9-10
    good: number; // 7-8
    needsImprovement: number; // 5-6
    poor: number; // 0-4
  };
}

// Validation configuration options
export interface ValidationConfig {
  allowDuplicateIdentifiers?: boolean;
  requireCallDate?: boolean;
  requireDuration?: boolean;
  requireManagerNotes?: boolean;
  scoreRange?: { min: number; max: number };
  dateRange?: { earliest: Date; latest: Date };
  strictValidation?: boolean;
  customBusinessRules?: CustomBusinessRule[];
}

export interface CustomBusinessRule {
  name: string;
  description: string;
  validate: (record: ParsedScorecardData, allRecords: ParsedScorecardData[]) => ValidationError | null;
}

/**
 * Main validation function for BDR scorecard data
 */
export async function validateScorecardData(
  data: ParsedScorecardData[],
  trainingProgram: BDRTrainingProgram,
  config?: ValidationConfig
): Promise<ScorecardValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const validRecords: ValidatedScorecardRecord[] = [];
  
  const validationConfig: ValidationConfig = {
    allowDuplicateIdentifiers: false,
    requireCallDate: false,
    requireDuration: false,
    requireManagerNotes: false,
    scoreRange: { min: 0, max: 10 },
    dateRange: { 
      earliest: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      latest: new Date()
    },
    strictValidation: true,
    customBusinessRules: [],
    ...config
  };

  // Step 1: Basic data structure validation
  if (!data || data.length === 0) {
    errors.push({
      type: 'missing_required',
      severity: 'critical',
      message: 'No scorecard data provided for validation'
    });
    
    return createValidationResult([], errors, warnings);
  }

  // Step 2: Validate against training program criteria
  const programCriteriaErrors = validateAgainstProgramCriteria(data, trainingProgram);
  errors.push(...programCriteriaErrors);

  // Step 3: Check for duplicate call identifiers
  const duplicateErrors = findDuplicateIdentifiers(data, validationConfig);
  errors.push(...duplicateErrors);

  // Step 4: Validate individual records
  for (const record of data) {
    try {
      const recordValidation = validateIndividualRecord(record, data, validationConfig);
      
      if (recordValidation.errors.length === 0) {
        validRecords.push(recordValidation.validRecord);
      }
      
      errors.push(...recordValidation.errors);
      warnings.push(...recordValidation.warnings);
      
    } catch (error) {
      errors.push({
        type: 'invalid_format',
        severity: 'error',
        message: `Failed to validate record: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recordIdentifier: record.callIdentifier,
        rowNumber: record.rowNumber
      });
    }
  }

  // Step 5: Business rule validation
  if (validationConfig.customBusinessRules) {
    for (const rule of validationConfig.customBusinessRules) {
      for (const record of data) {
        const ruleError = rule.validate(record, data);
        if (ruleError) {
          errors.push(ruleError);
        }
      }
    }
  }

  // Step 6: Data quality analysis and warnings
  const qualityWarnings = analyzeDataQuality(validRecords.map(r => r.normalizedData));
  warnings.push(...qualityWarnings);

  return createValidationResult(validRecords, errors, warnings);
}

/**
 * Validate against training program criteria requirements
 */
function validateAgainstProgramCriteria(
  data: ParsedScorecardData[],
  trainingProgram: BDRTrainingProgram
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if program has required criteria
  if (!trainingProgram.scorecardCriteria || trainingProgram.scorecardCriteria.length === 0) {
    errors.push({
      type: 'business_rule',
      severity: 'critical',
      message: 'Training program has no defined scorecard criteria'
    });
    return errors;
  }

  // Validate that we have the expected criteria count
  const expectedCriteriaCount = trainingProgram.scorecardCriteria.length;
  const actualScoreFields = 5; // opening, clearConfident, patternInterrupt, toneEnergy, closing

  if (expectedCriteriaCount !== actualScoreFields && trainingProgram.scorecardCriteria.length > 10) {
    errors.push({
      type: 'business_rule',
      severity: 'error',
      message: `Training program expects ${expectedCriteriaCount} criteria, but scorecard data provides ${actualScoreFields} score fields`
    });
  }

  return errors;
}

/**
 * Find duplicate call identifiers
 */
function findDuplicateIdentifiers(
  data: ParsedScorecardData[],
  config: ValidationConfig
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (config.allowDuplicateIdentifiers) {
    return errors;
  }

  const identifierCounts = new Map<string, number>();
  const identifierRows = new Map<string, number[]>();

  for (const record of data) {
    const id = record.callIdentifier.toLowerCase().trim();
    identifierCounts.set(id, (identifierCounts.get(id) || 0) + 1);
    
    if (!identifierRows.has(id)) {
      identifierRows.set(id, []);
    }
    identifierRows.get(id)!.push(record.rowNumber);
  }

  for (const [identifier, count] of identifierCounts) {
    if (count > 1) {
      const rows = identifierRows.get(identifier)!;
      errors.push({
        type: 'duplicate_identifier',
        severity: 'error',
        message: `Duplicate call identifier "${identifier}" found in rows: ${rows.join(', ')}`,
        recordIdentifier: identifier,
        suggestedFix: 'Ensure each call has a unique identifier'
      });
    }
  }

  return errors;
}

/**
 * Validate individual scorecard record
 */
function validateIndividualRecord(
  record: ParsedScorecardData,
  allRecords: ParsedScorecardData[],
  config: ValidationConfig
): {
  validRecord: ValidatedScorecardRecord;
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const normalizationApplied: string[] = [];

  // Validate call identifier
  if (!record.callIdentifier || record.callIdentifier.trim().length === 0) {
    errors.push({
      type: 'missing_required',
      severity: 'error',
      message: 'Call identifier is required',
      rowNumber: record.rowNumber,
      field: 'callIdentifier'
    });
  }

  // Validate scores
  const scores = {
    opening: record.openingScore,
    clearConfident: record.clearConfidentScore,
    patternInterrupt: record.patternInterruptScore,
    toneEnergy: record.toneEnergyScore,
    closing: record.closingScore
  };

  for (const [scoreName, scoreValue] of Object.entries(scores)) {
    if (typeof scoreValue !== 'number' || isNaN(scoreValue)) {
      errors.push({
        type: 'invalid_format',
        severity: 'error',
        message: `${scoreName} score must be a valid number`,
        recordIdentifier: record.callIdentifier,
        rowNumber: record.rowNumber,
        field: scoreName,
        value: scoreValue
      });
    } else if (scoreValue < config.scoreRange!.min || scoreValue > config.scoreRange!.max) {
      errors.push({
        type: 'out_of_range',
        severity: 'error',
        message: `${scoreName} score (${scoreValue}) must be between ${config.scoreRange!.min} and ${config.scoreRange!.max}`,
        recordIdentifier: record.callIdentifier,
        rowNumber: record.rowNumber,
        field: scoreName,
        value: scoreValue
      });
    }
  }

  // Validate and normalize call date
  let normalizedDate: Date | null = null;
  if (record.callDate) {
    try {
      normalizedDate = parseCallDate(record.callDate);
      
      if (config.dateRange) {
        if (normalizedDate < config.dateRange.earliest) {
          warnings.push({
            type: 'data_quality',
            message: `Call date ${record.callDate} is older than expected range`,
            recordIdentifier: record.callIdentifier,
            rowNumber: record.rowNumber,
            field: 'callDate',
            impact: 'medium'
          });
        } else if (normalizedDate > config.dateRange.latest) {
          errors.push({
            type: 'out_of_range',
            severity: 'error',
            message: `Call date ${record.callDate} is in the future`,
            recordIdentifier: record.callIdentifier,
            rowNumber: record.rowNumber,
            field: 'callDate',
            value: record.callDate
          });
        }
      }
    } catch (error) {
      errors.push({
        type: 'invalid_format',
        severity: 'error',
        message: `Invalid call date format: ${record.callDate}`,
        recordIdentifier: record.callIdentifier,
        rowNumber: record.rowNumber,
        field: 'callDate',
        value: record.callDate,
        suggestedFix: 'Use YYYY-MM-DD format or valid date string'
      });
    }
  } else if (config.requireCallDate) {
    errors.push({
      type: 'missing_required',
      severity: 'error',
      message: 'Call date is required',
      recordIdentifier: record.callIdentifier,
      rowNumber: record.rowNumber,
      field: 'callDate'
    });
  }

  // Validate duration
  let normalizedDuration: number | null = record.durationMinutes || null;
  if (record.durationMinutes !== undefined) {
    if (record.durationMinutes < 0 || record.durationMinutes > 180) {
      warnings.push({
        type: 'data_quality',
        message: `Call duration ${record.durationMinutes} minutes seems unusual`,
        recordIdentifier: record.callIdentifier,
        rowNumber: record.rowNumber,
        field: 'duration',
        impact: 'low'
      });
    }
  } else if (config.requireDuration) {
    errors.push({
      type: 'missing_required',
      severity: 'error',
      message: 'Call duration is required',
      recordIdentifier: record.callIdentifier,
      rowNumber: record.rowNumber,
      field: 'duration'
    });
  }

  // Validate manager notes
  let normalizedNotes: string | null = record.managerNotes?.trim() || null;
  if (!normalizedNotes && config.requireManagerNotes) {
    errors.push({
      type: 'missing_required',
      severity: 'error',
      message: 'Manager notes are required',
      recordIdentifier: record.callIdentifier,
      rowNumber: record.rowNumber,
      field: 'managerNotes'
    });
  }

  // Calculate overall score (weighted average)
  const overallScore = calculateOverallScore(scores);

  // Create normalized data
  const normalizedData: NormalizedScorecardData = {
    callIdentifier: record.callIdentifier.trim(),
    callDate: normalizedDate,
    durationMinutes: normalizedDuration,
    scores,
    managerNotes: normalizedNotes,
    calculatedOverallScore: overallScore,
    metadata: {
      originalRowNumber: record.rowNumber,
      normalizationApplied
    }
  };

  // Create validation flags
  const validationFlags = {
    hasAllRequiredFields: !config.requireCallDate || !!normalizedDate,
    scoresWithinRange: Object.values(scores).every(score => 
      score >= config.scoreRange!.min && score <= config.scoreRange!.max
    ),
    dateFormatValid: !record.callDate || !!normalizedDate,
    callIdentifierValid: !!record.callIdentifier?.trim()
  };

  const validRecord: ValidatedScorecardRecord = {
    originalData: record,
    normalizedData,
    validationFlags
  };

  return { validRecord, errors, warnings };
}

/**
 * Parse call date from string
 */
function parseCallDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}`);
  }
  return date;
}

/**
 * Calculate weighted overall score from individual criteria scores
 */
function calculateOverallScore(scores: Record<string, number>): number {
  // Standard BDR criteria weights (can be customized per program)
  const weights = {
    opening: 0.15,      // 15%
    clearConfident: 0.25, // 25% 
    patternInterrupt: 0.20, // 20%
    toneEnergy: 0.20,   // 20%
    closing: 0.20       // 20%
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [criteria, score] of Object.entries(scores)) {
    const weight = weights[criteria as keyof typeof weights] || 0;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
}

/**
 * Analyze data quality and generate warnings
 */
function analyzeDataQuality(records: NormalizedScorecardData[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (records.length === 0) return warnings;

  // Check for missing optional fields
  const missingDates = records.filter(r => !r.callDate).length;
  const missingDurations = records.filter(r => !r.durationMinutes).length;
  const missingNotes = records.filter(r => !r.managerNotes).length;

  if (missingDates > records.length * 0.5) {
    warnings.push({
      type: 'missing_optional',
      message: `${missingDates} of ${records.length} records are missing call dates`,
      impact: 'medium'
    });
  }

  if (missingNotes > records.length * 0.8) {
    warnings.push({
      type: 'missing_optional',
      message: `${missingNotes} of ${records.length} records are missing manager notes`,
      impact: 'high'
    });
  }

  // Check for unusual score patterns
  const allScores = records.flatMap(r => Object.values(r.scores));
  const avgScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
  
  if (avgScore < 3) {
    warnings.push({
      type: 'data_quality',
      message: `Average score is unusually low (${avgScore.toFixed(1)}). Verify scoring accuracy.`,
      impact: 'high'
    });
  } else if (avgScore > 9) {
    warnings.push({
      type: 'data_quality',
      message: `Average score is unusually high (${avgScore.toFixed(1)}). Verify scoring accuracy.`,
      impact: 'high'
    });
  }

  return warnings;
}

/**
 * Create final validation result
 */
function createValidationResult(
  validRecords: ValidatedScorecardRecord[],
  errors: ValidationError[],
  warnings: ValidationWarning[]
): ScorecardValidationResult {
  const totalRecords = validRecords.length + errors.filter(e => e.severity === 'error').length;
  const errorRecords = errors.filter(e => e.severity === 'error').length;
  const warningRecords = warnings.length;

  // Calculate score distribution
  const allScores = validRecords.flatMap(r => Object.values(r.normalizedData.scores));
  const scoreDistribution = {
    excellent: allScores.filter(s => s >= 9).length,
    good: allScores.filter(s => s >= 7 && s < 9).length,
    needsImprovement: allScores.filter(s => s >= 5 && s < 7).length,
    poor: allScores.filter(s => s < 5).length
  };

  // Calculate missing optional fields
  const missingOptionalFields = {
    callDate: validRecords.filter(r => !r.normalizedData.callDate).length,
    duration: validRecords.filter(r => !r.normalizedData.durationMinutes).length,
    managerNotes: validRecords.filter(r => !r.normalizedData.managerNotes).length
  };

  const summary: ValidationSummary = {
    totalRecords,
    validRecords: validRecords.length,
    errorRecords,
    warningRecords,
    duplicateIdentifiers: errors.filter(e => e.type === 'duplicate_identifier').length,
    missingOptionalFields,
    scoreDistribution
  };

  return {
    isValid: errors.filter(e => e.severity === 'error' || e.severity === 'critical').length === 0,
    validRecords,
    errors,
    warnings,
    summary
  };
}

/**
 * Utility function to generate validation report
 */
export function generateValidationReport(result: ScorecardValidationResult): string {
  const lines = [];
  
  lines.push('=== BDR Scorecard Validation Report ===\n');
  
  // Summary
  lines.push(`Total Records: ${result.summary.totalRecords}`);
  lines.push(`Valid Records: ${result.summary.validRecords}`);
  lines.push(`Records with Errors: ${result.summary.errorRecords}`);
  lines.push(`Records with Warnings: ${result.summary.warningRecords}\n`);
  
  // Validation status
  lines.push(`Overall Status: ${result.isValid ? '✅ VALID' : '❌ INVALID'}\n`);
  
  // Errors
  if (result.errors.length > 0) {
    lines.push('=== ERRORS ===');
    for (const error of result.errors) {
      lines.push(`${error.severity.toUpperCase()}: ${error.message}`);
      if (error.rowNumber) lines.push(`  Row: ${error.rowNumber}`);
      if (error.suggestedFix) lines.push(`  Fix: ${error.suggestedFix}`);
    }
    lines.push('');
  }
  
  // Warnings
  if (result.warnings.length > 0) {
    lines.push('=== WARNINGS ===');
    for (const warning of result.warnings) {
      lines.push(`WARNING: ${warning.message}`);
      if (warning.impact) lines.push(`  Impact: ${warning.impact}`);
    }
    lines.push('');
  }
  
  // Data Quality Summary
  lines.push('=== DATA QUALITY ===');
  lines.push(`Score Distribution:`);
  lines.push(`  Excellent (9-10): ${result.summary.scoreDistribution.excellent}`);
  lines.push(`  Good (7-8): ${result.summary.scoreDistribution.good}`);
  lines.push(`  Needs Improvement (5-6): ${result.summary.scoreDistribution.needsImprovement}`);
  lines.push(`  Poor (0-4): ${result.summary.scoreDistribution.poor}`);
  
  return lines.join('\n');
}