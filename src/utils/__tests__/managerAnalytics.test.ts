import { describe, expect, it } from "vitest";
import {
  buildEmployeeSummaries,
  filterRecordings,
  calculateManagerKpis,
  buildCallQualityRows,
  ManagerFilterState,
} from "@/utils/managerAnalytics";
import type { Recording } from "@/types/recording";

const makeRecording = (overrides: Partial<Recording>): Recording => ({
  id: overrides.id || Math.random().toString(36).slice(2),
  title: overrides.title || "Call",
  file_type: overrides.file_type || "audio",
  status: overrides.status || "completed",
  created_at: overrides.created_at || new Date().toISOString(),
  duration: overrides.duration ?? 600,
  user_id: overrides.user_id,
  coaching_evaluation: overrides.coaching_evaluation,
  content_type: overrides.content_type,
  summary: overrides.summary,
  description: overrides.description,
  enable_coaching: overrides.enable_coaching ?? true,
  transcript: overrides.transcript,
  ai_summary: overrides.ai_summary,
  ai_next_steps: overrides.ai_next_steps,
  ai_insights: overrides.ai_insights,
  ai_moments: overrides.ai_moments,
  ai_speaker_analysis: overrides.ai_speaker_analysis,
  ai_speakers_updated_at: overrides.ai_speakers_updated_at,
  ai_generated_at: overrides.ai_generated_at,
  file_url: overrides.file_url,
  support_analysis: overrides.support_analysis,
});

describe("managerAnalytics helpers", () => {
  const recordings: Recording[] = [
    makeRecording({
      id: "1",
      user_id: "user-1",
      created_at: "2025-03-01T10:00:00Z",
      content_type: "sales_call",
      coaching_evaluation: { overallScore: 7.4, agentName: "Jamie Lee", team: "Enterprise", improvements: ["Closing"], strengths: ["Discovery"] },
    }),
    makeRecording({
      id: "2",
      user_id: "user-1",
      created_at: "2025-03-05T09:30:00Z",
      content_type: "sales_call",
      coaching_evaluation: { overallScore: 6.2, agentName: "Jamie Lee", team: "Enterprise", improvements: ["Qualification"], strengths: ["Rapport"] },
    }),
    makeRecording({
      id: "3",
      user_id: "user-2",
      created_at: "2025-03-02T12:00:00Z",
      content_type: "customer_support",
      coaching_evaluation: { overallScore: 4.9, agentName: "Morgan Hill", team: "Support", improvements: ["Empathy"], strengths: ["Resolution"] },
    }),
    makeRecording({
      id: "4",
      user_id: "user-2",
      created_at: "2025-02-15T15:20:00Z",
      content_type: "customer_support",
      coaching_evaluation: null,
    }),
  ];

  it("buildEmployeeSummaries aggregates by employee", () => {
    const summaries = buildEmployeeSummaries(recordings);
    expect(summaries).toHaveLength(2);

    const jamie = summaries.find(summary => summary.employeeName === "Jamie Lee");
    expect(jamie).toBeDefined();
    expect(jamie?.totalCalls).toBe(2);
    expect(jamie?.averageScore).toBe(6.8);
    expect(jamie?.focusAreas).toContain("Closing");

    const morgan = summaries.find(summary => summary.employeeName === "Morgan Hill");
    expect(morgan?.riskCalls).toBe(1);
  });

  it("filterRecordings respects filters", () => {
    const baseSummaries = buildEmployeeSummaries(recordings);
    const teamMap = new Map(baseSummaries.map(summary => [summary.employeeId, summary.team] as const));

    const filters: ManagerFilterState = {
      selectedEmployees: ["user-1"],
      selectedTeams: [],
      dateRange: {
        start: "2025-03-01T00:00:00Z",
        end: "2025-03-31T23:59:59Z",
      },
      callTypes: ["sales_call"],
      minScore: 6,
      search: "",
    };

    const filtered = filterRecordings(recordings, filters, teamMap);
    expect(filtered).toHaveLength(2);
    expect(filtered.every(record => record.user_id === "user-1")).toBe(true);

    const teamFiltered = filterRecordings(recordings, { ...filters, selectedEmployees: [], callTypes: [], selectedTeams: ["Support"], minScore: undefined }, teamMap);
    expect(teamFiltered).toHaveLength(1);
    expect(teamFiltered[0].user_id).toBe("user-2");
  });

  it("calculateManagerKpis produces summary metrics", () => {
    const summaries = buildEmployeeSummaries(recordings);
    const kpis = calculateManagerKpis(recordings, summaries, summaries.length);
    expect(kpis.totalCalls).toBe(4);
    expect(kpis.coachedCalls).toBe(3);
    expect(kpis.highRiskCalls).toBe(1);
  });

  it("buildCallQualityRows sorts newest first and annotates risk", () => {
    const rows = buildCallQualityRows(recordings);
    expect(rows[0].recording.id).toBe("2");
    const highRisk = rows.find(row => row.recording.id === "3");
    expect(highRisk?.riskLevel).toBe("high");
  });
});
