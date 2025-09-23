import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface SupportContextType {
  supportMode: boolean;
  setSupportMode: (enabled: boolean) => void;
  servqualMetrics: {
    empathy: number;
    professionalism: number;
    responsiveness: number;
    customerSatisfaction: number;
    escalationRisk: 'low' | 'medium' | 'high';
  };
  supportSignals: {
    escalationIndicators: string[];
    satisfactionSignals: string[];
    resolutionEffectiveness: number;
  };
  toggleSupportMode: () => void;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

interface SupportProviderProps {
  children: React.ReactNode;
}

export function SupportProvider({ children }: SupportProviderProps) {
  const [supportMode, setSupportMode] = useState(false);
  const { user } = useAuth();

  // Initialize support mode based on user preferences or context
  useEffect(() => {
    const savedMode = localStorage.getItem('support-mode');
    if (savedMode) {
      setSupportMode(JSON.parse(savedMode));
    }
  }, []);

  // Save support mode preference
  useEffect(() => {
    localStorage.setItem('support-mode', JSON.stringify(supportMode));
  }, [supportMode]);

  // Mock SERVQUAL metrics - in real implementation, these would come from AI analysis
  const servqualMetrics = {
    empathy: 85,
    professionalism: 92,
    responsiveness: 78,
    customerSatisfaction: 88,
    escalationRisk: 'low' as const
  };

  // Mock support signals - in real implementation, these would be calculated from recording analysis
  const supportSignals = {
    escalationIndicators: [
      'Customer expressed frustration',
      'Request for supervisor mentioned'
    ],
    satisfactionSignals: [
      'Positive sentiment detected',
      'Problem resolution confirmed',
      'Customer thanked agent'
    ],
    resolutionEffectiveness: 85
  };

  const toggleSupportMode = () => {
    setSupportMode(!supportMode);
  };

  const value: SupportContextType = {
    supportMode,
    setSupportMode,
    servqualMetrics,
    supportSignals,
    toggleSupportMode
  };

  return (
    <SupportContext.Provider value={value}>
      {children}
    </SupportContext.Provider>
  );
}

export function useSupportMode() {
  const context = useContext(SupportContext);
  if (context === undefined) {
    throw new Error('useSupportMode must be used within a SupportProvider');
  }
  return context;
}

export default SupportContext;