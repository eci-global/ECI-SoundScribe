// Mock compliance automation engine to fix build errors
export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
}

export interface AutomationEvent {
  id: string;
  type: string;
  timestamp: string;
}

export const automationEngine = {
  processEvent: (event: AutomationEvent) => {
    console.log('Mock automation engine processing:', event);
  },
  getRules: (): ComplianceRule[] => [],
  evaluateCompliance: () => ({ compliant: true, issues: [] })
};

export default automationEngine;