import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface UXContextType {
  uxMode: boolean;
  setUXMode: (enabled: boolean) => void;
  uxMetrics: {
    interviewQuality: number;
    questionEffectiveness: number;
    solutionClarity: number;
    customerSatisfaction: number;
    actionabilityScore: number;
  };
  uxSignals: {
    painPoints: string[];
    opportunities: string[];
    keyInsights: string[];
    nextSteps: string[];
  };
  toggleUXMode: () => void;
}

const UXContext = createContext<UXContextType | undefined>(undefined);

interface UXProviderProps {
  children: React.ReactNode;
}

export function UXProvider({ children }: UXProviderProps) {
  const [uxMode, setUXMode] = useState(false);
  const { user } = useAuth();

  // Initialize UX mode based on user preferences or context
  useEffect(() => {
    const savedMode = localStorage.getItem('ux-mode');
    if (savedMode) {
      setUXMode(JSON.parse(savedMode));
    }
  }, []);

  // Save UX mode preference
  useEffect(() => {
    localStorage.setItem('ux-mode', JSON.stringify(uxMode));
  }, [uxMode]);

  // Mock UX metrics - in real implementation, these would come from UX analysis
  const uxMetrics = {
    interviewQuality: 88,
    questionEffectiveness: 82,
    solutionClarity: 91,
    customerSatisfaction: 85,
    actionabilityScore: 87
  };

  // Mock UX signals - in real implementation, these would be calculated from UX analysis
  const uxSignals = {
    painPoints: [
      'Performance and speed issues',
      'Usability and interface confusion',
      'Missing features or functionality'
    ],
    opportunities: [
      'Positive user sentiment and satisfaction',
      'Enhancement and improvement opportunities',
      'User recommendations and suggestions'
    ],
    keyInsights: [
      'Customer workflow integration needs',
      'Feature request prioritization',
      'Support resource requirements'
    ],
    nextSteps: [
      'Implement performance optimizations',
      'Redesign user interface',
      'Develop requested features'
    ]
  };

  const toggleUXMode = () => {
    setUXMode(!uxMode);
  };

  const value: UXContextType = {
    uxMode,
    setUXMode,
    uxMetrics,
    uxSignals,
    toggleUXMode
  };

  return (
    <UXContext.Provider value={value}>
      {children}
    </UXContext.Provider>
  );
}

export function useUXMode() {
  const context = useContext(UXContext);
  if (context === undefined) {
    throw new Error('useUXMode must be used within a UXProvider');
  }
  return context;
}
