/**
 * Enhanced Excel Parser for BDR Scorecard Training Data
 *
 * Intelligent parser that automatically detects and extracts BDR scorecard data
 * from various Excel/CSV formats without requiring manual column mapping.
 * Uses content-based pattern recognition and spatial relationship analysis.
 */

import * as XLSX from 'xlsx';

// Expected Excel column mappings
export interface ExcelColumnMapping {
  callId: string[];
  callDate: string[];
  duration: string[];
  openingScore: string[];
  objectionHandlingScore: string[];
  qualificationScore: string[];
  toneEnergyScore: string[];
  assertivenessControlScore: string[];
  businessAcumenScore: string[];
  closingScore: string[];
  talkTimeScore: string[];
  managerNotes: string[];
  // Legacy compatibility
  clearConfidentScore?: string[];
  patternInterruptScore?: string[];
}

// Default column name variations that we'll try to match
export const DEFAULT_COLUMN_MAPPING: ExcelColumnMapping = {
  callId: ['Call ID', 'CallID', 'Call_ID', 'ID', 'Call Identifier', 'Identifier'],
  callDate: ['Call Date', 'CallDate', 'Call_Date', 'Date', 'Call_Date_Time', 'DateTime'],
  duration: ['Duration', 'Duration (min)', 'Duration_Min', 'Call Duration', 'Length', 'Time'],
  openingScore: ['Opening', 'Opening Score', 'Opening_Score'],
  objectionHandlingScore: ['Objection Handling', 'Objection Handling Score', 'Objection_Handling'],
  qualificationScore: ['Qualification', 'Qualification Score', 'Qualification_Score'],
  toneEnergyScore: ['Tone & Energy', 'Tone Energy', 'Tone & Energy Score', 'Energy'],
  assertivenessControlScore: ['Assertiveness & Control', 'Assertiveness Control', 'Assertiveness'],
  businessAcumenScore: ['Business Acumen & Relevance', 'Business Acumen', 'Business_Acumen'],
  closingScore: ['Closing', 'Closing Score', 'Close'],
  talkTimeScore: ['Talk Time', 'Talk Time Score', 'Talk_Time'],
  managerNotes: ['Manager Notes', 'Notes', 'Comments', 'Feedback', 'Manager_Notes', 'Manager Comments'],
  // Legacy compatibility
  clearConfidentScore: ['Clear & Confident Score', 'Clear Confident', 'Clear_Confident', 'Confidence', 'Clarity'],
  patternInterruptScore: ['Pattern Interrupt Score', 'Pattern Interrupt', 'Pattern_Interrupt', 'Interrupt', 'Pattern']
};

// Smart scan result with confidence scoring
export interface SmartScanResult {
  confidence: number; // 0-1 confidence score
  detectedFormat: 'data_export' | 'coaching_template' | 'unknown';
  fieldMappings: Record<string, FieldDetection>;
  overallScore?: FieldDetection;
  callIdentifier?: FieldDetection;
  managerNotes?: FieldDetection;
  spatialAnalysis: SpatialAnalysis;
}

// Field detection with location and confidence
export interface FieldDetection {
  row: number;
  col: number;
  value: any;
  confidence: number;
  detectionMethod: 'exact_match' | 'fuzzy_match' | 'content_analysis' | 'spatial_inference';
  alternativeLocations?: Array<{ row: number; col: number; confidence: number }>;
}

// Spatial relationship analysis
export interface SpatialAnalysis {
  headerRow?: number;
  dataStartRow?: number;
  scoreColumns: number[];
  textColumns: number[];
  layoutPattern: 'horizontal_data' | 'vertical_template' | 'mixed_layout';
  confidence: number;
}

// BDR Scoring Rubric Structure
export interface ScoringRubricLevel {
  score: number;
  label: string;
  description: string;
}

export interface ScoringRubric {
  levels: ScoringRubricLevel[];
  extractedFromRows: string; // e.g., "9-15" for reference
}

// BDR Criteria Detail Structure
export interface BDRCriteriaDetail {
  score?: number;
  avgScore?: number;
  expectations?: string[];
  notes?: string;
}

// Parsed scorecard data structure
export interface ParsedScorecardData {
  callIdentifier: string;
  callDate: string;
  durationMinutes?: number;
  overallScore?: number; // Overall/average score (critical for coaching template format)
  agentName?: string; // Agent name from scorecard B2 cell

  // Individual scores (for backward compatibility)
  openingScore: number;
  objectionHandlingScore: number;
  qualificationScore: number;
  toneEnergyScore: number;
  assertivenessControlScore: number;
  businessAcumenScore: number;
  closingScore: number;
  talkTimeScore: number;

  // Detailed BDR criteria data (new enhanced structure)
  openingDetail?: BDRCriteriaDetail;
  objectionHandlingDetail?: BDRCriteriaDetail;
  qualificationDetail?: BDRCriteriaDetail;
  toneEnergyDetail?: BDRCriteriaDetail;
  assertivenessControlDetail?: BDRCriteriaDetail;
  businessAcumenDetail?: BDRCriteriaDetail;
  closingDetail?: BDRCriteriaDetail;
  talkTimeDetail?: BDRCriteriaDetail;

  managerNotes?: string;

  // BDR Scoring Rubric (critical for AI training)
  scoringRubric?: ScoringRubric;

  rowNumber: number; // For error reporting
  // New fields for filename-based matching
  sourceFilename: string; // Original filename with extension
  filenameWithoutExtension: string; // For title matching
  // Legacy compatibility fields
  clearConfidentScore?: number;
  patternInterruptScore?: number;
}

// Excel parsing result
export interface ExcelParseResult {
  success: boolean;
  data: ParsedScorecardData[];
  errors: ExcelParseError[];
  warnings: ExcelParseWarning[];
  metadata: {
    filename: string;
    sheetName: string;
    totalRows: number;
    validRows: number;
    columnMapping: Record<string, string>;
  };
}

// Error and warning types
export interface ExcelParseError {
  type: 'file_format' | 'missing_columns' | 'invalid_data' | 'parse_error';
  message: string;
  row?: number;
  column?: string;
  value?: any;
}

export interface ExcelParseWarning {
  type: 'missing_optional' | 'data_assumption' | 'format_conversion';
  message: string;
  row?: number;
  column?: string;
  value?: any;
}

/**
 * Smart Excel parsing with automatic data detection
 * Uses content-based pattern recognition to find BDR data automatically
 */
export async function smartParseExcelScorecardData(
  file: File,
  enableSmartScan: boolean = true
): Promise<ExcelParseResult> {
  if (enableSmartScan) {
    return await parseWithSmartScan(file);
  } else {
    return await parseExcelScorecardData(file);
  }
}

/**
 * Enhanced smart scanning parser
 */
export async function parseWithSmartScan(file: File): Promise<ExcelParseResult> {
  const errors: ExcelParseError[] = [];
  const warnings: ExcelParseWarning[] = [];

  try {
    // Validate file format and size
    const validation = await validateFile(file);
    if (!validation.success) {
      return validation.result;
    }

    // Read and parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    console.log('🔍 Smart scanning Excel file:', file.name);
    console.log('📊 File structure:', { rows: jsonData.length, firstRowCols: jsonData[0]?.length });

    // Perform intelligent whole-file scan
    const scanResult = await performSmartScan(jsonData, file.name);
    console.log('🎯 Smart scan result:', scanResult);

    // Extract data based on scan results
    const parsedData = await extractDataFromScanResult(scanResult, jsonData, file.name);

    return {
      success: parsedData.length > 0,
      data: parsedData,
      errors,
      warnings,
      metadata: {
        filename: file.name,
        sheetName,
        totalRows: jsonData.length,
        validRows: parsedData.length,
        columnMapping: Object.fromEntries(
          Object.entries(scanResult.fieldMappings).map(([key, detection]) =>
            [key, `Row ${detection.row + 1}, Col ${String.fromCharCode(65 + detection.col)} (${detection.confidence.toFixed(2)} confidence)`]
          )
        )
      }
    };

  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [{
        type: 'parse_error',
        message: `Smart scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      warnings: [],
      metadata: {
        filename: file.name,
        sheetName: '',
        totalRows: 0,
        validRows: 0,
        columnMapping: {}
      }
    };
  }
}

/**
 * Validate file format and size
 */
async function validateFile(file: File): Promise<{ success: boolean; result?: ExcelParseResult }> {
  if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
    return {
      success: false,
      result: {
        success: false,
        data: [],
        errors: [{
          type: 'file_format',
          message: 'Invalid file format. Please upload an Excel file (.xlsx or .xls) or CSV file (.csv)'
        }],
        warnings: [],
        metadata: {
          filename: file.name,
          sheetName: '',
          totalRows: 0,
          validRows: 0,
          columnMapping: {}
        }
      }
    };
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      success: false,
      result: {
        success: false,
        data: [],
        errors: [{
          type: 'file_format',
          message: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 5MB limit`
        }],
        warnings: [],
        metadata: {
          filename: file.name,
          sheetName: '',
          totalRows: 0,
          validRows: 0,
          columnMapping: {}
        }
      }
    };
  }

  return { success: true };
}

/**
 * Perform intelligent whole-file scanning for BDR scorecard data
 */
async function performSmartScan(data: any[][], filename: string): Promise<SmartScanResult> {
  console.log('🔍 Starting smart scan analysis...');

  // Initialize result structure
  const result: SmartScanResult = {
    confidence: 0,
    detectedFormat: 'unknown',
    fieldMappings: {},
    spatialAnalysis: {
      scoreColumns: [],
      textColumns: [],
      layoutPattern: 'horizontal_data',
      confidence: 0
    }
  };

  // Step 1: Analyze spatial relationships and layout patterns
  result.spatialAnalysis = analyzeSpatialRelationships(data);
  console.log('📐 Spatial analysis:', result.spatialAnalysis);

  // Step 2: Detect file format (coaching template vs data export)
  result.detectedFormat = detectFileFormat(data, result.spatialAnalysis);
  console.log('📋 Detected format:', result.detectedFormat);

  // Step 3: Content-based field detection
  result.fieldMappings = await detectFieldsWithContentAnalysis(data, result.spatialAnalysis);
  console.log('🎯 Field mappings:', result.fieldMappings);

  // Step 4: Special handling for coaching template format (Row 45 Column D scenario)
  if (result.detectedFormat === 'coaching_template') {
    const templateFields = await detectCoachingTemplateFields(data, filename);
    result.fieldMappings = { ...result.fieldMappings, ...templateFields };
  }

  // Step 5: Calculate overall confidence score
  result.confidence = calculateOverallConfidence(result);
  console.log('📊 Overall confidence:', result.confidence);

  return result;
}

/**
 * Analyze spatial relationships to understand Excel layout
 */
function analyzeSpatialRelationships(data: any[][]): SpatialAnalysis {
  const analysis: SpatialAnalysis = {
    scoreColumns: [],
    textColumns: [],
    layoutPattern: 'horizontal_data',
    confidence: 0
  };

  if (data.length === 0) return analysis;

  // Find columns containing numeric scores (likely 0-4 range)
  for (let col = 0; col < (data[0]?.length || 0); col++) {
    let scoreCount = 0;
    let textCount = 0;

    for (let row = 0; row < Math.min(data.length, 50); row++) {
      const cell = data[row]?.[col];
      if (cell !== null && cell !== undefined && cell !== '') {
        const num = parseFloat(String(cell));
        if (!isNaN(num) && num >= 0 && num <= 4) {
          scoreCount++;
        } else if (String(cell).trim().length > 5) {
          textCount++;
        }
      }
    }

    if (scoreCount >= 3) analysis.scoreColumns.push(col);
    if (textCount >= 3) analysis.textColumns.push(col);
  }

  // Detect layout pattern
  if (analysis.scoreColumns.length >= 5) {
    analysis.layoutPattern = 'horizontal_data'; // Data export format
  } else if (analysis.scoreColumns.length <= 2 && analysis.textColumns.length >= 1) {
    analysis.layoutPattern = 'vertical_template'; // Coaching template format
  } else {
    analysis.layoutPattern = 'mixed_layout';
  }

  // Find header row
  for (let row = 0; row < Math.min(data.length, 20); row++) {
    const rowContent = data[row]?.map(cell => String(cell || '').toLowerCase()) || [];
    if (rowContent.some(cell =>
      ['section', 'expectation', 'score', 'opening', 'closing', 'call', 'id'].some(keyword =>
        cell.includes(keyword)
      )
    )) {
      analysis.headerRow = row;
      analysis.dataStartRow = row + 1;
      break;
    }
  }

  analysis.confidence = Math.min(
    (analysis.scoreColumns.length * 0.2) + (analysis.textColumns.length * 0.1) +
    (analysis.headerRow !== undefined ? 0.3 : 0),
    1.0
  );

  return analysis;
}

/**
 * Detect file format based on content and layout
 */
function detectFileFormat(data: any[][], spatial: SpatialAnalysis): 'data_export' | 'coaching_template' | 'unknown' {
  // Look for coaching template indicators
  const hasTemplateSections = data.some(row =>
    row?.some(cell => {
      const str = String(cell || '').toLowerCase();
      return ['sections', 'expectations'].some(keyword => str.includes(keyword));
    })
  );

  // Look for BDR categories as headers
  const hasBDRHeaders = data.some(row =>
    row?.some(cell => {
      const str = String(cell || '').toLowerCase();
      return ['opening', 'objection handling', 'qualification', 'closing'].some(keyword =>
        str.includes(keyword)
      );
    })
  );

  if (hasTemplateSections && spatial.layoutPattern === 'vertical_template') {
    return 'coaching_template';
  } else if (hasBDRHeaders && spatial.layoutPattern === 'horizontal_data') {
    return 'data_export';
  }

  return 'unknown';
}

/**
 * Content-based field detection with fuzzy matching
 */
async function detectFieldsWithContentAnalysis(data: any[][], spatial: SpatialAnalysis): Promise<Record<string, FieldDetection>> {
  const fields: Record<string, FieldDetection> = {};

  // Define field detection patterns
  const fieldPatterns = {
    callIdentifier: {
      keywords: ['call', 'id', 'identifier'],
      contentPattern: /^[A-Z0-9_\s-]{5,50}$/i,
      priority: 1
    },
    overallScore: {
      keywords: ['overall', 'average', 'total', 'score'],
      contentPattern: /^[0-4](\.[0-9])?$/,
      priority: 1
    },
    openingScore: {
      keywords: ['opening'],
      contentPattern: /^[0-4]$/,
      priority: 2
    },
    objectionHandlingScore: {
      keywords: ['objection', 'handling'],
      contentPattern: /^[0-4]$/,
      priority: 2
    },
    qualificationScore: {
      keywords: ['qualification'],
      contentPattern: /^[0-4]$/,
      priority: 2
    },
    toneEnergyScore: {
      keywords: ['tone', 'energy'],
      contentPattern: /^[0-4]$/,
      priority: 2
    },
    assertivenessControlScore: {
      keywords: ['assertiveness', 'control'],
      contentPattern: /^[0-4]$/,
      priority: 2
    },
    businessAcumenScore: {
      keywords: ['business', 'acumen', 'relevance'],
      contentPattern: /^[0-4]$/,
      priority: 2
    },
    closingScore: {
      keywords: ['closing', 'close'],
      contentPattern: /^[0-4]$/,
      priority: 2
    },
    talkTimeScore: {
      keywords: ['talk', 'time'],
      contentPattern: /^[0-4]$/,
      priority: 2
    },
    managerNotes: {
      keywords: ['notes', 'comments', 'feedback', 'manager'],
      contentPattern: /.{10,}/,
      priority: 3
    },
    agentName: {
      keywords: ['agent', 'name', 'rep', 'representative', 'user', 'employee'],
      contentPattern: /^[A-Za-z\s]{2,50}$/,
      priority: 1
    }
  };

  // Scan each cell for field matches
  for (let row = 0; row < data.length; row++) {
    for (let col = 0; col < (data[row]?.length || 0); col++) {
      const cell = data[row]?.[col];
      if (cell === null || cell === undefined || cell === '') continue;

      const cellStr = String(cell).toLowerCase().trim();

      // Check each field pattern
      for (const [fieldName, pattern] of Object.entries(fieldPatterns)) {
        let confidence = 0;
        let method: FieldDetection['detectionMethod'] = 'content_analysis';

        // Keyword matching in headers
        if (pattern.keywords.some(keyword => cellStr.includes(keyword))) {
          confidence += 0.6;
          method = 'fuzzy_match';
        }

        // Content pattern matching
        if (pattern.contentPattern.test(String(cell))) {
          confidence += 0.4;
        }

        // Spatial relationship bonus
        if (fieldName.includes('Score') && spatial.scoreColumns.includes(col)) {
          confidence += 0.2;
        }

        // Update field if this is a better match
        if (confidence >= 0.5 && (!fields[fieldName] || confidence > fields[fieldName].confidence)) {
          fields[fieldName] = {
            row,
            col,
            value: cell,
            confidence,
            detectionMethod: method
          };
        }
      }
    }
  }

  return fields;
}

/**
 * Special detection for coaching template format (handles Row 45 Column D scenario)
 */
async function detectCoachingTemplateFields(data: any[][], filename: string): Promise<Record<string, FieldDetection>> {
  const fields: Record<string, FieldDetection> = {};

  console.log('🎯 Analyzing coaching template format...');

  // Extract BDR Scoring Rubric from rows 9-15, column B (critical for AI training)
  console.log('📊 Extracting BDR scoring rubric from rows 9-15...');
  const scoringRubric: ScoringRubric = {
    levels: [],
    extractedFromRows: '9-15'
  };

  // Parse scoring guidelines from rows 9-15, split across columns A (score) and B (description)
  for (let row = 9; row <= 15; row++) {
    if (row < data.length && data[row]) {
      // Handle special case where score value might be number 0
      const rawScore = data[row][0];
      const scoreLabel = (rawScore === 0) ? '0' : (rawScore ? String(rawScore).trim() : '');
      const description = data[row][1] ? String(data[row][1]).trim() : '';

      // Skip header row, empty cells, and non-score entries
      if (scoreLabel && scoreLabel !== 'Scoring Details' && description && description.length > 10) {
        // Validate that this is actually a scoring level
        const isValidScore = scoreLabel === 'BLANK' || /^[0-4]$/.test(scoreLabel);

        if (isValidScore) {
          // Convert "BLANK" to a special score value, numeric scores to numbers
          const scoreValue = scoreLabel === 'BLANK' ? -1 : parseInt(scoreLabel);

          scoringRubric.levels.push({
            score: scoreValue,
            label: scoreLabel,
            description: description
          });

          console.log(`✅ Found scoring level: ${scoreLabel} - "${description.substring(0, 60)}${description.length > 60 ? '...' : ''}"`);
        }
      }
    }
  }

  // Store the scoring rubric if we found any levels
  if (scoringRubric.levels.length > 0) {
    fields.scoringRubric = {
      row: 9, // Starting row
      col: 0, // Column A (corrected from Column B)
      value: scoringRubric,
      confidence: 0.95,
      detectionMethod: 'spatial_inference'
    };
    console.log(`📊 Extracted complete scoring rubric with ${scoringRubric.levels.length} levels`);
  }

  // BDR criteria row ranges and their field names
  const bdrCriteriaRanges = [
    { name: 'opening', startRow: 18, endRow: 22, field: 'openingDetail' },
    { name: 'objectionHandling', startRow: 22, endRow: 27, field: 'objectionHandlingDetail' },
    { name: 'qualification', startRow: 27, endRow: 32, field: 'qualificationDetail' },
    { name: 'toneEnergy', startRow: 32, endRow: 34, field: 'toneEnergyDetail' },
    { name: 'assertivenessControl', startRow: 34, endRow: 37, field: 'assertivenessControlDetail' },
    { name: 'businessAcumen', startRow: 37, endRow: 39, field: 'businessAcumenDetail' },
    { name: 'closing', startRow: 39, endRow: 43, field: 'closingDetail' },
    { name: 'talkTime', startRow: 43, endRow: 45, field: 'talkTimeDetail' }
  ];

  // Extract detailed BDR criteria data
  for (const criteria of bdrCriteriaRanges) {
    const criteriaData: any = {
      expectations: [],
      scores: [],
      avgScore: null,
      notes: null
    };

    for (let row = criteria.startRow; row < Math.min(criteria.endRow, data.length); row++) {
      const rowData = data[row] || [];

      // Column B: Expectations
      const expectation = rowData[1];
      if (expectation && String(expectation).trim().length > 10) {
        criteriaData.expectations.push(String(expectation).trim());
      }

      // Column C: Individual scores
      const score = rowData[2];
      if (score !== null && score !== undefined && score !== '') {
        const numScore = parseFloat(String(score));
        if (!isNaN(numScore) && numScore >= 0 && numScore <= 4) {
          criteriaData.scores.push(numScore);
        }
      }

      // Column D: Average score (usually on first row of section)
      const avgScore = rowData[3];
      if (avgScore !== null && avgScore !== undefined && avgScore !== '' && criteriaData.avgScore === null) {
        const numAvg = parseFloat(String(avgScore));
        if (!isNaN(numAvg) && numAvg >= 0 && numAvg <= 4) {
          criteriaData.avgScore = numAvg;
        }
      }

      // Column E: Notes
      const note = rowData[4];
      if (note && String(note).trim().length > 3 && !criteriaData.notes) {
        criteriaData.notes = String(note).trim();
      }
    }

    // Store the complete criteria data
    if (criteriaData.expectations.length > 0 || criteriaData.scores.length > 0 || criteriaData.notes) {
      fields[criteria.field] = {
        row: criteria.startRow,
        col: -1, // Multiple columns
        value: criteriaData,
        confidence: 0.9,
        detectionMethod: 'spatial_inference'
      };

      // Also store individual score for backward compatibility
      const primaryScore = criteriaData.scores.length > 0 ? criteriaData.scores[0] : criteriaData.avgScore;
      if (primaryScore !== null) {
        fields[`${criteria.name}Score`] = {
          row: criteria.startRow,
          col: 2,
          value: primaryScore,
          confidence: 0.95,
          detectionMethod: 'spatial_inference'
        };
        console.log(`✅ Found ${criteria.name}Score:`, primaryScore);
      }
    }
  }

  // Target specific locations for overall score
  const metaLocations = [
    { row: 44, col: 3, field: 'overallScore', description: 'Row 45 Column D (typical manager score location)' },
    { row: 17, col: 3, field: 'overallScore', description: 'Row 18 Column DD (alternative score location)' }
  ];

  for (const location of metaLocations) {
    if (location.row < data.length && location.col < (data[location.row]?.length || 0)) {
      const cell = data[location.row]?.[location.col];
      if (cell !== null && cell !== undefined && cell !== '') {
        const cellValue = String(cell).trim();
        const num = parseFloat(cellValue);

        if (!isNaN(num) && num >= 0 && num <= 4) {
          fields[location.field] = {
            row: location.row,
            col: location.col,
            value: num,
            confidence: 0.9,
            detectionMethod: 'spatial_inference'
          };
          console.log(`✅ Found ${location.field} at ${location.description}:`, num);
          break;
        }
      }
    }
  }

  // Extract agent name from B2 cell (Row 2, Column B)
  if (data.length >= 2 && data[1] && data[1].length >= 2) {
    const agentNameCell = data[1][1]; // Row 2 (index 1), Column B (index 1)
    if (agentNameCell && String(agentNameCell).trim().length > 0) {
      const agentName = String(agentNameCell).trim();
      fields.agentName = {
        row: 1, // Row 2 (0-indexed)
        col: 1, // Column B (0-indexed)
        value: agentName,
        confidence: 0.95,
        detectionMethod: 'spatial_inference'
      };
      console.log(`✅ Found agent name in B2: "${agentName}"`);
    }
  }

  // Extract call identifier from filename
  const callIdentifier = filename.replace(/\.(xlsx|xls|csv)$/i, '');
  fields.callIdentifier = {
    row: -1, // Indicates filename source
    col: -1,
    value: callIdentifier,
    confidence: 0.95,
    detectionMethod: 'exact_match'
  };

  return fields;
}

/**
 * Calculate overall confidence score for scan result
 */
function calculateOverallConfidence(result: SmartScanResult): number {
  const fieldCount = Object.keys(result.fieldMappings).length;
  const avgFieldConfidence = Object.values(result.fieldMappings)
    .reduce((sum, field) => sum + field.confidence, 0) / Math.max(fieldCount, 1);

  const formatConfidence = result.detectedFormat !== 'unknown' ? 0.8 : 0.2;
  const spatialConfidence = result.spatialAnalysis.confidence;

  return (avgFieldConfidence * 0.5) + (formatConfidence * 0.3) + (spatialConfidence * 0.2);
}

/**
 * Extract final data based on smart scan results
 */
async function extractDataFromScanResult(
  scanResult: SmartScanResult,
  data: any[][],
  filename: string
): Promise<ParsedScorecardData[]> {
  const extractedData: ParsedScorecardData[] = [];

  // Handle coaching template format (single entry from detected fields)
  if (scanResult.detectedFormat === 'coaching_template') {
    const callIdentifier = scanResult.fieldMappings.callIdentifier?.value ||
                          filename.replace(/\.(xlsx|xls|csv)$/i, '') || 'Unknown Call';

    const overallScore = scanResult.fieldMappings.overallScore?.value ?
                        parseFloat(String(scanResult.fieldMappings.overallScore.value)) : 0;

    const managerNotes = scanResult.fieldMappings.managerNotes?.value ?
                        String(scanResult.fieldMappings.managerNotes.value) : undefined;

    // Extract individual BDR criteria scores or use overall score as fallback
    const getIndividualScore = (fieldName: string): number => {
      const fieldMapping = scanResult.fieldMappings[fieldName];
      if (fieldMapping && typeof fieldMapping.value === 'number') {
        return fieldMapping.value;
      }
      // Fallback to overall score if individual score not found
      return overallScore || 0;
    };

    // Extract detailed BDR criteria data
    const getDetailedCriteria = (detailFieldName: string): BDRCriteriaDetail | undefined => {
      const detailMapping = scanResult.fieldMappings[detailFieldName];
      if (detailMapping && detailMapping.value) {
        const data = detailMapping.value;
        return {
          score: data.scores && data.scores.length > 0 ? data.scores[0] : undefined,
          avgScore: data.avgScore,
          expectations: data.expectations && data.expectations.length > 0 ? data.expectations : undefined,
          notes: data.notes || undefined
        };
      }
      return undefined;
    };

    const entry: ParsedScorecardData = {
      callIdentifier,
      callDate: new Date().toISOString().split('T')[0],
      overallScore, // Include the detected overall score (e.g., 1.8 from row 45 column D)

      // Agent name from B2 cell
      agentName: scanResult.fieldMappings.agentName?.value as string,

      // Individual scores (for backward compatibility)
      openingScore: getIndividualScore('openingScore'),
      objectionHandlingScore: getIndividualScore('objectionHandlingScore'),
      qualificationScore: getIndividualScore('qualificationScore'),
      toneEnergyScore: getIndividualScore('toneEnergyScore'),
      assertivenessControlScore: getIndividualScore('assertivenessControlScore'),
      businessAcumenScore: getIndividualScore('businessAcumenScore'),
      closingScore: getIndividualScore('closingScore'),
      talkTimeScore: getIndividualScore('talkTimeScore'),

      // Detailed BDR criteria data (new enhanced structure)
      openingDetail: getDetailedCriteria('openingDetail'),
      objectionHandlingDetail: getDetailedCriteria('objectionHandlingDetail'),
      qualificationDetail: getDetailedCriteria('qualificationDetail'),
      toneEnergyDetail: getDetailedCriteria('toneEnergyDetail'),
      assertivenessControlDetail: getDetailedCriteria('assertivenessControlDetail'),
      businessAcumenDetail: getDetailedCriteria('businessAcumenDetail'),
      closingDetail: getDetailedCriteria('closingDetail'),
      talkTimeDetail: getDetailedCriteria('talkTimeDetail'),

      managerNotes,

      // BDR Scoring Rubric (critical for AI training)
      scoringRubric: scanResult.fieldMappings.scoringRubric?.value as ScoringRubric,

      rowNumber: scanResult.fieldMappings.overallScore?.row + 1 || 1,
      sourceFilename: filename,
      filenameWithoutExtension: filename.replace(/\.(xlsx|xls|csv)$/i, '')
    };

    extractedData.push(entry);
    console.log('✅ Extracted coaching template data:', entry);
  }
  // Handle data export format (multiple rows)
  else if (scanResult.detectedFormat === 'data_export') {
    // Use traditional row-by-row parsing for data export format
    const startRow = scanResult.spatialAnalysis.dataStartRow || 1;

    console.log(`📊 Processing data export format from row ${startRow}, found ${Object.keys(scanResult.fieldMappings).length} field mappings`);

    for (let row = startRow; row < data.length; row++) {
      try {
        const rowData = data[row];
        if (!rowData || rowData.length === 0 || rowData.every(cell => !cell && cell !== 0)) {
          continue; // Skip empty rows
        }

        // Extract data using detected field mappings
        const extractFieldValue = (fieldName: string) => {
          const fieldDetection = scanResult.fieldMappings[fieldName];
          if (!fieldDetection) return null;

          // For data export, field detection points to column headers, so we use the column index
          const colIndex = fieldDetection.col;
          return colIndex !== undefined && colIndex < rowData.length ? rowData[colIndex] : null;
        };

        // Extract call identifier
        const callIdentifier = extractFieldValue('callIdentifier') || `Call_${row + 1}`;

        // Extract agent name from data export format
        const agentName = extractFieldValue('agentName') ||
                         extractFieldValue('agent_name') ||
                         extractFieldValue('name') ||
                         extractFieldValue('rep_name') ||
                         null;

        // Extract and validate scores (0-4 scale)
        const parseScoreValue = (value: any, fieldName: string): number => {
          if (value === null || value === undefined || value === '') return 0;
          const numValue = parseFloat(String(value));
          if (isNaN(numValue)) {
            console.warn(`⚠️ Invalid score for ${fieldName} in row ${row + 1}: ${value}`);
            return 0;
          }
          return Math.max(0, Math.min(4, numValue)); // Clamp to 0-4 range
        };

        const entry: ParsedScorecardData = {
          callIdentifier: String(callIdentifier).trim(),
          callDate: extractFieldValue('callDate') ? parseDate(extractFieldValue('callDate')) : new Date().toISOString().split('T')[0],
          durationMinutes: extractFieldValue('duration') ? parseDuration(extractFieldValue('duration')) : undefined,
          agentName: agentName ? String(agentName).trim() : undefined,
          openingScore: parseScoreValue(extractFieldValue('openingScore'), 'Opening'),
          objectionHandlingScore: parseScoreValue(extractFieldValue('objectionHandlingScore'), 'Objection Handling'),
          qualificationScore: parseScoreValue(extractFieldValue('qualificationScore'), 'Qualification'),
          toneEnergyScore: parseScoreValue(extractFieldValue('toneEnergyScore'), 'Tone & Energy'),
          assertivenessControlScore: parseScoreValue(extractFieldValue('assertivenessControlScore'), 'Assertiveness & Control'),
          businessAcumenScore: parseScoreValue(extractFieldValue('businessAcumenScore'), 'Business Acumen'),
          closingScore: parseScoreValue(extractFieldValue('closingScore'), 'Closing'),
          talkTimeScore: parseScoreValue(extractFieldValue('talkTimeScore'), 'Talk Time'),
          managerNotes: extractFieldValue('managerNotes') ? String(extractFieldValue('managerNotes')).trim() : undefined,
          rowNumber: row + 1,
          sourceFilename: filename,
          filenameWithoutExtension: filename.replace(/\.(xlsx|xls|csv)$/i, ''),
          // Legacy compatibility
          clearConfidentScore: extractFieldValue('clearConfidentScore') ? parseScoreValue(extractFieldValue('clearConfidentScore'), 'Clear & Confident') : undefined,
          patternInterruptScore: extractFieldValue('patternInterruptScore') ? parseScoreValue(extractFieldValue('patternInterruptScore'), 'Pattern Interrupt') : undefined
        };

        extractedData.push(entry);
        console.log(`✅ Extracted data export row ${row + 1}:`, entry.callIdentifier, 'scores:', [entry.openingScore, entry.objectionHandlingScore, entry.qualificationScore]);

      } catch (error) {
        console.error(`❌ Error parsing row ${row + 1}:`, error);
        continue; // Skip problematic rows but continue processing
      }
    }
  }
  // Handle unknown format with fallback extraction
  else {
    console.warn('⚠️ Unknown format detected, attempting fallback extraction');

    // Try to extract any available data from field mappings
    if (Object.keys(scanResult.fieldMappings).length > 0) {
      const fallbackEntry: ParsedScorecardData = {
        callIdentifier: filename.replace(/\.(xlsx|xls|csv)$/i, '') || 'Unknown Call',
        callDate: new Date().toISOString().split('T')[0],
        openingScore: 0,
        objectionHandlingScore: 0,
        qualificationScore: 0,
        toneEnergyScore: 0,
        assertivenessControlScore: 0,
        businessAcumenScore: 0,
        closingScore: 0,
        talkTimeScore: 0,
        rowNumber: 1,
        sourceFilename: filename,
        filenameWithoutExtension: filename.replace(/\.(xlsx|xls|csv)$/i, '')
      };

      // Try to extract any overall score if available
      if (scanResult.fieldMappings.overallScore) {
        const overallScore = parseFloat(String(scanResult.fieldMappings.overallScore.value)) || 0;
        fallbackEntry.openingScore = overallScore;
        fallbackEntry.objectionHandlingScore = overallScore;
        fallbackEntry.qualificationScore = overallScore;
        fallbackEntry.toneEnergyScore = overallScore;
        fallbackEntry.assertivenessControlScore = overallScore;
        fallbackEntry.businessAcumenScore = overallScore;
        fallbackEntry.closingScore = overallScore;
        fallbackEntry.talkTimeScore = overallScore;
      }

      extractedData.push(fallbackEntry);
      console.log('🔄 Created fallback entry for unknown format:', fallbackEntry);
    }
  }

  return extractedData;
}

/**
 * Original Excel parsing function (fallback for non-smart mode)
 * Parses BDR scorecard data from uploaded Excel file
 */
export async function parseExcelScorecardData(
  file: File,
  customColumnMapping?: Partial<ExcelColumnMapping>
): Promise<ExcelParseResult> {
  const errors: ExcelParseError[] = [];
  const warnings: ExcelParseWarning[] = [];
  
  try {
    // Validate file format
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      return {
        success: false,
        data: [],
        errors: [{
          type: 'file_format',
          message: 'Invalid file format. Please upload an Excel file (.xlsx or .xls)'
        }],
        warnings: [],
        metadata: {
          filename: file.name,
          sheetName: '',
          totalRows: 0,
          validRows: 0,
          columnMapping: {}
        }
      };
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        data: [],
        errors: [{
          type: 'file_format',
          message: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 5MB limit`
        }],
        warnings: [],
        metadata: {
          filename: file.name,
          sheetName: '',
          totalRows: 0,
          validRows: 0,
          columnMapping: {}
        }
      };
    }

    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    let workbook: XLSX.WorkBook;
    
    try {
      workbook = XLSX.read(arrayBuffer, { type: 'array' });
    } catch (error) {
      return {
        success: false,
        data: [],
        errors: [{
          type: 'parse_error',
          message: 'Failed to parse Excel file. File may be corrupted or in unsupported format.'
        }],
        warnings: [],
        metadata: {
          filename: file.name,
          sheetName: '',
          totalRows: 0,
          validRows: 0,
          columnMapping: {}
        }
      };
    }

    // Get first worksheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        data: [],
        errors: [{
          type: 'parse_error',
          message: 'No worksheets found in Excel file'
        }],
        warnings: [],
        metadata: {
          filename: file.name,
          sheetName: '',
          totalRows: 0,
          validRows: 0,
          columnMapping: {}
        }
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) {
      return {
        success: false,
        data: [],
        errors: [{
          type: 'invalid_data',
          message: 'Excel file must contain at least a header row and one data row'
        }],
        warnings: [],
        metadata: {
          filename: file.name,
          sheetName,
          totalRows: jsonData.length,
          validRows: 0,
          columnMapping: {}
        }
      };
    }

    // Extract headers and detect column mapping
    const headers = jsonData[0] as string[];
    const columnMapping = detectColumnMapping(headers, customColumnMapping);
    
    // Validate required columns are present
    const missingColumns = validateRequiredColumns(columnMapping);
    if (missingColumns.length > 0) {
      return {
        success: false,
        data: [],
        errors: [{
          type: 'missing_columns',
          message: `Missing required columns: ${missingColumns.join(', ')}`
        }],
        warnings: [],
        metadata: {
          filename: file.name,
          sheetName,
          totalRows: jsonData.length,
          validRows: 0,
          columnMapping: {}
        }
      };
    }

    // Extract filename information for matching
    const sourceFilename = file.name;
    const filenameWithoutExtension = sourceFilename.replace(/\.(xlsx|xls|csv)$/i, '');

    // Parse data rows
    const dataRows = jsonData.slice(1); // Skip header row
    const parsedData: ParsedScorecardData[] = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // +2 because: +1 for index, +1 for header row
      
      try {
        const parsedRow = parseDataRow(row, columnMapping, rowNumber, headers, sourceFilename, filenameWithoutExtension);
        if (parsedRow) {
          parsedData.push(parsedRow);
        }
      } catch (error) {
        errors.push({
          type: 'invalid_data',
          message: `Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown parsing error'}`,
          row: rowNumber
        });
      }
    }

    return {
      success: errors.length === 0,
      data: parsedData,
      errors,
      warnings,
      metadata: {
        filename: file.name,
        sheetName,
        totalRows: jsonData.length - 1, // Exclude header
        validRows: parsedData.length,
        columnMapping: Object.fromEntries(
          Object.entries(columnMapping).map(([key, value]) => [key, headers[value] || ''])
        )
      }
    };

  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [{
        type: 'parse_error',
        message: `Unexpected error parsing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      warnings: [],
      metadata: {
        filename: file.name,
        sheetName: '',
        totalRows: 0,
        validRows: 0,
        columnMapping: {}
      }
    };
  }
}

/**
 * Detect column mapping from Excel headers
 */
function detectColumnMapping(
  headers: string[], 
  customMapping?: Partial<ExcelColumnMapping>
): Record<string, number> {
  const mapping: Record<string, number> = {};
  const columnMapping = { ...DEFAULT_COLUMN_MAPPING, ...customMapping };

  // For each required field, try to find matching column
  for (const [fieldName, possibleHeaders] of Object.entries(columnMapping)) {
    let foundIndex = -1;
    
    for (const possibleHeader of possibleHeaders) {
      foundIndex = headers.findIndex(header => 
        header && header.toString().toLowerCase().trim() === possibleHeader.toLowerCase().trim()
      );
      
      if (foundIndex !== -1) {
        mapping[fieldName] = foundIndex;
        break;
      }
    }
    
    // If no exact match, try partial matching
    if (foundIndex === -1) {
      for (const possibleHeader of possibleHeaders) {
        foundIndex = headers.findIndex(header => 
          header && header.toString().toLowerCase().includes(possibleHeader.toLowerCase().split(' ')[0])
        );
        
        if (foundIndex !== -1) {
          mapping[fieldName] = foundIndex;
          break;
        }
      }
    }
  }

  return mapping;
}

/**
 * Validate that all required columns are mapped
 */
function validateRequiredColumns(mapping: Record<string, number>): string[] {
  const required = ['callId', 'openingScore', 'objectionHandlingScore', 'qualificationScore', 'toneEnergyScore', 'assertivenessControlScore', 'businessAcumenScore', 'closingScore', 'talkTimeScore'];
  const missing: string[] = [];

  for (const field of required) {
    if (mapping[field] === undefined || mapping[field] === -1) {
      missing.push(field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()));
    }
  }

  return missing;
}

/**
 * Parse individual data row
 */
function parseDataRow(
  row: any[], 
  mapping: Record<string, number>, 
  rowNumber: number,
  headers: string[],
  sourceFilename: string,
  filenameWithoutExtension: string
): ParsedScorecardData | null {
  // Skip empty rows
  if (!row || row.length === 0 || row.every(cell => !cell && cell !== 0)) {
    return null;
  }

  const getData = (field: string): any => {
    const colIndex = mapping[field];
    return colIndex !== undefined && colIndex !== -1 ? row[colIndex] : undefined;
  };

  // Extract and validate required fields
  const callIdentifier = getData('callId');
  if (!callIdentifier) {
    throw new Error('Call ID is required and cannot be empty');
  }

  // Parse scores (0-4 scale validation)
  const scores = {
    opening: parseScore(getData('openingScore'), 'Opening Score'),
    objectionHandling: parseScore(getData('objectionHandlingScore'), 'Objection Handling Score'),
    qualification: parseScore(getData('qualificationScore'), 'Qualification Score'),
    toneEnergy: parseScore(getData('toneEnergyScore'), 'Tone & Energy Score'),
    assertivenessControl: parseScore(getData('assertivenessControlScore'), 'Assertiveness & Control Score'),
    businessAcumen: parseScore(getData('businessAcumenScore'), 'Business Acumen Score'),
    closing: parseScore(getData('closingScore'), 'Closing Score'),
    talkTime: parseScore(getData('talkTimeScore'), 'Talk Time Score'),
    // Legacy compatibility (optional)
    clearConfident: getData('clearConfidentScore') ? parseScore(getData('clearConfidentScore'), 'Clear & Confident Score', true) : undefined,
    patternInterrupt: getData('patternInterruptScore') ? parseScore(getData('patternInterruptScore'), 'Pattern Interrupt Score', true) : undefined
  };

  // Parse optional fields
  let callDate = '';
  const rawDate = getData('callDate');
  if (rawDate) {
    callDate = parseDate(rawDate);
  }

  let durationMinutes: number | undefined;
  const rawDuration = getData('duration');
  if (rawDuration) {
    durationMinutes = parseDuration(rawDuration);
  }

  const managerNotes = getData('managerNotes')?.toString().trim() || undefined;

  return {
    callIdentifier: callIdentifier.toString().trim(),
    callDate,
    durationMinutes,
    openingScore: scores.opening,
    objectionHandlingScore: scores.objectionHandling,
    qualificationScore: scores.qualification,
    toneEnergyScore: scores.toneEnergy,
    assertivenessControlScore: scores.assertivenessControl,
    businessAcumenScore: scores.businessAcumen,
    closingScore: scores.closing,
    talkTimeScore: scores.talkTime,
    managerNotes,
    rowNumber,
    // New filename fields for matching
    sourceFilename,
    filenameWithoutExtension,
    // Legacy compatibility fields
    clearConfidentScore: scores.clearConfident,
    patternInterruptScore: scores.patternInterrupt
  };
}

/**
 * Parse and validate score (0-4 scale)
 */
function parseScore(value: any, fieldName: string, optional: boolean = false): number | undefined {
  if (value === null || value === undefined || value === '') {
    if (optional) {
      return undefined;
    }
    throw new Error(`${fieldName} is required`);
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    throw new Error(`${fieldName} must be a number (received: ${value})`);
  }

  if (numValue < 0 || numValue > 10) {
    throw new Error(`${fieldName} must be between 0 and 10 (received: ${numValue})`);
  }

  // Round to nearest integer for consistency
  return Math.round(numValue);
}

/**
 * Parse date from various formats
 */
function parseDate(value: any): string {
  if (!value) return '';
  
  // Handle Excel date numbers
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }

  // Handle string dates
  const dateStr = value.toString().trim();
  const date = new Date(dateStr);
  
  if (isNaN(date.getTime())) {
    return dateStr; // Return original if can't parse, let validation handle it
  }

  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Parse duration from various formats (minutes)
 */
function parseDuration(value: any): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const str = value.toString().trim();
  
  // Try to extract number from string (e.g., "15 min", "15:30", "15.5")
  const match = str.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    return isNaN(num) ? undefined : Math.round(num);
  }

  return undefined;
}

/**
 * Utility function to preview Excel data before full parsing
 */
export async function previewExcelData(
  file: File,
  maxRows: number = 5
): Promise<{
  headers: string[];
  sampleRows: any[][];
  totalRows: number;
  error?: string;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    
    if (!sheetName) {
      return {
        headers: [],
        sampleRows: [],
        totalRows: 0,
        error: 'No worksheets found'
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length === 0) {
      return {
        headers: [],
        sampleRows: [],
        totalRows: 0,
        error: 'No data found in worksheet'
      };
    }

    const headers = jsonData[0] as string[];
    const sampleRows = jsonData.slice(1, maxRows + 1);
    
    return {
      headers,
      sampleRows,
      totalRows: jsonData.length - 1, // Exclude header
    };

  } catch (error) {
    return {
      headers: [],
      sampleRows: [],
      totalRows: 0,
      error: error instanceof Error ? error.message : 'Failed to preview file'
    };
  }
}

/**
 * Display BDR Expectations in clean, formatted output
 * Formats expectations data exactly like the user-requested output format
 */
export function displayBDRExpectations(parseResult: ExcelParseResult): string {
  if (!parseResult.success || parseResult.data.length === 0) {
    return '❌ No BDR data available to display expectations';
  }

  const entry = parseResult.data[0];
  let output = '';

  // Header
  output += `📋 EXPECTATIONS DATA FROM COLUMN B (Rows 18-44):\n\n`;

  // Define the BDR criteria with their details
  const bdrCriteria = [
    {
      name: '🎯 Opening (Rows 19-22):',
      detail: entry.openingDetail,
      rowRange: '19-22'
    },
    {
      name: '🎯 Objection Handling (Rows 23-27):',
      detail: entry.objectionHandlingDetail,
      rowRange: '23-27'
    },
    {
      name: '🎯 Qualification (Rows 28-32):',
      detail: entry.qualificationDetail,
      rowRange: '28-32'
    },
    {
      name: '🎯 Tone & Energy (Rows 33-34):',
      detail: entry.toneEnergyDetail,
      rowRange: '33-34'
    },
    {
      name: '🎯 Assertiveness & Control (Rows 35-37):',
      detail: entry.assertivenessControlDetail,
      rowRange: '35-37'
    },
    {
      name: '🎯 Business Acumen & Relevance (Rows 38-39):',
      detail: entry.businessAcumenDetail,
      rowRange: '38-39'
    },
    {
      name: '🎯 Closing (Rows 40-43):',
      detail: entry.closingDetail,
      rowRange: '40-43'
    },
    {
      name: '🎯 Talk Time (Row 44):',
      detail: entry.talkTimeDetail,
      rowRange: '44'
    }
  ];

  // Display each criterion's expectations
  bdrCriteria.forEach((criterion) => {
    output += `**${criterion.name}**\n`;

    if (criterion.detail?.expectations && criterion.detail.expectations.length > 0) {
      criterion.detail.expectations.forEach((expectation, index) => {
        output += `${index + 1}. "${expectation}"\n`;
      });
    } else {
      output += `No expectations found for this criterion\n`;
    }

    output += '\n';
  });

  return output;
}

/**
 * Console-friendly BDR Expectations display
 * Returns formatted string ready for console.log output
 */
export function logBDRExpectations(parseResult: ExcelParseResult): void {
  const formattedOutput = displayBDRExpectations(parseResult);
  console.log(formattedOutput);
}

/**
 * Get structured expectations data for programmatic use
 * Returns clean object with expectations organized by BDR criteria
 */
export function getBDRExpectationsData(parseResult: ExcelParseResult): Record<string, string[]> {
  if (!parseResult.success || parseResult.data.length === 0) {
    return {};
  }

  const entry = parseResult.data[0];

  return {
    'Opening': entry.openingDetail?.expectations || [],
    'Objection Handling': entry.objectionHandlingDetail?.expectations || [],
    'Qualification': entry.qualificationDetail?.expectations || [],
    'Tone & Energy': entry.toneEnergyDetail?.expectations || [],
    'Assertiveness & Control': entry.assertivenessControlDetail?.expectations || [],
    'Business Acumen & Relevance': entry.businessAcumenDetail?.expectations || [],
    'Closing': entry.closingDetail?.expectations || [],
    'Talk Time': entry.talkTimeDetail?.expectations || []
  };
}