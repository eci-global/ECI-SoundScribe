import { supabase } from '../integrations/supabase/client';
import type {
  Employee,
  Team,
  EmployeeCallParticipation,
  EmployeeScorecard,
  EmployeePerformanceTrend,
  ManagerCoachingNote,
  EmployeeAnalytics,
  EmployeeSearchFilters,
  EmployeeSearchResult,
  EmployeeDetailResponse,
  EmployeeListResponse,
  VoiceDetectionResult,
  EmployeeDashboardData,
  TeamPerformanceReport,
  EmployeePerformanceSummary
} from '../types/employee';

export class EmployeeService {
  // =============================================
  // EMPLOYEE MANAGEMENT
  // =============================================

  /**
   * Get all employees with optional filters
   */
  static async getEmployees(filters?: EmployeeSearchFilters): Promise<EmployeeListResponse> {
    try {
      // Simple query without complex joins for now
      let query = supabase
        .from('employees')
        .select('*')
        .eq('status', 'active');

      if (filters?.department) {
        query = query.eq('department', filters.department);
      }
      if (filters?.team_id) {
        query = query.eq('team_id', filters.team_id);
      }
      if (filters?.role) {
        query = query.eq('role', filters.role);
      }

      const { data: employees, error } = await query.order('first_name');

      if (error) {
        console.error('Error fetching employees:', error);
        throw error;
      }

      // Build results using real performance summaries per employee (with limited concurrency)
      const results: EmployeeSearchResult[] = await this.mapWithConcurrency(
        employees || [],
        6,
        async (employee) => {
          try {
            const summary = await this.getEmployeePerformanceSummary(employee.id);
            return {
              employee,
              performance_summary: summary,
              recent_activity: this.getRecentActivityText(summary),
              score_trend: this.calculateScoreTrend(summary.score_trend),
            } as EmployeeSearchResult;
          } catch {
            const summary = this.getDefaultPerformanceSummary();
            summary.employee_name = `${employee.first_name} ${employee.last_name}`;
            return {
              employee,
              performance_summary: summary,
              recent_activity: this.getRecentActivityText(summary),
              score_trend: this.calculateScoreTrend(summary.score_trend),
            } as EmployeeSearchResult;
          }
        }
      );

      return {
        employees: results,
        total_count: (employees || []).length,
        page: 1,
        page_size: (employees || []).length,
        filters_applied: filters || {}
      };
    } catch (error) {
      console.error('Error in getEmployees:', error);
      throw error;
    }
  }

  /**
   * Get employee by ID with full analytics
   */
  static async getEmployeeById(employeeId: string): Promise<EmployeeDetailResponse> {
    // Try rich select with embeds; if it fails (relationship names or RLS), fall back to plain row
    let employee: any | null = null;
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          teams:team_id(name, department),
          manager:manager_id(first_name, last_name)
        `)
        .eq('id', employeeId)
        .single();
      if (!error && data) {
        employee = data;
      }
    } catch (_) {
      // ignore and fall back
    }
    if (!employee) {
      // 1) Try plain UUID id
      const basicRes = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();
      if (!basicRes.error && basicRes.data) {
        employee = basicRes.data;
      } else {
        // 2) Fallback: route param might be legacy employee code (e.g., "140541")
        const codeRes = await supabase
          .from('employees')
          .select('*')
          .eq('employee_code', employeeId)
          .single();
        if (!codeRes.error && codeRes.data) {
          employee = codeRes.data;
        } else {
          throw basicRes.error || codeRes.error || new Error('Employee not found');
        }
      }
    }

    // Fetch analytics with error handling to prevent profile loading failure
    let analytics, dashboard_data;

    try {
      [analytics, dashboard_data] = await Promise.all([
        this.getEmployeeAnalytics(employee.id, employee).catch(err => {
          console.warn('Failed to load employee analytics, using defaults:', err);
          return this.getDefaultAnalytics(employee);
        }),
        this.getEmployeeDashboardData(employee.id, employee).catch(err => {
          console.warn('Failed to load dashboard data, using defaults:', err);
          return this.getDefaultDashboardData(employee);
        }),
      ]);
    } catch (error) {
      console.warn('Failed to load employee analytics, using defaults:', error);
      analytics = this.getDefaultAnalytics(employee);
      dashboard_data = this.getDefaultDashboardData(employee);
    }

    return { employee, analytics, dashboard_data };
  }

  /**
   * Create new employee
   */
  static async createEmployee(employeeData: Partial<Employee>): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .insert(employeeData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update employee
   */
  static async updateEmployee(employeeId: string, updates: Partial<Employee>): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', employeeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // =============================================
  // CALL PARTICIPATION TRACKING
  // =============================================

  /**
   * Record employee participation in a call
   */
  static async recordCallParticipation(
    recordingId: string,
    employeeId: string,
    participationData: Partial<EmployeeCallParticipation>
  ): Promise<EmployeeCallParticipation> {
    const { data, error } = await supabase
      .from('employee_call_participation')
      .insert({
        recording_id: recordingId,
        employee_id: employeeId,
        ...participationData
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get call participation for a recording
   */
  static async getCallParticipation(recordingId: string): Promise<EmployeeCallParticipation[]> {
    const { data, error } = await supabase
      .from('employee_call_participation')
      .select(`
        *,
        employees:employee_id(first_name, last_name, role, department)
      `)
      .eq('recording_id', recordingId)
      .order('participation_type', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update call participation
   */
  static async updateCallParticipation(
    participationId: string,
    updates: Partial<EmployeeCallParticipation>
  ): Promise<EmployeeCallParticipation> {
    const { data, error } = await supabase
      .from('employee_call_participation')
      .update(updates)
      .eq('id', participationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // =============================================
  // SCORECARD MANAGEMENT
  // =============================================

  /**
   * Create employee scorecard
   */
  static async createScorecard(scorecardData: Partial<EmployeeScorecard>): Promise<EmployeeScorecard> {
    const { data, error } = await supabase
      .from('employee_scorecards')
      .insert(scorecardData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get scorecards for an employee
   */
  static async getEmployeeScorecards(
    employeeId: string,
    limit: number = 50
  ): Promise<EmployeeScorecard[]> {
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select(`
        *,
        recordings:recording_id(title, created_at, duration)
      `)
      .eq('employee_id', employeeId)
      .order('evaluated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get employee performance summary
   */
  static async getEmployeePerformanceSummary(employeeId: string): Promise<EmployeePerformanceSummary> {
    try {
      const { data, error } = await supabase
        .rpc('get_employee_performance_summary', { p_employee_id: employeeId });
      if (!error && data && data[0]) {
        return data[0];
      }
      // Fallback to computing from scorecards if RPC missing or empty
      return await this.buildSummaryFromScorecards(employeeId);
    } catch (err) {
      // Fallback to computing from scorecards if RPC throws
      try {
        return await this.buildSummaryFromScorecards(employeeId);
      } catch (e) {
        console.warn('Failed to build summary from scorecards; using default:', e);
        return this.getDefaultPerformanceSummary();
      }
    }
  }

  // =============================================
  // COACHING AND FEEDBACK
  // =============================================

  /**
   * Create manager coaching note
   */
  static async createCoachingNote(noteData: Partial<ManagerCoachingNote>): Promise<ManagerCoachingNote> {
    const { data, error } = await supabase
      .from('manager_coaching_notes')
      .insert(noteData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get coaching notes for an employee
   */
  static async getEmployeeCoachingNotes(employeeId: string): Promise<ManagerCoachingNote[]> {
    const { data, error } = await supabase
      .from('manager_coaching_notes')
      .select(`
        *,
        manager:manager_id(first_name, last_name),
        recordings:recording_id(title, created_at)
      `)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update coaching note
   */
  static async updateCoachingNote(
    noteId: string,
    updates: Partial<ManagerCoachingNote>
  ): Promise<ManagerCoachingNote> {
    const { data, error } = await supabase
      .from('manager_coaching_notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // =============================================
  // ANALYTICS AND REPORTING
  // =============================================

  /**
   * Get comprehensive employee analytics
   */
  static async getEmployeeAnalytics(employeeId: string, employee?: Employee): Promise<EmployeeAnalytics> {
    const emp: Employee = employee || (await supabase.from('employees').select('*').eq('id', employeeId).single()).data as Employee;
    const code = emp?.employee_id;

    const [performance_summary, recent_recordings, score_trends, coaching_history] = await Promise.all([
      this.getEmployeePerformanceSummaryAny(emp.id, code),
      this.getEmployeeRecentRecordingsAny(emp.id, code),
      this.getEmployeeScoreTrendsAny(emp.id, code),
      this.getEmployeeCoachingNotesAny(emp.id, code),
    ]);

    return {
      employee: emp,
      performance_summary,
      recent_recordings,
      score_trends,
      coaching_history,
    };
  }

  /**
   * Get employee dashboard data
   */
  static async getEmployeeDashboardData(employeeId: string, employee?: Employee): Promise<EmployeeDashboardData> {
    const emp: Employee = employee || (await supabase.from('employees').select('*').eq('id', employeeId).single()).data as Employee;
    const code = emp?.employee_id;

    const [performanceSummary, recentScores, strengthsAnalysis, improvementAreas, coachingEffectiveness] = await Promise.all([
      this.getEmployeePerformanceSummaryAny(emp.id, code),
      this.getEmployeeRecentScoresAny(emp.id, code),
      this.getEmployeeStrengthsAnalysisAny(emp.id, code),
      this.getEmployeeImprovementAreasAny(emp.id, code),
      this.getEmployeeCoachingEffectivenessAny(emp.id, code),
    ]);

    return {
      employee: emp,
      performance_metrics: {
        total_calls: performanceSummary.total_calls,
        average_score: performanceSummary.current_score,
        score_improvement: performanceSummary.score_trend,
        coaching_sessions: performanceSummary.coaching_notes_count,
        manager_feedback_count: performanceSummary.coaching_notes_count,
      },
      recent_scores: recentScores,
      strengths_analysis: strengthsAnalysis,
      improvement_areas: improvementAreas,
      coaching_effectiveness: coachingEffectiveness,
    };
  }

  /**
   * List all teams
   */
  static async listTeams(): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  }

  /**
   * Organization-level summary stats for a time range
   */
  static async getOrgStats(timeRange: '7d' | '30d' | '90d' | '1y'): Promise<{ totalEmployees: number; averageScore: number; totalCalls: number; coachingSessions: number }>{
    const startDate = this.getStartDate(timeRange);

    const [employeeCountRes, scorecardsRes, coachingNotesRes] = await Promise.all([
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('employee_scorecards').select('overall_score, evaluated_at').gte('evaluated_at', startDate.toISOString()),
      supabase.from('manager_coaching_notes').select('id, created_at').gte('created_at', startDate.toISOString()),
    ]);

    const totalEmployees = employeeCountRes.count || 0;
    const totalCalls = scorecardsRes.data?.length || 0;
    const averageScore = totalCalls > 0
      ? (scorecardsRes.data!.reduce((sum: number, r: any) => sum + (r.overall_score || 0), 0) / totalCalls)
      : 0;
    const coachingSessions = coachingNotesRes.data?.length || 0;

    return { totalEmployees, averageScore, totalCalls, coachingSessions };
  }

  /**
   * Org performance trend over time
   */
  static async getOrgPerformanceTrend(timeRange: '7d' | '30d' | '90d' | '1y'): Promise<Array<{ date: string; score: number; calls: number }>>{
    const startDate = this.getStartDate(timeRange);
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select('evaluated_at, overall_score')
      .gte('evaluated_at', startDate.toISOString())
      .order('evaluated_at', { ascending: true });
    if (error) throw error;

    const grouped: Record<string, { sum: number; count: number }> = {};
    for (const row of data || []) {
      const day = new Date(row.evaluated_at).toISOString().slice(0, 10);
      if (!grouped[day]) grouped[day] = { sum: 0, count: 0 };
      grouped[day].sum += row.overall_score || 0;
      grouped[day].count += 1;
    }
    return Object.entries(grouped).map(([date, { sum, count }]) => ({
      date,
      score: count > 0 ? sum / count : 0,
      calls: count,
    }));
  }

  /**
   * Compare teams by average score and total calls
   */
  static async getTeamComparison(timeRange: '7d' | '30d' | '90d' | '1y'): Promise<Array<{ name: string; averageScore: number; totalCalls: number; memberCount: number }>>{
    const startDate = this.getStartDate(timeRange);
    const teams = await this.listTeams();

    const results: Array<{ name: string; averageScore: number; totalCalls: number; memberCount: number }> = [];
    for (const team of teams) {
      const { data: employees, error: empErr } = await supabase
        .from('employees')
        .select('id')
        .eq('team_id', team.id)
        .eq('status', 'active');
      if (empErr) throw empErr;
      const ids = (employees || []).map((e: any) => e.id);
      if (ids.length === 0) {
        results.push({ name: team.name, averageScore: 0, totalCalls: 0, memberCount: 0 });
        continue;
      }
      const { data: sc, error: scErr } = await supabase
        .from('employee_scorecards')
        .select('overall_score, employee_id, evaluated_at')
        .in('employee_id', ids)
        .gte('evaluated_at', startDate.toISOString());
      if (scErr) throw scErr;
      const count = sc?.length || 0;
      const avg = count > 0 ? (sc!.reduce((s: number, r: any) => s + (r.overall_score || 0), 0) / count) : 0;
      results.push({ name: team.name, averageScore: avg, totalCalls: count, memberCount: ids.length });
    }
    return results;
  }

  /**
   * Top performers across org for a time range
   */
  static async getTopPerformers(timeRange: '7d' | '30d' | '90d' | '1y', limit = 5): Promise<Array<{ employee: Employee; score: number; calls: number; improvement: number }>>{
    const startDate = this.getStartDate(timeRange);
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select('employee_id, overall_score, evaluated_at')
      .gte('evaluated_at', startDate.toISOString());
    if (error) throw error;

    const byEmp: Record<string, { scores: Array<{ date: string; score: number }>; count: number; avg: number } > = {};
    for (const row of data || []) {
      const key = row.employee_id;
      if (!byEmp[key]) byEmp[key] = { scores: [], count: 0, avg: 0 };
      byEmp[key].scores.push({ date: row.evaluated_at, score: row.overall_score || 0 });
      byEmp[key].count += 1;
    }
    for (const key of Object.keys(byEmp)) {
      const arr = byEmp[key].scores;
      const sum = arr.reduce((s, r) => s + r.score, 0);
      byEmp[key].avg = arr.length > 0 ? sum / arr.length : 0;
      arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    const topIds = Object.entries(byEmp)
      .sort((a, b) => b[1].avg - a[1].avg)
      .slice(0, limit)
      .map(([id]) => id);

    if (topIds.length === 0) return [];

    const { data: empRows, error: empErr } = await supabase
      .from('employees')
      .select('*')
      .in('id', topIds);
    if (empErr) throw empErr;
    const empMap = new Map((empRows || []).map((e: any) => [e.id, e as Employee]));

    return topIds.map((id) => {
      const record = byEmp[id];
      const scores = record.scores;
      const improvement = scores.length >= 2 ? (scores[scores.length - 1].score - scores[0].score) : 0;
      return {
        employee: empMap.get(id)!,
        score: Number(record.avg.toFixed(2)),
        calls: record.count,
        improvement: Number(improvement.toFixed(2)),
      };
    });
  }

  /**
   * Common improvement areas across org
   */
  static async getCommonImprovementAreas(timeRange: '7d' | '30d' | '90d' | '1y', limit = 5): Promise<Array<{ area: string; count: number; trend: 'improving' | 'declining' | 'stable' }>>{
    const startDate = this.getStartDate(timeRange);
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select('improvements, evaluated_at')
      .gte('evaluated_at', startDate.toISOString());
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of data || []) {
      for (const imp of (row.improvements || [])) {
        counts[imp] = (counts[imp] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([area, count]) => ({ area, count, trend: 'stable' as const }));
  }

  /**
   * Get team performance report
   */
  static async getTeamPerformanceReport(teamId: string): Promise<TeamPerformanceReport> {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError) throw teamError;

    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'active');

    if (employeesError) throw employeesError;

    const teamMetrics = await this.calculateTeamMetrics(teamId);
    const individualPerformance = await Promise.all(
      employees.map(async (employee) => ({
        employee,
        performance_summary: await this.getEmployeePerformanceSummary(employee.id),
        recent_trend: this.calculateScoreTrend(0) // TODO: Calculate actual trend
      }))
    );

    return {
      team,
      employees,
      team_metrics: teamMetrics,
      individual_performance: individualPerformance
    };
  }

  // =============================================
  // VOICE DETECTION AND IDENTIFICATION
  // =============================================

  /**
   * Detect employee voice in recording
   */
  static async detectEmployeeVoice(
    recordingId: string,
    audioData?: ArrayBuffer
  ): Promise<VoiceDetectionResult> {
    // This would integrate with your existing voice analysis system
    // For now, return a mock result
    return {
      confidence: 0.85,
      detection_method: 'automatic',
      voice_characteristics: {},
      suggested_employees: []
    };
  }

  /**
   * Train voice profile for employee
   */
  static async trainEmployeeVoiceProfile(
    employeeId: string,
    sampleRecordings: string[]
  ): Promise<void> {
    const { error } = await supabase
      .from('employee_voice_profiles')
      .upsert({
        employee_id: employeeId,
        sample_recordings: sampleRecordings,
        training_status: 'completed',
        last_training_date: new Date().toISOString()
      });

    if (error) throw error;
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private static async getEmployeeRecentRecordings(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_call_participation')
      .select(`
        *,
        recordings:recording_id(id, title, created_at, duration)
      `)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.warn('getEmployeeRecentRecordings participation fetch failed, will fallback to scorecards:', error);
    }
    const rows = data || [];
    const recIds = rows.map((r: any) => r.recordings?.id).filter(Boolean);
    let scoreMap = new Map<string, number>();
    if (recIds.length > 0) {
      const { data: sc, error: scErr } = await supabase
        .from('employee_scorecards')
        .select('recording_id, participation_id, overall_score, evaluated_at')
        .in('recording_id', recIds)
        .eq('employee_id', employeeId)
        .order('evaluated_at', { ascending: false });
      if (scErr) throw scErr;
      // Prefer participation_id match, else latest by evaluated_at
      const latestByRecording = new Map<string, { score: number; participation_id?: string }>();
      for (const row of sc || []) {
        if (!latestByRecording.has(row.recording_id)) {
          latestByRecording.set(row.recording_id, { score: row.overall_score, participation_id: row.participation_id });
        }
      }
      scoreMap = new Map(Array.from(latestByRecording.entries()).map(([rid, v]) => [rid, v.score]));
    }

    let mapped = rows.map((item: any) => ({
      id: item.recordings.id,
      title: item.recordings.title,
      created_at: item.recordings.created_at,
      duration: item.recordings.duration,
      participation_type: item.participation_type,
      overall_score: scoreMap.get(item.recordings.id) ?? 0,
      talk_time_percentage: item.talk_time_percentage,
      strengths: [],
      improvements: []
    }));

    // Fallback: if no participation rows, derive recent recordings from latest scorecards
    if (mapped.length === 0) {
      const { data: sc2, error: scErr2 } = await supabase
        .from('employee_scorecards')
        .select(`
          evaluated_at,
          overall_score,
          recordings:recording_id(id, title, created_at, duration)
        `)
        .eq('employee_id', employeeId)
        .order('evaluated_at', { ascending: false })
        .limit(10);
      if (!scErr2 && sc2) {
        mapped = sc2
          .filter((r: any) => r.recordings)
          .map((r: any) => ({
            id: r.recordings.id,
            title: r.recordings.title,
            created_at: r.recordings.created_at,
            duration: r.recordings.duration,
            participation_type: 'primary' as const,
            overall_score: r.overall_score || 0,
            talk_time_percentage: 0,
            strengths: [],
            improvements: []
          }));
      }
    }

    return mapped;
  }

  private static async getEmployeeScoreTrends(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select('evaluated_at, overall_score')
      .eq('employee_id', employeeId)
      .order('evaluated_at', { ascending: true })
      .limit(30);

    if (error) throw error;
    return data?.map(item => ({
      date: item.evaluated_at,
      score: item.overall_score,
      period: 'daily' as const
    })) || [];
  }

  private static async getEmployeeRecentScores(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select(`
        evaluated_at,
        overall_score,
        recordings:recording_id(title)
      `)
      .eq('employee_id', employeeId)
      .order('evaluated_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data?.map(item => ({
      date: item.evaluated_at,
      score: item.overall_score,
      recording_title: item.recordings.title
    })) || [];
  }

  private static async getEmployeeStrengthsAnalysis(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select('strengths')
      .eq('employee_id', employeeId)
      .order('evaluated_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const allStrengths = data?.flatMap(item => item.strengths || []) || [];
    const strengthFrequency = allStrengths.reduce((acc, strength) => {
      acc[strength] = (acc[strength] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      top_strengths: Object.keys(strengthFrequency).sort((a, b) => strengthFrequency[b] - strengthFrequency[a]).slice(0, 5),
      strength_frequency: strengthFrequency
    };
  }

  private static async getEmployeeImprovementAreas(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select('improvements')
      .eq('employee_id', employeeId)
      .order('evaluated_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const allImprovements = data?.flatMap(item => item.improvements || []) || [];
    const improvementFrequency = allImprovements.reduce((acc, improvement) => {
      acc[improvement] = (acc[improvement] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      top_improvements: Object.keys(improvementFrequency).sort((a, b) => improvementFrequency[b] - improvementFrequency[a]).slice(0, 5),
      improvement_frequency: improvementFrequency
    };
  }

  private static async getEmployeeCoachingEffectiveness(employeeId: string) {
    const { data, error } = await supabase
      .from('manager_coaching_notes')
      .select('status')
      .eq('employee_id', employeeId);

    if (error) throw error;

    const totalNotes = data?.length || 0;
    const completedNotes = data?.filter(note => note.status === 'completed').length || 0;

    return {
      coaching_notes_count: totalNotes,
      action_items_completed: completedNotes,
      follow_up_rate: totalNotes > 0 ? (completedNotes / totalNotes) * 100 : 0
    };
  }

  private static async calculateTeamMetrics(teamId: string) {
    const { data: empRows, error: empErr } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('team_id', teamId)
      .eq('status', 'active');
    if (empErr) throw empErr;
    const ids = (empRows || []).map((e: any) => e.id);
    if (ids.length === 0) return { total_calls: 0, average_score: 0, top_performers: [], improvement_areas: [] };

    const { data: sc, error: scErr } = await supabase
      .from('employee_scorecards')
      .select('employee_id, overall_score, improvements')
      .in('employee_id', ids);
    if (scErr) throw scErr;

    const totalCalls = sc?.length || 0;
    const averageScore = totalCalls > 0 ? (sc!.reduce((s: number, r: any) => s + (r.overall_score || 0), 0) / totalCalls) : 0;

    const byEmp: Record<string, { sum: number; count: number }> = {};
    const impCounts: Record<string, number> = {};
    for (const row of sc || []) {
      const key = row.employee_id;
      if (!byEmp[key]) byEmp[key] = { sum: 0, count: 0 };
      byEmp[key].sum += row.overall_score || 0;
      byEmp[key].count += 1;
      for (const imp of (row.improvements || [])) {
        impCounts[imp] = (impCounts[imp] || 0) + 1;
      }
    }
    const top_performers = Object.entries(byEmp)
      .sort((a, b) => (b[1].sum / (b[1].count || 1)) - (a[1].sum / (a[1].count || 1)))
      .slice(0, 5)
      .map(([empId]) => empId);
    const improvement_areas = Object.keys(impCounts).sort((a, b) => impCounts[b] - impCounts[a]).slice(0, 5);

    return { total_calls: totalCalls, average_score: averageScore, top_performers, improvement_areas };
  }

  // Flexible helpers that can match by UUID id or legacy employee code
  private static async getEmployeePerformanceSummaryAny(employeeId: string, employeeCode?: string): Promise<EmployeePerformanceSummary> {
    try {
      const { data, error } = await supabase
        .rpc('get_employee_performance_summary', { p_employee_id: employeeId });
      if (!error && data && data[0]) return data[0];
    } catch {}
    return this.buildSummaryFromScorecardsAny(employeeId, employeeCode);
  }

  private static async buildSummaryFromScorecardsAny(employeeId: string, employeeCode?: string): Promise<EmployeePerformanceSummary> {
    // Related tables use UUID foreign keys, so only query with employeeId (UUID)
    const [scRes, notesRes, participationRes] = await Promise.all([
      supabase
        .from('employee_scorecards')
        .select('evaluated_at, overall_score, criteria_scores')
        .eq('employee_id', employeeId)  // Only use UUID for related tables
        .order('evaluated_at', { ascending: false })
        .limit(100),
      supabase
        .from('manager_coaching_notes')
        .select('id', { count: 'exact', head: true })
        .eq('employee_id', employeeId),  // Only use UUID for related tables
      supabase
        .from('employee_call_participation')
        .select('recording_id, confidence_score, created_at')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(100)
    ]);

    const rows = (scRes as any)?.data || [];
    const participationRows = (participationRes as any)?.data || [];

    // Use scorecards if available, otherwise fall back to participation records
    const total_calls = rows.length > 0 ? rows.length : participationRows.length;

    let current_score = 0;
    let score_trend = 0;
    let last_evaluation_date = new Date().toISOString();

    if (rows.length > 0) {
      // Use scorecard data
      const latest = rows[0];
      const oldest = rows[rows.length - 1];
      current_score = latest?.overall_score ?? 0;
      score_trend = rows.length >= 2 ? (latest.overall_score - (oldest?.overall_score ?? latest.overall_score)) : 0;
      last_evaluation_date = latest?.evaluated_at || new Date().toISOString();
    } else if (participationRows.length > 0) {
      // Fallback: estimate score from participation confidence
      const avgConfidence = participationRows.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / participationRows.length;
      current_score = avgConfidence * 10; // Convert 0-1 confidence to 0-10 score
      score_trend = 0; // No trend data available from participation
      last_evaluation_date = participationRows[0]?.created_at || new Date().toISOString();

      console.log(`📊 Using participation fallback: ${total_calls} calls, avg confidence ${avgConfidence.toFixed(2)}, estimated score ${current_score.toFixed(1)}`);
    }

    // Extract strengths/improvements from criteria_scores jsonb or use empty arrays
    const strengthsFreq: Record<string, number> = {};
    const improvementsFreq: Record<string, number> = {};
    for (const r of rows) {
      // Extract from criteria_scores if available, otherwise use empty arrays
      const criteriaScores = r.criteria_scores || {};
      const strengths = criteriaScores.strengths || [];
      const improvements = criteriaScores.improvements || [];

      for (const s of strengths) strengthsFreq[s] = (strengthsFreq[s] || 0) + 1;
      for (const im of improvements) improvementsFreq[im] = (improvementsFreq[im] || 0) + 1;
    }
    const recent_strengths = Object.keys(strengthsFreq).sort((a, b) => strengthsFreq[b] - strengthsFreq[a]).slice(0, 3);
    const recent_improvements = Object.keys(improvementsFreq).sort((a, b) => improvementsFreq[b] - improvementsFreq[a]).slice(0, 3);
    const coaching_notes_count = (notesRes as any)?.count || 0;

    return {
      employee_name: '',
      total_calls,
      current_score,
      score_trend,
      recent_strengths,
      recent_improvements,
      coaching_notes_count,
      last_evaluation_date,
    };
  }

  private static async getEmployeeRecentRecordingsAny(employeeId: string, employeeCode?: string) {
    // Related tables use UUID foreign keys, so only query with employeeId (UUID)
    console.log(`🔍 DEBUG: Fetching recordings for employee ${employeeId}`);

    const { data, error } = await supabase
      .from('employee_call_participation')
      .select(`
        *,
        recordings:recording_id(id, title, created_at, duration)
      `)
      .eq('employee_id', employeeId)  // Only use UUID for related tables
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.warn('🚨 getEmployeeRecentRecordingsAny participation fetch failed, fallback to scorecards:', error);
    }

    console.log(`📊 DEBUG: Found ${data?.length || 0} participation records:`, data);
    const rows = data || [];
    const recIds = rows.map((r: any) => r.recordings?.id).filter(Boolean);
    let scoreMap = new Map<string, number>();
    if (recIds.length > 0) {
      const { data: sc, error: scErr } = await supabase
        .from('employee_scorecards')
        .select('recording_id, participation_id, overall_score, evaluated_at')
        .in('recording_id', recIds)
        .eq('employee_id', employeeId)  // Only use UUID for related tables
        .order('evaluated_at', { ascending: false });
      if (!scErr) {
        const latestByRecording = new Map<string, { score: number; participation_id?: string }>();
        for (const row of sc || []) {
          if (!latestByRecording.has(row.recording_id)) {
            latestByRecording.set(row.recording_id, { score: row.overall_score, participation_id: row.participation_id });
          }
        }
        scoreMap = new Map(Array.from(latestByRecording.entries()).map(([rid, v]) => [rid, v.score]));
      }
    }

    let mapped = rows.map((item: any) => {
      if (!item.recordings) {
        console.warn(`⚠️  Participation record missing recording data:`, item);
        return null;
      }
      // Extract detection metadata from speaker_segments JSONB field
      const detectionMetadata = item.speaker_segments || {};

      return {
        id: item.recordings.id,
        title: item.recordings.title,
        created_at: item.recordings.created_at,
        duration: item.recordings.duration,
        participation_type: item.participation_type,
        overall_score: scoreMap.get(item.recordings.id) ?? 0,
        talk_time_percentage: item.talk_time_percentage,
        strengths: [],
        improvements: [],
        // AI Detection metadata
        participation_id: item.id, // employee_call_participation.id
        detection_method: detectionMetadata.detection_method,
        confidence_score: item.confidence_score,
        manually_tagged: item.manually_tagged ?? false,
        detected_name: detectionMetadata.detected_name,
        name_type: detectionMetadata.name_type,
        reasoning: detectionMetadata.reasoning
      };
    }).filter(Boolean);

    console.log(`🎯 DEBUG: Mapped ${mapped.length} recordings successfully`);

    if (mapped.length === 0) {
      const { data: sc2, error: scErr2 } = await supabase
        .from('employee_scorecards')
        .select(`
          evaluated_at,
          overall_score,
          recordings:recording_id(id, title, created_at, duration)
        `)
        .eq('employee_id', employeeId)  // Only use UUID for related tables
        .order('evaluated_at', { ascending: false })
        .limit(10);
      if (!scErr2 && sc2) {
        mapped = sc2
          .filter((r: any) => r.recordings)
          .map((r: any) => ({
            id: r.recordings.id,
            title: r.recordings.title,
            created_at: r.recordings.created_at,
            duration: r.recordings.duration,
            participation_type: 'primary' as const,
            overall_score: r.overall_score || 0,
            talk_time_percentage: 0,
            strengths: [],
            improvements: []
          }));
      }
    }

    // FALLBACK 3: If still no results, try matching by employee name in recordings table
    if (mapped.length === 0) {
      try {
        // Get employee's full name for matching
        const { data: employee } = await supabase
          .from('employees')
          .select('first_name, last_name')
          .eq('id', employeeId)
          .single();

        if (employee) {
          const fullName = `${employee.first_name} ${employee.last_name}`;
          console.log(`🔍 Fallback: Looking for recordings with employee_name matching "${fullName}"`);

          // Search recordings by employee_name (from AI detection)
          const { data: nameMatches, error: nameError } = await supabase
            .from('recordings')
            .select('id, title, created_at, duration, employee_name')
            .or(`employee_name.ilike.%${employee.first_name}%,employee_name.ilike.%${employee.last_name}%`)
            .order('created_at', { ascending: false })
            .limit(10);

          if (!nameError && nameMatches && nameMatches.length > 0) {
            console.log(`✅ Fallback found ${nameMatches.length} recordings by employee name`);

            // Get scorecards for these recordings to add scoring data
            const recordingIds = nameMatches.map(r => r.id);
            const { data: fallbackScores } = await supabase
              .from('employee_scorecards')
              .select('recording_id, overall_score, evaluated_at')
              .in('recording_id', recordingIds)
              .eq('employee_id', employeeId)
              .order('evaluated_at', { ascending: false });

            const scoreMap = new Map(
              (fallbackScores || []).map(s => [s.recording_id, s.overall_score])
            );

            mapped = nameMatches.map((recording: any) => ({
              id: recording.id,
              title: recording.title,
              created_at: recording.created_at,
              duration: recording.duration,
              participation_type: 'primary' as const,
              overall_score: scoreMap.get(recording.id) ?? 0,
              talk_time_percentage: 0,
              strengths: [],
              improvements: []
            }));

            console.log(`✅ Using employee name fallback: found ${mapped.length} recordings`);
          }
        }
      } catch (fallbackError) {
        console.warn('⚠️ Employee name fallback failed:', fallbackError);
      }
    }

    return mapped;
  }

  private static async getEmployeeScoreTrendsAny(employeeId: string, employeeCode?: string) {
    // Related tables use UUID foreign keys, so only query with employeeId (UUID)
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select('evaluated_at, overall_score')
      .eq('employee_id', employeeId)  // Only use UUID for related tables
      .order('evaluated_at', { ascending: true })
      .limit(30);

    if (error) throw error;
    return data?.map(item => ({ date: item.evaluated_at, score: item.overall_score, period: 'daily' as const })) || [];
  }

  private static async getEmployeeRecentScoresAny(employeeId: string, employeeCode?: string) {
    // Related tables use UUID foreign keys, so only query with employeeId (UUID)
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select(`
        evaluated_at,
        overall_score,
        recordings:recording_id(title)
      `)
      .eq('employee_id', employeeId)  // Only use UUID for related tables
      .order('evaluated_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data?.map(item => ({ date: item.evaluated_at, score: item.overall_score, recording_title: item.recordings.title })) || [];
  }

  private static async getEmployeeStrengthsAnalysisAny(employeeId: string, employeeCode?: string) {
    // Related tables use UUID foreign keys, so only query with employeeId (UUID)
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select('criteria_scores')
      .eq('employee_id', employeeId)  // Only use UUID for related tables
      .order('evaluated_at', { ascending: false })
      .limit(20);
    if (error) throw error;

    // Extract strengths from criteria_scores jsonb
    const all = data?.flatMap(item => {
      const criteriaScores = item.criteria_scores || {};
      return criteriaScores.strengths || [];
    }) || [];

    const freq = all.reduce((acc, s) => ((acc[s] = (acc[s] || 0) + 1), acc), {} as Record<string, number>);
    return { top_strengths: Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 5), strength_frequency: freq };
  }

  private static async getEmployeeImprovementAreasAny(employeeId: string, employeeCode?: string) {
    // Related tables use UUID foreign keys, so only query with employeeId (UUID)
    const { data, error } = await supabase
      .from('employee_scorecards')
      .select('criteria_scores')
      .eq('employee_id', employeeId)  // Only use UUID for related tables
      .order('evaluated_at', { ascending: false })
      .limit(20);
    if (error) throw error;

    // Extract improvements from criteria_scores jsonb
    const all = data?.flatMap(item => {
      const criteriaScores = item.criteria_scores || {};
      return criteriaScores.improvements || [];
    }) || [];

    const freq = all.reduce((acc, s) => ((acc[s] = (acc[s] || 0) + 1), acc), {} as Record<string, number>);
    return { top_improvements: Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 5), improvement_frequency: freq };
  }

  private static async getEmployeeCoachingNotesAny(employeeId: string, employeeCode?: string) {
    // Related tables use UUID foreign keys, so only query with employeeId (UUID)
    const { data, error } = await supabase
      .from('manager_coaching_notes')
      .select(`
        *,
        manager:manager_id(first_name, last_name),
        recordings:recording_id(title, created_at)
      `)
      .eq('employee_id', employeeId)  // Only use UUID for related tables
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  private static async getEmployeeCoachingEffectivenessAny(employeeId: string, employeeCode?: string) {
    // Related tables use UUID foreign keys, so only query with employeeId (UUID)
    const { data, error } = await supabase
      .from('manager_coaching_notes')
      .select('status')
      .eq('employee_id', employeeId);  // Only use UUID for related tables
    if (error) throw error;

    const totalNotes = data?.length || 0;
    const completedNotes = data?.filter(note => note.status === 'completed').length || 0;

    return {
      coaching_notes_count: totalNotes,
      action_items_completed: completedNotes,
      follow_up_rate: totalNotes > 0 ? (completedNotes / totalNotes) * 100 : 0,
    };
  }

  private static getStartDate(timeRange: '7d' | '30d' | '90d' | '1y'): Date {
    const now = new Date();
    const d = new Date(now);
    switch (timeRange) {
      case '7d': d.setDate(now.getDate() - 7); break;
      case '30d': d.setDate(now.getDate() - 30); break;
      case '90d': d.setDate(now.getDate() - 90); break;
      case '1y': d.setFullYear(now.getFullYear() - 1); break;
    }
    return d;
  }

  private static getDefaultPerformanceSummary(): EmployeePerformanceSummary {
    return {
      employee_name: '',
      total_calls: 0,
      current_score: 0,
      score_trend: 0,
      recent_strengths: [],
      recent_improvements: [],
      coaching_notes_count: 0,
      last_evaluation_date: new Date().toISOString()
    };
  }

  private static getRecentActivityText(performanceSummary: EmployeePerformanceSummary): string {
    if (performanceSummary.total_calls === 0) {
      return 'No recent activity';
    }
    return `Last evaluation: ${new Date(performanceSummary.last_evaluation_date).toLocaleDateString()}`;
  }

  private static calculateScoreTrend(scoreTrend: number): 'improving' | 'declining' | 'stable' {
    if (scoreTrend > 0.1) return 'improving';
    if (scoreTrend < -0.1) return 'declining';
    return 'stable';
  }

  private static async buildSummaryFromScorecards(employeeId: string): Promise<EmployeePerformanceSummary> {
    const [scRes, notesRes, participationRes] = await Promise.all([
      supabase
        .from('employee_scorecards')
        .select('evaluated_at, overall_score, criteria_scores')
        .eq('employee_id', employeeId)
        .order('evaluated_at', { ascending: false })
        .limit(100),
      supabase
        .from('manager_coaching_notes')
        .select('id', { count: 'exact', head: true })
        .eq('employee_id', employeeId),
      supabase
        .from('employee_call_participation')
        .select('recording_id, confidence_score, created_at')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(100)
    ]);

    const rows = (scRes as any)?.data || [];
    const participationRows = (participationRes as any)?.data || [];
    const total_calls = rows.length > 0 ? rows.length : participationRows.length;

    let current_score = 0;
    let score_trend = 0;
    let last_evaluation_date = new Date().toISOString();

    if (rows.length > 0) {
      // Use scorecard data
      const latest = rows[0];
      const oldest = rows[rows.length - 1];
      current_score = latest?.overall_score ?? 0;
      score_trend = rows.length >= 2 ? (latest.overall_score - (oldest?.overall_score ?? latest.overall_score)) : 0;
      last_evaluation_date = latest?.evaluated_at || new Date().toISOString();
    } else if (participationRows.length > 0) {
      // Fallback: estimate score from participation confidence
      const avgConfidence = participationRows.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / participationRows.length;
      current_score = avgConfidence * 10; // Convert 0-1 confidence to 0-10 score
      score_trend = 0; // No trend data available from participation
      last_evaluation_date = participationRows[0]?.created_at || new Date().toISOString();

      console.log(`📊 Using participation fallback (main): ${total_calls} calls, avg confidence ${avgConfidence.toFixed(2)}, estimated score ${current_score.toFixed(1)}`);
    }

    // Aggregate strengths/improvements (top 3) from criteria_scores jsonb
    const strengthsFreq: Record<string, number> = {};
    const improvementsFreq: Record<string, number> = {};
    for (const r of rows) {
      // Extract from criteria_scores if available
      const criteriaScores = r.criteria_scores || {};
      const strengths = criteriaScores.strengths || [];
      const improvements = criteriaScores.improvements || [];

      for (const s of strengths) strengthsFreq[s] = (strengthsFreq[s] || 0) + 1;
      for (const im of improvements) improvementsFreq[im] = (improvementsFreq[im] || 0) + 1;
    }
    const recent_strengths = Object.keys(strengthsFreq).sort((a, b) => strengthsFreq[b] - strengthsFreq[a]).slice(0, 3);
    const recent_improvements = Object.keys(improvementsFreq).sort((a, b) => improvementsFreq[b] - improvementsFreq[a]).slice(0, 3);

    const coaching_notes_count = (notesRes as any)?.count || 0;

    return {
      employee_name: '',
      total_calls,
      current_score,
      score_trend,
      recent_strengths,
      recent_improvements,
      coaching_notes_count,
      last_evaluation_date,
    };
  }

  // Simple concurrency limiter for mapping async functions across arrays
  private static async mapWithConcurrency<T, U>(items: T[], limit: number, fn: (item: T) => Promise<U>): Promise<U[]> {
    const results: U[] = new Array(items.length) as U[];
    let index = 0;
    const workers = new Array(Math.min(limit, Math.max(1, items.length))).fill(0).map(async () => {
      while (true) {
        const current = index++;
        if (current >= items.length) break;
        results[current] = await fn(items[current]);
      }
    });
    await Promise.all(workers);
    return results;
  }

  // Default analytics data for when analytics fetching fails
  private static getDefaultAnalytics(employee: Employee): EmployeeAnalytics {
    return {
      employee,
      performance_summary: {
        employee_name: `${employee.first_name} ${employee.last_name}`,
        total_calls: 0,
        current_score: 0,
        score_trend: 0,
        recent_strengths: [],
        recent_improvements: [],
        coaching_notes_count: 0,
        last_evaluation_date: new Date().toISOString()
      },
      recent_recordings: [],
      score_trends: [],
      coaching_history: []
    };
  }

  // Default dashboard data for when dashboard fetching fails
  private static getDefaultDashboardData(employee: Employee): EmployeeDashboardData {
    return {
      employee,
      performance_metrics: {
        total_calls: 0,
        average_score: 0,
        score_improvement: 0,
        coaching_sessions: 0,
        manager_feedback_count: 0
      },
      recent_scores: [],
      strengths_analysis: { top_strengths: [], strength_frequency: {} },
      improvement_areas: { top_improvements: [], improvement_frequency: {} },
      coaching_effectiveness: {
        coaching_notes_count: 0,
        action_items_completed: 0,
        follow_up_rate: 0
      }
    };
  }
}
