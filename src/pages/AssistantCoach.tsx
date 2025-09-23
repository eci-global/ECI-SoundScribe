import React from 'react';

import StandardLayout from '../components/layout/StandardLayout';
import { AILearningDashboard } from '../components/coach/AILearningDashboard';
import { SmartRecommendations } from '../components/coach/SmartRecommendations';
import { SuccessPatterns } from '../components/coach/SuccessPatterns';
import { SupportAILearningDashboard } from '../components/coach/SupportAILearningDashboard';
import { SupportSmartRecommendations } from '../components/coach/SupportSmartRecommendations';
import { SupportSuccessPatterns } from '../components/coach/SupportSuccessPatterns';
import BDRTrainingDashboard from '../components/coach/BDRTrainingDashboard';
import { useDashboard } from '../hooks/useDashboard';
import { useSupportMode } from '../contexts/SupportContext';

const AssistantCoach = () => {
  const { stats, recordings, loading } = useDashboard();
  const supportMode = useSupportMode();
  
  // Return appropriate component based on mode
  if (supportMode.supportMode) {
    return <SupportAssistantCoach recordings={recordings} />;
  } else {
    return <SalesAssistantCoach recordings={recordings} />;
  }
};

// Sales Assistant Coach Component (existing functionality)
function SalesAssistantCoach({ recordings }: { recordings: any[] }) {
  return (
    <StandardLayout activeSection="assistant">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 font-sans">
        <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">AI Sales Coach</h1>
          <p className="text-gray-600">Your intelligent sales coaching companion with personalized insights</p>
        </header>

        {/* AI Learning Intelligence Dashboard */}
        <AILearningDashboard recordings={recordings} />

        {/* BDR Training Dashboard */}
        <BDRTrainingDashboard recordings={recordings} />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Smart Recommendations */}
          <div className="lg:col-span-1">
            <SmartRecommendations 
              recordings={recordings} 
              onStartPractice={(rec) => console.log('Starting practice:', rec)}
            />
          </div>

          {/* Right Column - Success Patterns */}
          <div className="lg:col-span-1">
            <SuccessPatterns recordings={recordings} />
          </div>
        </div>

        </div>
      </div>
    </StandardLayout>
  );
}

// Support Assistant Coach Component
function SupportAssistantCoach({ recordings }: { recordings: any[] }) {
  return (
    <StandardLayout activeSection="assistant">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 font-sans">
        <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-gray-800">AI Support Coach</h1>
            <div className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md font-medium">
              Support Mode
            </div>
          </div>
          <p className="text-gray-600">Your intelligent customer service coaching companion with personalized insights</p>
        </header>

        {/* AI Learning Intelligence Dashboard */}
        <SupportAILearningDashboard recordings={recordings} />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Smart Recommendations */}
          <div className="lg:col-span-1">
            <SupportSmartRecommendations 
              recordings={recordings} 
              onStartPractice={(rec) => console.log('Starting support practice:', rec)}
            />
          </div>

          {/* Right Column - Success Patterns */}
          <div className="lg:col-span-1">
            <SupportSuccessPatterns recordings={recordings} />
          </div>
        </div>

        </div>
      </div>
    </StandardLayout>
  );
}




export default AssistantCoach;
