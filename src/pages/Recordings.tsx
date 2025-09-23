import React from 'react';
import StandardLayout from '../components/layout/StandardLayout';
import { useDashboard } from '../hooks/useDashboard';
import { useSupportMode } from '../contexts/SupportContext';
import { SalesRecordingsView } from '../components/recordings/SalesRecordingsView';
import { SupportRecordingsView } from '../components/recordings/SupportRecordingsView';

const Recordings = () => {
  const { recordings, loading } = useDashboard();
  const supportMode = useSupportMode();
  
  // Return appropriate component based on mode wrapped in StandardLayout
  return (
    <StandardLayout activeSection="summaries">
      {supportMode.supportMode ? (
        <SupportRecordingsView recordings={recordings} loading={loading} />
      ) : (
        <SalesRecordingsView recordings={recordings} loading={loading} />
      )}
    </StandardLayout>
  );
};

export default Recordings;