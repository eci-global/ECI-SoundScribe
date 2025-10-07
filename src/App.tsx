
import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SupportProvider } from "@/contexts/SupportContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSignIn from "./pages/admin/AdminSignIn";
import CreateUsers from "./pages/admin/CreateUsers";
import NotFound from "./pages/NotFound";
import UploadsImport from "./pages/UploadsImport";
import NotificationsInbox from "./pages/NotificationsInbox";
import HelpDocs from "./pages/HelpDocs";
import TrendAnalytics from "./pages/TrendAnalytics";
import Summaries from "./pages/Summaries";
import OutreachRecordingsList from "./pages/outreach/RecordingsList";
import RecordingDetail from "./pages/outreach/RecordingDetail";
import OutreachConnect from "./pages/integrations/OutreachConnect";
import OutreachCallback from "./pages/integrations/OutreachCallback";
import OutreachTest from "./pages/integrations/OutreachTest";
import OutreachImport from "./pages/integrations/OutreachImport";
import OutreachIntegrationHelp from "./pages/help/OutreachIntegration";
import AssistantCoach from "./pages/AssistantCoach";
import DurationDebug from "./pages/DurationDebug";
import Recordings from "./pages/Recordings";
import BDRTrainingSettings from "./pages/admin/BDRTrainingSettings";
import AllRecordings from "./pages/admin/AllRecordings";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { setupGlobalErrorHandler } from '@/utils/globalErrorHandler';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

const App = () => {
  console.log('App.tsx - App component initializing');
  
  useEffect(() => {
    console.log('App.tsx - useEffect running, setting up global error handler');
    // Setup global error handling for React Query issues
    setupGlobalErrorHandler();
  }, []);

  console.log('App.tsx - Rendering App component');
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <SupportProvider>
              <Toaster />
              <Sonner />
              <SidebarProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/processing" element={<Navigate to="/uploads?tab=queue" replace />} />
                  <Route path="/uploads" element={<UploadsImport />} />
                  <Route path="/notifications" element={<NotificationsInbox />} />
                  <Route path="/help" element={<HelpDocs />} />
                  <Route path="/analytics" element={<TrendAnalytics />} />
                  <Route path="/recordings" element={<Recordings />} />
                  <Route path="/summaries" element={<Summaries />} />
                  <Route path="/summaries/:id" element={<Summaries />} />
                  <Route path="/recording/:id" element={<Summaries />} />
                  <Route path="/outreach/recordings" element={<Navigate to="/recordings" replace />} />
                  <Route path="/outreach/recordings/:recordingId" element={<RecordingDetail />} />
                  <Route path="/integrations/outreach/connect" element={<OutreachConnect />} />
                  <Route path="/integrations/outreach/callback" element={<OutreachCallback />} />
                  <Route path="/integrations/outreach/test" element={<OutreachTest />} />
                  <Route path="/integrations/outreach/import" element={<OutreachImport />} />
                  <Route path="/help/outreach-integration" element={<OutreachIntegrationHelp />} />
                  <Route path="/AssistantCoach" element={<AssistantCoach />} />
                  <Route path="/debug/duration" element={<DurationDebug />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/sign-in" element={<AdminSignIn />} />
                  <Route path="/admin/library" element={<AllRecordings />} />
                  <Route path="/admin/create-users" element={<CreateUsers />} />
                  <Route path="/admin/recordings" element={<AdminDashboard />} />
                  <Route path="/admin/files" element={<AdminDashboard />} />
                  <Route path="/admin/storage-analytics" element={<AdminDashboard />} />
                  <Route path="/admin/org" element={<AdminDashboard />} />
                  <Route path="/admin/org/users" element={<AdminDashboard />} />
                  <Route path="/admin/users-access" element={<AdminDashboard />} />
                  <Route path="/admin/access" element={<AdminDashboard />} />
                  <Route path="/admin/tools" element={<AdminDashboard />} />
                  <Route path="/admin/audit" element={<AdminDashboard />} />
                  <Route path="/admin/targeting" element={<AdminDashboard />} />
                  <Route path="/admin/automations" element={<AdminDashboard />} />
                  <Route path="/admin/integrations" element={<AdminDashboard />} />
                  <Route path="/admin/organization-outreach" element={<AdminDashboard />} />
                  <Route path="/admin/analytics" element={<AdminDashboard />} />
                  <Route path="/admin/bdr-training" element={<BDRTrainingSettings />} />
                  <Route path="/admin/all-recordings" element={<AllRecordings />} />
                  <Route path="/admin/bdr-scorecard-history" element={<AdminDashboard />} />
                  <Route path="/admin/privacy" element={<AdminDashboard />} />
                  <Route path="/admin/activity" element={<AdminDashboard />} />
                  <Route path="/admin/ai-control" element={<AdminDashboard />} />
                  <Route path="/admin/ai-prompts" element={<AdminDashboard />} />
                  <Route path="/admin/ai-models" element={<AdminDashboard />} />
                  <Route path="/admin/ai-scoring" element={<AdminDashboard />} />
                  <Route path="/admin/ai-experiments" element={<AdminDashboard />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </SidebarProvider>
            </SupportProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
