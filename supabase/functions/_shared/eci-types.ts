// ECI Support Call Scoring Framework Types
// Replaces SERVQUAL framework with ECI's behavior-based evaluation system

export interface ECIBehaviorEvidence {
  /** Timestamp in seconds where behavior was demonstrated/absent */
  timestamp: number;
  /** Direct quote from transcript */
  quote: string;
  /** Brief context around the quote for clarity */
  context: string;
  /** Type of evidence (positive demonstration or negative example) */
  type: 'positive' | 'negative';
}

export interface ECIBehaviorEvaluation {
  /** AI rating: YES (demonstrated), NO (absent/poor), UNCERTAIN (needs manager review) */
  rating: 'YES' | 'NO' | 'UNCERTAIN';
  /** Timestamped evidence supporting the rating */
  evidence: ECIBehaviorEvidence[];
  /** Quick actionable coaching tip (1-2 sentences) */
  briefTip: string;
  /** Comprehensive coaching analysis and recommendations */
  detailedRecommendation: string;
  /** AI confidence level in this rating (0-1) */
  confidence: number;
  /** Behavior definition from ECI Quality Form */
  definition: string;
}

export interface ECIAnalysisResult {
  /** Framework identifier */
  framework: 'ECI';
  /** When this analysis was performed */
  analysisDate: string;
  /** Recording ID this analysis belongs to */
  recordingId: string;

  /** Care for the Customer section (60% weight) */
  careForCustomer: {
    extremeOwnershipAndHelpfulness: ECIBehaviorEvaluation;
    activeListening: ECIBehaviorEvaluation;
    empathy: ECIBehaviorEvaluation;
    toneAndPace: ECIBehaviorEvaluation;
    professionalism: ECIBehaviorEvaluation;
    customerConnection: ECIBehaviorEvaluation;
  };

  /** Call Resolution section (30% weight) */
  callResolution: {
    followedProperProcedures: ECIBehaviorEvaluation;
    accurateInformation: ECIBehaviorEvaluation;
  };

  /** Call Flow section (10% weight) */
  callFlow: {
    opening: ECIBehaviorEvaluation;
    holdTransferProcedures: ECIBehaviorEvaluation;
    closing: ECIBehaviorEvaluation;
    documentation: ECIBehaviorEvaluation;
  };

  /** Non-Negotiable automatic fail conditions */
  nonNegotiables: {
    /** Did not notate the call into appropriate system */
    noDocumentation: {
      violated: boolean;
      evidence?: ECIBehaviorEvidence[];
    };
    /** Did not fully authenticate per procedures */
    securityVerification: {
      violated: boolean;
      evidence?: ECIBehaviorEvidence[];
    };
    /** Profanity, dishonesty, rudeness */
    unprofessionalism: {
      violated: boolean;
      evidence?: ECIBehaviorEvidence[];
    };
  };

  /** Overall summary and coaching */
  summary: {
    /** Key strengths demonstrated in the call */
    strengths: string[];
    /** Primary areas needing improvement */
    improvementAreas: string[];
    /** Brief overall coaching tip */
    briefOverallCoaching: string;
    /** Detailed overall coaching recommendation */
    detailedOverallCoaching: string;
    /** True if any behaviors rated UNCERTAIN (requires manager review) */
    managerReviewRequired: boolean;
    /** Count of behaviors by rating */
    behaviorCounts: {
      yes: number;
      no: number;
      uncertain: number;
    };
  };

  /** AI processing metadata */
  metadata: {
    /** AI model used for analysis */
    model: string;
    /** Processing time in milliseconds */
    processingTime: number;
    /** Total segments analyzed for timing */
    segmentsAnalyzed: number;
    /** Transcript length analyzed */
    transcriptLength: number;
  };
}

/** Helper type for behavior definitions from ECI Quality Form */
export const ECI_BEHAVIOR_DEFINITIONS = {
  // Care for the Customer (60 points total)
  extremeOwnershipAndHelpfulness: "Proactively works to resolve all concerns and questions. Assures the customer of the steps that will be taken to resolve concerns and/or questions.",
  activeListening: "Attentively listens to and is focused on the customer from the start to the end of the call. Demonstrates complete understanding by offering verbal cues, recalling specific detail and paraphrasing related to the customer's concerns as appropriate.",
  empathy: "Responds empathetically to the customer's emotions and validates their concerns throughout the conversation.",
  toneAndPace: "Communicates in a reassuring, warm and sincere manner that builds trust. Mirrors the customer's speed in conversation.",
  professionalism: "Courteous, polite and respectful in word choice when communicating. Allows sufficient time to speak without interrupting, and responds appropriately when the customer is finished. Avoids industry jargon.",
  customerConnection: "Builds a relationship through positive rapport, personable conversation and avoids unnecessary silences. Makes every attempt to go above and beyond to achieve a memorable connection.",

  // Call Resolution (30 points total)
  followedProperProcedures: "Utilizes all available tools, systems and resources, including reading previous notes to resolve issues and/or questions. Follows all approved and agreed upon policies and procedures.",
  accurateInformation: "Assessed the full scope of issue and provides correct and relevant information which may include time frames.",

  // Call Flow (10 points total)
  opening: "Ready for the incoming call. Starts the call with the standard Global Payments greeting: \"Thank you for calling (Business Unit), this is (Name). How can I make your day better?\" Applies the appropriate company branding per departmental procedures.",
  holdTransferProcedures: "Obtains the customer's permission to place them on hold or transfer them, and thanks them when coming back from the hold or transfer. Adheres to all departmental hold and transfer procedures.",
  closing: "Before ending the call or completing a transfer, offers additional assistance. Outlines any steps if applicable. Closes the communication in a warm and pleasant way.",
  documentation: "Properly notate the call into the appropriate system. The content should include the Problem, Action and Resolution (PAR)."
} as const;

/** Type for behavior keys */
export type ECIBehaviorKey = keyof typeof ECI_BEHAVIOR_DEFINITIONS;

/** Helper function to create empty behavior evaluation */
export function createEmptyBehaviorEvaluation(behaviorKey: ECIBehaviorKey): ECIBehaviorEvaluation {
  return {
    rating: 'UNCERTAIN',
    evidence: [],
    briefTip: '',
    detailedRecommendation: '',
    confidence: 0,
    definition: ECI_BEHAVIOR_DEFINITIONS[behaviorKey]
  };
}