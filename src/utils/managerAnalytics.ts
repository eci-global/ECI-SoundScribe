import { differenceInDays, isAfter, isBefore, parseISO, subDays } from 'date-fns';
import type { Recording } from '@/types/recording';
import {
  getCoachingScore,
  getCoachingImprovements,
  getCoachingStrengths,
} from '@/types/recording';

export type ManagerCallType = string;

export interface ManagerFilterState {
  selectedEmployees: string[];
  selectedTeams: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  callTypes: ManagerCallType[];
  minScore?: number;
  search?: string;
}

export interface EmployeeSummary {
  employeeId: string;
  employeeName: string;
  team: string;
  totalCalls: number;
  coachedCalls: number;
  averageScore: number | null;
  latestScore: number | null;
  scoreTrend: number[];
  improvementRate: number;
  lastCallAt?: string;
  focusAreas: string[];
  riskCalls: number;
  totalDuration: number;
  callsThisWeek: number;
}

export interface ManagerKpis {
  totalCalls: number;
  coachedCalls: number;
  averageScore: number | null;
  weekOverWeekChange: number;
  highRiskCalls: number;
  activeEmployees: number;
  employeesNeedingAttention: number;
  coverageRate: number;
  callVolumeLast7: number;
}

export interface CallQualityRecord {
  id: string;
  recording: Recording;
  employeeId: string;
  employeeName: string;
  team: string;
  recordedAt: string;
  status: Recording['status'];
  score: number | null;
  duration: number;
  callType: string;
  riskLevel: 'low' | 'medium' | 'high';
  focusArea?: string;
  summary?: string;
}

interface EmployeeAccumulator {
  employeeId: string;
  employeeName: string;
  team: string;
  records: Recording[];
  scores: Array<{ score: number; date: Date }>;
  totalDuration: number;
  coachedCalls: number;
  riskCalls: number;
  callsThisWeek: number;
}

function normaliseEmployeeName(name?: string | null, fallback?: string): string {
  if (!name) {
    return fallback ?? 'Team Member';
  }
  const trimmed = name.toString().trim();
  return trimmed.length ? trimmed : (fallback ?? 'Team Member');
}

function safeDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function extractEmployeeIdentity(recording: Recording): {
  employeeId: string;
  employeeName: string;
  team: string;
} {
  const evaluation = recording.coaching_evaluation as Record<string, unknown> | null;
  const employeeId = (evaluation?.agentId || evaluation?.agent_id || evaluation?.agent?.id || recording.user_id || 'unknown') as string;
  const employeeName = normaliseEmployeeName(
    evaluation?.agentName || evaluation?.agent_name || evaluation?.agent?.name || evaluation?.agent,
    employeeId,
  );
  const team = evaluation?.team || evaluation?.teamName || evaluation?.team_name || (recording.content_type === 'customer_support' ? 'Support' : 'Sales');

  return {
    employeeId,
    employeeName,
    team: team || 'Unassigned',
  };
}

function computeImprovementRate(scores: Array<{ score: number; date: Date }>): number {
  if (scores.length < 4) {
    return 0;
  }

  const sorted = [...scores].sort((a, b) => a.date.getTime() - b.date.getTime());
  const recent = sorted.slice(-3);
  const previous = sorted.slice(-6, -3);

  if (!previous.length) {
    return 0;
  }

  const recentAvg = recent.reduce((sum, item) => sum + item.score, 0) / recent.length;
  const previousAvg = previous.reduce((sum, item) => sum + item.score, 0) / previous.length;

  return Number((recentAvg - previousAvg).toFixed(2));
}

export function buildEmployeeSummaries(recordings: Recording[]): EmployeeSummary[] {
  const now = new Date();
  const map = new Map<string, EmployeeAccumulator>();

  recordings.forEach(recording => {
    const identity = extractEmployeeIdentity(recording);
    const createdAt = safeDate(recording.created_at) ?? now;
    const score = getCoachingScore(recording);

    if (!map.has(identity.employeeId)) {
      map.set(identity.employeeId, {
        employeeId: identity.employeeId,
        employeeName: identity.employeeName,
        team: identity.team,
        records: [],
        scores: [],
        totalDuration: 0,
        coachedCalls: 0,
        riskCalls: 0,
        callsThisWeek: 0,
      });
    }

    const entry = map.get(identity.employeeId)!;
    entry.records.push(recording);
    entry.totalDuration += recording.duration ?? 0;

    if (score > 0) {
      entry.coachedCalls += 1;
      entry.scores.push({ score, date: createdAt });
      if (score < 6) {
        entry.riskCalls += 1;
      }
    }

    if (differenceInDays(now, createdAt) <= 7) {
      entry.callsThisWeek += 1;
    }
  });

  return Array.from(map.values()).map(entry => {
    const sortedRecords = [...entry.records].sort((a, b) => {
      const dateA = safeDate(a.created_at)?.getTime() ?? 0;
      const dateB = safeDate(b.created_at)?.getTime() ?? 0;
      return dateA - dateB;
    });

    const scores = entry.scores.map(item => item.score);
    const averageScore = scores.length ? Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2)) : null;
    const latestScore = entry.scores.length ? entry.scores[entry.scores.length - 1].score : null;
    const scoreTrend = entry.scores
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(item => Number(item.score.toFixed(2)))
      .slice(-10);
    const improvementRate = computeImprovementRate(entry.scores);
    const lastCallAt = sortedRecords.length ? sortedRecords[sortedRecords.length - 1].created_at : undefined;
    const focusAreas = Array.from(new Set(sortedRecords.flatMap(record => getCoachingImprovements(record)).filter(Boolean))).slice(0, 3);

    return {
      employeeId: entry.employeeId,
      employeeName: entry.employeeName,
      team: entry.team,
      totalCalls: entry.records.length,
      coachedCalls: entry.coachedCalls,
      averageScore,
      latestScore,
      scoreTrend,
      improvementRate,
      lastCallAt,
      focusAreas,
      riskCalls: entry.riskCalls,
      totalDuration: Math.round(entry.totalDuration),
      callsThisWeek: entry.callsThisWeek,
    } satisfies EmployeeSummary;
  });
}

export function buildCallQualityRows(recordings: Recording[]): CallQualityRecord[] {
  return recordings
    .map(recording => {
      const identity = extractEmployeeIdentity(recording);
      const score = getCoachingScore(recording);
      const riskLevel: CallQualityRecord['riskLevel'] = score > 0 ? (score < 5 ? 'high' : score < 7 ? 'medium' : 'low') : 'medium';
      const focusArea = getCoachingImprovements(recording)[0] || getCoachingStrengths(recording)[0];

      return {
        id: `${recording.id}-${recording.created_at}`,
        recording,
        employeeId: identity.employeeId,
        employeeName: identity.employeeName,
        team: identity.team,
        recordedAt: recording.created_at,
        status: recording.status,
        score: score > 0 ? Number(score.toFixed(2)) : null,
        duration: recording.duration ?? 0,
        callType: recording.content_type || 'General',
        riskLevel,
        focusArea,
        summary: recording.summary || recording.ai_summary || undefined,
      } satisfies CallQualityRecord;
    })
    .sort((a, b) => {
      const dateA = safeDate(a.recordedAt)?.getTime() ?? 0;
      const dateB = safeDate(b.recordedAt)?.getTime() ?? 0;
      return dateB - dateA;
    });
}

export function filterRecordings(
  recordings: Recording[],
  filters: ManagerFilterState,
  employeeTeams?: Map<string, string>,
): Recording[] {
  const hasEmployeeFilter = filters.selectedEmployees?.length > 0;
  const hasTeamFilter = filters.selectedTeams?.length > 0;
  const hasCallTypeFilter = filters.callTypes?.length > 0;
  const startDate = filters.dateRange?.start ? safeDate(filters.dateRange.start) : null;
  const endDate = filters.dateRange?.end ? safeDate(filters.dateRange.end) : null;

  return recordings.filter(recording => {
    const identity = extractEmployeeIdentity(recording);
    const createdAt = safeDate(recording.created_at);

    if (hasEmployeeFilter && !filters.selectedEmployees.includes(identity.employeeId)) {
      return false;
    }

    if (hasTeamFilter) {
      const team = employeeTeams?.get(identity.employeeId) ?? identity.team;
      if (!filters.selectedTeams.includes(team)) {
        return false;
      }
    }

    if (startDate && createdAt && isBefore(createdAt, startDate)) {
      return false;
    }

    if (endDate && createdAt && isAfter(createdAt, endDate)) {
      return false;
    }

    if (hasCallTypeFilter) {
      const callType = recording.content_type || 'General';
      if (!filters.callTypes.includes(callType)) {
        return false;
      }
    }

    if (filters.minScore) {
      const score = getCoachingScore(recording);
      if (!score || score < filters.minScore) {
        return false;
      }
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const combined = [recording.title, recording.summary, recording.ai_summary, identity.employeeName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!combined.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });
}

export function calculateManagerKpis(
  filteredRecordings: Recording[],
  employeeSummaries: EmployeeSummary[],
  totalEmployeeCount: number,
): ManagerKpis {
  const totalCalls = filteredRecordings.length;
  const coachedCalls = filteredRecordings.filter(recording => getCoachingScore(recording) > 0).length;
  const scores = filteredRecordings
    .map(recording => getCoachingScore(recording))
    .filter((score): score is number => Boolean(score && score > 0));
  const averageScore = scores.length ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2)) : null;

  const now = new Date();
  const lastSevenDays = subDays(now, 7);
  const previousSevenDaysStart = subDays(lastSevenDays, 7);

  let callsLastSeven = 0;
  let callsPreviousSeven = 0;
  let highRiskCalls = 0;

  filteredRecordings.forEach(recording => {
    const createdAt = safeDate(recording.created_at);
    if (!createdAt) {
      return;
    }

    if (isAfter(createdAt, lastSevenDays)) {
      callsLastSeven += 1;
    } else if (isAfter(createdAt, previousSevenDaysStart) && isBefore(createdAt, lastSevenDays)) {
      callsPreviousSeven += 1;
    }

    const score = getCoachingScore(recording);
    if (score > 0 && score < 5) {
      highRiskCalls += 1;
    }
  });

  const weekOverWeekChange = callsPreviousSeven > 0
    ? Number((((callsLastSeven - callsPreviousSeven) / callsPreviousSeven) * 100).toFixed(1))
    : callsLastSeven > 0
      ? 100
      : 0;

  const employeesNeedingAttention = employeeSummaries.filter(summary => {
    const avg = summary.averageScore ?? 0;
    return avg > 0 && (avg < 6 || summary.improvementRate < 0);
  }).length;

  const activeEmployees = employeeSummaries.filter(summary => summary.totalCalls > 0).length;
  const coverageRate = totalEmployeeCount > 0 ? Number(((activeEmployees / totalEmployeeCount) * 100).toFixed(1)) : 0;

  return {
    totalCalls,
    coachedCalls,
    averageScore,
    weekOverWeekChange,
    highRiskCalls,
    activeEmployees,
    employeesNeedingAttention,
    coverageRate,
    callVolumeLast7: callsLastSeven,
  } satisfies ManagerKpis;
}
