import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, BarChart3, Target } from 'lucide-react';
import { subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import StandardLayout from '@/components/layout/StandardLayout';
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';
import { CoachingScorecards } from '@/components/dashboard/CoachingScorecards';
import FrameworkAnalyticsDashboard from '@/components/dashboard/FrameworkAnalyticsDashboard';
import { useRecordings } from '@/hooks/useRecordings';
import { useAuth } from '@/hooks/useAuth';
import { createSafeChannel, removeChannel } from '@/utils/realtimeUtils';
import { useSupportMode } from '@/contexts/SupportContext';
import type { Recording } from '@/types/recording';
import {
  ManagerFilterState,
  buildEmployeeSummaries,
  filterRecordings,
  calculateManagerKpis,
  buildCallQualityRows,
  EmployeeSummary,
  CallQualityRecord,
} from '@/utils/managerAnalytics';
import { ManagerFilters, EmployeeOption } from '@/components/analytics/ManagerFilters';
import { ManagerKpiBar } from '@/components/analytics/ManagerKpiBar';
import { EmployeePerformanceGrid } from '@/components/analytics/EmployeePerformanceGrid';
import { EmployeeMetricTrends } from '@/components/analytics/EmployeeMetricTrends';
import { CallQualityTable } from '@/components/analytics/CallQualityTable';
import { InsightHighlights } from '@/components/analytics/InsightHighlights';
import { CallInsightDrawer } from '@/components/analytics/CallInsightDrawer';

const createInitialFilters = (): ManagerFilterState => ({
  selectedEmployees: [],
  selectedTeams: [],
  dateRange: {
    start: subDays(new Date(), 30).toISOString(),
    end: new Date().toISOString(),
  },
  callTypes: [],
  minScore: undefined,
  search: '',
});



export default function TrendAnalytics() {
  const [activeView, setActiveView] = useState<'overview' | 'scorecards' | 'frameworks'>('overview');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ManagerFilterState>(() => createInitialFilters());
  const [selectedCall, setSelectedCall] = useState<CallQualityRecord | null>(null);

  const { user } = useAuth();
  const supportMode = useSupportMode();
  const { data: recordingsList, isLoading: recordingsLoading, error: recordingsError, refetch } = useRecordings();

  useEffect(() => {
    if (recordingsError) {
      console.error('TrendAnalytics: useRecordings error:', recordingsError);
      setError(`Failed to fetch recordings: ${recordingsError.message}`);
      setLoading(false);
    }
  }, [recordingsError]);

  useEffect(() => {
    async function processRecordings() {
      if (recordingsLoading || recordingsError) {
        setLoading(recordingsLoading);
        return;
      }

      if (!user?.id) {
        setError('Please sign in to view analytics');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (!recordingsList || recordingsList.length === 0) {
          setRecordings([]);
          setLoading(false);
          return;
        }

        const transformed = recordingsList.map(recording => ({
          ...recording,
          title: recording.title || 'Untitled recording',
          description: recording.description || '',
          file_type: recording.file_type || 'audio',
          duration: recording.duration || 0,
        })) as Recording[];

        setRecordings(transformed);
      } catch (err) {
        console.error('TrendAnalytics: Error in processRecordings:', err);
        setError(err instanceof Error ? err.message : 'Failed to process recordings');
      } finally {
        setLoading(false);
      }
    }

    processRecordings();
  }, [recordingsList, recordingsLoading, recordingsError, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const channel = createSafeChannel(`recordings-analytics-${user.id}`);

    channel?.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'recordings' },
      payload => {
        if (payload.new) {
          setRecordings(current => {
            const exists = current.some(record => record.id === payload.new.id);
            if (exists) {
              return current.map(record => (record.id === payload.new.id ? { ...record, ...(payload.new as Recording) } : record));
            }
            return [payload.new as Recording, ...current];
          });
        }
      },
    );

    return () => {
      if (channel) {
        removeChannel(channel);
      }
    };
  }, [user?.id]);

  // Filter recordings by current mode (sales/support/ux)
  const modeFilteredRecordings = useMemo(() => {
    if (supportMode.currentMode === 'sales') {
      return recordings.filter(r => r.content_type === 'sales_call' || !r.content_type);
    } else if (supportMode.currentMode === 'support') {
      return recordings.filter(r => r.content_type === 'customer_support');
    } else if (supportMode.currentMode === 'ux') {
      return recordings.filter(r => r.content_type === 'user_experience');
    }
    return recordings;
  }, [recordings, supportMode.currentMode]);

  const baseEmployeeSummaries: EmployeeSummary[] = useMemo(() => buildEmployeeSummaries(modeFilteredRecordings), [modeFilteredRecordings]);

  const employeeTeamsMap = useMemo(() => {
    return new Map(baseEmployeeSummaries.map(summary => [summary.employeeId, summary.team] as const));
  }, [baseEmployeeSummaries]);

  const filteredRecordings = useMemo(
    () => filterRecordings(modeFilteredRecordings, filters, employeeTeamsMap),
    [modeFilteredRecordings, filters, employeeTeamsMap],
  );

  const filteredEmployeeSummaries = useMemo(
    () => buildEmployeeSummaries(filteredRecordings),
    [filteredRecordings],
  );

  const managerKpis = useMemo(
    () => calculateManagerKpis(filteredRecordings, filteredEmployeeSummaries, baseEmployeeSummaries.length || filteredEmployeeSummaries.length),
    [filteredRecordings, filteredEmployeeSummaries, baseEmployeeSummaries.length],
  );

  const callQualityRows = useMemo(() => buildCallQualityRows(filteredRecordings).slice(0, 40), [filteredRecordings]);

  const employeeOptions: EmployeeOption[] = useMemo(
    () => baseEmployeeSummaries.map(employee => ({ id: employee.employeeId, name: employee.employeeName, team: employee.team })),
    [baseEmployeeSummaries],
  );

  const teamOptions = useMemo(() => {
    const teams = new Set(baseEmployeeSummaries.map(employee => employee.team).filter(Boolean));
    return Array.from(teams).sort();
  }, [baseEmployeeSummaries]);

  const callTypeOptions = useMemo(() => {
    const set = new Set<string>();
    recordings.forEach(recording => {
      set.add(recording.content_type || 'General');
    });
    return Array.from(set).sort();
  }, [recordings]);

  useEffect(() => {
    if (!baseEmployeeSummaries.length) {
      return;
    }
    setFilters(previous => {
      const validEmployees = previous.selectedEmployees.filter(id => employeeTeamsMap.has(id));
      const validTeams = previous.selectedTeams.filter(team => teamOptions.includes(team));
      if (validEmployees.length === previous.selectedEmployees.length && validTeams.length === previous.selectedTeams.length) {
        return previous;
      }
      return {
        ...previous,
        selectedEmployees: validEmployees,
        selectedTeams: validTeams,
      };
    });
  }, [baseEmployeeSummaries, employeeTeamsMap, teamOptions]);

  const analyticsViews = useMemo(() => {
    if (supportMode.supportMode) {
      return [
        { id: 'overview', label: 'Support Performance Overview', icon: TrendingUp },
        { id: 'scorecards', label: 'Support Quality Scorecards', icon: BarChart3 },
        { id: 'frameworks', label: 'Support Frameworks', icon: Target },
      ];
    }
    return [
      { id: 'overview', label: 'Sales Performance Overview', icon: TrendingUp },
      { id: 'scorecards', label: 'Sales Coaching Scorecards', icon: BarChart3 },
      { id: 'frameworks', label: 'Sales Frameworks', icon: Target },
    ];
  }, [supportMode.supportMode]);

  const handleSelectEmployee = (employeeId: string) => {
    setFilters(previous => ({
      ...previous,
      selectedEmployees: previous.selectedEmployees.includes(employeeId) ? previous.selectedEmployees : [employeeId],
    }));
  };

  const handleInspectCall = (row: CallQualityRecord) => {
    setSelectedCall(row);
  };

  const resetFilters = () => {
    setFilters(createInitialFilters());
  };

  return (
    <StandardLayout activeSection="analytics">
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-eci-gray-800 flex items-center gap-2">
                <TrendingUp className={`w-6 h-6 ${
                  supportMode.currentMode === 'support' ? 'text-blue-600' :
                  supportMode.currentMode === 'ux' ? 'text-purple-600' :
                  'text-eci-red'
                }`} />
                <span>{
                  supportMode.currentMode === 'support' ? 'Support Performance Analytics' :
                  supportMode.currentMode === 'ux' ? 'UX Interview Analytics' :
                  'Sales Performance Analytics'
                }</span>
              </h1>
              <div className={`px-2.5 py-0.5 text-xs rounded-md font-medium ${
                supportMode.currentMode === 'support' ? 'bg-blue-100 text-blue-700' :
                supportMode.currentMode === 'ux' ? 'bg-purple-100 text-purple-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {supportMode.currentMode === 'support' ? 'Support Mode' :
                 supportMode.currentMode === 'ux' ? 'UX Mode' :
                 'Sales Mode'}
              </div>
            </div>
            <p className="text-sm text-eci-gray-600">
              {supportMode.currentMode === 'support'
                ? 'Track customer satisfaction scores, resolution times, escalation patterns, and service quality metrics to optimize support operations'
                : supportMode.currentMode === 'ux'
                ? 'Monitor interview effectiveness, pain point identification, solution recommendations, and user feedback trends to improve product experience'
                : 'Measure deal progression, coaching effectiveness, objection handling, and sales performance metrics to drive revenue growth'
              }
            </p>
          </div>

          <div className="mb-4">
            <div className="flex flex-wrap gap-2 bg-gray-100 p-1 rounded-lg">
              {analyticsViews.map(view => (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id as 'overview' | 'scorecards' | 'frameworks')}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    activeView === view.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  <view.icon className="h-4 w-4" strokeWidth={1.5} />
                  {view.label}
                </button>
              ))}
            </div>
          </div>

          {(loading || recordingsLoading) && (
            <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-12 text-sm text-gray-600 shadow-sm">
              Loading analytics data...
            </div>
          )}

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6 text-sm text-red-700">
                <CardTitle className="text-red-700">Error loading analytics</CardTitle>
                <CardDescription className="mt-2 text-red-600">{error}</CardDescription>
                <button
                  onClick={() => {
                    setError(null);
                    refetch();
                  }}
                  className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Retry loading
                </button>
              </CardContent>
            </Card>
          )}

          {!loading && !recordingsLoading && !error && (
            <div className="space-y-4">
              {activeView === 'overview' ? (
                <>
                  <ManagerFilters
                    filters={filters}
                    onChange={setFilters}
                    onReset={resetFilters}
                    employees={employeeOptions}
                    teams={teamOptions}
                    callTypes={callTypeOptions}
                  />

                  <ManagerKpiBar kpis={managerKpis} />

                  <EmployeePerformanceGrid
                    employees={filteredEmployeeSummaries.slice(0, 6)}
                    onSelectEmployee={handleSelectEmployee}
                  />

                  <EmployeeMetricTrends recordings={filteredRecordings} employees={filteredEmployeeSummaries} />

                  <CallQualityTable rows={callQualityRows} onInspect={handleInspectCall} />

                  <InsightHighlights kpis={managerKpis} employees={filteredEmployeeSummaries} />
                </>
              ) : null}

              {activeView === 'scorecards' ? (
                <CoachingScorecards recordings={filteredRecordings} />
              ) : null}

              {activeView === 'frameworks' ? (
                <FrameworkAnalyticsDashboard userId={user?.id} recordings={filteredRecordings} />
              ) : null}
            </div>
          )}
        </div>
      </div>

      <CallInsightDrawer record={selectedCall} open={Boolean(selectedCall)} onOpenChange={open => !open && setSelectedCall(null)} />
    </StandardLayout>
  );
}







