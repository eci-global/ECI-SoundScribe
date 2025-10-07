import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

type AppMode = 'sales' | 'support' | 'ux';

interface SupportContextType {
  supportMode: boolean;
  setSupportMode: (enabled: boolean) => void;
  currentMode: AppMode;
  setCurrentMode: (mode: AppMode) => void;
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
  toggleMode: () => void;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

interface SupportProviderProps {
  children: React.ReactNode;
}

export function SupportProvider({ children }: SupportProviderProps) {
  const [supportMode, setSupportMode] = useState(false);
  const [currentMode, setCurrentMode] = useState<AppMode>('sales');
  const { user } = useAuth();

  // Initialize mode based on user preferences or context
  useEffect(() => {
    const savedMode = localStorage.getItem('app-mode');
    const savedSupportMode = localStorage.getItem('support-mode');
    
    if (savedMode) {
      setCurrentMode(savedMode as AppMode);
    }
    if (savedSupportMode) {
      setSupportMode(JSON.parse(savedSupportMode));
    }
  }, []);

  // Save mode preferences
  useEffect(() => {
    localStorage.setItem('app-mode', currentMode);
    localStorage.setItem('support-mode', JSON.stringify(supportMode));
  }, [currentMode, supportMode]);

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

  const toggleMode = () => {
    const modes: AppMode[] = ['sales', 'support', 'ux'];
    const currentIndex = modes.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setCurrentMode(modes[nextIndex]);
    
    // Update supportMode based on current mode
    setSupportMode(modes[nextIndex] === 'support');
  };

  const value: SupportContextType = {
    supportMode,
    setSupportMode,
    currentMode,
    setCurrentMode,
    servqualMetrics,
    supportSignals,
    toggleSupportMode,
    toggleMode
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