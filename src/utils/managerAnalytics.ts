import type { Recording } from '@/types/recording';
import { getCoachingScore, getCoachingStrengths, getCoachingImprovements } from '@/types/recording';

// State used by TrendAnalytics filters
export interface ManagerFilterState {
  selectedEmployees: string[];
  selectedTeams: string[];
  dateRange: { start: string; end: string };
  callTypes: string[];
  minScore?: number;
  search: string;
}

// Summarized employee performance row
export interface EmployeeSummary {
  employeeId: string;
  employeeName: string;
  team: string;
  totalCalls: number;
  averageScore: number;
  recentScoreTrend: number;
  strengths: string[];
  improvements: string[];
}

// Row for call quality table
export interface CallQualityRecord {
  id: string;
  title: string;
  createdAt: string;
  duration: number;
  score: number;
  contentType: string;
  description?: string;
}

// Build per-employee summaries from recordings; heuristics based on recording data
export function buildEmployeeSummaries(recordings: Recording[]): EmployeeSummary[] {
  const byEmployee: Map<string, EmployeeSummary> = new Map();

  for (const rec of recordings) {
    // Derive a placeholder employee from recording metadata when not present
    // In many systems, a recording is associated with one principal employee via user_id
    const employeeId = rec.user_id || 'unknown';
    const employeeName = 'unknown';
    const team = rec.content_type || 'General';
    const score = getCoachingScore(rec);
    const strengths = getCoachingStrengths(rec);
    const improvements = getCoachingImprovements(rec);

    if (!byEmployee.has(employeeId)) {
      byEmployee.set(employeeId, {
        employeeId,
        employeeName,
        team,
        totalCalls: 0,
        averageScore: 0,
        recentScoreTrend: 0,
        strengths: [],
        improvements: [],
      });
    }

    const s = byEmployee.get(employeeId)!;
    s.totalCalls += 1;
    // incremental average
    s.averageScore = s.averageScore + (score - s.averageScore) / s.totalCalls;
    s.strengths = mergeTop(s.strengths, strengths, 10);
    s.improvements = mergeTop(s.improvements, improvements, 10);
  }

  // Simple trend proxy: none available per recording sequence, set 0
  return Array.from(byEmployee.values());
}

// Filter recordings by manager filter state
export function filterRecordings(
  recordings: Recording[],
  filters: ManagerFilterState,
  employeeTeamsMap: Map<string, string | undefined>,
): Recording[] {
  const start = new Date(filters.dateRange.start).getTime();
  const end = new Date(filters.dateRange.end).getTime();
  const term = (filters.search || '').toLowerCase();
  const wantTypes = new Set((filters.callTypes || []).map((t) => t.toLowerCase()));

  return recordings.filter((rec) => {
    const created = new Date(rec.created_at).getTime();
    if (Number.isFinite(start) && created < start) return false;
    if (Number.isFinite(end) && created > end) return false;

    if (filters.minScore != null) {
      const sc = getCoachingScore(rec);
      if (sc < filters.minScore) return false;
    }

    if (wantTypes.size > 0) {
      const ct = (rec.content_type || 'general').toLowerCase();
      if (!wantTypes.has(ct)) return false;
    }

    if (filters.selectedEmployees.length > 0) {
      const id = rec.user_id || 'unknown';
      if (!filters.selectedEmployees.includes(id)) return false;
    }

    if (filters.selectedTeams.length > 0) {
      const id = rec.user_id || 'unknown';
      const team = employeeTeamsMap.get(id) || '';
      if (!team || !filters.selectedTeams.includes(team)) return false;
    }

    if (term) {
      const hay = `${rec.title || ''} ${rec.description || ''}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }

    return true;
  });
}

// Compute basic KPIs for the manager dashboard
export function calculateManagerKpis(
  recordings: Recording[],
  employees: EmployeeSummary[],
  denominator: number,
) {
  const totalCalls = recordings.length;
  const totalScore = recordings.reduce((s, r) => s + getCoachingScore(r), 0);
  const averageScore = totalCalls > 0 ? totalScore / totalCalls : 0;
  const topEmployee = employees
    .slice()
    .sort((a, b) => b.averageScore - a.averageScore)[0];

  return {
    totalCalls,
    averageScore,
    topPerformer: topEmployee ? { id: topEmployee.employeeId, name: topEmployee.employeeName, score: topEmployee.averageScore } : null,
    employeeCount: denominator || employees.length,
  };
}

// Transform recordings into a call quality table structure
export function buildCallQualityRows(recordings: Recording[]): CallQualityRecord[] {
  return recordings.map((r) => ({
    id: r.id,
    title: r.title || 'Untitled recording',
    createdAt: r.created_at,
    duration: r.duration || 0,
    score: getCoachingScore(r),
    contentType: r.content_type || 'General',
    description: r.description,
  }));
}

function mergeTop(existing: string[], incoming: string[], max: number): string[] {
  const freq: Record<string, number> = {};
  for (const s of existing) freq[s] = (freq[s] || 0) + 1;
  for (const s of incoming) freq[s] = (freq[s] || 0) + 1;
  return Object.keys(freq)
    .sort((a, b) => freq[b] - freq[a])
    .slice(0, max);
}

